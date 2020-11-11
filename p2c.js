/*
USAGE:

# node p2c.js <jail_id> <jail_p2c_url>

*/
const puppeteer = require('puppeteer');
const fs = require("fs");
const { Parser } = require('json2csv');
const parser = new Parser();


var scrapeDetails = async (browser, url, n) => {
	let page = await browser.newPage();
	await page.goto(url);

    // Select 10,000 and let it load up
    await page.waitForSelector("#pager_center > table > tbody > tr > td:nth-child(5) > select");
    await page.select('#pager_center > table > tbody > tr > td:nth-child(5) > select', '10000');
	await page.waitForTimeout(1000);

    // Select the Nth row (as passed in params)
    await page.click("#tblII tbody tr:nth-child("+n+")");
    
    // Wait for the details table to load and then grab deets
    await page.waitForSelector("#Table4");
	var data = await page.evaluate(() => {
        var x = {};
        x.arrest_date = document.querySelector("#mainContent_CenterColumnContent_lblArrestDate").innerHTML;
        return x;
	});
    await page.close();
    return data;
}


var scrape = async (jail_id, url) => {
	let browser = await puppeteer.launch({headless: false});	// <--- set to true for scraping

	let page = await browser.newPage();
	await page.goto(url);
    await page.waitForSelector("#pager_center > table > tbody > tr > td:nth-child(5) > select");
    await page.select('#pager_center > table > tbody > tr > td:nth-child(5) > select', '10000');
	await page.waitForTimeout(1000);

    let data = await page.$$eval('#tblII tbody tr', tds => tds.map((td) => {
      return td.innerText;
    }));
    console.log("jail_id: ", jail_id);
    console.log("url: ", url);
    console.log(data.length);
    
    for (var d in data) {
        if (d < 20) {
            console.log(d);
            let deets = await scrapeDetails(browser, url, d+1);
            console.log("deets", deets);
//            await page.waitForSelector("#pager_center > table > tbody > tr > td:nth-child(5) > select");
//            await page.select('#pager_center > table > tbody > tr > td:nth-child(5) > select', d);
//            await page.waitForSelector("#pager_center > table > tbody > tr > td:nth-child(5) > select");
//            await page.select('#pager_center > table > tbody > tr > td:nth-child(5) > select', '10000');
        }
    }

	browser.close();
	return {};
};

// http://p2c.wakeso.net/jailinmates.aspx
if (process.argv.length > 2) {
    jail_id = process.argv[2];
    url = process.argv[3];
    scrape(jail_id, url);
}