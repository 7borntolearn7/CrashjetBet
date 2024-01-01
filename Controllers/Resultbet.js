const { sqlPromise } = require("../Config/config");
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
      balance: 0,
      status: "RS_ERROR",
      missed: `Missing required attributes: ${missingAttributes.join(", ")}`,
      message: "Bad Request",
    });
  }

  try {
    // Fetch the current balance from clientInfo using the fetchBalance function
    let currentBalance = await fetchBalance(userId, token);
    currentBalance = Number(currentBalance);

    if (currentBalance === null) {
      return res
        .status(404)
        .json({ status: "RS_ERROR", message: "User not found", balance: 0 });
    }

    console.log(currentBalance);

    // Calculate the new balance as the sum of the current balance and the amount
    newBalance = currentBalance + Number(amount);

    console.log(amount);
    console.log(newBalance);

    // Execute the update and insert queries using sqlPromise.query
    const [updateResult] = await sqlPromise.query(
      "UPDATE clientInfo SET LimitCurr = ? WHERE token = ?",
      [newBalance, token]
    );

    const [betResult] = await sqlPromise.query(
      "INSERT INTO CrashjetBet (BetStatus, Sport, ClientId, updated_on, updated_by, User_Id, token, Amount, roundId, Operator_Id, Currency, Request_UUID, Bet_Id, Bet_Time, GameId, GameCode, Transaction_Type, reference_request_uuid) VALUES ('CLOSED', DEFAULT, 0, DEFAULT, DEFAULT, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CREDIT', ?)",
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

    res.json({ balance: newBalance, status: "RS_OK" });
  } catch (error) {
    console.error("Error updating result:", error);
    res.status(500).json({
      balance: 0,
      status: "RS_ERROR",
      message: "Internal Server Error",
    });
  }
};

module.exports = { resultbet };
