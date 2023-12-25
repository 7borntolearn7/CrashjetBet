const mysql = require("mysql2/promise");
const dbConfig = require("../Config/config");
const { fetchBalance } = require("../Utils/Utils"); // Adjust the path accordingly

let newBalance = null;

const getResult = async (req, res) => {
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
  } = req.body;

  try {
    // Fetch the current balance from clientInfo using the fetchBalance function
    let currentBalance = await fetchBalance(userId);
    currentBalance = Number(currentBalance);

    if (currentBalance === null) {
      return res.status(404).json({ error: "User not found" });
    }

    // Calculate the new balance as the sum of the current balance and the amount
    newBalance = currentBalance + Number(amount);

    console.log(currentBalance);
    console.log(amount);
    console.log(newBalance);

    // Create a MySQL connection
    const connection = await mysql.createConnection(dbConfig);

    // Start a transaction
    await connection.beginTransaction();

    try {
      // Check if the bet with the given bet_id exists
      const [betResult] = await connection.execute(
        "SELECT * FROM CrashjetBet WHERE Bet_Id = ?",
        [bet_id]
      );

      if (betResult.length === 0) {
        return res
          .status(404)
          .json({ error: "Bet not found or already settled" });
      }

      // Check if the bet status is 'OPEN' and the transaction type is 'DEBIT'
      if (
        betResult[0].BetStatus !== "OPEN" ||
        betResult[0].Transaction_Type !== "DEBIT"
      ) {
        return res
          .status(400)
          .json({ error: "Invalid bet status or transaction type" });
      }

      // If the amount is greater than zero, update the clientInfo table
      if (amount > 0) {
        await connection.execute(
          "UPDATE clientInfo SET LimitCurr = ? WHERE token = ?",
          [newBalance, token]
        );
      }

      // Update the bet record in the Crashbet table with BetStatus as 'CLOSED'
      await connection.execute(
        "UPDATE CrashjetBet SET BetStatus = 'CLOSED' WHERE Bet_Id = ?",
        [bet_id]
      );

      // Insert a new record into the Crashbet table for the same bet_id
      await connection.execute(
        "INSERT INTO CrashjetBet (BetStatus, Sport, ClientId, updated_on, updated_by, User_Id, token, Amount, roundId, Operator_Id, Currency, Request_UUID, Bet_Id, Bet_Time, GameId, GameCode, Transaction_Type) VALUES ('CLOSED', DEFAULT, 0, DEFAULT, DEFAULT, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CREDIT')",
        [
          userId,
          token,
          amount,
          roundId,
          operatorId,
          currency,
          request_uuid,
          bet_id,
          bet_time,
          game_id,
          game_code,
        ]
      );

      // Commit the transaction
      await connection.commit();

      res.json({ success: true, balance: newBalance, message: "RS_OK" });
    } catch (error) {
      // Rollback the transaction in case of an error
      await connection.rollback();
      console.error("Error updating result:", error);
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

module.exports = { getResult };
