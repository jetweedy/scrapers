const puppeteer = require('puppeteer');
const fs = require("fs");
const { Parser } = require('json2csv');
const parser = new Parser();


let scrape = async (alpha) => {
	browsers[alpha] = await puppeteer.launch({headless: true});	// <--- set to true for scraping
	var page = await browsers[alpha].newPage();
	await page.goto('https://inmatelocator.cdcr.ca.gov/default.aspx');
	await page.waitFor(1000);
	await page.goto('https://inmatelocator.cdcr.ca.gov/search.aspx');
	await page.waitFor(1000);
	await page.click('#ctl00_LocatorPublicPageContent_btnAccept');
	await page.waitFor(2000);
	await page.evaluate(() => {
		document.querySelector("#ctl00_LocatorPublicPageContent_txtLastName").setAttribute("maxlength",100);
	});

	var alphastring = alpha + "";
	if (alpha.length > 16) {
		alphastring = alpha.substring(0,16) + "|" + alpha.substring(16);
	}
//	console.log("alphastring", alphastring);

	var alphaparts = alphastring.split("|");
	await page.type('#ctl00_LocatorPublicPageContent_txtLastName', alphaparts[0]); //, {delay: 20});		
	if (alphaparts.length>1) {
		await page.type('#ctl00_LocatorPublicPageContent_txtFirstName', alphaparts[1]); //, {delay: 20});		
	}
	await page.waitFor(200);
	await page.click('#ctl00_LocatorPublicPageContent_btnSearch');
	await page.waitFor(3000);
	var results = [];
	var toomany = await page.evaluate(() => {
		if (document.querySelector("#ctl00_LocatorPublicPageContent_lblMessageText")) {
			if (document.querySelector("#ctl00_LocatorPublicPageContent_lblMessageText").innerText.trim()
			== "Displaying the first 1000 records") {
				return true;
			}
		}
		return false;
	});
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
		morePages[alpha] = true;
		while(morePages[alpha]) {
			pageIndexes[alpha]++;
			var data = await page.evaluate(() => {
				var r = {results:[]};
				if (document.querySelector('#ctl00_LocatorPublicPageContent_gvGridView > tbody')) {
					var html = document.querySelector('#ctl00_LocatorPublicPageContent_gvGridView > tbody').innerHTML;
					var matches = [];
					var re = /<tr>.*?<td><a.*?>(.*?)<\/a><\/td>.*?<td>(.*?)<\/td>.*?<td>(.*?)<\/td>.*?<td>(.*?)<\/td>.*?<\/tr>/sg;
					do { m = re.exec(html); if (m) { matches.push(m); } } while (m);
					for (var m in matches) {
						r.results.push({
							name:matches[m][1].trim()
							,
							id:matches[m][2].trim()
							,
							age:matches[m][3].trim()
							,
							admdate:matches[m][4].trim()
						});
					}
				} else {
					r.error = "no gridview body found";
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
//			morePages[alpha] = false;
		}

		
	}
	browsers[alpha].close();
	return {alpha:alpha, results:results, skipped:skipped};
};


var scrapeAlpha = (alpha) => {
	pageIndexes[alpha] = 0;
	if (fs.existsSync("./California/"+alpha+".csv")) {
		console.log("File exists, so skipping " + alpha + ".");
		alphas[alpha].done = true;
		alphas[alpha].busy = false;
		tryAnotherAlpha('File existed already.');
	} else {
		console.log("Starting '"+alpha+"'...");
		scrape(alpha).then((x) => {
	//		console.log("x", x);
			if (x.results.length>0) {
				var csv = parser.parse(x.results);		
				var lines = csv.split('\n');
				lines.splice(0,1);
				csv = lines.join('\n');		
				fs.writeFile("./California/"+x.alpha+".csv", csv+"\n", ()=>{});
			}
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
var ALPHAHALVES = ['[A-M]','[N-Z]'];
var ALPHAPARTS = ALPHAHALVES;
//console.log("ALPHAPARTS", ALPHAPARTS);



/*
var useLetters = 'ABCDEFG';
for (var a in useLetters) {
	alphas[useLetters[a]] = {busy:false,done:false};
}
delete alphas['V'];
*/

// alphas["[A-Z]'"] = {busy:false,done:false};

//var alphas = {'V[A-M][A-M][A-M]':{busy:false, done:false}};
var alphas = {'V':{busy:false,done:false}};

tryAnotherAlpha(1);
tryAnotherAlpha(2);
tryAnotherAlpha(3);
tryAnotherAlpha(4);
tryAnotherAlpha(5);







