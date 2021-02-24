const Btc = require('./Btc.js');
const axios = require('axios');
const Airtable = require('airtable');
require('dotenv').config();

const BTC_BASE_URL = process.env.BTC_BASE_URL;
const BTC_API_KEY = process.env.BTC_API_KEY;
const AIR_TABLE_ID = process.env.AIR_TABLE_ID;
const AIR_TABLE_API_KEY = process.env.AIR_TABLE_API_KEY;
const BTC_TABLE = process.env.BTC_TABLE;

var minutes = 1, the_interval = minutes * 60 * 1000;
var btcArr = {};

async function start ()
{
    if(Object.keys(btcArr).length>0) {
        postAllLostBTC();
    }

    var currentBtc = await getCurrentBtcDetails();
    console.log(currentBtc);
    postBtc(currentBtc);    
} 

async function getCurrentBtcDetails() {
    let url = BTC_BASE_URL+"?api_key="+BTC_API_KEY;

    const result = await axios.get(url);
    const rates = result.data.USD;
    var currentdate = new Date(); 

    var btc = new Btc(currentdate, rates);
    return btc;
}

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
                console.error(err);
                btcArr[btc.time]=btc;
                return reject(err);
            }
            records.forEach(function (record) {
                console.log(record.getId());
            });
            return resolve(btc)
        });
    })
}

function postAllLostBTC() {
    for (var key in btcArr) {
        tryPost(btcArr[key]);
    }
}

var tryPost = function (btc) {
    return new Promise(
        async function (resolve, reject) {
            try { 
                await postBtc(btc)
                delete btcArr[btc.time];
                resolve(btc); // fulfilled
            } catch {
                var reason = new Error('Something wrong');
                reject(reason); // reject
            }
        }
    );
};


setInterval(function() {
    start();
}, the_interval);