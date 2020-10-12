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
            const data = [];
            const metas = [];

            $('head > meta').each((index, el) => {
                console.log("meta element");
                console.log(el.attribs);
//                metas.push({
//                    name: el.attr("name"),
//                    content: el.attr("content"),
//                });
            });
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
//                html: body,
                title: $('title').text(), 
                metas: metas, 
                data: data,
            });

//            await Apify.utils.enqueueLinks({
//                $,
//                requestQueue,
//                baseUrl: request.loadedUrl,
//                pseudoUrls: purls,
//            });            
            
        },
    });

    await crawler.run();
});