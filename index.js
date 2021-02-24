const Btc = require('./Btc.js');
const axios = require('axios');
const Airtable = require('airtable');
require('dotenv').config();

//Dotenv environment variables
const BTC_BASE_URL = process.env.BTC_BASE_URL;
const BTC_API_KEY = process.env.BTC_API_KEY;
const AIR_TABLE_ID = process.env.AIR_TABLE_ID;
const AIR_TABLE_API_KEY = process.env.AIR_TABLE_API_KEY;
const BTC_TABLE = process.env.BTC_TABLE;

var minutes = 1, the_interval = minutes * 60 * 1000;
var btcArr = {};

//Main method
async function start ()
{
    //Checking if errors occured and trying to fix them
    if(Object.keys(btcArr).length>0) {
        postAllLostBTC();
    }

    var currentBtc = await getCurrentBtcDetails();
    console.log(currentBtc);
    postBtc(currentBtc);    
} 

//Retrieving current Bitcoin exchange rate
async function getCurrentBtcDetails() {
    let url = BTC_BASE_URL+"?api_key="+BTC_API_KEY;

    const result = await axios.get(url);
    const rates = result.data.USD;
    var currentdate = new Date(); 

    var btc = new Btc(currentdate, rates);
    return btc;
}

//Posting single btc
async function postBtc(btc) {
    return new Promise((resolve, reject) => {

        var base = new Airtable({apiKey: AIR_TABLE_API_KEY}).base(AIR_TABLE_ID);
        base(BTC_TABLE).create([
        {
            "fields": {
                "Time": btc.time,
                "Rates": btc.rates
            }
        }
        ], function(err, records) {
            if (err) {
                //Error occured - save the BTC variable for next
                btcArr[btc.time]=btc;
                console.error(err);
                return reject(err);
            }
            records.forEach(function (record) {
                console.log(record.getId());
            });
            return resolve(btc)
        });
    })
}

//Iterating all failed btc's for another try
function postAllLostBTC() {
    for (var key in btcArr) {
        tryPost(btcArr[key]);
    }
}

//Trying to post the btc again
var tryPost = function (btc) {
    return new Promise(
        async function (resolve, reject) {
            try { 
                await postBtc(btc)

                //Delete BTC by key if the postBtc method succeed
                delete btcArr[btc.time];
                resolve(btc);
            } catch {
                var reason = new Error('Something wrong');
                reject(reason);
            }
        }
    );
};

//Executing the program every single minute
setInterval(function() {
    start();
}, the_interval);