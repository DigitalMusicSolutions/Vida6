/**
*      Events. Pub/Sub system for Loosely Coupled logic.
*
*      Based on the Diva.js events system...
*      https://github.com/DDMAL/diva.js/blob/master/source/js/utils.js
*
*      ... which was in turn loosely based on Peter Higgins' port from Dojo to jQuery
*      https://github.com/phiggins42/bloody-jquery-plugins/blob/master/pubsub.js
*
*      Re-adapted to vanilla Javascript, then poorly adapted into ES6 for Vida6.
*/
export class Events
{
    constructor()
    {
        this.cache = {};
    }

    /**
     *      Events.publish
     *      e.g.: publish("ObjectClicked", [e.target, closestMeasure], this);
     *
     *      @class Events
     *      @method publish
     *      @param topic {String}
     *      @param args     {Array}
     *      @param scope {Object} Optional
     */
    publish(topic, args, scope)
    {
        if (this.cache[topic])
        {
            let thisTopic = this.cache[topic],
                i = thisTopic.length;

            while (i--)
                thisTopic[i].apply(scope || this, args || []);
        }
    }

    /**
     *      Events.subscribe
     *      e.g.: subscribe("ObjectClicked", (obj, measure) => {...})
     *
     *      @class Events
     *      @method subscribe
     *      @param topic {String}
     *      @param callback {Function}
     *      @return Event handler {Array}
     */
    subscribe(topic, callback)
    {
        if (!this.cache[topic])
            this.cache[topic] = [];

        this.cache[topic].push(callback);
        return [topic, callback];
    }

    /**
     *      Events.unsubscribe
     *      e.g.: let handle = subscribe("ObjectClicked", (obj, measure) => {...})
     *              unsubscribe(handle);
     *
     *      @class Events
     *      @method unsubscribe
     *      @param handle {Array}
     *      @param completely {Boolean} - Unsubscribe all events for a given topic.
     *      @return success {Boolean}
     */
    unsubscribe(handle, completely)
    {
        const t = handle[0];

        if (this.cache[t])
        {
            let i = this.cache[t].length;
            while (i--)
            {
                if (this.cache[t][i] === handle[1])
                {
                    this.cache[t].splice(i, 1);
                    if (completely)
                        delete this.cache[t];
                    return true;
                }
            }
        }
        return false;
    }

    /**
     *      Events.unsubscribeAll
     *      e.g.: unsubscribeAll();
     *
     *      @class Events
     *      @method unsubscribe
     */
    unsubscribeAll()
    {
        this.cache = {};
    };
}

/**
*  EventManager
*  - Manages binding events to a given parent object to avoid ES6 scope issues.
*/
export class EventManager
{
    constructor(options)
    {
        if (!options) return false;
        this.parent = options.parent;
        this.cache = {};
        this.vidaIDAttr = 'data-vida-el-id';
    }

    // Binds function `funct` to element `el` on event `ev`
    bind(el, ev, funct)
    {
        // Assign the element a random ID for the EventManager to reference it by (or get it if we already have one)
        let vidaID = el.getAttribute(this.vidaIDAttr) || el.getAttribute('id');
        if (!vidaID)
        {
            vidaID = randomHex(16);
            el.setAttribute(this.vidaIDAttr, vidaID);
        }

        // Fill out the object
        if (!(vidaID in this.cache))
            this.cache[vidaID] = {};

        const elObj = this.cache[vidaID];
        if (!(ev in elObj))
            elObj[ev] = [];

        const elEvObj = elObj[ev];

        // Bind the function to the parent
        const boundFunct = funct.bind(this.parent);
        elEvObj.push(boundFunct);

        // Add the listener
        el.addEventListener(ev, boundFunct);
    }

    // Unbinds all functions listening to event `ev` on element `el`
    unbind(el, ev)
    {
        // Get the vidaID from the object; if it doesn't exist, we haven't bound any events
        const vidaID = el.getAttribute(this.vidaIDAttr) || el.getAttribute('id');
        if (!vidaID) return;

        if (vidaID in this.cache)
        {
            if (ev in this.cache[vidaID])
            {
                for (let boundFunct of this.cache[vidaID][ev])
                {
                    el.removeEventListener(ev, boundFunct);
                }
            }
        }
    }

    // Unbinds everything managed by this
    unbindAll()
    {
        for (let vidaID in this.cache)
        {
            // See if it was a regular ID
            let el = document.getElementById(vidaID);

            // Then try the local ID
            if (!el) el = document.querySelector(`*[${this.vidaIDAttr}='${vidaID}']`);

            // If the element's been deleted/doesn't exist, abandon
            if (!el) continue;

            for (let ev in this.cache[vidaID])
            {
                for (let funct of this.cache[vidaID][ev])
                {
                    el.removeEventListener(ev, funct);
                }
            }
        }
    }
}

export function iterableDOM (DOMElement)
{
    let nodes = [];
    for (const curNode in DOMElement)
    {
        // all nodes in the DOMElement object will have a numerical key; discard the others
        if (!isNaN(parseInt(curNode))) nodes.push(DOMElement[curNode]);
    }
    return nodes;
};

function randomHex(digits) {
    return Math.floor((1 + Math.random()) * Math.pow(16, digits)).toString(16).substring(1);
}