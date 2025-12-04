// routes/blog.js - Rutas de Blog
const express = require("express");
const router = express.Router();

const { sql, pool, poolConnect } = require("../db"); // <-- ../db


// =============================
//     OBTENER POSTS
// =============================
router.get("/", async (req, res) => {
    try {
        await poolConnect;

        const result = await pool.request()
            .query(`
                SELECT id_post, asunto, descripcion
                FROM Post
                ORDER BY id_post DESC
            `);

        res.json(result.recordset);

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error obteniendo posts" });
    }
});

// =============================
//     CREAR NUEVO POST
// =============================
router.post("/", async (req, res) => {
    const { asunto, descripcion } = req.body;

    if (!asunto || !descripcion)
        return res.status(400).json({ mensaje: "Faltan datos" });

    try {
        await poolConnect;

        await pool.request()
            .input("asunto", sql.VarChar, asunto)
            .input("descripcion", sql.VarChar, descripcion)
            .query(`
                INSERT INTO Post (id_post, asunto, descripcion)
                VALUES ((SELECT ISNULL(MAX(id_post),0)+1 FROM Post),
                @asunto, @descripcion)
            `);

        res.json({ mensaje: "Post creado correctamente" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error creando post" });
    }
});

module.exports = router;
