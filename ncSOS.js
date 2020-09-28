const puppeteer = require('puppeteer');
const fs = require("fs");
const { Parser } = require('json2csv');
const parser = new Parser();


/*

Go through lists of results and compile array of Ids:
Then Visit this URL for each of those:
https://www.sosnc.gov/online_services/Search/Business_Registration_profile?Id=10473115
*/


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
			/*
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
			*/
			morePages[alpha] = await page.evaluate(() => {
				var np = document.querySelector("#NextPage");
				if (np && np.className!="disabled") {
					return true;
				}
				return false;
			});
//			console.log("morePages["+alpha+"]", morePages[alpha]);
			if (morePages[alpha]) {
				await page.click('#NextPage');			
				await page.waitFor(10000);
			}
			await page.waitFor(2000);
//			morePages[alpha] = false;				// <--------- leave false because all results hidden on one page
		}


	}

	browsers[alpha].close();
	return {alpha:alpha, results:results, skipped:skipped};
};


var scrapeAlpha = (alpha) => {
	pageIndexes[alpha] = 0;
	if (fs.existsSync("./ncsosresults/"+alpha+".csv")) {
		console.log("File exists, so skipping " + alpha + ".");
		alphas[alpha].done = true;
		alphas[alpha].busy = false;
		tryAnotherAlpha('File existed already.');
	} else {
		console.log("Starting '"+alpha+"'...");
		scrape(alpha).then((x) => {
			console.log("x", x);
/*
			if (x.results.length>0) {
				var csv = parser.parse(x.results);		
				var lines = csv.split('\n');
				lines.splice(0,1);
				csv = lines.join('\n');		
				fs.writeFile("./ncsosresults/"+x.alpha+".csv", csv+"\n", ()=>{});
			}
*/
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
		}, 1000);
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

console.log("alphas: ", alphas);

tryAnotherAlpha(1);
//tryAnotherAlpha(2);
//tryAnotherAlpha(3);
//tryAnotherAlpha(4);
//tryAnotherAlpha(5);

