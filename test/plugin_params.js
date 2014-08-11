
var test = require('tape');
var BlueHub = require('../lib/bluehub');
var Params = require('../lib/plugins/params');

function MockConfig () {
    this.get = function (key) {
        return this[key];
    }
}

test('Container creation (params plugin)', function (t) {
    t.plan(1);

    var config = new MockConfig();
    var container = Params(BlueHub.create(), config);

    t.ok(container, 'container created');
});

test('Get from key (params plugin)', function (t) {
    t.plan(1);

    var config = new MockConfig();
    var container = Params(BlueHub.create(), config);

    config.testparam1 = 987;

    container.get('%testparam1', function (err, param) {
        t.equal(param, 987);
    });
});

test('Service depends on parameters (params plugin)', function (t) {
    t.plan(2);

    var config = new MockConfig();
    var container = Params(BlueHub.create(), config);

    config.testparam1 = 987;
    config.testparam2 = 988;
    config.testparam3 = 989;

    container.add('test1', {
        depends: ['%testparam1', '%testparam2', '%testparam3'],
        factory: function (a, b, c, cb) {
            t.pass();
            cb(null, a + b + c);
        }
    });

    container.get('test1', function (err, s) {
        t.equal(s, 987 + 988 + 989);
    });
});
