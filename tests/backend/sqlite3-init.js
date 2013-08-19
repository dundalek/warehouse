
var SqlBackend = require('../../backend/sql'),
    Q = require('q'),
    backend = new SqlBackend({
        driver: 'sqlite3',
        filename: '/tmp/sqlite.db'
    }),
    store = backend.objectStore('test', {keyPath: '_id'});

exports.setup = function() {
    return store.connection().then(function(connection) {
        return Q.ninvoke(connection, 'runSql',
                'CREATE TABLE IF NOT EXISTS `test` (' +
                '  `_id` int(11) NOT NULL,' +
                '  `firstname` varchar(255) NOT NULL,' +
                '  `lastname` varchar(255) NOT NULL,' +
                '  `age` int(11) NOT NULL' +
                ');');
        });
};

exports.name = 'SqlStore: Sqlite3';
exports.store = store;