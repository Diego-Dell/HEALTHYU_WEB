// routes/index.js
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { sql, poolPromise } = require("../db");


// =============== util hash ===============
function hashPassword(pass) {
  return Buffer.from(
    crypto.createHash("sha256").update(pass).digest("hex"),
    "hex"
  );
}

// ===================================================
//  POST /auth/register → crea Usuario con id aleatorio
// ===================================================
router.post("/auth/register", async (req, res) => {
  try {
    const { nombre_usuario, contrasena } = req.body;

    if (!nombre_usuario || !contrasena) {
      return res.status(400).json({ mensaje: "Faltan datos." });
    }

    const pool = await poolPromise;

    // 1) ¿El usuario existe?
    const existe = await pool
      .request()
      .input("u", sql.VarChar(50), nombre_usuario)
      .query("SELECT 1 FROM Usuario WHERE nombre_usuario = @u");

    if (existe.recordset.length > 0) {
      return res.status(400).json({ mensaje: "El usuario ya existe." });
    }

    // 2) generar id_usuario aleatorio (555xxxxx)
    let id_usuario;
    let existeId = true;

    while (existeId) {
      // número aleatorio entre 55500000 y 55599999
      id_usuario = 55500000 + Math.floor(Math.random() * 100000);

      const check = await pool
        .request()
        .input("id", sql.Int, id_usuario)
        .query("SELECT 1 FROM Usuario WHERE id_usuario = @id");

      existeId = check.recordset.length > 0;
    }

    // 3) hash de contraseña
    const hash = hashPassword(contrasena);

    // 4) insert usuario
    await pool
      .request()
      .input("id_usuario", sql.Int, id_usuario)
      .input("nombre_usuario", sql.VarChar(50), nombre_usuario)
      .input("hash", sql.VarBinary, hash)
      .query(`
        INSERT INTO Usuario (id_usuario, ci_paciente, nombre_usuario, contrasena_hash, estado)
        VALUES (@id_usuario, NULL, @nombre_usuario, @hash, 1)
      `);

    return res.json({
      mensaje: "Usuario registrado correctamente.",
      id_usuario_generado: id_usuario,
    });
  } catch (err) {
    console.error("Error en /auth/register:", err);
    return res.status(500).json({ mensaje: "Error en el servidor." });
  }
});



// ===================================================
//  POST /auth/login  → Validar credenciales
// ===================================================
router.post("/auth/login", async (req, res) => {
  try {
    const { nombre_usuario, contrasena } = req.body;

    if (!nombre_usuario || !contrasena) {
      return res
        .status(400)
        .json({ mensaje: "Datos incompletos para login." });
    }

    const pool = await poolPromise;
    const hash = hashPassword(contrasena);

    const result = await pool
      .request()
      .input("u", sql.VarChar(50), nombre_usuario)
      .input("h", sql.VarBinary, hash)
      .query(`
        SELECT id_usuario, ci_paciente, nombre_usuario
        FROM Usuario
        WHERE nombre_usuario = @u AND contrasena_hash = @h AND estado = 1
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({ mensaje: "Credenciales incorrectas." });
    }

    return res.json({ usuario: result.recordset[0] });
  } catch (err) {
    console.error("Error en /auth/login:", err);
    return res.status(500).json({ mensaje: "Error en el servidor." });
  }
});

// ===================================================
// GET /pacientes/datos/:usuario → Usuario + Paciente
// ===================================================
router.get("/pacientes/datos/:usuario", async (req, res) => {
  try {
    const nombre = req.params.usuario;
    const pool = await poolPromise;

    const usuario = await pool
      .request()
      .input("u", sql.VarChar(50), nombre)
      .query(`
        SELECT id_usuario, ci_paciente, nombre_usuario, estado
        FROM Usuario
        WHERE nombre_usuario = @u
      `);

    if (usuario.recordset.length === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }

    const datosUsuario = usuario.recordset[0];
    const ci = datosUsuario.ci_paciente;

    let paciente = null;

    if (ci !== null && ci !== undefined) {
      const pacRes = await pool
        .request()
        .input("ci", sql.Int, ci)
        .query(`SELECT * FROM Paciente WHERE ci_paciente = @ci`);

      const row = pacRes.recordset[0];
      if (row) {
        paciente = {
          ...row,
          // foto_perfil viene como Buffer → la convertimos a base64
          foto_perfil: row.foto_perfil
            ? Buffer.from(row.foto_perfil).toString("base64")
            : null,
        };
      }
    }

    return res.json({
      usuario: datosUsuario,
      paciente,
    });
  } catch (err) {
    console.error("Error en GET /pacientes/datos:", err);
    return res.status(500).json({ mensaje: "Error en el servidor." });
  }
});






router.put("/pacientes/por-usuario/:usuario", async (req, res) => {
  try {
    const nombreUsuario = req.params.usuario;
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
        foto_perfil, 
        } = req.body || {};


    const pool = await poolPromise;

    // buscamos id_usuario del nombre de usuario
    const u = await pool
      .request()
      .input("u", sql.VarChar(50), nombreUsuario)
      .query(`
        SELECT id_usuario, ci_paciente
        FROM Usuario
        WHERE nombre_usuario = @u
      `);

    if (u.recordset.length === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }

    const id_usuario = u.recordset[0].id_usuario;

    // parseos básicos
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
        : Number(sexo); // 0 / 1

    let fechaNacDate = null;
    if (fecha_nacimiento && String(fecha_nacimiento).trim() !== "") {
      // 'YYYY-MM-DD' la dejamos tal cual, mssql la acepta
      fechaNacDate = fecha_nacimiento;
    }


            let fotoBuffer = null;
        if (foto_perfil && typeof foto_perfil === "string" && foto_perfil.trim() !== "") {
        try {
            fotoBuffer = Buffer.from(foto_perfil, "base64");
        } catch (e) {
            fotoBuffer = null;
        }
}


    const request = pool.request();

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

    await request.query(`
      DECLARE @ci_final INT;

      -- si viene CI, usamos ese; sino generamos uno nuevo
      IF @ci_paciente IS NOT NULL
      BEGIN
          SET @ci_final = @ci_paciente;
      END
      ELSE
      BEGIN
          SELECT @ci_final = ISNULL(MAX(ci_paciente), 0) + 1
          FROM Paciente;
      END

      -- si existe paciente -> UPDATE, si no -> INSERT
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
              foto_perfil,
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
              NULL,
              @fecha_nacimiento
          );
      END

      -- enlazar Usuario → Paciente
      UPDATE Usuario
      SET ci_paciente = @ci_final
      WHERE id_usuario = @id_usuario;
    `);

    return res.json({ mensaje: "Datos de paciente guardados correctamente." });
  } catch (err) {
    console.error("Error en PUT /pacientes/por-usuario:", err);
    return res.status(500).json({ mensaje: "Error en el servidor." });
  }
});

// ===================================================
// PUT /pacientes/password  → Cambiar contraseña
// ===================================================
router.put("/pacientes/password", async (req, res) => {
  try {
    const { nombre_usuario, actual, nueva } = req.body;

    if (!nombre_usuario || !actual || !nueva) {
      return res.status(400).json({ mensaje: "Faltan datos." });
    }

    const pool = await poolPromise;
    const hashActual = hashPassword(actual);

    const user = await pool
      .request()
      .input("u", sql.VarChar(50), nombre_usuario)
      .input("h", sql.VarBinary, hashActual)
      .query(`
        SELECT id_usuario
        FROM Usuario
        WHERE nombre_usuario = @u AND contrasena_hash = @h
      `);

    if (user.recordset.length === 0) {
      return res.status(401).json({ mensaje: "Contraseña actual incorrecta." });
    }

    const hashNueva = hashPassword(nueva);

    await pool
      .request()
      .input("u", sql.VarChar(50), nombre_usuario)
      .input("h", sql.VarBinary, hashNueva)
      .query(`
        UPDATE Usuario
        SET contrasena_hash = @h
        WHERE nombre_usuario = @u
      `);

    return res.json({ mensaje: "Contraseña actualizada correctamente." });
  } catch (err) {
    console.error("Error en PUT /pacientes/password:", err);
    return res.status(500).json({ mensaje: "Error en el servidor." });
  }
});

module.exports = router;
