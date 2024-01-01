const { sqlPromise } = require("../Config/config");
const { fetchBalance } = require("../Utils/Utils");

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
    // Fetch the current balance using the fetchBalance function
    const currentBalance = await fetchBalance(userId, token);

    if (currentBalance === null) {
      return res.status(404).json({
        balance: 0,
        status: "RS_ERROR",
        message: "User not found or invalid credentials",
      });
    }

    console.log(currentBalance);

    // Check if the user has enough balance to place the bet
    if (currentBalance < amount) {
      return res.status(400).json({
        status: "RS_ERROR",
        message: "Insufficient balance to place the bet",
      });
    }

    // Deduct the bet amount from the user's balance
    const newBalance = Number(currentBalance) - Number(amount);
    console.log(amount);
    console.log(newBalance);

    // Execute the update and insert queries using sqlPromise.query
    const [updateResult] = await sqlPromise.query(
      "UPDATE clientInfo SET LimitCurr = ? WHERE  token = ?",
      [newBalance, token]
    );

    const [betResult] = await sqlPromise.query(
      "INSERT INTO CrashjetBet (BetStatus,Sport,ClientId,updated_on,updated_by,User_Id, token,Amount,roundId,Operator_Id,Currency,Request_UUID,Bet_Id,Bet_Time,GameId, GameCode,Transaction_Type) VALUES (DEFAULT,DEFAULT,0,DEFAULT,DEFAULT,?, ?, ?, ?, ?, ?,?,?,?,?,?,DEFAULT)",
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

    res.json({
      balance: newBalance,
      bet: betResult,
      status: "RS_OK",
    });
  } catch (error) {
    console.error("Error placing bet:", error);
    res.status(500).json({
      balance: 0,
      status: "RS_ERROR",
      message: "Internal Server Error",
    });
  }
};

module.exports = { placeBet };
