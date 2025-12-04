// routes/index.js
const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("./db");

// ======================================================================
//  AUTH
// ======================================================================

// POST /api/auth/login
router.post("/auth/login", async (req, res) => {
  const { nombre_usuario, contrasena } = req.body;

  if (!nombre_usuario || !contrasena) {
    return res
      .status(400)
      .json({ mensaje: "Faltan nombre de usuario o contraseña." });
  }

  try {
    const pool = await poolPromise;

    // IMPORTANTE: el hash se genera en SQL con HASHBYTES,
    // igual que en tu app de escritorio.
    const result = await pool
      .request()
      .input("nombre_usuario", sql.VarChar(50), nombre_usuario)
      .input("contrasena", sql.VarChar(50), contrasena)
      .query(`
        SELECT id_usuario,
               ci_paciente,
               nombre_usuario,
               estado
        FROM   Usuario
        WHERE  nombre_usuario = @nombre_usuario
        AND    contrasena_hash = HASHBYTES('SHA2_256', @contrasena);
      `);

    if (result.recordset.length === 0) {
      return res
        .status(401)
        .json({ mensaje: "Usuario o contraseña incorrectos." });
    }

    const usuario = result.recordset[0];

    // Lo que espera el frontend: { usuario: {...} }
    return res.json({ usuario });
  } catch (err) {
    console.error("Error en /auth/login:", err);
    return res.status(500).json({ mensaje: "Error en el servidor." });
  }
});

// POST /api/auth/register
router.post("/auth/register", async (req, res) => {
  const { nombre_usuario, contrasena } = req.body;

  if (!nombre_usuario || !contrasena) {
    return res
      .status(400)
      .json({ mensaje: "Faltan nombre de usuario o contraseña." });
  }

  try {
    const pool = await poolPromise;

    // 1) Verificar que el usuario NO exista
    const existe = await pool
      .request()
      .input("nombre_usuario", sql.VarChar(50), nombre_usuario)
      .query(`
        SELECT COUNT(*) AS total
        FROM   Usuario
        WHERE  nombre_usuario = @nombre_usuario;
      `);

    if (existe.recordset[0].total > 0) {
      return res.status(400).json({ mensaje: "El usuario ya existe." });
    }

    // 2) Insertar usuario con hash generado por SQL
    const insert = await pool
      .request()
      .input("nombre_usuario", sql.VarChar(50), nombre_usuario)
      .input("contrasena", sql.VarChar(50), contrasena)
      .query(`
        INSERT INTO Usuario (ci_paciente, nombre_usuario, contrasena_hash, estado)
        VALUES (NULL, @nombre_usuario, HASHBYTES('SHA2_256', @contrasena), 1);

        SELECT SCOPE_IDENTITY() AS id_usuario;
      `);

    const id_usuario = insert.recordset[0].id_usuario;

    return res.status(201).json({
      usuario: {
        id_usuario,
        nombre_usuario,
        ci_paciente: null,
        estado: 1,
      },
    });
  } catch (err) {
    console.error("Error en /auth/register:", err);
    return res.status(500).json({ mensaje: "Error en el servidor." });
  }
});

// POST /api/auth/cambiar-password
router.post("/auth/cambiar-password", async (req, res) => {
  const { id_usuario, contrasenaActual, contrasenaNueva } = req.body;

  if (!id_usuario || !contrasenaActual || !contrasenaNueva) {
    return res
      .status(400)
      .json({ mensaje: "Faltan datos para cambiar la contraseña." });
  }

  try {
    const pool = await poolPromise;

    // Validar contraseña actual
    const check = await pool
      .request()
      .input("id_usuario", sql.Int, id_usuario)
      .input("contrasenaActual", sql.VarChar(50), contrasenaActual)
      .query(`
        SELECT COUNT(*) AS total
        FROM   Usuario
        WHERE  id_usuario = @id_usuario
        AND    contrasena_hash = HASHBYTES('SHA2_256', @contrasenaActual);
      `);

    if (check.recordset[0].total === 0) {
      return res
        .status(401)
        .json({ mensaje: "La contraseña actual no es correcta." });
    }

    // Actualizar a la nueva contraseña (hash desde SQL)
    await pool
      .request()
      .input("id_usuario", sql.Int, id_usuario)
      .input("contrasenaNueva", sql.VarChar(50), contrasenaNueva)
      .query(`
        UPDATE Usuario
        SET    contrasena_hash = HASHBYTES('SHA2_256', @contrasenaNueva)
        WHERE  id_usuario = @id_usuario;
      `);

    return res.json({ mensaje: "Contraseña actualizada correctamente." });
  } catch (err) {
    console.error("Error en /auth/cambiar-password:", err);
    return res.status(500).json({ mensaje: "Error en el servidor." });
  }
});

// DELETE /api/auth/eliminar-cuenta/:id_usuario
router.delete("/auth/eliminar-cuenta/:id_usuario", async (req, res) => {
  const { id_usuario } = req.params;

  try {
    const pool = await poolPromise;

    await pool
      .request()
      .input("id_usuario", sql.Int, id_usuario)
      .query(`
        DELETE FROM Usuario
        WHERE id_usuario = @id_usuario;
      `);

    return res.json({ mensaje: "Cuenta eliminada correctamente." });
  } catch (err) {
    console.error("Error en /auth/eliminar-cuenta:", err);
    return res.status(500).json({ mensaje: "Error en el servidor." });
  }
});

// ======================================================================
//  PACIENTES (lo que usa cuenta.html)
// ======================================================================

// GET /api/pacientes/por-usuario/:id_usuario
router.get("/pacientes/por-usuario/:id_usuario", async (req, res) => {
  const { id_usuario } = req.params;

  try {
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("id_usuario", sql.Int, id_usuario)
      .query(`
        SELECT P.*
        FROM   Usuario U
        JOIN   Paciente P ON P.ci_paciente = U.ci_paciente
        WHERE  U.id_usuario = @id_usuario;
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ mensaje: "Paciente no encontrado." });
    }

    return res.json({ paciente: result.recordset[0] });
  } catch (err) {
    console.error("Error en GET /pacientes/por-usuario:", err);
    return res.status(500).json({ mensaje: "Error en el servidor." });
  }
});

// PUT /api/pacientes/por-usuario/:id_usuario
router.put("/pacientes/por-usuario/:id_usuario", async (req, res) => {
  const { id_usuario } = req.params;
  const {
    ci_paciente,
    nombre_completo,
    correo,
    celular,
    fecha_nacimiento,
    direccion,
    sexo,
    id_tipo_sangre,
    id_centro,
  } = req.body;

  try {
    const pool = await poolPromise;

    // Asegurarnos de que el Usuario tenga ese ci_paciente asociado
    await pool
      .request()
      .input("id_usuario", sql.Int, id_usuario)
      .input("ci_paciente", sql.Int, ci_paciente)
      .query(`
        UPDATE Usuario
        SET    ci_paciente = @ci_paciente
        WHERE  id_usuario = @id_usuario;
      `);

    // Insertar/actualizar Paciente
    await pool
      .request()
      .input("ci_paciente", sql.Int, ci_paciente)
      .input("nombre_completo", sql.VarChar(120), nombre_completo)
      .input("correo", sql.VarChar(100), correo)
      .input("celular", sql.VarChar(20), celular)
      .input("fecha_nacimiento", sql.DateTime, fecha_nacimiento)
      .input("direccion", sql.VarChar(200), direccion)
      .input("sexo", sql.Bit, sexo)
      .input("id_tipo_sangre", sql.Int, id_tipo_sangre)
      .input("id_centro", sql.Int, id_centro || null)
      .query(`
        IF EXISTS (SELECT 1 FROM Paciente WHERE ci_paciente = @ci_paciente)
        BEGIN
          UPDATE Paciente
          SET    nombre_completo  = @nombre_completo,
                 correo           = @correo,
                 celular          = @celular,
                 fecha_nacimiento = @fecha_nacimiento,
                 direccion        = @direccion,
                 sexo             = @sexo,
                 id_tipo_sangre   = @id_tipo_sangre,
                 id_centro        = @id_centro
          WHERE  ci_paciente = @ci_paciente;
        END
        ELSE
        BEGIN
          INSERT INTO Paciente
            (ci_paciente, id_tipo_sangre, id_centro, correo,
             nombre_completo, celular, direccion, sexo, foto_perfil, fecha_nacimiento)
          VALUES
            (@ci_paciente, @id_tipo_sangre, @id_centro, @correo,
             @nombre_completo, @celular, @direccion, @sexo, NULL, @fecha_nacimiento);
        END
      `);

    return res.json({ mensaje: "Datos de paciente guardados correctamente." });
  } catch (err) {
    console.error("Error en PUT /pacientes/por-usuario:", err);
    return res.status(500).json({ mensaje: "Error en el servidor." });
  }
});

// ======================================================================

module.exports = router;
