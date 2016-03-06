/**
 * Vida6 - An ES6 controller for Verovio
 */

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
        // initializes layout of the parent element and Verovio communication; "private function"
        this.initializeLayoutAndWorker(options);

        this.resizeTimer = undefined;
        this.updateDims();
        window.addEventListener('resize.vida', this.resizeComponents);
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
        this.systemData = [
            /* {
                'topOffset':
                'id': 
            } */
        ];
        
        this.currentSystem = 0; // topmost system object within the Vida display
        this.totalSystems = 0; // total number of system objects

        // For dragging
        this.clickedPage;
        this.drag_id = [];
        this.drag_start;
        this.dragging;
        this.highlighted_cache = [];
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

    createOverlay()
    {
        // Copy wrapper HTML to overlay
        this.ui.svgOverlay.innerHTML = this.ui.svgWrapper.innerHTML;

        // Make all <g>s and <path>s transparent, hide the text
        var idx;
        var gElems = this.ui.svgOverlay.querySelectorAll("g");
        for (idx = 0; idx < gElems.length; idx++)
        {
            gElems[idx].style.strokeOpacity = 0.0;
            gElems[idx].style.fillOpacity = 0.0;
        }
        var pathElems = this.ui.svgOverlay.querySelectorAll("path");
        for (idx = 0; idx < pathElems.length; idx++)
        {
            pathElems[idx].style.strokeOpacity = 0.0;
            pathElems[idx].style.fillOpacity = 0.0;
        }
        delete this.ui.svgOverlay.querySelectorAll("text"); // TODO: was originally $.remove()

        $(".vida-svg-object").on('click.vida', function(e) {
            var closestMeasure = $(e.target).closest(".measure");
            if (closestMeasure.length > 0)
                console.log("Would have published measureClicked");
                // mei.Events.publish('MeasureClicked', [closestMeasure]);
            e.stopPropagation();
        });

        var notes = this.ui.svgOverlay.querySelectorAll(".note");
        for (idx = 0; idx < notes.length; idx++)
        {
            var note = notes[idx];

            this.boundMouseDown = (evt) => this.mouseDownListener(evt);
            note.removeEventListener('mousedown', this.boundMouseDown);
            note.removeEventListener('touchstart', this.boundMouseDown);
            note.addEventListener('mousedown', this.boundMouseDown);
            note.addEventListener('touchstart', this.boundMouseDown);
        }
        // this.ui.svgOverlay.querySelectorAll("defs").append("filter").attr("id", "selector");
        // resizeComponents();
    }

    updateNavIcons()
    {
        if (this.currentSystem === this.totalSystems - 1) this.ui.nextPage.style.visibility = 'hidden';
        else this.ui.nextPage.style.visibility = 'visible';

        if (this.currentSystem === 0) this.ui.prevPage.style.visibility = 'hidden';
        else this.ui.prevPage.style.visibility = 'visible';
    }

    updateZoomIcons()
    {
        if (this.verovioSettings.scale == 100) this.ui.zoomIn.style.visibility = 'hidden';
        else this.ui.zoomIn.style.visibility = 'visible';

        if (this.verovioSettings.scale == 10) this.ui.zoomOut.style.visibility = 'hidden';
        else this.ui.zoomOut.style.visibility = 'visible';
    }

    scrollToObject(id)
    {
        var index = $("#vida-svg-overlay " + id).closest('#vida-svg-overlay > svg').index("#vida-svg-overlay > svg");
        scrollToPage(index);
    }

    scrollToPage(pageNumber)
    {
        var toScrollTo = this.systemData[pageNumber].topOffset;
        this.ui.svgOverlay.scrollTop = toScrollTo;
        this.updateNavIcons();
    }

    initializeLayoutAndWorker(options)
    {
        // Set up the base layout
        this.ui.parentElement.innerHTML = '<div id="vida-page-controls">' +
            '<div id="vida-prev-page" class="vida-direction-control"></div>' +
            '<div id="vida-zoom-controls">' +
                '<span id="vida-zoom-in" class="vida-zoom-control"></span>' +
                '<span id="vida-zoom-out" class="vida-zoom-control"></span>' +
            '</div>' +
            //'<div class="vida-grid-toggle">Toggle to grid</div>' +
            '<div id="vida-next-page" class="vida-direction-control"></div>' +
            '<div id="vida-orientation-toggle">Toggle orientation</div>' +
        '</div>' +
        '<div id="vida-svg-wrapper" class="vida-svg-object" style="z-index: 1; position:absolute;"></div>' +
        '<div id="vida-svg-overlay" class="vida-svg-object" style="z-index: 1; position:absolute;"></div>' +
        '<div id="vida-loading-popup"></div>';

        // Set up the UI object
        this.ui.svgWrapper = document.getElementById("vida-svg-wrapper");
        this.ui.svgOverlay = document.getElementById("vida-svg-overlay");
        this.ui.controls = document.getElementById("vida-page-controls");
        this.ui.popup = document.getElementById("vida-loading-popup");
        this.ui.nextPage = document.getElementById("vida-next-page");
        this.ui.prevPage = document.getElementById("vida-prev-page");
        this.ui.orientationToggle = document.getElementById("vida-orientation-toggle");
        this.ui.zoomIn = document.getElementById("vida-zoom-in");
        this.ui.zoomOut = document.getElementById("vida-zoom-out");

        // Initialize all the listeners on permanent objects
        this.initializeOneTimeListeners(self);

        // Initialize the Verovio WebWorker wrapper
        this.verovioWorker = new Worker(options.workerLocation); // the threaded wrapper for the Verovio object
        var self = this; // for referencing it inside onmessage
        this.verovioWorker.onmessage = function(event){
            const vidaOffset = self.ui.svgWrapper.getBoundingClientRect().top;
            switch (event.data[0]){ // all cases have the rest of the array returned notated in a comment
                case "dataLoaded": // [page count]
                    self.pageCount = event.data[1];
                    for(var pIdx = 0; pIdx < self.pageCount; pIdx++)
                    {
                        self.ui.svgWrapper.innerHTML += "<div class='vida-system-wrapper' data-index='" + pIdx + "'></div>";
                        self.contactWorker("renderPage", [pIdx]);
                    }
                    break;

                case "returnPage": // [page index, rendered svg]
                    const systemWrapper = document.querySelector(".vida-system-wrapper[data-index='" + event.data[1] + "']");
                    systemWrapper.innerHTML = event.data[2];

                    // Add data about the available systems here
                    const systems = self.ui.svgWrapper.querySelectorAll('g[class=system]');
                    for(var sIdx = 0; sIdx < systems.length; sIdx++)
                        self.systemData[sIdx] = {
                            'topOffset': systems[sIdx].getBoundingClientRect().top - vidaOffset - self.verovioSettings.border,
                            'id': systems[sIdx].id
                        };

                    // update the global tracking var
                    self.totalSystems = self.systemData.length;

                    // create the overlay, save the content, remove the popup, make sure highlights are up to date
                    if(event.data[3]) self.createOverlay();
                    self.verovioContent = self.ui.svgWrapper.innerHTML;
                    self.ui.popup.remove();
                    self.reapplyHighlights();
                    break;

                case "mei": // [mei as interpreted by Verovio]
                    mei = event.data[1];
                    break;

                default:
                    console.log("Message from Verovio of type", event.data[0] + ":", event.data);
                    break;
            }
        };
    }

    initializeOneTimeListeners()
    {
        // synchronized scrolling between svg overlay and wrapper
        this.boundSyncScroll = (evt) => this.syncScroll(evt);
        this.ui.svgOverlay.addEventListener('scroll', this.boundSyncScroll); // todo: proxy these

        // control bar events
        this.boundGotoNext = (evt) => this.gotoNextPage(evt);
        this.ui.nextPage.addEventListener('click', this.boundGotoNext);
        this.boundGotoPrev = (evt) => this.gotoPrevPage(evt);
        this.ui.prevPage.addEventListener('click', this.boundGotoPrev);
        this.boundOrientationToggle = (evt) => this.toggleOrientation(evt);
        this.ui.orientationToggle.addEventListener('click', this.boundOrientationToggle);
        this.boundZoomIn = (evt) => this.zoomIn(evt);
        this.ui.zoomIn.addEventListener('click', this.boundZoomIn);
        this.boundZoomOut = (evt) => this.zoomOut(evt);
        this.ui.zoomOut.addEventListener('click', this.boundZoomOut);


    }

    /**
     * Event listeners
     */
    syncScroll(e)
    {
        var newTop = this.ui.svgWrapper.scrollTop = e.target.scrollTop;

        for(var idx = 0; idx < this.systemData.length; idx++)
            if(newTop <= this.systemData[idx].topOffset + 25)
            {
                this.currentSystem = idx;
                break;
            }

        this.updateNavIcons();
    }

    gotoNextPage()
    {
        if (this.currentSystem < this.totalSystems - 1) this.scrollToPage(this.currentSystem + 1);
    }

    gotoPrevPage()
    {
        if (this.currentSystem > 0) this.scrollToPage(this.currentSystem - 1);
    }

    toggleOrientation() // TODO: this setting might not be right. IgnoreLayout instead?
    {
        if(this.verovioSettings.horizontallyOriented === 1)
        {
            this.verovioSettings.horizontallyOriented = 0;
            $('.vida-direction-control').show();
        }
        else
        {
            this.verovioSettings.horizontallyOriented = 1;
            $('.vida-direction-control').hide();
        }

        this.refreshVerovio();
    }

    zoomIn()
    {
        if (this.verovioSettings.scale <= 100)
        {
            this.verovioSettings.scale += 10;
            this.refreshVerovio();
        }
        this.updateZoomIcons();
    }

    zoomOut()
    {
        if (this.verovioSettings.scale > 10)
        {
            this.verovioSettings.scale -= 10;
            this.refreshVerovio();
        }
        this.updateZoomIcons();
    }

    mouseDownListener(e)
    {
        var idx;
        var t = e.target, tx = parseInt(t.getAttribute("x"), 10), ty = parseInt(t.getAttribute("y"), 10);
        var id = t.parentNode.attributes.id.value;
        var sysID = t.closest('.system').attributes.id.value;

        for(idx = 0; idx < this.systemData.length; idx++)
            if(this.systemData[idx].id == sysID)
            {
                this.clickedPage = idx;
                break;
            }

        if (id != this.drag_id[0]) this.drag_id.unshift( id ); // make sure we don't add it twice
        //hide_id( "svg_output", drag_id[0] );
        this.resetHighlights();
        this.newHighlight( "vida-svg-overlay", this.drag_id[0] );

        var viewBoxSVG = $(t).closest("svg");
        var parentSVG = viewBoxSVG.parent().closest("svg")[0];
        var actualSizeArr = viewBoxSVG[0].getAttribute("viewBox").split(" ");
        var actualHeight = parseInt(actualSizeArr[2]);
        var actualWidth = parseInt(actualSizeArr[3]);
        var svgHeight = parseInt(parentSVG.getAttribute('height'));
        var svgWidth = parseInt(parentSVG.getAttribute('width'));
        var pixPerPix = ((actualHeight / svgHeight) + (actualWidth / svgWidth)) / 2;

        this.drag_start = {
            "x": tx, 
            "initY": e.pageY, 
            "svgY": ty, 
            "pixPerPix": pixPerPix //ty / (e.pageY - $("#vida-svg-wrapper")[0].getBoundingClientRect().top)
        };
        // we haven't started to drag yet, this might be just a selection
        this.dragging = false;
        this.boundMouseMove = (evt) => this.mouseMoveListener(evt);
        this.boundMouseUp = (evt) => this.mouseUpListener(evt);
        $(document).on("mousemove", this.boundMouseMove);
        $(document).on("mouseup", this.boundMouseUp);
        $(document).on("touchmove", this.boundMouseMove);
        $(document).on("touchend", this.boundMouseUp);
        console.log("Would have published highlightSelected");
    };

    mouseMoveListener(e)
    {
        const scaledY = this.drag_start.svgY + (e.pageY - this.drag_start.initY) * this.drag_start.pixPerPix;
        e.target.parentNode.setAttribute("transform", "translate(" + [0 , scaledY] + ")");

        $(e.target).parent().css({
            "fill-opacity": "0.0",
            "stroke-opacity": "0.0"
        });

        // we use this to distinct from click (selection)
        this.dragging = true;
        const editorAction = JSON.stringify({
            action: 'drag', 
            param: { 
                elementId: this.drag_id[0], 
                x: parseInt(this.drag_start.x),
                y: parseInt(scaledY) 
            }   
        });
        console.log(editorAction);

        this.contactWorker('edit', [editorAction, this.clickedPage, false]); 
        this.removeHighlight( "vida-svg-overlay", this.drag_id[0] );  
        this.newHighlight( "vida-svg-wrapper", this.drag_id[0] ); 
        e.preventDefault();
    };

    mouseUpListener()
    {
        $(document).unbind("mousemove", this.boundMouseMove);
        $(document).unbind("mouseup", this.boundMouseUp);
        $(document).unbind("touchmove", this.boundMouseMove);
        $(document).unbind("touchend", this.boundMouseUp);
        if (this.dragging) {
            this.removeHighlight("vida-svg-overlay", this.drag_id[0]);
            this.contactWorker("renderPage", [this.clickedPage, true]);
            this.dragging = false;
            this.drag_id.splice(0);
        }
    };

    newHighlight(div, id) 
    {
        for(var idx = 0; idx < this.highlighted_cache.length; idx++)
        {
            if(div == this.highlighted_cache[idx][0] && id == this.highlighted_cache[idx][1]) return;
        }
        this.highlighted_cache.push([div, id]);
        this.reapplyHighlights();
    }

    reapplyHighlights()
    {
        for(var idx = 0; idx < this.highlighted_cache.length; idx++)
        {
            $("#" + this.highlighted_cache[idx][0] + " * #" + this.highlighted_cache[idx][1] ).css({
                "fill": "#ff0000",
                "stroke": "#ff0000",
                "fill-opacity": "1.0",
                "stroke-opacity": "1.0"
            });
        }
    }

    removeHighlight(div, id)
    {
        for(var idx = 0; idx < this.highlighted_cache.length; idx++)
        {
            if(div == this.highlighted_cache[idx][0] && id == this.highlighted_cache[idx][1])
            {
                var removed = this.highlighted_cache.splice(idx, 1);
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

    resetHighlights()
    {
        while(this.highlighted_cache[0]) this.removeHighlight(this.highlighted_cache[0][0], this.highlighted_cache[0][1]);
    }
}
