const puppeteer = require('puppeteer');
const fs = require("fs");
const { Parser } = require('json2csv');
const parser = new Parser();


let scrape = async (alpha) => {
	browsers[alpha] = await puppeteer.launch({headless: false});	// <--- set to true for scraping
	var page = await browsers[alpha].newPage();
	await page.goto('https://inmatelocator.cdcr.ca.gov/default.aspx');
	await page.waitFor(1000);
	await page.goto('https://inmatelocator.cdcr.ca.gov/search.aspx');
	await page.waitFor(1000);
	await page.click('#ctl00_LocatorPublicPageContent_btnAccept');
	await page.waitFor(1000);
	await page.type('#ctl00_LocatorPublicPageContent_txtLastName', alpha); //, {delay: 20});		
	await page.click('#ctl00_LocatorPublicPageContent_btnSearch');
	await page.waitFor(3000);
	var results = [];
	var morePages = true;
	while(morePages) {
		await page.waitFor(500);
		var data = await page.evaluate(() => {
			var r = [];
			var html = document.querySelector('#ctl00_LocatorPublicPageContent_gvGridView > tbody').innerHTML;
			var matches = [];
			var re = /<tr>.*?<td><a.*?>(.*?)<\/a><\/td>.*?<td>(.*?)<\/td>.*?<td>(.*?)<\/td>.*?<td>(.*?)<\/td>.*?<\/tr>/sg;
			do { m = re.exec(html); if (m) { matches.push(m); } } while (m);
			for (var m in matches) {
				r.push({
					name:matches[m][1].trim()
					,
					id:matches[m][2].trim()
					,
					age:matches[m][3].trim()
					,
					admdate:matches[m][4].trim()
				});
			}
			return r;
		});
		for (var r in data) {
			results.push(data[r]);
		}
//		console.log("data", data);
		var result = await page.evaluate(() => {
			var as = document.getElementsByTagName("A");
			for (var a=0;a<as.length;a++) {
				if (as[a].innerHTML=="Next Page") {
					return true;
				}
			}
			return false;
		});
		morePages = result;
		console.log("morePages", morePages);
		if (morePages) {
			await page.click('#ctl00_LocatorPublicPageContent_gvGridView > tbody > tr:nth-child(23) > td > table > tbody > tr > td:last-child > a');			
		}
		await page.waitFor(500);
	}
	browsers[alpha].close();
	return {alpha:alpha, results:results};
};


var scrapeAlpha = (alpha) => {
	console.log("Starting '"+alpha+"'...");
	scrape(alpha).then((x) => {
		console.log("x", x);
/*
		if (x.results.length>0) {
//			console.log("x", x);
			var csv = parser.parse(x.results);		
			var lines = csv.split('\n');
//			console.log("lines", lines);
			lines.splice(0,1);
			csv = lines.join('\n');		
			fs.writeFile("./Mississippi/"+x.alpha+".csv", csv+"\n", ()=>{});
			console.log("Done saving '" + x.alpha + "'.");
	//		fs.appendFile("./Mississippi/Mississipi.csv", csv+"\n", ()=>{});
		}
*/
	});	
}


var browsers = {};
var alphas = ['Aa','Ab','Ad','Ag'];
var alphaIndex = -1;

// NEXT:
// Test saving
// Increment through the alphas in limited sets
scrapeAlpha('Ab');


/*
var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
var alphabet = ALPHABET.toLowerCase();

scrapeAlpha('W[AEIOU]');
scrapeAlpha('W[BCDFGHJK]');
scrapeAlpha('W[LMNPQRS]');
scrapeAlpha('W[TVWXYZ]');
scrapeAlpha('[UVXYZ]');

*/


