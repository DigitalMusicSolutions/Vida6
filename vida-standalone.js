// Perma-vars
// const workerLocation = "verovio-worker.js"; // TODO: possible to make from existing code?
// const verovioWorker = new Worker(workerLocation);
const parser = new DOMParser();

export class Vida 
{
    //options needs to include workerLocation and parentElement
    constructor(options)
    {
        // Set up UI and layout
        this.ui = {
            parentElement: options.parentElement, // must be DOM node
            svgWrapper: undefined,
            svgOverlay: undefined,
            controls: undefined,
            popup: undefined
        };
        this.initializeLayout();
        this.verovioWorker = new Worker(options.workerLocation);
        this.initializeWorker();

        this.resizeTimer = undefined;
        this.updateDims();
        $(window).on('resize.vida', this.resizeComponents);
        this.verovioSettings = {
            pageHeight: 100,
            pageWidth: 100,
            inputFormat: 'mei', // change at thy own risk
            scale: 40,
            border: 50,
            horizontallyOriented: 0,    //1 or 0 (NOT boolean, but mimicing it) for whether the page will display horizontally or vertically
            ignoreLayout: 1,
            adjustPageHeight: 1
        };
        this.mei = undefined;
        this.verovioContent = undefined;
        this.pageCount = 0;
        this.systemData = { // actually an array, but just in case
            /*
            index: {
                'topOffset':
                'id': 
            }
            */
        };
        // pageTops should just use systemData topOffset
    }

    initializeLayout()
    {
        this.ui.parentElement.innerHTML = '<div id="vida-page-controls">' +
            '<div class="vida-prev-page vida-direction-control"></div>' +
            '<div class="vida-zoom-controls">' +
                '<span class="vida-zoom-in"></span>' +
                '<span class="vida-zoom-out"></span>' +
            '</div>' +
            //'<div class="vida-grid-toggle">Toggle to grid</div>' +
            '<div class="vida-orientation-toggle">Toggle orientation</div>' +
            '<div class="vida-next-page vida-direction-control"></div>' +
        '</div>' +
        '<div id="vida-svg-wrapper" class="vida-svg-object" style="z-index: 1; position:absolute;"></div>' +
        '<div id="vida-svg-overlay" class="vida-svg-object" style="z-index: 1; position:absolute;"></div>' +
        '<div id="vida-loading-popup"></div>';

        this.ui.svgWrapper = document.getElementById("vida-svg-wrapper");
        this.ui.svgOverlay = document.getElementById("vida-svg-overlay");
        this.ui.controls = document.getElementById("vida-page-controls");
        this.ui.popup = document.getElementById("vida-loading-popup");
    }

    initializeWorker()
    {
        var self = this;
        this.verovioWorker.onmessage = function(event){
            switch (event.data[0]){
                case "dataLoaded":
                    self.pageCount = event.data[1];
                    const vidaOffset = self.ui.svgWrapper.getBoundingClientRect().top;
                    for(var pIdx = 0; pIdx < self.pageCount; pIdx++)
                    {
                        self.ui.svgWrapper.innerHTML += "<div class='vida-system-wrapper' data-index='" + pIdx + "'></div>";
                        self.contactWorker("renderPage", [pIdx]);
                    }
                    break;

                case "returnPage":
                    const pageIdx = event.data[1];
                    document.querySelector(".vida-system-wrapper[data-index='" + pageIdx + "']").innerHTML = event.data[2];

                    const parsedSVG = parser.parseFromString(event.data[2], "text/xml");
                    const systems = parsedSVG.querySelectorAll('g[class=system]');
                    for(var sIdx = 0; sIdx < systems.length; sIdx++) 
                    {
                        self.systemData[systems[sIdx].id] = {
                            'topOffset': systems[sIdx].getBoundingClientRect().top - vidaOffset - self.verovioSettings.border,
                            'pageIdx': pageIdx
                        };   
                    }

                    self.verovioContent = $("#vida-svg-wrapper").html();
                    if(event.data[3]) self.createOverlay( 0 );
                    $(".vida-loading-popup").remove();
                    reapplyHighlights();
                    break;

                case "mei":
                    mei = event.data[1];
                    console.log(mei);
                    break;

                default:
                    console.log("Message from Verovio of type", event.data[0] + ":", event.data);
                    break;
            }
        };
    }

    contactWorker(messageType, data)
    {
        this.verovioWorker.postMessage([messageType].concat(data || []));
    }

    reloadOptions()
    {
        this.verovioSettings.pageHeight = Math.max(this.ui.svgWrapper.clientHeight * (100 / this.verovioSettings.scale) - this.verovioSettings.border, 100); // minimal value required by Verovio
        this.verovioSettings.pageWidth = Math.max(this.ui.svgWrapper.clientWidth * (100 / this.verovioSettings.scale) - this.verovioSettings.border, 100); // idem     
        this.verovioWorker.postMessage(['setOptions', JSON.stringify(this.verovioSettings)]);
    }

    // TODO: strip jQuery
    resizeComponents()
    {
        // Immediately: resize larger components
        this.updateDims();

        // Set timeout for resizing Verovio once full resize action is complete
        clearTimeout(this.resizeTimer);
        const self = this;
        this.resizeTimer = setTimeout(function ()
        {
            self.refreshVerovio();
        }, 200);
    }

    updateDims()
    {
        this.ui.svgOverlay.style.height = this.ui.svgWrapper.style.height = this.ui.parentElement.clientHeight - this.ui.controls.clientHeight;
        this.ui.svgOverlay.style.top = this.ui.svgWrapper.style.top = this.ui.controls.clientHeight;
        this.ui.svgOverlay.style.width = this.ui.svgWrapper.style.width = this.ui.parentElement.clientWidth;
    }

    initPopup(text)
    {
        this.ui.popup.style.top = this.ui.parentElement.getBoundingClientRect().top + 50;
        this.ui.popup.style.left = this.ui.parentElement.getBoundingClientRect().left + 30;
        this.ui.popup.innerHTML = text;
        this.ui.popup.style.display = "block";
    }

    hidePopup()
    {
        this.ui.popup.innerHTML = "";
        this.ui.popup.style.display = "none";
    }

    // Used to reload Verovio, or to provide new MEI
    refreshVerovio(mei)
    {
        if (mei) this.mei = mei;
        if (!this.mei) return;

        this.ui.svgOverlay.innerHTML = this.ui.svgWrapper.innerHTML = this.verovioContent = "";
        this.reloadOptions();
        this.contactWorker('loadData', this.mei + "\n");
    }

    createOverlay(param)
    {
        console.log("Would create overlay", param);
    }
}

// Input and output
let mei = "";
let svg = "";

// Layout info
let systemData = {}; //systemID: {'topOffset': offset, 'pageIdx'': pageidx}
let pageTops = [];

// Various other pieces of information
let currentPage = 0;
let totalPages = 0;
let clickedPage;

// Settings to pass to Verovio
var verovioSettings = {
    border: 50,
    horizontallyOriented: 0,    //1 or 0 (NOT boolean, but mimicing it) for whether the page will display horizontally or vertically
    ignoreLayout: 1,
    pageHeight: 100,
    pageWidth: 100,
};

// Laurent's dragging stuff
var drag_id = [];
var drag_start;
var dragging;
var highlighted_cache = [];


function reloadPage(pageIdx, initOverlay)
{
    initPopup("Reloading...");
    reloadMEI();
    // verovioWorker.postMessage(['renderPage', pageIdx, initOverlay]);
}

this.changeMusic = function(newData)
{
    refreshVerovio(newData);
};

this.reloadPanel = function()
{            
    reloadOptions();
    refreshVerovio();
};

this.toggleOrientation = function()
{
    if(verovioSettings.horizontallyOriented === 1)
    {
        verovioSettings.horizontallyOriented = 0;
        $('.vida-direction-control').show();
    }
    else
    {
        verovioSettings.horizontallyOriented = 1;
        $('.vida-direction-control').hide();
    }

    refreshVerovio();
};

this.edit = function(editorAction)
{
    // verovioWorker.postMessage(['edit', editorAction]);
};

this.scrollToObject = function(id)
{
    var parent = options.parentSelector[0];
    var index = $("#vida-svg-overlay " + id).closest('#vida-svg-overlay > svg').index("#vida-svg-overlay > svg")

    scrollToPage(index);
};

function newHighlight(div, id) 
{
    for(var idx = 0; idx < highlighted_cache.length; idx++)
    {
        if(div == highlighted_cache[idx][0] && id == highlighted_cache[idx][1]) return;
    }
    highlighted_cache.push([div, id]);
    reapplyHighlights();
}

function reapplyHighlights()
{
    for(var idx = 0; idx < highlighted_cache.length; idx++)
    {
        $("#" + highlighted_cache[idx][0] + " * #" + highlighted_cache[idx][1] ).css({
            "fill": "#ff0000",
            "stroke": "#ff0000",
            "fill-opacity": "1.0",
            "stroke-opacity": "1.0"
        });
    }
}

function removeHighlight(div, id)
{
    for(var idx = 0; idx < highlighted_cache.length; idx++)
    {
        if(div == highlighted_cache[idx][0] && id == highlighted_cache[idx][1])
        {
            var removed = highlighted_cache.splice(idx, 1);
            var css = removed[0] == "vida-svg-wrapper" ?
                {
                    "fill": "#000000",
                    "stroke": "#000000",
                    "fill-opacity": "1.0",
                    "stroke-opacity": "1.0"
                } :
                {
                    "fill": "#000000",
                    "stroke": "#000000",
                    "fill-opacity": "0.0",
                    "stroke-opacity": "0.0"
                };
            $("#" + removed[0] + " * #" + removed[1] ).css(css);
            return;
        }
    }
}

function resetHighlights()
{
    while(highlighted_cache[0])
    {
        removeHighlight(highlighted_cache[0][0], highlighted_cache[0][1]);
    }
}

var mouseDownListener = function(e)
{
    var idx;
    var t = e.target, tx = parseInt(t.getAttribute("x"), 10), ty = parseInt(t.getAttribute("y"), 10);
    var id = t.parentNode.attributes.id.value;
    var sysID = t.closest('.system').attributes.id.value;
    var sysIDs = Object.keys(systemData);

    for(idx = 0; idx < sysIDs.length; idx++)
    {
        var curID = sysIDs[idx];
        if(curID == sysID)
        {
            clickedPage = systemData[curID].pageIdx;
            break;
        }
    }

    if (id != drag_id[0]) drag_id.unshift( id ); // make sure we don't add it twice
    //hide_id( "svg_output", drag_id[0] );
    resetHighlights();
    newHighlight( "vida-svg-overlay", drag_id[0] );

    var viewBoxSVG = $(t).closest("svg");
    var parentSVG = viewBoxSVG.parent().closest("svg")[0];
    var actualSizeArr = viewBoxSVG[0].getAttribute("viewBox").split(" ");
    var actualHeight = parseInt(actualSizeArr[2]);
    var actualWidth = parseInt(actualSizeArr[3]);
    var svgHeight = parseInt(parentSVG.getAttribute('height'));
    var svgWidth = parseInt(parentSVG.getAttribute('width'));
    var pixPerPix = ((actualHeight / svgHeight) + (actualWidth / svgWidth)) / 2;

    drag_start = {
        "x": tx, 
        "initY": e.pageY, 
        "svgY": ty, 
        "pixPerPix": pixPerPix //ty / (e.pageY - $("#vida-svg-wrapper")[0].getBoundingClientRect().top)
    };
    // we haven't started to drag yet, this might be just a selection
    dragging = false;
    $(document).on("mousemove", mouseMoveListener);
    $(document).on("mouseup", mouseUpListener);
    $(document).on("touchmove", mouseMoveListener);
    $(document).on("touchend", mouseUpListener);
    mei.Events.publish("HighlightSelected", [id])
};

var mouseMoveListener = function(e)
{
    var scaledY = drag_start.svgY + (e.pageY - drag_start.initY) * drag_start.pixPerPix;
    e.target.parentNode.setAttribute("transform", "translate(" + [0 , scaledY] + ")");

    $(e.target).parent().css({
        "fill-opacity": "0.0",
        "stroke-opacity": "0.0"
    });

    // we use this to distinct from click (selection)
    dragging = true;
    editorAction = JSON.stringify({ action: 'drag', param: { elementId: drag_id[0], 
        x: parseInt(drag_start.x),
        y: parseInt(scaledY) }   
    });

    // verovioWorker.postMessage(['edit', editorAction, clickedPage, false]); 
    removeHighlight( "vida-svg-overlay", drag_id[0] );  
    newHighlight( "vida-svg-wrapper", drag_id[0] ); 
    e.preventDefault();
};

var mouseUpListener = function()
{
    $(document).unbind("mousemove", mouseMoveListener);
    $(document).unbind("mouseup", mouseUpListener);
    $(document).unbind("touchmove", mouseMoveListener);
    $(document).unbind("touchend", mouseUpListener);
    if (dragging) {
        removeHighlight("vida-svg-overlay", drag_id[0]);
        delete this.__origin__; 
        reloadPage( clickedPage, true );
        dragging = false; 
        drag_id.length = 0;
    }
};

function create_overlay( id ) {
    $("#vida-svg-overlay").html( $("#vida-svg-wrapper").html() );
    overlay_svg = $("#vida-svg-overlay > svg");

    var gElems = document.querySelectorAll("#vida-svg-overlay * g");
    var pathElems = document.querySelectorAll("#vida-svg-overlay * path");
    var idx;

    for (idx = 0; idx < gElems.length; idx++)
    {
        gElems[idx].style.strokeOpacity = 0.0;
        gElems[idx].style.fillOpacity = 0.0;
    }
    for (idx = 0; idx < pathElems.length; idx++)
    {
        pathElems[idx].style.strokeOpacity = 0.0;
        pathElems[idx].style.fillOpacity = 0.0;
    }

    $("#vida-svg-overlay * text").remove();
    $(".vida-svg-object").on('click.vida', function(e) {
        var closestMeasure = $(e.target).closest(".measure");
        if (closestMeasure.length > 0)
            mei.Events.publish('MeasureClicked', [closestMeasure]);
        e.stopPropagation();
    });

    $("#vida-svg-overlay * .note").on('mousedown.vida', mouseDownListener);
    $("#vida-svg-overlay * .note").on('touchstart.vida', mouseDownListener);
    $("#vida-svg-overlay * defs").append("filter").attr("id", "selector");
    // resizeComponents();
}

var syncScroll = function(e)
{        
    var newTop = $(e.target).scrollTop();
    $("#vida-svg-wrapper").scrollTop(newTop);

    for(var idx = 0; idx < pageTops.length; idx++)
    {
        var thisTop = pageTops[idx];
        if(newTop <= thisTop)
        {
            //there's a bit at the top
            currentPage = idx;
            break;
        }
    }

    checkNavIcons();
};

var scrollToPage = function(pageNumber)
{
    var toScrollTo = pageTops[pageNumber];
    if ((toScrollTo > document.querySelector("#vida-svg-overlay").getBoundingClientRect().bottom) ||
        (toScrollTo < document.querySelector("#vida-svg-overlay").getBoundingClientRect().top))
        $("#vida-svg-overlay").scrollTop(toScrollTo);
    
    checkNavIcons();
};

//updates nav icon displays
var checkNavIcons = function()
{
    if(currentPage === totalPages - 1)
    {
        $(".vida-next-page").css('visibility', 'hidden');
    }
    else if($(".vida-next-page").css('visibility') == 'hidden')
    {
        $(".vida-next-page").css('visibility', 'visible');
    }            

    if(currentPage === 0)
    {
        $(".vida-prev-page").css('visibility', 'hidden');
    }
    else if($(".vida-prev-page").css('visibility') == 'hidden')
    {
        $(".vida-prev-page").css('visibility', 'visible');
    }
};

$(".vida-orientation-toggle").on('click', this.toggleOrientation);

$(".vida-grid-toggle").on('click', this.toggleGrid);

$(".vida-next-page").on('click', function()
{
    if (currentPage < totalPages - 1)
    {
        scrollToPage(currentPage + 1);
    }
});

$(".vida-prev-page").on('click', function()
{
    if (currentPage > 0)
    {
        scrollToPage(currentPage - 1);
    }
});

$("#vida-svg-overlay").on('scroll', syncScroll);

$(".vida-zoom-in").on('click', function()
{
    if (verovioSettings.scale <= 100)
    {
        verovioSettings.scale += 10;
        refreshVerovio();
    }
    if(verovioSettings.scale == 100)
    {
        $(".vida-zoom-in").css('visibility', 'hidden');
    }
    else if($(".vida-zoom-out").css('visibility') == 'hidden')
    {
        $(".vida-zoom-out").css('visibility', 'visible');
    }
});

$(".vida-zoom-out").on('click', function()
{
    if (verovioSettings.scale > 10)
    {
        verovioSettings.scale -= 10;
        refreshVerovio();
    }
    if(verovioSettings.scale == 10)
    {
        $(".vida-zoom-out").css('visibility', 'hidden');
    }
    else if($(".vida-zoom-in").css('visibility') == 'hidden')
    {
        $(".vida-zoom-in").css('visibility', 'visible');
    }
});