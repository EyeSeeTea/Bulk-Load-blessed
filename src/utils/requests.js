import { createAjaxQueue } from "../logic/ajaxMultiQueue";

const ajaxQueue = createAjaxQueue(25);

/**
 * Gets from requestUrl a given JSON and calls back an anonymous function
 * @param requestUrl
 */
export function getJSON(_d2, requestUrl) {
    return new Promise(function (resolve, reject) {
        ajaxQueue.queue({
            dataType: "json",
            url: requestUrl,
            success: json => resolve(json),
            fail: reason => reject(reason),
            xhrFields: {
                withCredentials: true,
            },
        });
    });
}
