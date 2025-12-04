// healthyu-api/index.js
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 4000;

// Middlewares básicos
app.use(cors());
app.use(express.json());

// Servir tu frontend (carpeta public)
app.use(express.static(path.join(__dirname, "public")));

// ========= RUTAS API =========
// Rutas generales que ya tenías (pacientes, blog, etc.)
const apiRoutes = require("./routes/index");

// Rutas de autenticación (login / register) NUEVAS
const authRoutes = require("./routes/auth");

// /api/...  (pacientes, blog, etc.)
app.use("/api", apiRoutes);

// /api/auth/... (login, register)
app.use("/api/auth", authRoutes);

// ========= INICIAR SERVIDOR =========
app.listen(PORT, () => {
  console.log(`HealthyU API escuchando en http://localhost:${PORT}`);
});
