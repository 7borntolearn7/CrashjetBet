// Database connection configuration
const mysql = require("mysql2/promise");
let connection = null;
const dbConfig = {
  host: "stage-db-1.cmhfjy9fvag5.ap-south-1.rds.amazonaws.com",
  user: "admin",
  database: "oscardb",
  password: "YNLx5TMezvpXZmS",
};

const getBalance = async (req, res) => {
  const { userId, token } = req.body;

  try {
    // Create a MySQL connection
    connection = await mysql.createConnection(dbConfig);

    // Query the clientInfo table to fetch the current balance
    const [result] = await connection.execute(
      "SELECT LimitCurr FROM clientInfo WHERE id = ? AND token = ?",
      [userId, token]
    );

    // Check if the user with the given userId and token exists
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found or invalid credentials",
      });
    }

    // Return the balance in the response
    const balance = result[0].LimitCurr;
    console.log("Success");
    res.json({ success: true, balance, data: result });
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  } finally {
    // Release the connection when done
    if (connection) {
      await connection.end();
    }
  }
};

module.exports = { getBalance };
