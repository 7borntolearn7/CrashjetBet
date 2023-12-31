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
    roundId,
    request_uuid,
    bet_id,
    bet_time,
    game_id,
    game_code,
    reference_request_uuid,
    rollbackType,
    rollbackReason,
  } = req.body;

  const requiredAttributes = [
    "userId",
    "token",
    "operatorId",
    "currency",
    "roundId",
    "request_uuid",
    "bet_id",
    "bet_time",
    "game_id",
    "game_code",
    "reference_request_uuid",
    "rollbackType",
    "rollbackReason",
  ];

  const missingAttributes = requiredAttributes.filter(
    (attr) => !req.body[attr]
  );

  if (missingAttributes.length > 0) {
    return res.status(400).json({
      balance: 0,
      status: "RS_ERROR",
      message: "Bad Request",
      missed: `Missing required attributes: ${missingAttributes.join(", ")}`,
    });
  }

  try {
    // Create a MySQL connection
    const connection = await mysql.createConnection(dbConfig);

    // Start a transaction
    await connection.beginTransaction();

    try {
      // Check the latest record with the given bet_id
      const [betResult] = await connection.execute(
        "SELECT * FROM CrashjetBet WHERE Bet_Id = ? ORDER BY id DESC LIMIT 1",
        [bet_id]
      );

      if (betResult.length === 0) {
        return res.status(404).json({
          balance: 0,
          status: "RS_ERROR",
          message: "Bet not found or already rolled back",
        });
      }

      const originalDeductedAmount = betResult[0].Amount;

      // Credit the original deducted amount back to the user's account in clientInfo table
      const currentBalance = await fetchBalance(userId, token);
      newBalance = Number(currentBalance) + Number(originalDeductedAmount);

      await connection.execute(
        "UPDATE clientInfo SET LimitCurr = ? WHERE token = ?",
        [newBalance, token]
      );

      // Update the current bet record with BetStatus 'CLOSED'
      await connection.execute(
        "UPDATE CrashjetBet SET BetStatus = 'CLOSED' WHERE Bet_Id = ?",
        [bet_id]
      );

      // Insert a new record for rollback with additional fields
      await connection.execute(
        "INSERT INTO CrashjetBet (BetStatus, Sport, ClientId, updated_on, updated_by, User_Id, token, Amount, roundId, Operator_Id, Currency, Request_UUID, Bet_Id, Bet_Time, GameId, GameCode, Transaction_Type, reference_request_uuid, RollbackType, RollbackReason) VALUES ('ROLLBACK', DEFAULT, 0, DEFAULT, DEFAULT, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CREDIT',?,?,?)",
        [
          userId,
          token,
          originalDeductedAmount,
          roundId,
          operatorId,
          currency,
          request_uuid,
          bet_id,
          bet_time,
          game_id,
          game_code,
          reference_request_uuid,
          rollbackType,
          rollbackReason,
        ]
      );

      // Commit the transaction
      await connection.commit();

      res.json({
        balance: newBalance,
        status: "RS_OK",
      });
    } catch (error) {
      // Rollback the transaction in case of an error
      await connection.rollback();
      console.error("Error rolling back bet:", error);
      res.status(500).json({
        balance: 0,
        status: "RS_ERROR",
        message: "Internal Server Error",
      });
    } finally {
      // Close the connection when done
      connection.end();
    }
  } catch (error) {
    console.error("Error connecting to the database:", error);
    res.status(500).json({
      balance: 0,
      status: "RS_ERROR",
      message: "Internal Server Error",
    });
  }
};

module.exports = { rollbackBet };
