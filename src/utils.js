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
        let cache = {};
        let argsCache = {};

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
        this.publish = function (topic, args, scope)
        {
            if (cache[topic])
            {
                var thisTopic = cache[topic],
                    i = thisTopic.length;

                while (i--)
                    thisTopic[i].apply(scope || this, args || []);
            }
        };

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
        this.subscribe = function (topic, callback)
        {
            if (!cache[topic])
                cache[topic] = [];

            cache[topic].push(callback);
            return [topic, callback];
        };

        /**
         *      Events.unsubscribe
         *      e.g.: var handle = subscribe("ObjectClicked", (obj, measure) => {...})
         *              unsubscribe(handle);
         *
         *      @class Events
         *      @method unsubscribe
         *      @param handle {Array}
         *      @param completely {Boolean} - Unsubscribe all events for a given topic.
         *      @return success {Boolean}
         */
        this.unsubscribe = function (handle, completely)
        {
            var t = handle[0];

            if (cache[t])
            {
                var i = cache[t].length;
                while (i--)
                {
                    if (cache[t][i] === handle[1])
                    {
                        cache[t].splice(i, 1);
                        if (completely)
                            delete cache[t];
                        return true;
                    }
                }
            }
            return false;
        };

        /**
         *      Events.unsubscribeAll
         *      e.g.: unsubscribeAll();
         *
         *      @class Events
         *      @method unsubscribe
         */
        this.unsubscribeAll = function ()
        {
            cache = {};
        };
    }
}
