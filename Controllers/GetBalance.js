const { fetchBalance } = require("../Utils/Utils");

let connection = null;

const getBalance = async (req, res) => {
  const { userId } = req.body;

  try {
    // Use the fetchBalance function to get the balance
    const balance = await fetchBalance(userId);

    if (balance === null) {
      return res.status(404).json({
        success: false,
        error: "User not found or invalid credentials",
        message: "RS_ERR",
      });
    }

    console.log("Success");
    res.json({ success: true, balance: balance, message: "RS_OK" });
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
