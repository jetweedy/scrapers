const puppeteer = require('puppeteer');
const fs = require("fs");
const { Parser } = require('json2csv');
const parser = new Parser();



let scrape = async (alpha) => {
/* HEADLESS? */
	browsers[alpha] = await puppeteer.launch({headless: true});	// <--- set to true for scraping
/* /HEADLESS? */
	var page = await browsers[alpha].newPage();
	await page.goto('http://wdoc-loc.wyo.gov/');
	await page.waitFor(2000);
	await page.type('#lastName', alpha); //, {delay: 20});		
	await page.waitFor(200);
	await page.click('body > div > div:nth-child(3) > div > form > fieldset > input');
	await page.waitFor(3000);
	var results = [];

	var toomany = false;
	var skipped = false;

	if (toomany) {
		alphas[alpha].done = true;
		for (var ap in ALPHAPARTS) {
			alphas[alpha+ALPHAPARTS[ap]] = {
				busy:false
				,
				done:false
			}
		}
		skipped = true;
	} else {
/* SCRAPING */		
		morePages[alpha] = true;
		while(morePages[alpha]) {
			pageIndexes[alpha]++;
			var data = await page.evaluate(() => {
				function cleanSearchResultString(x) {
					x = x.replace(/\t/g," ");
					x = x.replace(/ +/g," ");
					return x.trim();
				}
				var r = {results:[]};
				if (document.querySelector('#searchTable > tbody')) {
					var html = document.querySelector('#searchTable > tbody').innerHTML;
					var matches = [];
					var re = /<tr.*?>.*?<td.*?>(.*?)<\/td>.*?<td.*?>(.*?)<\/td>.*?<td.*?>(.*?)<\/td>.*?<td.*?>(.*?)<\/td>.*?<\/tr>/sg;
					do { m = re.exec(html); if (m) { matches.push(m); } } while (m);
					for (var m in matches) {
						r.results.push({
							name:cleanSearchResultString(matches[m][2])+", "+cleanSearchResultString(matches[m][1])
							,
							sex:cleanSearchResultString(matches[m][3])
							,
							age:cleanSearchResultString(matches[m][4])
						});
					}
				} else {
					r.error = "no table body found";
				}
				return r;
			});
			if (typeof data.error != "undefined") {
				console.log("v------------------v");
				console.log("(!)---> data.error | " + alpha + " | page " + pageIndexes[alpha]);
				console.log(data.error);
				console.log("^------------------^");
			}
			if (data.length==0) { 
				console.log("v------------------v");
				console.log("(!)---> No records found on page " + pageIndexes[alpha] + " of " + alpha + ".");
				console.log("^------------------^");
			}
			for (var r in data.results) {
				results.push(data.results[r]);
			}
	//		console.log("data", data);
			morePages[alpha] = await page.evaluate(() => {
				return (document.getElementById("searchTable_next").className.indexOf('disabled') < 0);
			});
//			console.log("morePages["+alpha+"]", morePages[alpha]);
			if (morePages[alpha]) {
				await page.click('#searchTable_next');			
				await page.waitFor(500);
			}
			await page.waitFor(500);
//			morePages[alpha] = false;				
		}
/* /SCRAPING */
	}
	browsers[alpha].close();
	return {alpha:alpha, results:results, skipped:skipped};
};


var scrapeAlpha = (alpha) => {
	pageIndexes[alpha] = 0;
	if (fs.existsSync("./Wyoming/"+alpha+".csv")) {
		console.log("File exists, so skipping " + alpha + ".");
		alphas[alpha].done = true;
		alphas[alpha].busy = false;
		tryAnotherAlpha('File existed already.');
	} else {
		console.log("Starting '"+alpha+"'...");
		scrape(alpha).then((x) => {
//			console.log("x", x);
/* SAVING */
			if (x.results.length>0) {
				var csv = parser.parse(x.results);		
				var lines = csv.split('\n');
				lines.splice(0,1);
				csv = lines.join('\n');		
				fs.writeFile("./Wyoming/"+x.alpha+".csv", csv+"\n", ()=>{});
			}
/* /SAVING */
			if (!x.skipped) {
				console.log("Done with '" + x.alpha + "'.");				
				alphas[alpha].done = true;
				alphas[alpha].busy = false;
			} else {
				console.log("Split '" + x.alpha + "' due to excess results.");
				alphas[alpha].busy = false;
			}
			tryAnotherAlpha('/scrapeAlpha()');
		});
	}
}


function tryAnotherAlpha(reason) {
//	console.log("-----");
//	console.log("tryAnotherAlpha()");
//	if (typeof reason != "undefined") { console.log("reason", reason); }
	var allDone = true;
	for (var a in alphas) {
//		console.log(a, alphas[a]);
		if (!alphas[a].done) {
			if (!alphas[a].busy) {
				alphas[a].busy = true;
				scrapeAlpha(a);
				return;
			}
			allDone = false;
		}
	}
	if (!allDone) {
//		console.log("Waiting a bit before looking for more to do.");
		setTimeout(() => {
			tryAnotherAlpha('Jobs were busy earlier.');
		}, 5000);
	}
}

var browsers = {};
var morePages = {};
var pageIndexes = {};

var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
//var ALPHAPARTS = ['[A-I]','[J-R]','[S-Z]'];
var ALPHAPARTS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
var MAXLASTNAMELENGTH = 6;


var alphas = {};
var useLetters1 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
var useLetters2 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ'";
for (var a in useLetters1) {
	for (var b in useLetters2) {
		alphas[useLetters1[a]+useLetters2[b]] = {busy:false,done:false};
	}
}

/*
//var alphas = {'V[A-M][A-M][A-M]':{busy:false, done:false}};
var alphas = {};
alphas['JO'] = {busy:false,done:false};
*/

console.log(alphas);

tryAnotherAlpha(1);
tryAnotherAlpha(2);
tryAnotherAlpha(3);
tryAnotherAlpha(4);
tryAnotherAlpha(5);







