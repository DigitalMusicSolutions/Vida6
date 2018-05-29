/**
 * Vida6 - An ES6-compatible controller for Verovio
 *
 * VidaController: The primary interface between the UI and the Verovio object
 * Authors: Andrew Horwitz
 *
 * Required options on initialization:
 * -workerLocation: location of the verovioWorker.js script included in this repo; relative to vida.js or absolute-pathed
 * -verovioLocation: location of the verovio toolkit copy you wish to use, relative to verovioWorker.js or absolute-pathed
 */

export class VidaController
{
    constructor(options)
    {
        options = options || {};
        if (!options.workerLocation || !options.verovioLocation)
            return console.error("The VidaController must be initialized with both the 'workerLocation' and 'verovioLocation' parameters.");

        // Keeps track of callback functions for worker calls
        this.ticketID = 0;
        this.tickets = {};

        // Keeps track of the worker reserved for each view
        this.workerLocation = options.workerLocation;
        this.verovioLocation = options.verovioLocation;
        this.viewWorkers = [];
        this.views = {}; // map to make sure that indexes line up
    }

    register(viewObj)
    {
        const newWorker = new Worker(this.workerLocation);
        const workerIndex = this.viewWorkers.push(newWorker) - 1; // 1-indexed length to 0-indexed value
        this.views[workerIndex] = viewObj;

        newWorker.onmessage = (event) =>
        {
            let eventType = event.data[0];
            let ticket = event.data[1];
            let params = event.data[2];

            if (eventType === 'error')
            {
                console.log('Error message from Verovio:', params);
                if (ticket) delete this.tickets[ticket];
            }

            else if (this.tickets[ticket])
            {
                this.tickets[ticket].call(viewObj, params);
                delete this.tickets[ticket];
            }

            else console.log('Unexpected worker case:', event);
        };
        this.contactWorker('setVerovio', {location: this.verovioLocation}, workerIndex);
        return workerIndex;
    }

    contactWorker(messageType, params, viewIndex, callback)
    {
        // array passed is [messageType, ticketNumber, dataObject]
        this.tickets[this.ticketID] = callback;
        this.viewWorkers[viewIndex].postMessage([messageType, this.ticketID, params]);
        this.ticketID++;
    }

    setMEIForViewIndex(viewIndex, MEI)
    {
        this.views[viewIndex].refreshVerovio(MEI);
    }
}
