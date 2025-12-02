const sql = require("mssql");

const config = {
    user: "sa",
    password: "Passw0rd!",
    server: "159.203.102.189", 
    database: "HealthyU",
    port: 1433,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

module.exports = {
    sql,
    poolConnect,
    pool
};
