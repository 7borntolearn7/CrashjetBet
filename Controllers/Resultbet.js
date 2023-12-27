const mysql = require("mysql2/promise");
const dbConfig = require("../Config/config");
const { fetchBalance } = require("../Utils/Utils");
let newBalance = null;

const resultbet = async (req, res) => {
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

  const requiredAttributes = [
    "userId",
    "token",
    "operatorId",
    "currency",
    "amount",
    "roundId",
    "request_uuid",
    "bet_id",
    "bet_time",
    "game_id",
    "game_code",
    "reference_request_uuid",
  ];

  const missingAttributes = requiredAttributes.filter(
    (attr) => !req.body[attr]
  );

  if (missingAttributes.length > 0) {
    return res.status(400).json({
      success: false,
      error: "Bad Request",
      missed: `Missing required attributes: ${missingAttributes.join(", ")}`,
      message: "RS_ERR",
      balance: 0,
    });
  }

  try {
    // Fetch the current balance from clientInfo using the fetchBalance function
    let currentBalance = await fetchBalance(userId, token);
    currentBalance = Number(currentBalance);

    if (currentBalance === null) {
      return res
        .status(404)
        .json({ error: "User not found", message: "RS_ERR", balance: 0 });
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
        return res.status(404).json({
          error: "Bet not found or already settled",
          message: "RS_ERR",
          balance: 0,
        });
      }

      // Check if the bet status is 'OPEN' and the transaction type is 'DEBIT'
      if (
        betResult[0].BetStatus !== "OPEN" ||
        betResult[0].Transaction_Type !== "DEBIT"
      ) {
        return res.status(400).json({
          error:
            "Invalid bet status or transaction type or You might be hitting request for the same bet id twice",
          message: "RS_ERR",
          balance: 0,
        });
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
        "INSERT INTO CrashjetBet (BetStatus, Sport, ClientId, updated_on, updated_by, User_Id, token, Amount, roundId, Operator_Id, Currency, Request_UUID, Bet_Id, Bet_Time, GameId, GameCode, Transaction_Type,reference_request_uuid) VALUES ('CLOSED', DEFAULT, 0, DEFAULT, DEFAULT, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CREDIT',?)",
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
          reference_request_uuid,
        ]
      );

      // Commit the transaction
      await connection.commit();

      res.json({ success: true, balance: newBalance, message: "RS_OK" });
    } catch (error) {
      // Rollback the transaction in case of an error
      await connection.rollback();
      console.error("Error updating result:", error);
      res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "RS_ERR",
        balance: 0,
      });
    } finally {
      // Close the connection when done
      connection.end();
    }
  } catch (error) {
    console.error("Error connecting to the database:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: "RS_ERR",
      balance: 0,
    });
  }
};

module.exports = { resultbet };
