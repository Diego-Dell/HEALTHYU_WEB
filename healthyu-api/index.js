const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const apiRoutes = require("./routes/index");
const pacientesRoutes = require("./routes/pacientes");
const blogRoutes = require("./routes/blog");

// Rutas principales
app.use("/api", apiRoutes);           // -> /api/auth/login, /api/pacientes/datos, etc
app.use("/api/pacientes", pacientesRoutes);
app.use("/api/blog", blogRoutes);

app.listen(PORT, () => {
  console.log(`HealthyU API escuchando en http://localhost:${PORT}`);
});
