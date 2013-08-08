/**
 * Asynchronous Dependency Injection Container for Javascript
 *
 * @author Leo Lara <leo@leolara.me>
 */

if (typeof Q == 'undefined') {
    var Q = require('q');
}

var ServiceContainer = function() {
    this.service_definitions = {};
    this.defers = {};
    this.services = {};
}

ServiceContainer.create = function() {
    return new ServiceContainer();
}

ServiceContainer.prototype.addDefinition = function (id, def) {
    this.service_definitions[id] = def;
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
        self.service_definitions[id].factory.apply(this, args);
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

exports = module.exports = ServiceContainer;
