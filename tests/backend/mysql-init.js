
var SqlBackend = require('../../backend/sql'),
    Q = require('q'),
    backend = new SqlBackend({
        driver: 'mysql',
        host: 'localhost',
        port: 3306,
        database: 'test',
        user: 'root',
        password: 'toor'
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
            ') ENGINE=InnoDB DEFAULT CHARSET=utf8;');
    });
};

exports.name = 'SqlStore: MySQL';
exports.store = store;