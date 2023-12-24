// Database connection configuration
const mysql = require("mysql2/promise");

const dbConfig = {
  host: "stage-db-1.cmhfjy9fvag5.ap-south-1.rds.amazonaws.com",
  user: "admin",
  database: "oscardb",
  password: "YNLx5TMezvpXZmS",
};
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

      // If the amount is greater than zero, update the clientInfo table
      if (amount > 0) {
        // Update the clientInfo table by crediting the amount to LimitCurr column
        const [userResult] = await connection.execute(
          "SELECT LimitCurr FROM clientInfo WHERE token = ?",
          [token]
        );

        if (userResult.length === 0) {
          return res.status(404).json({ error: "User not found" });
        }

        const currentBalance = Number(userResult[0].LimitCurr);
        const amount = Number(req.body.amount);
        console.log(amount);
        console.log(currentBalance);
        newBalance = currentBalance + amount;
        console.log(amount);
        console.log(newBalance);

        await connection.execute(
          "UPDATE clientInfo SET LimitCurr = ? WHERE token = ?",
          [newBalance, token]
        );
      }

      // Update the bet record in the Crashbet table with BetStatus as 'closed'
      await connection.execute(
        "UPDATE CrashjetBet SET BetStatus = 'CLOSED' WHERE Bet_Id = ?",
        [bet_id]
      );

      // Insert a new record into the Crashbet table for the same bet_id
      await connection.execute(
        "INSERT INTO CrashjetBet (BetStatus,Sport,ClientId,updated_on,updated_by,User_Id, token,Amount,roundId,Operator_Id,Currency,Request_UUID,Bet_Id,Bet_Time,GameId, GameCode,Transaction_Type) VALUES (DEFAULT,DEFAULT,0,DEFAULT,DEFAULT,?, ?, ?, ?, ?, ?,?,?,?,?,?,'CREDIT')",
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

      res.json({ success: true, message: newBalance });
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
