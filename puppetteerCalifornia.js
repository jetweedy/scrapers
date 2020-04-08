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
	await page.waitFor(1000);
	await page.evaluate(() => {
		document.querySelector("#ctl00_LocatorPublicPageContent_txtLastName").setAttribute("maxlength",100);
	});
	await page.type('#ctl00_LocatorPublicPageContent_txtLastName', alpha); //, {delay: 20});		
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
		for (var ap in ALPHAPARTS) {
			alphas.push(alpha+ALPHAPARTS[ap]);
		}
		console.log("Too many for '"+alpha+"', so splitting...");
		skipped = true;
	} else {
		

		var morePages = true;
		while(morePages) {
			await page.waitFor(1500);
			var data = await page.evaluate(() => {
				var r = [];
				if (document.querySelector('#ctl00_LocatorPublicPageContent_gvGridView > tbody')) {
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
				}
				return r;
			});
			for (var r in data) {
				results.push(data[r]);
			}
	//		console.log("data", data);
			morePages = await page.evaluate(() => {
				var as = document.getElementsByTagName("A");
				for (var a=0;a<as.length;a++) {
					if (as[a].innerHTML=="Next Page") {
						return true;
					}
				}
				return false;
			});
//			console.log("morePages", morePages);
			if (morePages) {
				await page.click('#ctl00_LocatorPublicPageContent_gvGridView > tbody > tr:nth-child(23) > td > table > tbody > tr > td:last-child > a');			
			}
			await page.waitFor(500);
//			morePages = false;
		}

		
	}
	browsers[alpha].close();
	return {alpha:alpha, results:results, skipped:skipped};
};


var scrapeAlpha = (alpha) => {
	if (fs.existsSync("./California/"+alpha+".csv")) {
		console.log("File exists, so skipping " + alpha + ".");
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
			} else {
				console.log("Split '" + x.alpha + "' due to excess results.");
			}
			tryNextAlpha()
		});	
	}
}





function tryAlpha(ai) {
	if (ai<alphas.length) {
		scrapeAlpha(alphas[ai]);
	}
}
function tryNextAlpha() {
	tryAlpha(++alphaIndex);
}
var browsers = {};
var alphaIndex = -1;

var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
var ALPHAHALVES = ['[A-M]','[N-Z]'];
var ALPHAPARTS = [];
for (var a=0;a<ALPHABET.length;a+=4) {
	var ps = "["+ALPHABET[a];
/*
	if (typeof ALPHABET[a+6] != "undefined") {
		ps = ps+"-"+ALPHABET[a+6];
	}
	else
	if (typeof ALPHABET[a+5] != "undefined") {
		ps = ps+"-"+ALPHABET[a+5];
	} 
	else
	if (typeof ALPHABET[a+4] != "undefined") {
		ps = ps+"-"+ALPHABET[a+4];
	} 
	else 
*/
	if (typeof ALPHABET[a+3] != "undefined") {
		ps = ps+"-"+ALPHABET[a+3];
	} 
	else
	if (typeof ALPHABET[a+2] != "undefined") {
		ps = ps+"-"+ALPHABET[a+2];
	} 
	else 
	if (typeof ALPHABET[a+1] != "undefined") {
		ps = ps+"-"+ALPHABET[a+1];
	}
	ps = ps + "]";
	ALPHAPARTS.push(ps);
}
var ALPHAPARTS = ALPHAHALVES;
console.log("ALPHAPARTS", ALPHAPARTS);

var alphas = ['V'];
console.log("alphas", alphas);
tryNextAlpha();




/*
//// To run alphas
alphas = [
	'W[AEIOU]'
	,'W[BCDFGHJK]'
	,'W[LMNPQRS]'
	,'W[TVWXYZ]'
	,[UVXYZ]'
];
tryNextAlpha();
tryNextAlpha();
//// etc
*/




