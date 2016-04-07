/*
Incoming:
-setVerovio (verovioLocation)
-loadData (verovioOptions, dataToLoad)
-renderPage (pageIndex, initOverlay=true)
-edit (editorAction, pageIndex, initOverlay)
-mei

Outgoing:
-dataLoaded (pageCount)
-returnPage (pageIndex, svg, redoOverlay)
-mei (mei)
*/

let vrvToolkit;
let vrvSet = false;

const contactCaller = function(message, ticket, params)
{
    postMessage([message, ticket, params]);
};

this.addEventListener('message', function(event){
    var rendered;
    var messageType = event.data[0];
    var ticket = event.data[1];
    var params = event.data[2];

    if (!vrvSet && messageType != "setVerovio") {
        contactCaller('error', ticket, {'error': "setVerovio must be called before the verovioWorker is used!"});
        console.error("setVerovio must be called before the verovioWorker is used!");
        return false;
    }

    switch (messageType)
    {
        case "setVerovio":
            importScripts(event.data[1]);
            vrvToolkit = new verovio.toolkit();
            vrvSet = true;
            break;

        case "loadData":
            vrvToolkit.loadData(params.mei);
            contactCaller('dataLoaded', ticket, {'pageCount': vrvToolkit.getPageCount()});
            break;

        case "setOptions":
            vrvToolkit.setOptions(params.options);
            break;

        case "renderPage": // page index comes in 0-indexed and should be returned 0-indexed
            try {
                rendered = vrvToolkit.renderPage(params.pageIndex + 1);
            }
            catch (e) {
                contactCaller('error', ticket, {'error': "Render of page " + params.pageIndex + " failed:" + e});
            }
            contactCaller("returnPage", ticket, {'pageIndex': params.pageIndex, 'svg': rendered, 'notNeededSoon': params.notNeededSoon || true});
            break;

        case "edit":
            //event.data{1: editorAction, 2: 0-indexed page index, 3: init overlay (to be passed back)}
            var res = vrvToolkit.edit(params.action);
            try {
                rendered = vrvToolkit.renderPage(params.pageIndex + 1);
            }
            catch (e) {
                contactCaller('error', ticket, {'error': "Render of page " + params.pageIndex + " failed:" + e});
            }
            contactCaller("returnPage", ticket, {'pageIndex': params.pageIndex, 'svg': rendered, 'notNeededSoon': params.notNeededSoon});
            break;

        case "mei":
            contactCaller("mei", ticket, {'mei': vrvToolkit.getMEI()});
            break;

        default:
            contactCaller('error', ticket, {'error': "Did not recognize input" + event.data});
            break;
    }
}, false);