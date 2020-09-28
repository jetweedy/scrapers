const puppeteer = require('puppeteer');
const fs = require("fs");
const { Parser } = require('json2csv');
const parser = new Parser();

let ids = {};



let scrape = async (alpha) => {
	browsers[alpha] = await puppeteer.launch({headless: false});	// <--- set to true for scraping

	var page = await browsers[alpha].newPage();
	await page.goto('https://www.sosnc.gov/online_services/search/by_title/_Business_Registration');
	await page.waitForTimeout(2000);
	await page.type('#SearchCriteria', alpha); //, {delay: 20});		
	await page.waitForTimeout(200);
	await page.click('#SubmitButton');
	await page.waitForTimeout(2000);
	var results = [];
	var skipped = false;

	var toomany = await page.evaluate(() => {
		var aaa = document.body.innerHTML+"";
		var bbb = document.body.innerHTML+"";
		bbb = bbb.replace("Please enter a longer search term","");
		return (aaa!=bbb);
	});


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
				var x = document.body.innerHTML;
//				var patt = RegExp('profile\?Id=[0-9]+','g');
				var patt = RegExp('ShowProfile\\(\'([0-9]+)\'\\)','gis');
				while( (match = patt.exec(x)) !== null) {
					r.results.push(match[1]);
				}
				return r;
			});
			for (var r in data.results) {
				results.push(data.results[r]);
			}
			morePages[alpha] = await page.evaluate(() => {
				var np = document.querySelector("#NextPage");
				if (np && np.className!="disabled" && !np.previousElementSibling.classList.contains("active")) {
					return true;
				}
				return false;
			});
//			console.log("morePages["+alpha+"]", morePages[alpha]);
			if (morePages[alpha]) {
				await page.click('#NextPage');			
				await page.waitForTimeout(1000);
			}
			await page.waitForTimeout(1000);
//			morePages[alpha] = false;				// <--------- leave false because all results hidden on one page
		}


	}
	browsers[alpha].close();
	return {alpha:alpha, results:results, skipped:skipped};
};


var scrapeAlpha = (alpha) => {
	pageIndexes[alpha] = 0;
	if (fs.existsSync("./ncsosresults/"+alpha+".csv")) {
//		console.log("File exists, so skipping " + alpha + ".");
		alphas[alpha].done = true;
		alphas[alpha].busy = false;
		tryAnotherAlpha('File existed already.');
	} else {
//		console.log("Starting '"+alpha+"'...");
		scrape(alpha).then((x) => {
//			console.log("x", x);

			if (x.results.length>0) {
				for (var r in x.results) {
					ids[x.results[r]] = false;
				}
			}

			if (!x.skipped) {
//				console.log("Done with '" + x.alpha + "'.");				
				alphas[alpha].done = true;
				alphas[alpha].busy = false;
			} else {
//				console.log("Split '" + x.alpha + "' due to excess results.");
				alphas[alpha].busy = false;
			}

			tryAnotherAlpha('/scrapeAlpha()');
		});
	}
}


function tryAnotherAlpha(reason) {
	var allDone = true;
	for (var a in alphas) {
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
		setTimeout(() => {
			tryAnotherAlpha('Jobs were busy earlier.');
		}, 1000);
	} else {
		//// This is where we should then handle all of these compiled IDS:
		//// Visit this URL for each of those:
		//// https://www.sosnc.gov/online_services/Search/Business_Registration_profile?Id=10473115
		console.log("ids: ", ids);
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


//var useLetters = 'ABCDEFGH';
//var useLetters = 'IJKLMNOPQR';
//var useLetters = 'STUVQXYZ';

ALPHABET = "AB".split("");
ALPHAPARTS = "AB".split("");
var useLetters = ALPHABET;
for (var a in useLetters) {
	for (var b in useLetters) {
		for (var c in useLetters) {
			alphas[useLetters[a]+useLetters[b]+useLetters[c]] = {busy:false,done:false};
		}
	}
}

alphas = {};
alphas["AAA"] = {busy:false,done:false};
alphas["ABA"] = {busy:false,done:false};

console.log("alphas: ", alphas);

tryAnotherAlpha(1);
//tryAnotherAlpha(2);
//tryAnotherAlpha(3);
//tryAnotherAlpha(4);
//tryAnotherAlpha(5);

