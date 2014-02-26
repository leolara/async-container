/**
 * Asynchronous Dependency Injection Container for Javascript
 *
 * @author Leo Lara <leo@leolara.me>
 */

if (typeof Q == 'undefined') {
    var Q = require('q');
}

var mockEtc = {
    get: function () {}
}

var ServiceContainer = function(etc) {
    this.service_definitions = {};
    this.defers = {};
    this.services = {};
    this.tags = {};
    this.etc = mockEtc;
    if (etc instanceof Object) {
        this.etc = etc;
    }
}

ServiceContainer.create = function(etc) {
    return new ServiceContainer(etc);
}

ServiceContainer.prototype.addDefinition = function (id, def) {
    var self = this;
    if (!(typeof id == "string")) {
        this.addDefinitions(id);
    }
    this.service_definitions[id] = def;
    if (typeof def['tags'] != 'undefined') {
        def['tags'].forEach(function (tag) {
            if (typeof self.tags[tag] == 'undefined') {
                self.tags[tag] = [id];
            } else {
                self.tags[tag].push(id);
            }
        });
    }
}

ServiceContainer.prototype.addDefinitions = function (defs) {
    for (var id in defs) {
        this.addDefinition(id, defs[id]);
    }
}

ServiceContainer.prototype.get = function (id, callback) {
    if (id instanceof Array) {
        return this.getArray(id, callback);
    }
    if (typeof this.defers[id] != 'undefined') {
        if (callback) {
            this.defers[id].then(callback);
        }
        return this.defers[id].promise;
    }

    this.defers[id] = Q.defer();

    if (typeof this.service_definitions[id] == 'undefined') {
        this.defers[id].reject({error: 1, message: "Service " + id + " does not exist!"});
        return this.defers[id].promise;
    }

    if (typeof this.service_definitions[id].factory == 'undefined') {
        this.defers[id].reject({error: 2, message: "Service " + id + " has no factory!"});
        return this.defers[id].promise;
    }

    if (!(this.service_definitions[id].depends instanceof Array)) {
        this.callFactory(id);
    } else {
        this.callFactoryDepends(id);
    }

    return this.defers[id].promise;
}

ServiceContainer.prototype.getArray = function (ids, callback) {
    var self = this;

    var promises = []

    ids.forEach(function (id) {
       promises.push(self.get(id));
    });

    Q.all(promises).spread(callback);

}

ServiceContainer.prototype.has = function (id) {
    return (typeof this.service_definitions[id] != 'undefined');
}

ServiceContainer.prototype.getTagIds = function (tag) {
    if (typeof this.tags[tag] == 'undefined') {
        return [];
    }

    return this.tags[tag];
}

ServiceContainer.prototype.tagGet = function (tag) {
    var ids = this.getTagIds(tag);

    if (ids.length > 0) {
        return this.getArray(ids);
    }

    return null;
}

ServiceContainer.prototype.callFactory = function (id) {
    this.service_definitions[id].factory.call(this, this.getFactoryCallback(id));
}

ServiceContainer.prototype.callFactoryDepends = function (id) {
    this.get(this.service_definitions[id].depends, this.factoryDependsCreateCallback(id));
}

ServiceContainer.prototype.factoryDependsCreateCallback = function (id) {
    var self = this;
    return function () {
        var args = Array.prototype.slice.call(arguments);
        args.unshift(self.getFactoryCallback(id));
        self.service_definitions[id].factory.apply(self, args);
    }
}

ServiceContainer.prototype.getFactoryCallback = function(id) {
    var self = this;
    return function (err, service) {
        if (err) {
            return self.defers[id].reject(err);
        }
        self.services[id] = service;
        self.defers[id].resolve(service);
    }
}

ServiceContainer.prototype.stat = function() {
    var self = this;
    return Object.keys(this.defers)
        .map(
            function(key){
                var state = self.defers[key].promise.inspect().state;
                var reason = self.defers[key].promise.inspect().reason || "";
                return ([key, state === 'rejected' ? state + " because " + reason : state]);
            }
        )
        .reduce(
            function(obj, pair){
                obj[pair[0].toString()]=pair[1];
                return obj;
            },
            {}
        )
    ;
};

exports = module.exports = ServiceContainer;
