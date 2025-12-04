// healthyu-api/routes/auth.js
const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("./db");

// ============ LOGIN ============
// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { nombre_usuario, contrasena } = req.body || {};

  if (!nombre_usuario || !contrasena) {
    return res
      .status(400)
      .json({ mensaje: "Faltan datos: nombre_usuario y/o contrasena." });
  }

  try {
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("nombre_usuario", sql.VarChar(50), nombre_usuario)
      .input("contrasena", sql.VarChar(50), contrasena)
      .query(`
        SELECT id_usuario, ci_paciente, nombre_usuario, estado
        FROM Usuario
        WHERE nombre_usuario = @nombre_usuario
          AND contrasena_hash = HASHBYTES('SHA2_256', @contrasena)
      `);

    if (!result.recordset.length) {
      return res
        .status(401)
        .json({ mensaje: "Usuario o contraseña incorrectos." });
    }

    const usuario = result.recordset[0];
    return res.json({ usuario });
  } catch (err) {
    console.error("Error en POST /auth/login:", err);
    return res.status(500).json({ mensaje: "Error en el servidor." });
  }
});

// ============ REGISTER ============
// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { nombre_usuario, contrasena } = req.body || {};

  if (!nombre_usuario || !contrasena) {
    return res
      .status(400)
      .json({ mensaje: "Faltan datos: nombre_usuario y/o contrasena." });
  }

  try {
    const pool = await poolPromise;

    // 1) Verificar que el usuario NO exista
    const existe = await pool
      .request()
      .input("nombre_usuario", sql.VarChar(50), nombre_usuario)
      .query(
        "SELECT 1 AS existe FROM Usuario WHERE nombre_usuario = @nombre_usuario"
      );

    if (existe.recordset.length) {
      return res
        .status(409)
        .json({ mensaje: "El nombre de usuario ya está en uso." });
    }

    // 2) Generar nuevo id_usuario
    const rsId = await pool
      .request()
      .query("SELECT ISNULL(MAX(id_usuario), 0) + 1 AS nuevoId FROM Usuario");
    const nuevoId = rsId.recordset[0].nuevoId;

    // 3) Generar nuevo ci_paciente básico
    const rsCi = await pool
      .request()
      .query(
        "SELECT ISNULL(MAX(ci_paciente), 0) + 1 AS nuevoCi FROM Paciente"
      );
    const nuevoCi = rsCi.recordset[0].nuevoCi;

    // 4) Crear Paciente básico (como tu app de escritorio)
    await pool
      .request()
      .input("ci_paciente", sql.Int, nuevoCi)
      .input("correo", sql.VarChar(100), `${nombre_usuario}@temp.com`)
      .input("nombre_completo", sql.VarChar(120), nombre_usuario)
      .query(`
        INSERT INTO Paciente
          (ci_paciente, id_tipo_sangre, id_centro, correo,
           nombre_completo, celular, direccion, sexo, foto_perfil, fecha_nacimiento)
        VALUES
          (@ci_paciente, 1, NULL, @correo,
           @nombre_completo, NULL, NULL, NULL, NULL, GETDATE());
      `);

    // 5) Insertar usuario con HASHBYTES (igual que en SQL / app)
    await pool
      .request()
      .input("id_usuario", sql.Int, nuevoId)
      .input("ci_paciente", sql.Int, nuevoCi)
      .input("nombre_usuario", sql.VarChar(50), nombre_usuario)
      .input("contrasena", sql.VarChar(50), contrasena)
      .query(`
        INSERT INTO Usuario (id_usuario, ci_paciente, nombre_usuario, contrasena_hash, estado)
        VALUES (
          @id_usuario,
          @ci_paciente,
          @nombre_usuario,
          HASHBYTES('SHA2_256', @contrasena),
          1
        );
      `);

    // 6) Devolver el usuario creado (mismo formato que login)
    return res.status(201).json({
      usuario: {
        id_usuario: nuevoId,
        ci_paciente: nuevoCi,
        nombre_usuario,
        estado: 1,
      },
    });
  } catch (err) {
    console.error("Error en POST /auth/register:", err);
    return res.status(500).json({ mensaje: "Error en el servidor." });
  }
});

module.exports = router;
