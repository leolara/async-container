
var test = require('tape');
var BlueHub = require('../lib/bluehub');

test('Container creation', function (t) {
    t.plan(1);

    var container = BlueHub.create();

    t.ok(container, 'container created');
});

test('Single service creation', function (t) {
    t.plan(1);

    var container = BlueHub.create();

    container.add('test1', {
        factory: function (cb) {
            cb(null, 987)
        }
    });

    container.get('test1', function (err, service) {
        t.equal(service, 987);
    });
});

test('Single service creation passing a function', function (t) {
    t.plan(1);

    var container = BlueHub.create();

    container.add('test1', function (cb) {
        cb(null, 987)
    });

    container.get('test1', function (err, service) {
        t.equal(service, 987);
    });
});

test('Multiple service creation', function (t) {
    t.plan(3);

    var container = BlueHub.create();

    container.add('test1', {
        factory: function (cb) {
            cb(null, 987)
        }
    });

    container.add('test2', {
        factory: function (cb) {
            cb(null, 989)
        }
    });

    container.add('test3', {
        factory: function (cb) {
            cb(null, 986)
        }
    });

    container.get('test1', function (err, service) {
        t.equal(service, 987);
    });

    container.get('test2', function (err, service) {
        t.equal(service, 989);
    });

    container.get('test3', function (err, service) {
        t.equal(service, 986);
    });
});

test('Dependencies creation with two levels', function (t) {
    t.plan(3);

    var container = BlueHub.create();

    container.add('test1', {
        factory: function (cb) {
            cb(null, 987)
        }
    });

    container.add('test2', {
        factory: function (cb) {
            cb(null, 989)
        }
    });

    container.add('test3', {
        factory: function (cb) {
            cb(null, 986)
        }
    });

    container.add('test4', {
        depends: ['test1', 'test2', 'test3'],
        factory: function (test1, test2, test3, cb) {
            t.pass('Factory with dependencies called');
            cb(null, test1 + test2 + test3);
        }
    });

    container.get('test4', function (err, service) {
        t.equal(null, err);
        t.equal(service, 987 + 989 + 986);
    });
});

test('Dependencies creation with three levels', function (t) {
    t.plan(3);

    var container = BlueHub.create();

    container.add('test1', {
        factory: function (cb) {
            cb(null, 987);
        }
    });

    container.add('test2', {
        depends: ['test1'],
        factory: function (test1, cb) {
            cb(null, test1  + 989);
        }
    });

    container.add('test3', {
        depends: ['test2'],
        factory: function (test2, cb) {
            t.pass('Factory with dependencies called');
            cb(null, test2 + 986);
        }
    });

    container.get('test3', function (err, service) {
        t.equal(null, err);
        t.equal(service, 987 + 989 + 986);
    });
});

test('Service creation that fails', function (t) {
    t.plan(1);

    var container = BlueHub.create();

    container.add('test1', {
        factory: function (cb) {
            cb({ error: 987} ,null)
        }
    });

    container.get('test1', function (err, service) {
        t.ok(err);
    });
});

test('Dependencies creation that fails', function (t) {
    t.plan(1);

    var container = BlueHub.create();

    container.add('test1', {
        factory: function (cb) {
            cb(null, 987)
        }
    });

    container.add('test2', {
        factory: function (cb) {
            cb({ error: 989 }, null)
        }
    });

    container.add('test3', {
        factory: function (cb) {
            cb(null, 986)
        }
    });

    container.add('test4', {
        depends: ['test1', 'test2', 'test3'],
        factory: function (cb, test1, test2, test3) {
            t.fail('Factory with dependencies that fail called');
            cb(null, test1 + test2 + test3);
        }
    });

    container.get('test4', function (err, service) {
        t.ok(err);
    });
});

test('Service creation that throws an exception', function (t) {
    t.plan(1);

    var container = BlueHub.create();

    container.add('test1', {
        factory: function (cb) {
            throw { error: 987};
        }
    });

    container.get('test1', function (err, service) {
        t.ok(err);
    });
});

test('Dependencies creation that throws an exception', function (t) {
    t.plan(1);

    var container = BlueHub.create();

    container.add('test1', {
        factory: function (cb) {
            cb(null, 987)
        }
    });

    container.add('test2', {
        factory: function (cb) {
            throw { error: 989 };
        }
    });

    container.add('test3', {
        factory: function (cb) {
            cb(null, 986)
        }
    });

    container.add('test4', {
        depends: ['test1', 'test2', 'test3'],
        factory: function (cb, test1, test2, test3) {
            t.fail('Factory with dependencies that fail called');
            cb(null, test1 + test2 + test3);
        }
    });

    container.get('test4', function (err, service) {
        t.ok(err);
    });
});

test('Non-existing service', function (t) {
    t.plan(1);

    var container = BlueHub.create();

    container.add('test1', {
        factory: function (cb) {
            cb(null, 987)
        }
    });

    container.get('testZZZZZZ', function (err, service) {
        t.ok(err);
    });
});

test('Service is only created once', function (t) {
    t.plan(3);

    var container = BlueHub.create();
    var count = 0;

    container.add('test1', {
        factory: function (cb) {
            count++;
            t.equal(count, 1);
            cb(null, 987)
        }
    });

    container.get('test1', function (err, service) {
        t.equal(service, 987);
    });
    container.get('test1', function (err, service) {
        t.equal(service, 987);
    });
});
