const { sqlPromise } = require("../Config/config");
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
    // Fetch the latest record with the given bet_id using sqlPromise.query
    const [betResult] = await sqlPromise.query(
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

    // Fetch the current balance from clientInfo using fetchBalance function
    const currentBalance = await fetchBalance(userId, token);
    newBalance = Number(currentBalance) + Number(originalDeductedAmount);

    // Execute the update and insert queries using sqlPromise.query
    await sqlPromise.query(
      "UPDATE clientInfo SET LimitCurr = ? WHERE token = ?",
      [newBalance, token]
    );

    await sqlPromise.query(
      "UPDATE CrashjetBet SET BetStatus = 'CLOSED' WHERE Bet_Id = ?",
      [bet_id]
    );

    await sqlPromise.query(
      "INSERT INTO CrashjetBet (BetStatus, Sport, ClientId, updated_on, updated_by, User_Id, token, Amount, roundId, Operator_Id, Currency, Request_UUID, Bet_Id, Bet_Time, GameId, GameCode, Transaction_Type, reference_request_uuid, RollbackType, RollbackReason) VALUES ('ROLLBACK', DEFAULT, 0, DEFAULT, DEFAULT, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CREDIT', ?, ?, ?)",
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

    res.json({
      balance: newBalance,
      status: "RS_OK",
    });
  } catch (error) {
    console.error("Error rolling back bet:", error);
    res.status(500).json({
      balance: 0,
      status: "RS_ERROR",
      message: "Internal Server Error",
    });
  }
};

module.exports = { rollbackBet };
