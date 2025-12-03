// routes/pacientes.js - Datos personales del paciente

const express = require("express");
const router = express.Router();

const { sql, pool, poolConnect } = require("../db");

// OBTENER PACIENTE POR USUARIO
router.get("/por-usuario/:idUsuario", async (req, res) => {
  const idUsuario = parseInt(req.params.idUsuario, 10);

  if (isNaN(idUsuario)) {
    return res.status(400).json({ mensaje: "idUsuario no válido" });
  }

  try {
    await poolConnect;

    const resUsuario = await pool
      .request()
      .input("idUsuario", sql.Int, idUsuario)
      .query(
        "SELECT ci_paciente, estado FROM Usuario WHERE id_usuario = @idUsuario"
      );

    if (resUsuario.recordset.length === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    const usuario = resUsuario.recordset[0];

    if (usuario.estado === false || usuario.estado === 0) {
      return res
        .status(403)
        .json({ mensaje: "La cuenta está desactivada o eliminada" });
    }

    if (!usuario.ci_paciente) {
      return res
        .status(404)
        .json({ mensaje: "El usuario no tiene datos de paciente aún" });
    }

    const ciPaciente = usuario.ci_paciente;

    const resPaciente = await pool
      .request()
      .input("ciPaciente", sql.Int, ciPaciente)
      .query(`
        SELECT ci_paciente, correo, nombre_completo, celular,
               edad, direccion, sexo, fecha_nacimiento, id_tipo_sangre
        FROM Paciente
        WHERE ci_paciente = @ciPaciente
      `);

    if (resPaciente.recordset.length === 0) {
      return res
        .status(404)
        .json({ mensaje: "Paciente no encontrado para este usuario" });
    }

    const paciente = resPaciente.recordset[0];
    res.json({ paciente });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error obteniendo datos del paciente" });
  }
});

// GUARDAR / ACTUALIZAR PACIENTE POR USUARIO
router.put("/por-usuario/:idUsuario", async (req, res) => {
  const idUsuario = parseInt(req.params.idUsuario, 10);

  if (isNaN(idUsuario)) {
    return res.status(400).json({ mensaje: "idUsuario no válido" });
  }

  const {
    ci_paciente,
    nombre_completo,
    correo,
    celular,
    edad,
    fecha_nacimiento,
    direccion,
    sexo,
    id_tipo_sangre,
  } = req.body;

  if (
    !ci_paciente ||
    !nombre_completo ||
    !correo ||
    !celular ||
    !edad ||
    !fecha_nacimiento ||
    !direccion ||
    (sexo !== 0 && sexo !== 1 && sexo !== "0" && sexo !== "1")
  ) {
    return res.status(400).json({ mensaje: "Faltan datos obligatorios" });
  }

  const sexoBit = Number(sexo);
  const idTipo = id_tipo_sangre ? Number(id_tipo_sangre) : null;

  try {
    await poolConnect;

    const transaccion = new sql.Transaction(pool);
    await transaccion.begin();

    try {
      // Verificar usuario activo
      const reqUsuario = new sql.Request(transaccion);
      const resUsuario = await reqUsuario
        .input("idUsuario", sql.Int, idUsuario)
        .query(
          "SELECT id_usuario, estado FROM Usuario WHERE id_usuario = @idUsuario"
        );

      if (resUsuario.recordset.length === 0) {
        await transaccion.rollback();
        return res.status(404).json({ mensaje: "Usuario no encontrado" });
      }

      const usuario = resUsuario.recordset[0];
      if (usuario.estado === false || usuario.estado === 0) {
        await transaccion.rollback();
        return res
          .status(403)
          .json({ mensaje: "La cuenta está desactivada o eliminada" });
      }

      // ¿Existe paciente?
      const reqPaciente = new sql.Request(transaccion);
      const resPaciente = await reqPaciente
        .input("ciPaciente", sql.Int, ci_paciente)
        .query(
          "SELECT ci_paciente FROM Paciente WHERE ci_paciente = @ciPaciente"
        );

      if (resPaciente.recordset.length > 0) {
        // Actualizar
        const reqActualizar = new sql.Request(transaccion);
        await reqActualizar
          .input("ciPaciente", sql.Int, ci_paciente)
          .input("nombreCompleto", sql.VarChar, nombre_completo)
          .input("correo", sql.VarChar, correo)
          .input("celular", sql.VarChar, celular)
          .input("edad", sql.Int, edad)
          .input("fechaNac", sql.DateTime, fecha_nacimiento)
          .input("direccion", sql.VarChar, direccion)
          .input("sexo", sql.Bit, sexoBit)
          .input("idTipoSangre", sql.Int, idTipo)
          .query(`
            UPDATE Paciente
            SET nombre_completo = @nombreCompleto,
                correo = @correo,
                celular = @celular,
                edad = @edad,
                fecha_nacimiento = @fechaNac,
                direccion = @direccion,
                sexo = @sexo,
                id_tipo_sangre = @idTipoSangre
            WHERE ci_paciente = @ciPaciente
          `);
      } else {
        // Insertar
        const reqInsertar = new sql.Request(transaccion);
        await reqInsertar
          .input("ciPaciente", sql.Int, ci_paciente)
          .input("nombreCompleto", sql.VarChar, nombre_completo)
          .input("correo", sql.VarChar, correo)
          .input("celular", sql.VarChar, celular)
          .input("edad", sql.Int, edad)
          .input("fechaNac", sql.DateTime, fecha_nacimiento)
          .input("direccion", sql.VarChar, direccion)
          .input("sexo", sql.Bit, sexoBit)
          .input("idTipoSangre", sql.Int, idTipo)
          .query(`
            INSERT INTO Paciente (
              ci_paciente, id_tipo_sangre,
              correo, nombre_completo, celular,
              edad, direccion, sexo, fecha_nacimiento
            )
            VALUES (
              @ciPaciente, @idTipoSangre,
              @correo, @nombreCompleto, @celular,
              @edad, @direccion, @sexo, @fechaNac
            )
          `);
      }

      // Vincular paciente con usuario
      const reqVincular = new sql.Request(transaccion);
      await reqVincular
        .input("idUsuario", sql.Int, idUsuario)
        .input("ciPaciente", sql.Int, ci_paciente)
        .query(
          "UPDATE Usuario SET ci_paciente = @ciPaciente WHERE id_usuario = @idUsuario"
        );

      await transaccion.commit();
      res.json({ mensaje: "Datos de paciente guardados correctamente" });
    } catch (errorInterno) {
      await transaccion.rollback();
      console.error(errorInterno);
      res.status(500).json({ mensaje: "Error guardando datos de paciente" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error en la transacción de paciente" });
  }
});

module.exports = router;
