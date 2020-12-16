const { index } = require("financialmodelingprep/lib/market");

module.exports = function (
    app,
    VerifyToken
) {
    const mongoose = require("mongoose");
    const Transaction = require("../models/Transaction.model");
    const YahooFinanceController = require("./YahooFinance.controller");
    const FMPController = require("./FinancialModelingPrep.controller");
    const CoinmarketcapController = require('./Coinmarketcap.controller');

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
                transaction_value: req.body.price * req.body.amount,
                transaction_type: req.body.transaction_type,
                transaction_date: req.body.transaction_date,
                created_date: new Date(),
                modified_date: new Date(),
            })

            if (newTransaction.asset_category === 'Commodity') {
                newTransaction.tradingview_symbol = await tradingviewSymbol(newTransaction.symbol);
            }

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


    app.get("/api/transaction/list/:page/:limit/:filterType?", VerifyToken, async (req, res) => {
        try {
            let userId = req.userId;
            let page = Number(req.params.page);
            let limit = Number(req.params.limit);
            let filterType = req.params.filterType

            let matchQuery = { user_id: userId };
            if(filterType && filterType !== 'All'){
                matchQuery['asset_category'] = filterType;
            }

            let aggregrateQuery = Transaction.aggregate([{ $match: matchQuery }]);
            let userOrders = await Transaction.aggregatePaginate(aggregrateQuery, { page: page, limit: limit });

            if (!userOrders.docs) {
                return res.error('Unable to find user.')
            }
            getLatestPrice(userOrders.docs);
            console.log('userOrders 1', userOrders);
            // userOrders = getLatestPrice(userOrders.docs);
            // console.log('userOrders 2', userOrders);

            // for (const order of userOrders.docs) {
            //     if (order.asset_category === 'Crypto') {
            //         let latestCryptoPrice = await CoinmarketcapController.getLatestCryptoPrice({ symbol: order.symbol });
            //         let quote = latestCryptoPrice.data[order.symbol].quote['USD'];

            //         order.current_total_avg_value = Number(quote.price) * order.amount;
            //         order.change_percentage = (order.current_total_avg_value - order.transaction_value) / order.transaction_value * 100;
            //     } else if (order.asset_category === 'Commodity') {
            //         let latestCommodityPrice = await FMPController.getLatestCommodityPrice(order.symbol);

            //         order.current_total_avg_value = latestCommodityPrice[0].price * order.amount;
            //         order.change_percentage = (order.current_total_avg_value - order.transaction_value) / order.transaction_value * 100;
            //     } else {
            //         let latestStockPrice = await YahooFinanceController.getLatestStockPrice(order.symbol);

            //         if (latestStockPrice.Information) {
            //             console.log('Exceeding limit', latestStockPrice);
            //             // @TO DO res.success or res.error
            //             // return;
            //         }

            //         order.current_total_avg_value = latestStockPrice.price.regularMarketPrice * order.amount;
            //         order.change_percentage = (order.current_total_avg_value - order.transaction_value) / order.transaction_value * 100;
            //     }
            // }

            return res.success(userOrders);
        } catch (error) {
            console.log(error)
            res.error("Something went wrong!");
        }
    });

    app.get("/api/transaction/:searchTerm", VerifyToken, async (req, res) => {
        try {
            let userId = req.userId;
            let filterType = req.params.searchTerm;

            let transaction = await Transaction.aggregate([{ $match: matchQuery }]);

            if (!userOrders) {
                return res.error('Unable to find user.')
            }

            getLatestPrice(transaction);

            return res.success(userOrders);
        } catch (error) {
            console.log(error)
            res.error("Something went wrong!");
        }
    });

    const getLatestPrice = async (userTransactions) => {

        for (const order of userTransactions) {
            if (order.asset_category === 'Crypto') {
                let latestCryptoPrice = await CoinmarketcapController.getLatestCryptoPrice({ symbol: order.symbol });
                let quote = latestCryptoPrice.data[order.symbol].quote['USD'];

                order.current_total_avg_value = Number(quote.price) * order.amount;
                order.change_percentage = (order.current_total_avg_value - order.transaction_value) / order.transaction_value * 100;
            } else if (order.asset_category === 'Commodity') {
                let latestCommodityPrice = await FMPController.getLatestCommodityPrice(order.symbol);

                order.current_total_avg_value = latestCommodityPrice[0].price * order.amount;
                order.change_percentage = (order.current_total_avg_value - order.transaction_value) / order.transaction_value * 100;
            } else {
                let latestStockPrice = await YahooFinanceController.getLatestStockPrice(order.symbol);

                if (latestStockPrice.Information) {
                    console.log('Exceeding limit', latestStockPrice);
                    // @TO DO res.success or res.error
                    // return;
                }

                order.current_total_avg_value = latestStockPrice.price.regularMarketPrice * order.amount;
                order.change_percentage = (order.current_total_avg_value - order.transaction_value) / order.transaction_value * 100;
            }
        }

        return userTransactions;
    }

    const tradingviewSymbol = (symbol) => {
        // Gold
        if (symbol === 'GCUSD' || symbol === 'ZGUSD') {
            return 'FOREXCOM:XAUUSD';
        }

        // Silver
        if (symbol === 'SIUSD' || symbol === 'ZIUSD') {
            return 'FOREXCOM:XAGUSD';
        }

        // Crude Oil
        if (symbol === 'CLUSD') {
            return 'NYMEX:CL1!';
        }

        // Brent Crude Oil
        if (symbol === 'BZUSD') {
            return 'OANDA:BCOUSD';
        }

        // Natural Gas
        if (symbol === 'NGUSD') {
            return 'NYMEX:NG1!'
        }

        // Palladium
        if (symbol === 'PAUSD') {
            return 'CURRENCYCOM:PALLADIUM'
        }

        // Palladium
        if (symbol === 'PAUSD') {
            return 'CURRENCYCOM:PALLADIUM'
        }

        // Coffee
        if (symbol === 'KCUSX') {
            return 'ICEUS:KC1!';
        }

        // Coffee
        if (symbol === 'KCUSX') {
            return 'ICEUS:KC1!';
        }

        // Sugar
        if (symbol === 'SBUSX') {
            return 'ICEUS:SB1!';
        }

        // Cocoa
        if (symbol === 'CCUSD') {
            return 'ICEUS:CC1!';
        }

        // Copper
        if (sumbol === 'HGUSD') {
            return 'COMEX:HG1!';
        }

        // Platinum
        if (sumbol === 'PLUSD') {
            return 'OANDA:XPTUSD';
        }

        // Cotton
        if (sumbol === 'CTUSX') {
            return 'ICEUS:CT1!';
        }

    }
}