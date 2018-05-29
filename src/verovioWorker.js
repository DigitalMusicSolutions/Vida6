/*
Incoming:
-setVerovio (verovioLocation)
-loadData (verovioOptions, dataToLoad)
-renderPage (pageIndex, initOverlay=true)
-edit (editorAction, pageIndex, initOverlay)
-mei

Outgoing:
-dataLoaded (pageCount)
-returnPage (pageIndex, svg, redoOverlay, mei)
-mei (mei)
*/

import * as verovio from 'verovio-dev';

const vrvToolkit = new verovio.toolkit;

function contactCaller(message, ticket, params)
{
    postMessage([message, ticket, params]);
}

// Page index comes in 0-indexed and should be returned 0-indexed, but Verovio requires 1-indexed
function renderPage(index, ticket)
{
    try {
        var rendered = vrvToolkit.renderPage(index + 1);
        contactCaller("returnPage", ticket, {
            'pageIndex': index, 
            'svg': rendered, 
            'createOverlay': true, 
            'mei': vrvToolkit.getMEI()
        });
    }
    catch (e) {
        contactCaller('error', ticket, {'error': "Render of page " + index + " failed:" + e});
    }
}

self.addEventListener('message', function (event) {
    var messageType = event.data[0];
    var ticket = event.data[1];
    var params = event.data[2];

    switch (messageType)
    {
        case "loadData":
            vrvToolkit.loadData(params.mei);
            contactCaller('dataLoaded', ticket, {'pageCount': vrvToolkit.getPageCount()});
            break;

        case "setOptions":
            vrvToolkit.setOptions(params.options);
            break;

        case "renderPage":
           renderPage(params.pageIndex, ticket);
           break;

        case "edit":
            try {
                var res = vrvToolkit.edit(params.action);
                renderPage(params.pageIndex, ticket);
            }
            catch (e) {
                contactCaller('error', ticket, {'error': "Edit failed:" + e});
            }
            break;

        case "mei":
            contactCaller("mei", ticket, {'mei': vrvToolkit.getMEI()});
            break;

        default:
            contactCaller('error', ticket, {'error': "Did not recognize input" + event.data});
            break;
    }
}, false);
