const puppeteer = require('puppeteer');
const fs = require("fs");
const { Parser } = require('json2csv');
const parser = new Parser();
var BrowserPages = {};

var browsers = {};

let scrape = async (alpha) => {
	
	browsers[alpha] = await puppeteer.launch({headless: true});	// <--- set to true for scraping
	var page = await browsers[alpha].newPage();
	await page.goto('https://www.ms.gov/mdoc/inmate/Search/Index');
//	await page.waitFor(1000);
	await page.type('#LastName', alpha); //, {delay: 20});
	await page.click('#PageContentBody > form > div > input.button01.button');
//	await page.waitFor(1000);

	morePages = true;
	var results = [];
	
	/* 
	[?] How to navigate back and then to the proper paginated page again? This process kind of sucks for that.
	*/
	
	while(morePages) {
		
		await page.waitFor(5000);

		var urls = await page.evaluate(() => {
			var r = [];
			$("tr.resultPages").each(function() {
//				if ($(this).css("display")=="table-row") {
					id = $(this).html().match(/GetDetails\/([A-Za-z0-9]+)"/)[1];
					r.push(id);
//				}
			});
			return r;
		});
//		console.log("urls", urls);

		
		
		for (var i=0;i<urls.length;i++) {
//			console.log(i+2);
			var visitURL = 'https://www.ms.gov/mdoc/inmate/Search/GetDetails/'+urls[i];
//			console.log("visitURL", visitURL);
			page.goto(visitURL);
//			await page.waitFor(1000);
			// Do some scraping here...
			var rec = false;
			try {
				await page.waitForSelector('#PageContentBody');
				await page.waitFor(500);
				rec = await page.evaluate(() => {
					try {
						var html = $("#PageContentBody").html();
						var dob = html.match(/Date of Birth.*?([0-9]{2}\/[0-9]{2}\/[0-9]{4})/)[1];
						var name = $("h3").html();
						var race = html.match(/Race.*?([A-Z]+)/)[1];
						var sex = html.match(/Sex.*?([A-Z]+)/)[1];
						return {
							name:name
							,
							dob:dob
							,
							sex:sex
							,
							race:race
		//					,
		//					html:html
						};
					} catch(er) { return false; }
				});
			} catch(er) { rec = false; }
			if (!!rec) {
				results.push(rec);		
			}
//			await page.goBack();
		}
/*
		var result = await page.evaluate(() => {
			return {
				morePages:!$("#NextPageButton").hasClass("disabled")
			};
		});
		morePages = result.morePages;
		console.log("morePages", result.morePages);
		if (morePages) {
			await page.click('#NextPageButton');			
		}		
*/
		morePages = false;											// <-- comment this to run all pages
	}
	await page.waitFor(1000);
	browsers[alpha].close();
	return {alpha:alpha, results:results};
};


var scrapeAlpha = (alpha) => {
	BrowserPages[alpha] = true;
	console.log("Starting '"+alpha+"'...");
	scrape(alpha).then((x) => {
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
	});	
}


var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
var alphabet = ALPHABET.toLowerCase();
//for (var l=0;l<alphabet.length;l++) { scrapeAlpha(alphabet[l]); }


scrapeAlpha('T[AEIOU]');
scrapeAlpha('T[BCDFGHJK]');
scrapeAlpha('T[LMNPQRS]');
scrapeAlpha('T[TVWXYZ]');

//scrapeAlpha('Bron');
//scrapeAlpha('B');



