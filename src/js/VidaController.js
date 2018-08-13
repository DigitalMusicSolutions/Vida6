'use babel';

/**
 * Vida6 - An ES6-compatible controller for Verovio
 *
 * VidaController: The primary interface between the UI and the Verovio object
 * Authors: Andrew Horwitz
 */

import * as VerovioWorker from 'worker-loader?name=./VerovioWorker.js&publicPath=/js/!./VerovioWorker.js';

export class VidaController
{
    constructor(options)
    {
        // Keeps track of callback functions for worker calls
        this.ticketID = 0;
        this.tickets = {};
        this.noCallback = 'no-callback'; // used when we know no callback is present for a ticket

        // Keeps track of the worker reserved for each view
        this.viewWorkers = [];
        this.views = {}; // map to make sure that indexes line up
    }

    register(viewObj)
    {
        const newWorker = new VerovioWorker();
        const workerIndex = this.viewWorkers.push(newWorker) - 1; // push returns length; convert 1-indexed length to 0-indexed value
        this.views[workerIndex] = viewObj;

        newWorker.onmessage = (event) =>
        {
            let eventType = event.data[0];
            let ticket = event.data[1];
            let params = event.data[2];

            if (eventType === 'error')
            {
                console.log('Error message from Verovio:', params);
            }

            else if (this.tickets[ticket] === this.noCallback) {}

            else if (this.tickets[ticket])
            {
                this.tickets[ticket].call(viewObj, params);
            }

            else console.log('Unexpected worker case:', event);

            if (ticket) delete this.tickets[ticket];
        };

        return workerIndex;
    }

    contactWorker(messageType, params, viewIndex, callback)
    {
        if (!(viewIndex in this.viewWorkers))
            return console.error("That VidaView has not been registered yet!");

        this.tickets[this.ticketID] = callback || this.noCallback;
        this.viewWorkers[viewIndex].postMessage([messageType, this.ticketID, params]);
        this.ticketID++;
    }

    setMEIForViewIndex(viewIndex, MEI)
    {
        this.views[viewIndex].refreshVerovio(MEI);
    }
}
