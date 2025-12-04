// healthyu-api/index.js
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 4000;

// middlewares
app.use(cors());
app.use(express.json());

// servir frontend (carpeta public)
app.use(express.static(path.join(__dirname, "public")));

// rutas principales (auth + pacientes, etc.)
const apiRoutes = require("./routes/index");
// blog separado
const blogRoutes = require("./routes/blog");

app.use("/api", apiRoutes);        // /api/auth/..., /api/pacientes/...
app.use("/api/blog", blogRoutes);  // /api/blog/...

app.listen(PORT, () => {
  console.log(`HealthyU API escuchando en http://localhost:${PORT}`);
});
