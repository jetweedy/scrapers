const puppeteer = require('puppeteer');
const fs = require("fs");
const { Parser } = require('json2csv');
const parser = new Parser();



let scrape = async (alpha) => {
/* HEADLESS? */
	browsers[alpha] = await puppeteer.launch({headless: true});	// <--- set to true for scraping
/* /HEADLESS? */
	var page = await browsers[alpha].newPage();
	await page.goto('https://public.doc.state.sc.us/scdc-public/');
	await page.waitFor(2000);
	await page.type('#inmateSearchForm > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > input:nth-child(7)', alpha); //, {delay: 20});		
	await page.waitFor(200);
	await page.click('#inmateSearchForm > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > input.button');
	await page.waitFor(2000);
	var results = [];
	var toomany = await page.evaluate(() => {
		var aaa = document.body.innerHTML+"";
		var bbb = document.body.innerHTML+"";
		bbb = bbb.replace("Your search returned more inmates than can be displayed.","");
		return (aaa!=bbb);
	});
	console.log("toomany", toomany);
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
				if (document.querySelector('#myTable > tbody')) {
					var html = document.querySelector('#myTable > tbody').innerHTML;
					var matches = [];
					var re = /<tr.*?>.*?<td.*?>(.*?)<\/td>.*?<td.*?>(.*?)<\/td>.*?<td.*?>(.*?)<\/td>.*?<td.*?>(.*?)<\/td>.*?<td.*?>(.*?)<\/td>.*?<td.*?>(.*?)<\/td>.*?<td.*?>(.*?)<\/td>.*?<\/tr>/sg;
					do { m = re.exec(html); if (m) { matches.push(m); } } while (m);
					for (var m in matches) {
						r.results.push({
							id:cleanSearchResultString(matches[m][1])
							,
							name:cleanSearchResultString(matches[m][2])
							,
							sex:cleanSearchResultString(matches[m][3])
							,
							race:cleanSearchResultString(matches[m][4])
							,
							age:cleanSearchResultString(matches[m][7])
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
				var as = document.getElementsByTagName("A");
				for (var a=0;a<as.length;a++) {
					if (as[a].innerHTML=="Next Page") {
						return true;
					}
				}
				return false;
			});
//			console.log("morePages["+alpha+"]", morePages[alpha]);
			if (morePages[alpha]) {
				await page.click('#ctl00_LocatorPublicPageContent_gvGridView > tbody > tr:nth-child(23) > td > table > tbody > tr > td:last-child > a');			
				await page.waitFor(3000);
			}
			await page.waitFor(500);
			morePages[alpha] = false;				// <--------- leave false because all results hidden on one page
		}
/* /SCRAPING */
	}
	browsers[alpha].close();
	return {alpha:alpha, results:results, skipped:skipped};
};


var scrapeAlpha = (alpha) => {
	pageIndexes[alpha] = 0;
	if (fs.existsSync("./SC/"+alpha+".csv")) {
		console.log("File exists, so skipping " + alpha + ".");
		alphas[alpha].done = true;
		alphas[alpha].busy = false;
		tryAnotherAlpha('File existed already.');
	} else {
		console.log("Starting '"+alpha+"'...");
		scrape(alpha).then((x) => {
			console.log("x", x);
/* SAVING */
			if (x.results.length>0) {
				var csv = parser.parse(x.results);		
				var lines = csv.split('\n');
				lines.splice(0,1);
				csv = lines.join('\n');		
				fs.writeFile("./SC/"+x.alpha+".csv", csv+"\n", ()=>{});
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
var useLetters = 'ABCDEFGH';
for (var a in useLetters) {
	alphas[useLetters[a]] = {busy:false,done:false};
}


/*
//var alphas = {'V[A-M][A-M][A-M]':{busy:false, done:false}};
var alphas = {};
alphas['A'] = {busy:false,done:false};
*/

//console.log(alphas);

tryAnotherAlpha(1);
//tryAnotherAlpha(2);
//tryAnotherAlpha(3);
//tryAnotherAlpha(4);
//tryAnotherAlpha(5);







