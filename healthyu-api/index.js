// index.js
const express = require("express");
const cors = require("cors");
const app = express();

// ====== Rutas ======
const authRoutes = require("./routes/auth");
const blogRoutes = require("./routes/blog");

// ====== Middlewares ======
app.use(cors());
app.use(express.json());

// ====== Rutas base ======
app.use("/api/auth", authRoutes);   // 👈 IMPORTANTE
app.use("/api/blog", blogRoutes);   // esto ya te funciona

// Ruta simple para comprobar que la API vive
app.get("/", (req, res) => {
  res.json({ mensaje: "API HealthyU OK" });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`✅ API HealthyU escuchando en el puerto ${PORT}`);
});
