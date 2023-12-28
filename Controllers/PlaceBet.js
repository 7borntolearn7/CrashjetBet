const mysql = require("mysql2/promise");
const dbConfig = require("../Config/config");
const { fetchBalance } = require("../Utils/Utils");

let currentBalance = null;
const placeBet = async (req, res) => {
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
      success: "RS_ERR",
      missed: `Missing required attributes: ${missingAttributes.join(", ")}`,
      message: "Bad Request",
      balance: 0,
    });
  }
  try {
    // Create a MySQL connection
    const connection = await mysql.createConnection(dbConfig);

    // Start a transaction
    await connection.beginTransaction();

    try {
      currentBalance = await fetchBalance(userId, token);

      if (!currentBalance) {
        return res.status(404).json({
          success: "RS_ERR",
          message: "User not found or invalid credentials",
          balance: 0,
        });
      }
      console.log(currentBalance);

      // Check if the user has enough balance to place the bet
      if (currentBalance < amount) {
        return res.status(400).json({
          success: "RS_ERR",
          message: "Insufficient balance to place the bet",
        });
      }

      // Deduct the bet amount from the user's balance
      const newBalance = currentBalance - amount;
      console.log(amount);
      console.log(newBalance);
      await connection.execute(
        "UPDATE clientInfo SET LimitCurr = ? WHERE  token = ?",
        [newBalance, token]
      );

      // Insert the updated record into the newly created table
      const [betResult] = await connection.execute(
        "INSERT INTO CrashjetBet (BetStatus,Sport,ClientId,updated_on,updated_by,User_Id, token,Amount,roundId,Operator_Id,Currency,Request_UUID,Bet_Id,Bet_Time,GameId, GameCode,Transaction_Type,reference_request_uuid) VALUES (DEFAULT,DEFAULT,0,DEFAULT,DEFAULT,?, ?, ?, ?, ?, ?,?,?,?,?,?,DEFAULT,?)",
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

      res.json({
        success: "RS_OK",
        balance: newBalance,
        bet: betResult,
        message: "",
      });
    } catch (error) {
      // Rollback the transaction in case of an error
      await connection.rollback();
      console.error("Error placing bet:", error);
      res.status(500).json({
        success: "RS_ERR",
        message: "Internal Server Error",
        balance: 0,
      });
    } finally {
      // Close the connection when done
      connection.end();
    }
  } catch (error) {
    console.error("Error connecting to the database:", error);
    res.status(500).json({
      success: "RS_ERR",
      message: "Internal Server Error",
      balance: 0,
    });
  }
};

module.exports = { placeBet };
