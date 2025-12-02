
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { sql, poolConnect, pool } = require("../db");

const JWT_SECRET = "CLAVE_SECRETA_CAMBIAR";

// LOGIN
router.post("/login", async (req, res) => {
    const { nombre_usuario, contrasena } = req.body;

    if (!nombre_usuario || !contrasena)
        return res.status(400).json({ mensaje: "Faltan datos" });

    try {
        await poolConnect;

        const result = await pool.request()
            .input("nombre", sql.VarChar, nombre_usuario)
            .query("SELECT * FROM Usuario WHERE nombre_usuario = @nombre");

        if (result.recordset.length === 0)
            return res.status(401).json({ mensaje: "No existe el usuario" });

        const usuario = result.recordset[0];
        const hash = usuario.contrasena_hash;

        const ok = await bcrypt.compare(contrasena, Buffer.from(hash).toString());
        if (!ok)
            return res.status(401).json({ mensaje: "Contraseña incorrecta" });

        const token = jwt.sign(
            { id: usuario.id_usuario, nombre_usuario },
            JWT_SECRET,
            { expiresIn: "8h" }
        );

        res.json({
            mensaje: "OK",
            token,
            usuario: {
                id: usuario.id_usuario,
                nombre_usuario
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error del servidor" });
    }
});

// REGISTRO
router.post("/registrar", async (req, res) => {
    const { nombre_usuario, contrasena } = req.body;

    try {
        await poolConnect;

        const existe = await pool.request()
            .input("nombre", sql.VarChar, nombre_usuario)
            .query("SELECT id_usuario FROM Usuario WHERE nombre_usuario = @nombre");

        if (existe.recordset.length > 0)
            return res.status(400).json({ mensaje: "Usuario ya existe" });

        const hash = await bcrypt.hash(contrasena, 10);

        const result = await pool.request()
            .input("nombre", sql.VarChar, nombre_usuario)
            .input("hash", sql.VarBinary, Buffer.from(hash))
            .input("estado", sql.Bit, 1)
            .query(`
                INSERT INTO Usuario (id_usuario, nombre_usuario, contrasena_hash, estado)
                VALUES (
                    (SELECT ISNULL(MAX(id_usuario),0)+1 FROM Usuario),
                    @nombre,
                    @hash,
                    @estado
                )
            `);

        res.json({ mensaje: "Usuario registrado" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error en registro" });
    }
});

module.exports = router;
