/**
 * Asynchronous Dependency Injection Container for Javascript
 *
 * @author Leo Lara <leo@leolara.me>
 */

var ServiceContainer = function() {
    this.service_definitions = {};
    this.services = {};
    this.waiting = {};
}

ServiceContainer.create = function() {
    return new ServiceContainer();
}

ServiceContainer.prototype.addDefinition = function (id, def) {
    this.service_definitions[id] = def;
}

ServiceContainer.prototype.getArray = function (ids, callback) {
    var count = ids.length;
    var self = this;

    function sendAll() {
        var args = [null];
        ids.forEach(function (id) {
            args.push(self.services[id]);
        });
        callback.apply(args);
    }

    ids.forEach(function (id) {
        self.get(id, function () {
            count--;
            if (count == 0) {
                sendAll();
            }
        });
    });
}

ServiceContainer.prototype.get = function (id, callback) {
    if (id instanceof Array) {
        return this.getArray(id, callback);
    }
    if (this.services[id]) {
        return callback(null, this.services[id]);
    }

    if (this.registerWaiting(id, callback) != 1) {
        return;
    }

    var self = this;
    if (!(this.service_definitions[id].depends instanceof Array)) {
        this.callFactory(id);
    } else {
        this.get(this.service_definitions[id].depends, function () {
            var args = Array.prototype.slice.call(arguments);
            args.splice(0,1);
            args.unshift(
                self,
                function (err, service) {
                    self.factoryCallback(self, id, service);
                }
            )
            this.service_definitions[id].factory.apply(args);
        });
    }
}

ServiceContainer.prototype.callFactory = function (id) {
    var self = this;
    this.service_definitions[id].factory(this, function (err, service) {
        self.factoryCallback(self, id, service);
    });
}

ServiceContainer.prototype.callFactoryDepends = function (id) {
    this.get(this.service_definitions[id].depends, this.factoryDependsCreateCallback(id));
}

ServiceContainer.prototype.factoryDependsCreateCallback = function (id) {
    var self = this;
    return function () {
        var args = Array.prototype.slice.call(arguments);
        args.splice(0,1);
        args.unshift(
            self,
            function (err, service) {
                self.factoryCallback(self, id, service);
            }
        );
        this.service_definitions[id].factory.apply(args);
    }
}

ServiceContainer.prototype.registerWaiting = function (id, callback) {
    if (!(this.waiting[id] instanceof Array)) {
        this.waiting[id] = [];
    }
    console.log(this.waiting[id]);

    this.waiting[id].push(callback);

    return this.waiting[id].length;
}

ServiceContainer.prototype.factoryCallback = function (container, id, service) {
    container.services[id] = service;
    container.waiting[id].forEach( function (callback) {
        return callback(null, service);
    });
}

exports = module.exports = ServiceContainer;
