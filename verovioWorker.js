/*
Incoming:
-loadData (verovioOptions, dataToLoad)
-renderPage (pageIndex, initOverlay=true)
-edit (editorAction, pageIndex, initOverlay)
-mei

Outgoing:
-dataLoaded (pageCount)
-returnPage (pageIndex, svg, redoOverlay)
-mei (mei)
*/

importScripts("verovio.min.js");
var vrvToolkit = new verovio.toolkit();

this.addEventListener('message', function(event){
    switch (event.data[0])
    {
        case "loadData":
            vrvToolkit.loadData(event.data[1]);
            postMessage(['dataLoaded', vrvToolkit.getPageCount()]);
            break;

        case "setOptions":
            vrvToolkit.setOptions(event.data[1]);
            break;

        case "renderPage": // page index comes in 0-indexed and should be returned 0-indexed
            try {
                var rendered = vrvToolkit.renderPage(event.data[1] + 1);
            }
            catch (e) {
                postMessage(["Render of page " + event.data[1] + " failed:" + e])
            }
            postMessage(["returnPage", event.data[1], rendered, event.data[2] || true]);
            break;

        case "edit":
            //event.data{1: editorAction, 2: 0-indexed page index, 3: init overlay (to be passed back)}
            var res = vrvToolkit.edit(event.data[1]);
            var rendered = vrvToolkit.renderPage(event.data[2] + 1);
            postMessage(["returnPage", event.data[2], rendered, event.data[3]]);
            break;

        case "mei":
            postMessage(["mei", vrvToolkit.getMEI()]);
            break;

        default:
            postMessage(["Did not recognize that input", event.data]);
            break;
    }
}, false);