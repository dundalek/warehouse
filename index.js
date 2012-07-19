
(function (factory) {
    var _;
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined' && typeof require !== 'undefined') {
        // CommonJS
        _ = require('underscore')
        _.extend(module.exports, factory(_, require('express'), require('url')));
    } else {
        // running in browser
        _ = this._;
        _.extend(window, factory(_, {}, {}));
    }
})(function(_, express, url) {

function respond(promise, res) {
    promise
        .then(function (result) {
            res.send(JSON.stringify(result));
        })
        .fail(function (err) {
            res.statusCode = err.code || 500;
            res.send(String(err));
        });
}

function _applyRoutes(app, name, store) {
    app.use(express.bodyParser());

    name = name.replace(/^\/?/, '/');

    app.get(name, function(req, res) {
        respond(store.query(url.parse(req.url).query), res);
    });

    app.get(name+'/:id', function(req, res) {
        respond(store.get(req.params.id), res);
    });

    app.post(name, function(req, res) {
        respond(store.add(req.body), res);
    });

    app.put(name+'/:id', function(req, res) {
        respond(store.put(req.body, req.params.id), res);
    });

    app.del(name, function(req, res) {
        respond(store.clear(), res);
    });

    app.del(name+'/:id', function(req, res) {
        respond(store.delete(req.params.id), res);
    });
}

function applyRoutes(app, name, store) {
    if (arguments.length === 2) {
        if (name instanceof Array) {
            // app, array of stores
            for (var i = 0; i < name.length; i++) {
                _applyRoutes(app, name[i].name, name[i]);
            };
        } else if (name.name && typeof name.get === 'function') {
            // app, store
            _applyRoutes(app, name.name, name);
        } else {
            // app, object with stores
            for (a in name) {
                if (name.hasOwnProperty) {
                    _applyRoutes(app, a, name[a]);
                }
            }
        }
    } else if (arguments.length === 3) {
        // app, name, store
        _applyRoutes(app, name, store);
    }

    return app; // allow chaining
}

return {
    applyRoutes: applyRoutes,
    respond: respond
};

});