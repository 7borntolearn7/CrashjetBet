const dataBase = require("mysql2/promise");

const sqlPromise = dataBase.createPool({
  host: "stage-db-1.cmhfjy9fvag5.ap-south-1.rds.amazonaws.com",
  user: "admin",
  password: "YNLx5TMezvpXZmS",
  database: "oscardb",
});

module.exports = { sqlPromise };
