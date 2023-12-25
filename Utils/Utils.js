const mysql = require("mysql2/promise");
const dbConfig = require("../Config/config"); // Adjust the path accordingly

const fetchBalance = async (userId) => {
  let connection = null;

  try {
    // Create a MySQL connection
    connection = await mysql.createConnection(dbConfig);

    // Query the database to fetch the balance

    const [result] = await connection.execute(
      "SELECT LimitCurr FROM clientInfo WHERE id = ?",
      [userId]
    );

    // Return balance or null if user not found
    const balance = result.length > 0 ? result[0].LimitCurr : null;
    return balance;
  } catch (error) {
    console.error("Error fetching balance:", error);
    // Handle the error as needed, e.g., log it or throw an exception
    throw error;
  } finally {
    // Release the connection when done
    if (connection) {
      await connection.end();
    }
  }
};

module.exports = { fetchBalance };
