import { createAjaxQueue } from "../logic/ajaxMultiQueue";

let ajaxQueue = createAjaxQueue(25);

/**
 * Gets from requestUrl a given JSON and calls back an anonymous function
 * @param requestUrl
 */
export function getJSON(requestUrl) {
    return new Promise(function(resolve, reject) {
        ajaxQueue.queue({
            dataType: "json",
            url: requestUrl,
            success: json => resolve(json),
            fail: reason => reject(reason),
        });
    });
}
