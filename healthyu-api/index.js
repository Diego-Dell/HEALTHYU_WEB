// index.js - API HealthyU

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Rutas
const rutasAuth = require("./routes/auth");
const rutasBlog = require("./routes/blog");
const rutasPacientes = require("./routes/pacientes");

app.use("/api/auth", rutasAuth);
app.use("/api/blog", rutasBlog);
app.use("/api/pacientes", rutasPacientes);

app.get("/", (req, res) => {
  res.json({ mensaje: "API HealthyU funcionando correctamente" });
});

const PUERTO = process.env.PORT || 4000;

app.listen(PUERTO, () => {
  console.log(`API HealthyU escuchando en el puerto ${PUERTO}`);
});
