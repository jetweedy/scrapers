const Apify = require('apify');

const useUrls = ['truewindtechnology.com'];
const purls = [];
for (var u in useUrls) {
    purls.push('http[s?]://'+useUrls[u]+'/[.+]');
    purls.push('http[s?]://www.'+useUrls[u]+'/[.+]');        
}


Apify.main(async () => {
    // Prepare a list of URLs to crawl
    
    const requestQueue = await Apify.openRequestQueue();
    for (var u in useUrls) {
        await requestQueue.addRequest({ url: 'https://'+useUrls[u] });    
    }
    
    // Crawl the URLs
    const crawler = new Apify.CheerioCrawler({
        requestQueue,
        handlePageFunction: async ({ request, response, body, contentType, $ }) => {
            const metas = [];
            $('head > meta').each((index, el) => {
                if (typeof el.attribs.name != "undefined") {
                    metas.push({
                        name: el.attribs.name,
                        content: el.attribs.content,
                    });
                }
            });
                        
            const emailregexp = /\S+@\S+\.\S+/;
            const emails = [...$('body').text().matchAll(emailregexp)];
            const phoneregexp = /\(?[0-9]{3}\)?[-.]?[0-9]{3}[-.]?[0-9]{4}/g;
            const phones = [...$('body').text().matchAll(phoneregexp)];
            
            const headings = [];
            $('h1').each((index, el) => {
                headings.push({
                    type: "h1",
                    content: $(el).text(),
                });
            });
            $('h2').each((index, el) => {
                headings.push({
                    type: "h2",
                    content: $(el).text(),
                });
            });
            $('h3').each((index, el) => {
                headings.push({
                    type: "h3",
                    content: $(el).text(),
                });
            });
            
            
            
                       
            const data = [];
/*
            $('.jet-feature-panel').each((index, el) => {
                data.push({
                    title: $(el)
                        .find('.title')
                        .text(),
                });
            });
*/
            // Save the data to dataset.
            await Apify.pushData({
                url: request.url,
                title: $('title').text(), 
                headings: headings, 
                emails: emails,
                phones: phones,
                metas: metas, 
                data: data,
            });

            if (true) {
                await Apify.utils.enqueueLinks({
                    $,
                    requestQueue,
                    baseUrl: request.loadedUrl,
                    pseudoUrls: purls,
                });            
            }
            
        },
    });

    await crawler.run();
});