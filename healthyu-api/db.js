const sql = require("mssql");

const config = {
  user: "sa",
  password: "Passw0rd!",
  server: "159.203.102.189",
  database: "HealthyU",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then((pool) => {
    console.log("Conectado a SQL Server HealthyU");
    return pool;
  })
  .catch((err) => {
    console.error("Error al conectar a SQL:", err);
  });

module.exports = {
  sql,
  poolPromise,
};
