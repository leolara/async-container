
function params(container, etc) {
    var oldGet = container.get;

    function shouldPass(id) {
        return !(typeof container.defers[id] == 'undefined' && typeof id == 'string' && id.charAt(0) == '%');
    }

    container.get = function (id, callback) {
        if (shouldPass(id)) {
            return oldGet.call(container, id, callback);
        }

        var key = id.substring(1);
        var val = etc.get(key);
        var definition = {
            factory: function (cb) {
                cb(null, val);
            }
        };

        container.add(id, definition);

        return oldGet.call(container, id, callback);
    }

    return container;
}

module.exports = params;
