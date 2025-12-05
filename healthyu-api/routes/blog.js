// routes/blog.js
// Rutas del blog Healthy U (SQL Server)

const express = require("express");
const router = express.Router();

const { sql, pool, poolConnect } = require("../db");

// =========================
// GET /api/blog/listar
// Lista las publicaciones más recientes
// =========================
router.get("/listar", async (req, res) => {
  try {
    // Asegurar conexión
    await poolConnect;

    const request = pool.request();

    const result = await request.query(`
      SELECT TOP 50
          p.id_post,
          p.asunto,
          p.descripcion,
          ISNULL(pa.nombre_completo, u.nombre_usuario) AS autor,
          CONVERT(VARCHAR(10), pp.fecha, 103) AS fecha
      FROM post p
      LEFT JOIN pac_post pp      ON p.id_post = pp.id_post
      LEFT JOIN Paciente pa      ON pp.ci_paciente = pa.ci_paciente
      LEFT JOIN Usuario u        ON u.ci_paciente = pa.ci_paciente
      ORDER BY p.id_post DESC;
    `);

    return res.json({ posts: result.recordset || [] });
  } catch (err) {
    console.error("Error en GET /api/blog/listar:", err);
    return res
      .status(500)
      .json({ mensaje: "Error obteniendo publicaciones del blog." });
  }
});

// =========================
// POST /api/blog/crear
// Crea una nueva publicación
// Body esperado: { asunto, contenido, id_usuario }
// =========================
router.post("/crear", async (req, res) => {
  const { asunto, contenido, id_usuario } = req.body;

  if (!asunto || !contenido || !id_usuario) {
    return res
      .status(400)
      .json({ mensaje: "Faltan datos: asunto, contenido o id_usuario." });
  }

  try {
    await poolConnect;
    const request = pool.request();

    request.input("id_usuario", sql.Int, id_usuario);
    request.input("asunto", sql.VarChar(150), asunto);
    request.input("descripcion", sql.VarChar(500), contenido);

    const result = await request.query(`
      DECLARE @ci_paciente INT;
      DECLARE @id_post INT;

      -- Buscar paciente vinculado al usuario
      SELECT @ci_paciente = ci_paciente
      FROM Usuario
      WHERE id_usuario = @id_usuario AND estado = 1;

      IF @ci_paciente IS NULL
      BEGIN
          RAISERROR('El usuario no tiene paciente asociado.', 16, 1);
          RETURN;
      END;

      -- Crear post
      INSERT INTO post (asunto, descripcion)
      VALUES (@asunto, @descripcion);

      SET @id_post = SCOPE_IDENTITY();

      -- Vincular post con paciente
      INSERT INTO pac_post (ci_paciente, id_post, fecha)
      VALUES (@ci_paciente, @id_post, CONVERT(date, GETDATE()));

      SELECT @id_post AS id_post;
    `);

    const id_post = result.recordset?.[0]?.id_post || null;

    return res.json({
      mensaje: "Publicación creada correctamente.",
      id_post,
    });
  } catch (err) {
    console.error("Error en POST /api/blog/crear:", err);
    return res
      .status(500)
      .json({ mensaje: "Error creando la publicación del blog." });
  }
});

module.exports = router;
