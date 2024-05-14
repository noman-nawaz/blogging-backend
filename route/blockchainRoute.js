const express = require("express");
const blockchain = require("../controllers/blockchaincontroller");

const BlockChainRoute = express.Router();

BlockChainRoute.get("/set-contact", blockchain.setTransaction);
BlockChainRoute.get("/get-tran", blockchain.getTransaction);

module.exports = BlockChainRoute;