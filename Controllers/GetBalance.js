const { fetchBalance } = require("../Utils/Utils");

const getBalance = async (req, res) => {
  const { userId, token } = req.body;
  console.log(userId);
  console.log(token);

  if (!userId || !token) {
    return res.status(400).json({
      balance: 0,
      status: "RS_ERROR",
      message: "Bad Request",
    });
  }

  try {
    // Use the fetchBalance function to get the balance
    const balance = await fetchBalance(userId, token);
    console.log(balance);

    if (balance === null) {
      return res.status(404).json({
        status: "RS_ERROR",
        message: "User not found or invalid credentials",
      });
    }

    console.log("Success");
    res.json({ balance: balance, status: "RS_OK" });
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).json({
      balance: 0,
      status: "RS_ERROR",
      message: "Internal Server Error",
    });
  }
};

module.exports = { getBalance };
