const mysql = require("mysql2/promise");
const dbConfig = require("../Config/config");
const { fetchBalance } = require("../Utils/Utils");

let newBalance = null;
const rollbackBet = async (req, res) => {
  const {
    userId,
    token,
    operatorId,
    currency,
    amount,
    roundId,
    request_uuid,
    bet_id,
    bet_time,
    game_id,
    game_code,
    reference_request_uuid,
  } = req.body;

  try {
    // Create a MySQL connection
    const connection = await mysql.createConnection(dbConfig);

    // Start a transaction
    await connection.beginTransaction();

    try {
      // Check the latest record with the given bet_id
      const [betResult] = await connection.execute(
        "SELECT * FROM CrashjetBet WHERE Bet_Id = ? ORDER BY id desc",
        [bet_id]
      );

      if (betResult.length === 0) {
        return res
          .status(404)
          .json({ error: "Bet not found or already rolled back" });
      }

      // Check if the bet status is 'DEBIT' for placebet rollback
      if (betResult[0].Transaction_Type === "DEBIT") {
        // Credit the amount back to the user's account in clientInfo table
        const currentBalance = await fetchBalance(userId);
        newBalance = Number(currentBalance) + Number(amount);

        await connection.execute(
          "UPDATE clientInfo SET LimitCurr = ? WHERE token = ?",
          [newBalance, token]
        );

        // Update the bet status to 'ROLLBACK'
        await connection.execute(
          "UPDATE CrashjetBet SET BetStatus = 'ROLLBACK' WHERE Bet_Id = ? AND Transaction_Type = 'DEBIT'",
          [bet_id]
        );
      }

      // Check if the bet status is 'CREDIT' for getresult rollback
      if (betResult[0].Transaction_Type === "CREDIT") {
        // Reduce the credited amount from the user's account in clientInfo table
        const currentBalance = await fetchBalance(userId);
        newBalance = Number(currentBalance) - Number(amount);

        await connection.execute(
          "UPDATE clientInfo SET LimitCurr = ? WHERE token = ?",
          [newBalance, token]
        );

        // Update the bet status to 'OPEN' and transaction type to 'DEBIT'
        await connection.execute(
          "UPDATE CrashjetBet SET BetStatus = 'OPEN', Transaction_Type = 'DEBIT' WHERE Bet_Id = ? AND Transaction_Type = 'CREDIT'",
          [bet_id]
        );
      }

      // Commit the transaction
      await connection.commit();

      res.json({
        success: true,
        message: "Rollback successful",
        balance: newBalance,
      });
    } catch (error) {
      // Rollback the transaction in case of an error
      await connection.rollback();
      console.error("Error rolling back bet:", error);
      res.status(500).json({ error: "Internal Server Error" });
    } finally {
      // Close the connection when done
      connection.end();
    }
  } catch (error) {
    console.error("Error connecting to the database:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { rollbackBet };
