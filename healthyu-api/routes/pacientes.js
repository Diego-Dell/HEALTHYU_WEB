// routes/pacientes.js


const express = require("express");
const router = express.Router();
const { sql, pool, poolConnect } = require("../db");

// ==========================
// GET /pacientes/por-usuario/:id_usuario
// ==========================
router.get("/por-usuario/:id_usuario", async (req, res) => {
  const id_usuario = parseInt(req.params.id_usuario, 10);

  if (Number.isNaN(id_usuario)) {
    return res.status(400).json({ mensaje: "id_usuario inválido." });
  }

  try {
    await poolConnect;
    const request = pool.request();

    request.input("id_usuario", sql.Int, id_usuario);

    const result = await request.query(`
      SELECT
          u.id_usuario,
          u.nombre_usuario,
          u.ci_paciente,
          p.nombre_completo,
          p.correo,
          p.celular,
          p.direccion,
          p.sexo,
          p.id_tipo_sangre,
          p.id_centro,
          p.fecha_nacimiento,
          p.foto_perfil
      FROM Usuario u
      LEFT JOIN Paciente p
          ON p.ci_paciente = u.ci_paciente
      WHERE u.id_usuario = @id_usuario;
    `);

    const row = result.recordset[0];

    if (!row) {
      // Usuario no encontrado
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }

    // Normalizar respuesta para el frontend
    let fechaISO = null;
    if (row.fecha_nacimiento instanceof Date) {
      fechaISO = row.fecha_nacimiento.toISOString().slice(0, 10); // yyyy-mm-dd
    }

    const paciente = {
      id_usuario: row.id_usuario,
      nombre_usuario: row.nombre_usuario,
      ci_paciente: row.ci_paciente,
      nombre_completo: row.nombre_completo,
      correo: row.correo,
      celular: row.celular,
      direccion: row.direccion,
      sexo: row.sexo === null || row.sexo === undefined ? null : Number(row.sexo), // 0 / 1
      id_tipo_sangre: row.id_tipo_sangre,
      id_centro: row.id_centro,
      fecha_nacimiento: fechaISO,
      // Si más adelante quieres usar la foto:
      foto_base64: row.foto_perfil ? Buffer.from(row.foto_perfil).toString("base64") : null
    };

    return res.json({ paciente });
  } catch (err) {
    console.error("Error en GET /pacientes/por-usuario:", err);
    return res.status(500).json({ mensaje: "Error en el servidor." });
  }
});

// ==========================
// PUT /pacientes/por-usuario/:id_usuario
// Guarda / actualiza datos del paciente
// ==========================
router.put("/por-usuario/:id_usuario", async (req, res) => {
  const id_usuario = parseInt(req.params.id_usuario, 10);

  if (Number.isNaN(id_usuario)) {
    return res.status(400).json({ mensaje: "id_usuario inválido." });
  }

  const {
    ci_paciente,        // puede venir null o vacío
    nombre_completo,
    correo,
    celular,
    fecha_nacimiento,   // 'YYYY-MM-DD' o ''
    direccion,
    sexo,               // 0 / 1 (string o número)
    id_tipo_sangre,
    id_centro           // puede venir null / ''
    // Por ahora no tratamos foto_perfil desde la web
  } = req.body || {};

  try {
    await poolConnect;
    const request = pool.request();

    // Parseos básicos
    const ciPacInt =
      ci_paciente && String(ci_paciente).trim() !== ""
        ? parseInt(ci_paciente, 10)
        : null;

    const tipoSangreInt =
      id_tipo_sangre && String(id_tipo_sangre).trim() !== ""
        ? parseInt(id_tipo_sangre, 10)
        : null;

    const idCentroInt =
      id_centro && String(id_centro).trim() !== ""
        ? parseInt(id_centro, 10)
        : null;

    const sexoBit =
      sexo === null || sexo === undefined || String(sexo).trim() === ""
        ? null
        : Number(sexo); // 0 o 1

    let fechaNacDate = null;
    if (fecha_nacimiento && String(fecha_nacimiento).trim() !== "") {
      // El driver de mssql admite string 'YYYY-MM-DD' directamente,
      // pero si quieres puedes convertirlo a Date aquí.
      fechaNacDate = fecha_nacimiento;
    }

    request
      .input("id_usuario", sql.Int, id_usuario)
      .input("ci_paciente", sql.Int, ciPacInt)
      .input("nombre_completo", sql.VarChar(120), nombre_completo || null)
      .input("correo", sql.VarChar(100), correo || null)
      .input("celular", sql.VarChar(20), celular || null)
      .input("direccion", sql.VarChar(200), direccion || null)
      .input("sexo", sql.Bit, sexoBit)
      .input("id_tipo_sangre", sql.Int, tipoSangreInt)
      .input("id_centro", sql.Int, idCentroInt)
      .input("fecha_nacimiento", sql.Date, fechaNacDate);

    const result = await request.query(`
      DECLARE @ci_final INT;

      -- Si ya viene un CI, lo usamos. Si no, generamos uno nuevo.
      IF @ci_paciente IS NOT NULL
      BEGIN
          SET @ci_final = @ci_paciente;
      END
      ELSE
      BEGIN
          SELECT @ci_final = ISNULL(MAX(ci_paciente), 0) + 1
          FROM Paciente;
      END

      -- Si existe paciente -> UPDATE, si no -> INSERT
      IF EXISTS (SELECT 1 FROM Paciente WHERE ci_paciente = @ci_final)
      BEGIN
          UPDATE Paciente
          SET nombre_completo  = @nombre_completo,
              correo           = @correo,
              celular          = @celular,
              direccion        = @direccion,
              sexo             = @sexo,
              id_tipo_sangre   = @id_tipo_sangre,
              id_centro        = @id_centro,
              fecha_nacimiento = @fecha_nacimiento
          WHERE ci_paciente = @ci_final;
      END
      ELSE
      BEGIN
          INSERT INTO Paciente (
              ci_paciente,
              id_tipo_sangre,
              id_centro,
              correo,
              nombre_completo,
              celular,
              direccion,
              sexo,
              fecha_nacimiento
          )
          VALUES (
              @ci_final,
              @id_tipo_sangre,
              @id_centro,
              @correo,
              @nombre_completo,
              @celular,
              @direccion,
              @sexo,
              @fecha_nacimiento
          );
      END

      -- Vincular el paciente al usuario
      UPDATE Usuario
      SET ci_paciente = @ci_final
      WHERE id_usuario = @id_usuario;

      SELECT @ci_final AS ci_paciente;
    `);

    const ciFinal =
      result.recordset && result.recordset[0]
        ? result.recordset[0].ci_paciente
        : ciPacInt;

    return res.json({
      mensaje: "Datos de paciente guardados correctamente.",
      ci_paciente: ciFinal
    });
  } catch (err) {
    console.error("Error en PUT /pacientes/por-usuario:", err);
    return res.status(500).json({ mensaje: "Error en el servidor." });
  }
});

module.exports = router;
