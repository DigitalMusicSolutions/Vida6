/*
Incoming:
-setVerovio (verovioLocation)
-loadData (verovioOptions, dataToLoad)
-RenderToSVG (pageIndex, initOverlay=true)
-edit (editorAction, pageIndex, initOverlay)
-mei

Outgoing:
-dataLoaded (pageCount)
-returnPage (pageIndex, svg, redoOverlay, mei)
-mei (mei)
*/

var vrvToolkit;
var vrvSet = false;

var contactCaller = function (message, ticket, params)
{
    postMessage([message, ticket, params]);
};

// Page index comes in 0-indexed and should be returned 0-indexed, but Verovio requires 1-indexed
var RenderToSVG = function (index, ticket)
{
    try {
        var rendered = vrvToolkit.renderToSVG(index + 1);
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
};

this.addEventListener('message', function (event){
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
            importScripts(params.location);
            HateESLint = verovio.toolkit;
            vrvToolkit = new HateESLint();
            vrvSet = true;
            break;

        case "loadData":
            vrvToolkit.loadData(params.mei);
            contactCaller('dataLoaded', ticket, {'pageCount': vrvToolkit.getPageCount()});
            break;

        case "setOptions":
            vrvToolkit.setOptions(params.options);
            break;

        case "renderPage":
           RenderToSVG(params.pageIndex, ticket);
           break;

        case "edit":
            try {
                var res = vrvToolkit.edit(params.action);
                RenderToSVG(params.pageIndex, ticket);
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
