const express = require("express");
const router = express.Router();

const { sql, poolConnect, pool } = require("../db");

// OBTENER POSTS
router.get("/", async (req, res) => {
    try {
        await poolConnect;

        const result = await pool.request()
            .query("SELECT * FROM Post ORDER BY id_post DESC");

        res.json(result.recordset);

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error cargando posts" });
    }
});

// CREAR POST
router.post("/", async (req, res) => {
    const { asunto, descripcion } = req.body;

    try {
        await poolConnect;

        const result = await pool.request()
            .input("asunto", sql.VarChar, asunto)
            .input("descripcion", sql.VarChar, descripcion)
            .query(`
                INSERT INTO Post (id_post, asunto, descripcion)
                VALUES ((SELECT ISNULL(MAX(id_post),0)+1 FROM Post), @asunto, @descripcion)
            `);

        res.json({ mensaje: "Post creado" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error creando post" });
    }
});

module.exports = router;
