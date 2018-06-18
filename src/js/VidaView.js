/**
 * Vida6 - An ES6-compatible controller for Verovio
 *
 * VidaView: A UI region which displays a single SVG representation of an MEI document
 * Authors: Andrew Horwitz
 *
 * Required options on initialization:
 * -controller: the previously constructed VidaController object
 * -parentElement: a DOM element inside which the VidaView should be constructed
 *
 * Optional options:
 * -mei: the MEI to initially load into this VidaView; can be set/changed after instantiation using VidaView:refreshVerovio
 * -iconClasses: extra classes to apply to toolbar buttons
 */

import {VidaController} from './VidaController';
import {Events, EventManager, iterableDOM} from './utils';

export class VidaView
{
    constructor(options)
    {
        options = options || {};

        // Root element in which Vida is created
        if (!options.parentElement || !(options.parentElement instanceof HTMLElement))
            return console.error("All VidaView objects must be initialized with a 'parentElement' parameter that is a DOM element.");
        this.parentElement = options.parentElement;

        // VidaController object
        if (!options.controller || !(options.controller instanceof VidaController))
            return console.error("All VidaView objects must be initialized with a 'controller' parameter that is an instance of the VidaController class.")
        this.controller = options.controller;

        // One of the little quirks of writing in ES6, bind events
        this.eventManager = new EventManager({parent: this});

        // Register this view with the controller and cache which viewIndex we are for future messages
        this.viewIndex = this.controller.register(this);

        // Allow developers to append custom classes to icons (for FontAwesome, etc)
        options.iconClasses = options.iconClasses || {};
        this.iconClasses = {
            nextPage: options.iconClasses.nextPage || '',
            prevPage: options.iconClasses.prevPage || '',
            zoomIn: options.iconClasses.zoomIn || '',
            zoomOut: options.iconClasses.zoomOut || ''
        };

        // initializes ui underneath the parent element, as well as Verovio communication
        this.initializeLayoutAndWorker();

        // Initialize the events system and alias the functions
        this.events = new Events();

        this.verovioSettings = {
            // Formatting for line breaks and identifying that we're working with MEI
            breaks: 'auto',
            inputFormat: 'mei',

            // Conserve space for the viewer by not showing a footer and capping the page height
            adjustPageHeight: true,
            noFooter: true,

            // These are all default values and are overridden further down in `VidaView:refreshVerovio` or as applied
            pageHeight: 2970,
            pageWidth: 2100,
            pageMarginLeft: 50,
            pageMarginRight: 50,
            pageMarginTop: 50,
            pageMarginBottom: 50,
            scale: 100
        };

        // "Global" variables
        this.resizeTimer; // Used to prevent per-pixel re-render events when the window is resized
        this.mei = undefined; // saved in Vida as well as the worker, because Verovio's interpretation isn't always correct

        // Vida ensures one system per Verovio page; track the current system/page and total count
        this.currentSystem = 0; // topmost system object within the Vida display
        this.totalSystems = 1; // total number of system objects; we can safely assume it'll be at least one

        // For dragging
        this.draggingActive; // boolean "active"
        this.highlightedCache = [];
        this.dragInfo = {
        /*
            "x": position of clicked note
            "initY": initial Y position
            "svgY": scaled initial Y position
            "pixPerPix": conversion between the above two
        */
        };

        // If we came in with MEI to render, load it in to Verovio
        if (options.mei) this.refreshVerovio(options.mei);
    }

    // Called to unsubscribe from all events. Probably a good idea to call this if the Vida object is deleted.
    destroy()
    {
        this.eventManager.unbindAll();
        this.events.unsubscribeAll();

        document.removeEventListener('mousemove', this.boundMouseMove);
        document.removeEventListener('mouseup', this.boundMouseUp);
        document.removeEventListener('touchmove', this.boundMouseMove);
        document.removeEventListener('touchend', this.boundMouseUp);
    }

    /**
     * This code separated out primarily for cleanliness' sake
     */
    initializeLayoutAndWorker()
    {
        this.ui = {
            parentElement: this.parentElement, // must be DOM node
            svgWrapper: undefined,
            svgOverlay: undefined,
            controls: undefined
        };

        this.ui.parentElement.innerHTML = '<div class="vida-wrapper">' +
            '<div class="vida-toolbar">' +
                '<div class="vida-page-controls vida-toolbar-block">' +
                    '<div class="vida-button vida-prev-page vida-direction-control ' + this.iconClasses.prevPage + '"></div>' +
                    '<div class="vida-button vida-next-page vida-direction-control ' + this.iconClasses.nextPage + '"></div>' +
                '</div>' +
                '<div class="vida-zoom-controls vida-toolbar-block">' +
                    '<span class="vida-button vida-zoom-in vida-zoom-control ' + this.iconClasses.zoomIn + '"></span>' +
                    '<span class="vida-button vida-zoom-out vida-zoom-control ' + this.iconClasses.zoomOut + '"></span>' +
                '</div>' +
            '</div>' +
            '<div class="vida-svg-wrapper vida-svg-object" style="z-index: 1; position:absolute;"></div>' +
            '<div class="vida-svg-overlay vida-svg-object" style="z-index: 1; position:absolute;"></div>' +
        '</div>';

        window.addEventListener('resize', this.boundResize);

        // If this has already been instantiated, undo events
        if (this.ui && this.ui.svgOverlay) this.destroy();

        // Set up the UI object
        this.ui.svgWrapper = this.ui.parentElement.querySelector('.vida-svg-wrapper');
        this.ui.svgOverlay = this.ui.parentElement.querySelector('.vida-svg-overlay');
        this.ui.controls = this.ui.parentElement.querySelector('.vida-page-controls');
        this.ui.nextPage = this.ui.parentElement.querySelector('.vida-next-page');
        this.ui.prevPage = this.ui.parentElement.querySelector('.vida-prev-page');
        this.ui.zoomIn = this.ui.parentElement.querySelector('.vida-zoom-in');
        this.ui.zoomOut = this.ui.parentElement.querySelector('.vida-zoom-out');

        // Document/Window-scoped events
        this.bindListeners();

        // synchronized scrolling between svg overlay and wrapper
        this.eventManager.bind(this.ui.svgOverlay, 'scroll', this.syncScroll);
        this.eventManager.bind(this.ui.svgOverlay, 'click', this.objectClickListener);

        // control bar events
        this.eventManager.bind(this.ui.nextPage, 'click', this.gotoNextSystem);
        this.eventManager.bind(this.ui.prevPage, 'click', this.gotoPrevSystem);
        this.eventManager.bind(this.ui.zoomIn, 'click', this.zoomIn);
        this.eventManager.bind(this.ui.zoomOut, 'click', this.zoomOut);

        // simulate a resize event
        this.updateDims();
    }

    // Necessary for how ES6 "this" works inside events
    bindListeners()
    {
        this.boundMouseMove = (evt) => this.mouseMoveListener(evt);
        this.boundMouseUp = (evt) => this.mouseUpListener(evt);
        this.boundResize = (evt) => this.resizeComponents(evt);
    }

    /**
     * Code for contacting the controller; renderPage is used as the callback multiple times.
     */
    contactWorker(messageType, params, callback)
    {
        this.controller.contactWorker(messageType, params, this.viewIndex, callback);
    }

    displayPage(params)
    {
        const vidaOffset = this.ui.svgWrapper.getBoundingClientRect().top;
        this.ui.svgWrapper.innerHTML = params.svg;

        // create the overlay, save the content, make sure highlights are up to date
        if (params.createOverlay) this.createOverlay();
        this.reapplyHighlights();

        // do not reset this.mei to what Verovio thinks it should be, as that'll cause significant problems
        this.updateNavIcons();
        this.events.publish('PageRendered', [this.currentSystem]);
    }

    /**
     * Serves as a wrapper for the Verovio Toolkit `setOptions` method.
     * @param {boolean} rerender - if true, triggers a rerender of the current page
     */
    updateSettings(rerender)
    {
        this.contactWorker('setOptions', {options: this.verovioSettings});
        if (rerender) this.renderCurrentPage();
    };

    /**
     * Serves as a wrapper for the Verovio Toolkit `loadData` method.
     * @param {string} mei - what the MEI should be updated to
     */
    refreshVerovio(mei)
    {
        if (mei) this.mei = mei;
        else return;

        this.ui.svgOverlay.innerHTML = this.ui.svgWrapper.innerHTML = `<div class='vida-loading'></div>`;

        // Reset pageHeight and pageWidth to match the effective scaled viewport width
        this.verovioSettings.pageHeight = 
            this.ui.svgWrapper.clientHeight // base wrapper height
            * (100 / this.verovioSettings.scale) // to scale
            - (this.verovioSettings.pageMarginTop + this.verovioSettings.pageMarginBottom); // minus margins

        this.verovioSettings.pageWidth = 
            this.ui.svgWrapper.clientWidth // base wrapper width
            * (100 / this.verovioSettings.scale) // to scale
            - (this.verovioSettings.pageMarginLeft + this.verovioSettings.pageMarginRight); // minus margins

        // Update the settings without a re-render
        this.updateSettings(false);

        // Reload the MEI, what we came here for, and re-render the current page after setting it
        this.contactWorker('loadData', {mei: this.mei + '\n'}, (params) =>
        {
            this.totalSystems = params.pageCount;
            this.currentSystem = Math.min(this.currentSystem, this.totalSystems);
            this.renderCurrentPage();
        });
    }
    
    /**
     * Updates the svgOverlay to match the svgWrapper
     */
    createOverlay()
    {
        // Copy wrapper HTML to overlay
        this.ui.svgOverlay.innerHTML = this.ui.svgWrapper.innerHTML;

        // Make all <g>s and <path>s transparent, hide the text
        for (const gElem of this.ui.svgOverlay.querySelectorAll('g'))
        {
            gElem.style.strokeOpacity = 0.0;
            gElem.style.fillOpacity = 0.0;
        }

        for (const pathElem of this.ui.svgOverlay.querySelectorAll('path'))
        {
            pathElem.style.strokeOpacity = 0.0;
            pathElem.style.fillOpacity = 0.0;
        }
        delete this.ui.svgOverlay.querySelectorAll('text');

        // Add event listeners for click on notes
        const notes = this.ui.svgOverlay.querySelectorAll('.note');
        for (let idx = 0; idx < notes.length; idx++)
        {
            const note = notes[idx];
            this.eventManager.bind(note, 'mousedown', this.mouseDownListener);
            this.eventManager.bind(note, 'touchstart', this.mouseDownListener);
        }
    }

    /**
     * Updates visibility of the page navigation icons
     */
    updateNavIcons()
    {
        if (this.verovioSettings.noLayout || (this.currentSystem === this.totalSystems - 1)) this.ui.nextPage.style.visibility = 'hidden';
        else this.ui.nextPage.style.visibility = 'visible';

        if (this.verovioSettings.noLayout || (this.currentSystem === 0)) this.ui.prevPage.style.visibility = 'hidden';
        else this.ui.prevPage.style.visibility = 'visible';
    }

    /**
     * Updates visibility of the zoom icons
     */
    updateZoomIcons()
    {
        if (this.verovioSettings.scale == 100) this.ui.zoomIn.style.visibility = 'hidden';
        else this.ui.zoomIn.style.visibility = 'visible';

        if (this.verovioSettings.scale == 10) this.ui.zoomOut.style.visibility = 'hidden';
        else this.ui.zoomOut.style.visibility = 'visible';
    }

    /**
     * Navigates to a given system
     */
    goToSystem(pageNumber)
    {
        this.currentSystem = pageNumber;
        this.renderCurrentPage();
    }

    /**
     * Renders the current page
     */
    renderCurrentPage()
    {
        this.contactWorker('renderPage', {pageIndex: this.currentSystem}, this.displayPage);
    }

    // Shortcurt for above with safety for max possible system
    gotoNextSystem()
    {
        if (this.currentSystem < (this.totalSystems - 1)) this.goToSystem(this.currentSystem + 1);
    }

    // Shortcurt for above with safety for min possible system
    gotoPrevSystem()
    {
        if (this.currentSystem > 0) this.goToSystem(this.currentSystem - 1);
    }

    /**
     * Event listeners - Display
     */
    resizeComponents()
    {
        // Immediately: resize larger components
        this.updateDims();

        /** 
         * Because this gets triggered on a per-pixel basis, reset it and actually trigger the
         *  rerender once we're pretty sure we're done with the drag.
         */ 
        clearTimeout(this.resizeTimer);
        const self = this;
        this.resizeTimer = setTimeout(function ()
        {
            self.renderCurrentPage();
        }, 200);
    }

    /**
     * Because the svgWrapper and svgOverlay elements are both position:absolute, make sure they
     *  have the same positioning so that they can be overlaid and clicks can register on the
     *  correct notehead.
     */
    updateDims()
    {
        this.ui.svgOverlay.style.height = this.ui.svgWrapper.style.height = this.ui.parentElement.clientHeight - this.ui.controls.clientHeight;
        this.ui.svgOverlay.style.top = this.ui.svgWrapper.style.top = this.ui.controls.clientHeight;
        this.ui.svgOverlay.style.width = this.ui.svgWrapper.style.width = this.ui.parentElement.clientWidth;
    }

    /**
     * Similarly, in case of overflow, make sure that scrolling in the overlay (which this function
     *  is bound to) triggers the same scroll on the svgWrapper element too.
     */
    syncScroll(e)
    {
        this.ui.svgWrapper.scrollTop = e.target.scrollTop;
        this.ui.svgWrapper.scrollLeft = e.target.scrollLeft;
    }

    // Handles zooming in - subtract 10 from scale
    zoomIn()
    {
        if (this.verovioSettings.scale <= 100)
        {
            this.verovioSettings.scale += 10;
            this.updateSettings(true);
        }
    }

    // Handles zooming out - subtract 10 from scale
    zoomOut()
    {
        if (this.verovioSettings.scale > 10)
        {
            this.verovioSettings.scale -= 10;
            this.updateSettings(true);
        }
    }

    /**
     * Event listeners - Dragging
     */
    objectClickListener(e)
    {
        var closestMeasure = e.target.closest('.measure');
        if (closestMeasure) this.events.publish('ObjectClicked', [e.target, closestMeasure]);
        e.stopPropagation();
    }

    mouseDownListener(e)
    {
        const notehead = e.target;
        if (!notehead.closest(".note")) return; // this should never happen, but as a safety
        const id = notehead.closest(".note").attributes.id.value;

        this.resetHighlights();
        this.activateHighlight(id);

        const viewBoxSVG = notehead.closest('svg');
        const parentSVG = viewBoxSVG.parentNode.closest('svg');
        const actualSizeArr = viewBoxSVG.getAttribute('viewBox').split(' ');
        const actualHeight = parseInt(actualSizeArr[3]);
        const svgHeight = parseInt(parentSVG.getAttribute('height'));
        const pixPerPix = (actualHeight / svgHeight);

        this.dragInfo['x'] = parseInt(notehead.getAttribute('x'));
        this.dragInfo['svgY'] = parseInt(notehead.getAttribute('y'));
        this.dragInfo['initY'] = e.pageY;
        this.dragInfo['pixPerPix'] = pixPerPix;

        // we haven't started to drag yet, this might be just a selection
        document.addEventListener('mousemove', this.boundMouseMove);
        document.addEventListener('mouseup', this.boundMouseUp);
        document.addEventListener('touchmove', this.boundMouseMove);
        document.addEventListener('touchend', this.boundMouseUp);
    };

    mouseMoveListener(e)
    {
        const scaledY = (e.pageY - this.dragInfo.initY) * this.dragInfo.pixPerPix;
        for (var idx = 0; idx < this.highlightedCache.length; idx++)
            this.ui.svgOverlay.querySelector('#' + this.highlightedCache[idx]).setAttribute('transform', 'translate(0, ' + scaledY + ')');

        this.draggingActive = true; // we know we're dragging if this listener triggers
        this.commitChanges(e.pageY);

        e.preventDefault();
    };

    mouseUpListener(e)
    {
        document.removeEventListener('mousemove', this.boundMouseMove);
        document.removeEventListener('mouseup', this.boundMouseUp);
        document.removeEventListener('touchmove', this.boundMouseMove);
        document.removeEventListener('touchend', this.boundMouseUp);

        if (this.draggingActive === true)
        {
            this.draggingActive = false;
            this.renderCurrentPage(); // triggers a rerender with createOverlay
        }
    }

    commitChanges(finalY)
    {
        for (var idx = 0; idx < this.highlightedCache.length; idx++)
        {
            const id = this.highlightedCache[idx];
            const obj = this.ui.svgOverlay.querySelector('#' + id);
            const scaledY = this.dragInfo.svgY + (finalY - this.dragInfo.initY) * this.dragInfo.pixPerPix;
            obj.style['transform'] =  'translate(' + [0, scaledY] + ')';
            obj.style['fill'] = '#000';
            obj.style['stroke'] = '#000';

            const editorAction = {
                action: 'drag',
                param: {
                    elementId: id,
                    x: parseInt(this.dragInfo.x),
                    y: parseInt(scaledY)
                }
            };

            this.contactWorker('edit', {action: editorAction, pageIndex: this.currentSystem}, this.displayPage);
        }
    };

    activateHighlight(id)
    {
        if (this.highlightedCache.indexOf(id) === -1)
        {
            this.highlightedCache.push(id);
        }

        this.reapplyHighlights();
    }

    reapplyHighlights()
    {
        for (var idx = 0; idx < this.highlightedCache.length; idx++)
        {
            // Set the wrapper instance to be red and visible
            const id = this.highlightedCache[idx];
            const wrapperTarget = this.ui.svgWrapper.querySelector('#' + id);
            wrapperTarget.style.fill = "#ff0000";
            wrapperTarget.style.stroke = "#ff0000";
        }
    }

    removeHighlight(id)
    {
        const idx = this.highlightedCache.indexOf(id);
        if (idx === -1) return;

        // Get the ID
        const removedID = this.highlightedCache.splice(idx, 1);
        const wrapperTarget = this.ui.svgWrapper.querySelector('#' + id);

        // Set it back to black
        wrapperTarget.style.fill = "#000000";
        wrapperTarget.style.stroke = "#000000";
    }

    resetHighlights()
    {
        while (this.highlightedCache[0]) this.removeHighlight(this.highlightedCache[0]);
    }
}
