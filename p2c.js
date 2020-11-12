/*

USAGE:

# node p2c.js <jail_id> <jail_p2c_url>
# node p2c.js 25 http://p2c.wakeso.net/jailinmates.aspx

4 http://www.morgantonps.org/p2c/jailinmates.aspx burke
5 http://onlineservices.cabarruscounty.us/p2c/jailinmates.aspx cabarrus
10 http://74.218.167.200/p2c/jailinmates.aspx cleveland
12 https://p2c.fcso.us/jailinmates.aspx forsyth
18 http://p2c.lincolnsheriff.org/jailinmates.aspx lincoln
20 http://p2c.nhcgov.com/p2c/jailinmates.aspx new_hanover
25 http://p2c.wakeso.net/jailinmates.aspx wake

*/
const puppeteer = require('puppeteer');
const fs = require("fs");
const { Parser } = require('json2csv');
const parser = new Parser();

// ------------------------
// Hide this when testing:
// ------------------------

const mysql = require('mysql');
require('dotenv').config({ path: __dirname+'/../.env' })
var con = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD, 
  database: process.env.DB_DATABASE
});

// ------------------------

var scrapeDetails = async (browser, url, n) => {
    try {
    //    console.log("----- GRABBING DEETS ---------");
    //    console.log(n);
    //    console.log("------------------------------");
        let page = await browser.newPage();
        await page.goto(url);

        // Select 10,000 and let it load up
        await page.waitForSelector("#pager_center > table > tbody > tr > td:nth-child(5) > select");
        await page.select('#pager_center > table > tbody > tr > td:nth-child(5) > select', '10000');
        await page.waitForSelector("#tblII tbody tr:nth-child("+n+")");

        // Select the Nth row (as passed in params)
        await page.click("#tblII tbody tr:nth-child("+n+")");
        
        // Wait for the details table to load and then grab deets
        await page.waitForSelector("#Table4", {timeout:5000});
        var data = await page.evaluate(() => {
            var x = {};
            x.name = document.querySelector("#mainContent_CenterColumnContent_lblName").innerHTML;
            x.age = document.querySelector("#mainContent_CenterColumnContent_lblAge").innerHTML.match(/[0-9]+/);
            if (typeof x.age != null) { x.age = parseInt(x.age[0]); } else { x.age = null; }
            x.race = document.querySelector("#mainContent_CenterColumnContent_lblRace").innerHTML;
            x.race = x.race.charAt(0).toUpperCase() + x.race.slice(1).toLowerCase();
            x.sex = document.querySelector("#mainContent_CenterColumnContent_lblSex").innerHTML;
            x.sex = x.sex.charAt(0).toUpperCase() + x.sex.slice(1).toLowerCase();
            x.court_date = document.querySelector("#mainContent_CenterColumnContent_lblNextCourtDate").innerHTML;

            x.charges = [];
            var crows = document.querySelectorAll("#mainContent_CenterColumnContent_dgMainResults > tbody tr:not(:first-child)");
            for (var c in crows) {
                if (crows[c].tagName=="TR") {
                    charge = crows[c].innerHTML.match(/<td.*?>(.*?)<\/td>.*?<td.*?>(.*?)<\/td>.*?<td.*?>(.*?)<\/td>.*?<td.*?>.*?(\$.*)?<\/td>/);
                    if (charge[4]==null) {
                        charge[4] = "N/A";
                    }
                    x.charges.push({
                        charge:charge[1]
                        , charge_status:charge[2]
                        , docket_number:charge[3]
                        , bond_amount:charge[4]
                    });
                }
            }
            return x;
        });
        await page.close();
        return data;
    } catch(er) {
        console.log(er);
        return false;
    }
}


var scrape = async (jail_id, url) => {
// -----------------------------------    
// Set headless to false when testing:
// -----------------------------------    
	let browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox']});
// -----------------------------------    
	let page = await browser.newPage();
	await page.goto(url);
    await page.waitForSelector("#pager_center > table > tbody > tr > td:nth-child(5) > select");
    await page.select('#pager_center > table > tbody > tr > td:nth-child(5) > select', '10000');
	await page.waitFor(1000);
    let data = await page.$$eval('#tblII tbody tr', tds => tds.map((td) => {
      return td.innerText;
    }));
    for (var d in data) {
        d = parseInt(d);
        if (d < 3000) {
            try {
                let deets = await scrapeDetails(browser, url, d+1);
                if (deets.name!=null) {
        //            console.log("deets", deets);
                    var sql = "INSERT INTO jail_records (jail_id, name, age, sex, race, created_at, updated_at) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)";
                    var vals = [
                            jail_id
                            , deets.name
                            , deets.age
                            , deets.sex
                            , deets.race
                        ];
        // ------------------------
        // Hide this when working:
        // ------------------------
                    console.log(sql);
                    console.log(vals);
        // ------------------------
        // ------------------------
        // Hide this when testing:
        // ------------------------
                    con.query(sql, vals, function (err, results, fields) {
        // ------------------------
                        var sqlb = "INSERT INTO charge_records (jail_record_id, charge, status, docket_number, bond_amount, created_at, updated_at) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)";
                        for (var c in deets.charges) {
        // ------------------------
        // Hide this when working:
        // ------------------------
//        var results = {insertId:101};                    
        // ------------------------
                            var valsb = [
                                results.insertId
                                , deets.charges[c].charge
                                , deets.charges[c].charge_status
                                , deets.charges[c].docket_number
                                , deets.charges[c].bond_amount
                            ];
        // ------------------------
        // ------------------------
        // Hide this when working:
        // ------------------------
                            console.log(sqlb);
                            console.log(valsb);
        // ------------------------
        // ------------------------
        // Hide this when testing:
        // ------------------------
                            con.query(sqlb, valsb, function(errb, resultsb, fieldsb) {});
        // ------------------------
                        }
        // ------------------------
        // Hide this when testing:
        // ------------------------
                    });
        // ------------------------
                }
            } catch(er) {
                console.log(er);
            }
        }
    }
    console.log("CLOSING BROWSER");
	browser.close();
	return {};
};

// http://p2c.wakeso.net/jailinmates.aspx
if (process.argv.length > 2) {
    jail_id = process.argv[2];
    url = process.argv[3];
    scrape(jail_id, url);
}