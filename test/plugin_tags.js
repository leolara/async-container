
var test = require('tape');
var BlueHub = require('../lib/bluehub');
var Tags = require('../lib/plugins/tags');

test('Container creation (tags plugin)', function (t) {
    t.plan(1);

    var container = Tags(BlueHub.create());

    t.ok(container, 'container created');
});

test('Multiple service creation (tags plugin)', function (t) {
    t.plan(2);

    var container = Tags(BlueHub.create());

    container.add('test1', {
        factory: function (cb) {
            cb(null, 987)
        }
    });

    container.add('test2', {
        tags: ['tag1', 'tag2'],
        factory: function (cb) {
            cb(null, 988)
        }
    });

    container.get('test1', function (err, service) {
        t.equal(service, 987);
    });

    container.get('test2', function (err, service) {
        t.equal(service, 988);
    });

});

test('Getting Ids using tags (tags plugin)', function (t) {
    t.plan(12);

    var container = Tags(BlueHub.create());

    container.add('test1', {
        factory: function (cb) {
            cb(null, 987)
        }
    });

    container.add('test2', {
        tags: ['tag1', 'tag2'],
        factory: function (cb) {
            cb(null, 988)
        }
    });

    container.add('test3', {
        tags: ['tag1'],
        factory: function (cb) {
            cb(null, 988)
        }
    });

    container.add('test4', {
        tags: ['tag2'],
        factory: function (cb) {
            cb(null, 988)
        }
    });

    container.get('@tag1', function (err, tag) {
        if (err) {
            t.fail();
            return;
        }
        var tag1 = tag.getIds();

        t.ok(tag1 instanceof Array);
        t.notEqual(-1, tag1.indexOf('test2'));
        t.notEqual(-1, tag1.indexOf('test3'));
        t.equal(-1, tag1.indexOf('test1'));
        t.equal(-1, tag1.indexOf('test4'));
    });

    container.get('@tag2', function (err, tag) {
        if (err) {
            t.fail();
            return;
        }

        var tag2 = tag.getIds();

        t.ok(tag2 instanceof Array);
        t.notEqual(-1, tag2.indexOf('test2'));
        t.notEqual(-1, tag2.indexOf('test4'));
        t.equal(-1, tag2.indexOf('test1'));
        t.equal(-1, tag2.indexOf('test3'));
    });

    container.get('@nullTag', function (err, tag) {
        if (err) {
            t.fail();
            return;
        }

        var nullTag = tag.getIds();

        t.ok(nullTag instanceof Array);
        t.equal(0, nullTag.length);
    });
});

test('Creating using tags (tags plugin)', function (t) {
    t.plan(9);

    var container = Tags(BlueHub.create());

    container.add('test1', {
        factory: function (cb) {
            t.fail('test1 created');
            cb(null, 987)
        }
    });

    container.add('test2', {
        tags: ['tag1', 'tag2'],
        factory: function (cb) {
            t.pass('test2 created');
            cb(null, 988)
        }
    });

    container.add('test3', {
        tags: ['tag1'],
        factory: function (cb) {
            t.pass('test3 created');
            cb(null, 989)
        }
    });

    container.add('test4', {
        tags: ['tag2'],
        factory: function (cb) {
            t.pass('test4 created');
            cb(null, 986)
        }
    });

    container.get('@tag1', function (err, tag) {
        t.equal(err, null);
        console.log(tag);
        tag(function (err, services) {
            console.log(services);
            t.equal(err, null);
            var acc = 0;
            services.forEach(function (s) {
                acc += s;
            })

            t.equal(acc, 988 + 989);
        });
    });

    container.get('@tag2', function (err, tag) {
        t.equal(err, null);
        tag(function (err, services) {
            t.equal(err, null);
            var acc = 0;
            services.forEach(function (s) {
                acc += s;
            })

            t.equal(acc, 988 + 986);
        });
    });

    /*container.getAllByTag('tag1', function (err, services) {
        t.equal(err, null);
        var acc = 0;
        services.forEach(function (s) {
            acc += s;
        })

        t.equal(acc, 988 + 989);
    });

    container.getAllByTag('tag2', function (err, services) {
        t.equal(err, null);
        var acc = 0;
        services.forEach(function (s) {
            acc += s;
        })

        t.equal(acc, 988 + 986);
    });*/
});
