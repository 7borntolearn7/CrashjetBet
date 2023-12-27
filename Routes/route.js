const express = require("express");
const router = express.Router();
const { getBalance } = require("../Controllers/GetBalance");
const { placeBet } = require("../Controllers/PlaceBet");
const { resultbet } = require("../Controllers/Resultbet");
const { rollbackBet } = require("../Controllers/Rollbackbet");

router.post("/getbalance", getBalance);
router.post("/placebet", placeBet);
router.post("/resultbet", resultbet);
router.post("/rollback", rollbackBet);

module.exports = router;
