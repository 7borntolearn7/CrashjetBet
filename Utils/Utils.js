const { sqlPromise } = require("../Config/config");

const fetchBalance = async (userId, token) => {
  try {
    const result = await sqlPromise.query(
      "SELECT LimitCurr FROM clientInfo WHERE id = ? AND token = ?",
      [userId, token]
    );

    console.log(result);

    console.log("This query executed successfully");

    const balance = result.length > 0 ? result[0][0].LimitCurr : null;
    console.log(balance);
    return balance;
  } catch (error) {
    console.error("Error fetching balance:", error);
    throw error;
  }
};

module.exports = { fetchBalance };
