const Apify = require('apify');

Apify.main(async () => {
    // Prepare a list of URLs to crawl
    
    const requestQueue = await Apify.openRequestQueue();
    await requestQueue.addRequest({ url: 'https://truewindtechnology.com' });    
    
    // Crawl the URLs
    const crawler = new Apify.CheerioCrawler({
        requestQueue,
        handlePageFunction: async ({ request, response, body, contentType, $ }) => {
            const data = [];

            // Do some data extraction from the page with Cheerio.
            $('.jet-feature-panel').each((index, el) => {
                data.push({
                    title: $(el)
                        .find('.title')
                        .text(),
                });
            });

            // Save the data to dataset.
            await Apify.pushData({
                url: request.url,
//                html: body,
                data,
            });

            await Apify.utils.enqueueLinks({
                $,
                requestQueue,
                baseUrl: request.loadedUrl,
                pseudoUrls: ['http[s?]://truewindtechnology.com/[.+]', 'http[s?]://www.truewindtechnology.com/[.+]'],
            });            
            
        },
    });

    await crawler.run();
});