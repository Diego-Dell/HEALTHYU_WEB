// routes/auth.js - Autenticación de usuarios

const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { sql, pool, poolConnect } = require("../db");

const SECRETO_JWT = "CAMBIA_ESTE_SECRETO";

// REGISTRO
router.post("/registro", async (req, res) => {
  const { nombre_usuario, contrasena } = req.body;

  if (!nombre_usuario || !contrasena) {
    return res.status(400).json({ mensaje: "Faltan datos" });
  }

  try {
    await poolConnect;

    const existe = await pool
      .request()
      .input("nombre", sql.VarChar, nombre_usuario)
      .query("SELECT id_usuario FROM Usuario WHERE nombre_usuario = @nombre");

    if (existe.recordset.length > 0) {
      return res.status(400).json({ mensaje: "El usuario ya existe" });
    }

    const hashTexto = await bcrypt.hash(contrasena, 10);

    await pool
      .request()
      .input("nombre", sql.VarChar, nombre_usuario)
      .input("hash", sql.VarBinary, Buffer.from(hashTexto))
      .input("estado", sql.Bit, 1)
      .query(`
        INSERT INTO Usuario (id_usuario, nombre_usuario, contrasena_hash, estado)
        VALUES (
          (SELECT ISNULL(MAX(id_usuario), 0) + 1 FROM Usuario),
          @nombre,
          @hash,
          @estado
        )
      `);

    res.json({ mensaje: "Usuario registrado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error en el registro" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const { nombre_usuario, contrasena } = req.body;

  if (!nombre_usuario || !contrasena) {
    return res.status(400).json({ mensaje: "Faltan datos" });
  }

  try {
    await poolConnect;

    const resultado = await pool
      .request()
      .input("nombre", sql.VarChar, nombre_usuario)
      .query("SELECT * FROM Usuario WHERE nombre_usuario = @nombre");

    if (resultado.recordset.length === 0) {
      return res.status(401).json({ mensaje: "Usuario no encontrado" });
    }

    const usuarioBD = resultado.recordset[0];

    if (usuarioBD.estado === false || usuarioBD.estado === 0) {
      return res
        .status(403)
        .json({ mensaje: "La cuenta está desactivada o eliminada" });
    }

    if (!usuarioBD.contrasena_hash) {
      return res
        .status(403)
        .json({ mensaje: "La cuenta no tiene contraseña válida" });
    }

    const hashGuardado = Buffer.from(usuarioBD.contrasena_hash).toString();
    const coincide = await bcrypt.compare(contrasena, hashGuardado);

    if (!coincide) {
      return res.status(401).json({ mensaje: "Contraseña incorrecta" });
    }

    const token = jwt.sign(
      {
        id_usuario: usuarioBD.id_usuario,
        nombre_usuario: usuarioBD.nombre_usuario,
      },
      SECRETO_JWT,
      { expiresIn: "8h" }
    );

    res.json({
      mensaje: "Login correcto",
      token,
      usuario: {
        id_usuario: usuarioBD.id_usuario,
        nombre_usuario: usuarioBD.nombre_usuario,
        estado: usuarioBD.estado,
        ci_paciente: usuarioBD.ci_paciente ?? null,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error en login" });
  }
});

// CAMBIAR CONTRASEÑA
router.post("/cambiar-password", async (req, res) => {
  const { id_usuario, contrasenaActual, contrasenaNueva } = req.body;

  if (!id_usuario || !contrasenaActual || !contrasenaNueva) {
    return res.status(400).json({ mensaje: "Faltan datos" });
  }

  try {
    await poolConnect;

    const resultado = await pool
      .request()
      .input("idUsuario", sql.Int, id_usuario)
      .query(
        "SELECT contrasena_hash, estado FROM Usuario WHERE id_usuario = @idUsuario"
      );

    if (resultado.recordset.length === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    const usuarioBD = resultado.recordset[0];

    if (usuarioBD.estado === false || usuarioBD.estado === 0) {
      return res
        .status(403)
        .json({ mensaje: "La cuenta está desactivada o eliminada" });
    }

    if (!usuarioBD.contrasena_hash) {
      return res
        .status(403)
        .json({ mensaje: "La cuenta no tiene contraseña válida" });
    }

    const hashGuardado = Buffer.from(usuarioBD.contrasena_hash).toString();
    const coincide = await bcrypt.compare(contrasenaActual, hashGuardado);

    if (!coincide) {
      return res
        .status(401)
        .json({ mensaje: "La contraseña actual no es correcta" });
    }

    const nuevoHashTexto = await bcrypt.hash(contrasenaNueva, 10);

    await pool
      .request()
      .input("idUsuario", sql.Int, id_usuario)
      .input("hashNuevo", sql.VarBinary, Buffer.from(nuevoHashTexto))
      .query(
        "UPDATE Usuario SET contrasena_hash = @hashNuevo WHERE id_usuario = @idUsuario"
      );

    res.json({ mensaje: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al cambiar la contraseña" });
  }
});

// ELIMINAR CUENTA (desactivar usuario)
router.delete("/eliminar-cuenta/:idUsuario", async (req, res) => {
  const idUsuario = parseInt(req.params.idUsuario, 10);

  if (isNaN(idUsuario)) {
    return res.status(400).json({ mensaje: "idUsuario no válido" });
  }

  try {
    await poolConnect;

    const existe = await pool
      .request()
      .input("idUsuario", sql.Int, idUsuario)
      .query("SELECT id_usuario FROM Usuario WHERE id_usuario = @idUsuario");

    if (existe.recordset.length === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    await pool
      .request()
      .input("idUsuario", sql.Int, idUsuario)
      .query(`
        UPDATE Usuario
        SET estado = 0,
            contrasena_hash = NULL,
            ci_paciente = NULL
        WHERE id_usuario = @idUsuario
      `);

    res.json({ mensaje: "Cuenta eliminada correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al eliminar la cuenta" });
  }
});

module.exports = router;
