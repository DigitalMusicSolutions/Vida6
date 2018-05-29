/**
 * Vida6 - An ES6-compatible controller for Verovio
 *
 * VidaController: The primary interface between the UI and the Verovio object
 * Authors: Andrew Horwitz
 */

import VerovioWorker from 'worker-loader?name=./verovioWorker-compiled.js&inline=true&publicPath=/js/!./verovioWorker.js';

export class VidaController
{
    constructor(options)
    {
        // Keeps track of callback functions for worker calls
        this.ticketID = 0;
        this.tickets = {};

        // Keeps track of the worker reserved for each view
        this.viewWorkers = [];
        this.views = {}; // map to make sure that indexes line up
    }

    register(viewObj)
    {
        const newWorker = new VerovioWorker();
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
