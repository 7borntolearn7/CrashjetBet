const express = require("express");
const router = express.Router();
const { getBalance } = require("../Controllers/GetBalance");
const { placeBet } = require("../Controllers/PlaceBet");
const { getResult } = require("../Controllers/GetResult");

router.post("/getbalance", getBalance);
router.post("/placebet", placeBet);
router.post("/getResult", getResult);

module.exports = router;
