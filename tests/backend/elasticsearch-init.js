
var ElasticSearchUrl = 'http://localhost:9200/test',
    ElasticSearchBackend = require('../../backend/elasticsearch'),
    backend = new ElasticSearchBackend({url: ElasticSearchUrl}),
    store = backend.objectStore('test', {keyPath: '_id'}),
    request = require('request');

exports.store = store;

// hooks to refresh ElasticSearch indices
exports.qinit = function(QUnit) {
    function refresh() {
        QUnit.stop();
        request({
            method:'POST',
            url: ElasticSearchUrl+'/_refresh'
        },
        function() {
            setTimeout(function() {
                QUnit.start();    
            }, 200);
        });
    }
    QUnit.testDone(refresh);
    QUnit.moduleStart(refresh);
};