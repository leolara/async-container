
if (typeof Q == 'undefined') {
    var Q = require('q');
}

var BlueHub = function () {
    var container = this;

    this.service_definitions = {};
    this.defers = {};

    this.add('$$container', function (cb) {
        cb(null, container);
    });
}

BlueHub.prototype.add = function (id, def) {
    if (!(typeof id == "string")) {
        this.addDefinitions(id);
    }
    if (def instanceof Function) {
        def = {
            factory: def
        };
    }
    this.service_definitions[id] = def;
}

BlueHub.prototype.addDefinitions = function (defs) {
    for (var id in defs) {
        this.add(id, defs[id]);
    }
}

BlueHub.prototype.get = function (id, callback) {
    if (typeof this.defers[id] != 'undefined') {
        if (callback) {
            callCallback(this.defers[id].promise);
        }
        return this.defers[id].promise;
    }

    this.defers[id] = Q.defer();

    if (typeof this.service_definitions[id] == 'undefined') {
        if (callback) {
            callCallback(this.defers[id].promise);
        }
        this.defers[id].reject({error: 1, message: "Service " + id + " does not exist!"});
        return this.defers[id].promise;
    }

    this.createService(id);

    if (callback) {
        callCallback(this.defers[id].promise);
    }
    return this.defers[id].promise;

    function callCallback(promise) {
        promise.then(function (service) {
            callback(null, service);
        }, function (err) {
            callback(err, null);
        })
    }
}

BlueHub.prototype.getArray = function (ids) {
    var self = this;
    var promises = [];

    ids.forEach(function (id) {
        promises.push(self.get(id));
    });

    return Q.all(promises);
}

BlueHub.prototype.createService = function (id) {
   var self = this;
    if (!(this.service_definitions[id].depends instanceof Array)) {
        this.callFactory(id, []);
    } else {
        this.getArray(this.service_definitions[id].depends).then(function (dependencies) {
            self.callFactory(id, dependencies);
        }).fail(function (err) {
            return self.defers[id].reject(err);
        });
    }
}

BlueHub.prototype.callFactory = function (id, dependencies) {
    var self = this;

    dependencies.push(onCreated);
    try {
        this.service_definitions[id].factory.apply(this, dependencies);
    } catch (ex) {
        return self.defers[id].reject(ex);
    }

    function onCreated (err, service) {
        if (err) {
            return self.defers[id].reject(err);
        }
        self.defers[id].resolve(service);
    }
}

BlueHub.create = function () {
    return new BlueHub();
}

module.exports = BlueHub;
