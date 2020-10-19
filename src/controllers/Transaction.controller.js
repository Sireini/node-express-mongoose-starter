
module.exports = function (
    app,
    VerifyToken
  ) {    
  const mongoose = require("mongoose");
  let Transaction = require("../models/Transaction.model");

  app.post("/api/transaction", VerifyToken, async (req, res) => {
    try {
        let newTransaction = new Transaction({
            _id: new mongoose.Types.ObjectId(),
            user_id: req.userId,
            name: req.body.name,
            asset_category: req.body.asset_category,
            symbol: req.body.symbol,
            price: req.body.price,
            amount: req.body.amount,
            transaction_type: req.body.transaction_type,
            transaction_date: req.body.transaction_date,
            created_date: new Date(),
            modified_date: new Date(),
        })

        let transactionSaved = await newTransaction.save();

        if (!transactionSaved) {
            return res.error("Something went wrong while creating a new transaction.");
        }

        return res.success(transactionSaved);
    } catch (e) {
        console.error(e);
        return res.error("Something went wrong!");
    }
  });

  
  app.get("/api/transaction/list", VerifyToken, async (req, res) => {
    try {
        let userId = req.userId;
        let userOrders = await Transaction.find({user_id: userId})
            .limit(5)
            .lean()
            .exec();

        if(!userOrders) {
            return res.error('Unable to find user.')
        }

        return res.success(userOrders);
    } catch (error) {
        console.log(error)
        res.error("Something went wrong!");        
    }
  });

}