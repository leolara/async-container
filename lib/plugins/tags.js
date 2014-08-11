
function tags(container) {
    var oldAdd = container.add;
    var oldGet = container.get;
    var bag = {};

    function addTag(tag, id) {
        if (typeof bag[tag] == 'undefined') {
            bag[tag] = [];
        }
        bag[tag].push(id);
    }

    container.add = function (id, definition) {
        oldAdd.call(container, id, definition);
        if (definition.tags instanceof Array) {
            definition.tags.forEach( function (tag) {
                addTag(tag, id);
            })
        }
    }

    function shouldPass(id) {
        return !(typeof container.defers[id] == 'undefined' && typeof id == 'string' && id.charAt(0) == '@');
    }

    container.get = function (id, callback) {
        if (shouldPass(id)) {
            return oldGet.call(container, id, callback);
        }

        var tag = id.substring(1);
        var getServices = function (callback) {
            var promise =  container.getArray(getServices.getIds(tag));

            if (callback) {
                promise.then(function (services) {
                    callback(null, services);
                }, function (err) {
                    callback(err, null);
                });
            }

            return promise;
        }

        getServices.getIds =  function () {
            if (typeof bag[tag] == 'undefined') {
                return [];
            }

            return bag[tag];
        }

        container.add(id, function (callback) {
            console.log(id + ' factory');
            callback(null, getServices);
        });

        return oldGet.call(container, id, callback);
    }

    return container;
}

module.exports = tags;
