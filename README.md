# Warehouse.js

Warehouse.js is a data storage layer for node.js and browser providing unified API for many supported storage engines (MongoDB, MySQL, SQLite, in-memory and others). You can create REST server or client with only few lines of code.

- Supports multiple backends (MongoDB, MySQL, SQLite, in-memory and others)
- Create REST server using few lines of code (compatible with Backbone.js)
- Unified API for CRUD operations
- Powerful query language [RQL](http://dundalek.com/rql/)
- MIT License

Make a quick protoype of your application without using an external database. Then switch to a robust storage (like MongoDB or MySQL) without the need to change your code.

## Install
```
npm install warehousejs
```

## REST server with express in node.js

```javascript

var express = require('express'),
    warehouse = require('warehousejs'),
    MongoBackend = require('warehousejs/backend/mongodb');

var app = express.createServer(),
    store = new MongoBackend().objectStore('item');

warehouse.applyRoutes(app, store);

app.listen(80);
```

The example server above can be used with [Backbone.js](http://backbonejs.com).

```javascript

// client

var Model = Backbone.Model.extend({
   idAttribute: '_id' // Mongo uses _id for primary key
});

var items = new Backbone.Collection.extend({
   url: '/item',
   model: Model
});

items.fetch();

var john = items.create({name: 'John', age: 25});

john.set('age', 30);

john.save();
```


## CRUD

The API is similar to [IndexedDB](http://www.w3.org/TR/IndexedDB/) API ( _add_, _get_, _put_, _delete_ ). It is based on asynchronous promises (using [Q](http://github.com/kriskowal/q/) library).

```javascript

var jack = {id: 15, firstname: 'Jack', lastname: 'Hammer', age: 35};

// Create
store.add(jack)
     .then(function(result) { /* success */ })
     .fail(function(error) { /* error */ });

// Read
store.get(15)
     .then(function(result) { console.log(result.name) }); // outputs: Jack

// Update
jack.age = 40;
store.put(jack).then(callback);

// Delete
store.delete(15).then(callback);

// Delete all
store.clear().then(callback);
```

## Querying

Queries are implemented using [RQL](http://dundalek.com/rql/).
```javascript

// get items with id=15
store.query('id=15')
     .then(function(result) {}); // result is an Array

// get items with age >= 21
store.query('age=ge=21').then(callback);

// get items with price < 100, sort by acending price and descending rating
store.query('price=lt=100&sort(+price,-rating)').then(callback);
```

## API

### Backend

Backend represents DB that has collections for storing items. Common methods are:

- objectStoreNames () - list collections or tables
- objectStore(String name, [Object options]) - gets object store with specified name. If it does not exists then it is created.
- createObjectStore (String name, [Object options]) - creates object store with specified name
- deleteObjectStore (String name)  - deletes object store with specified name (equivalent for droping table in SQL)
- open () - opens database connection. You don't have to worry about it most of the times, because connection will be automatically opened first time when it is needed (lazy loading).
- close () - closes database connection
- isClosed () - is the connection closed?

Options for stores are:

- keyPath - attribute that represents primary key (default 'id').

### Store

Store represents collection of items (e.g. collection for MongoDB or table for SQL). Common methods are:

- put (value, [key | directives])
- add (value, [key | directives])
- delete (key | directives)
- get (key | directives)
- clear ()
- query (String query)

_Key_ is a built-in type - String, Number, ...
_Directives_ is a object e.g. {key: '123'}

Common attributes:

- String name
- String keyPath


## Backends

- [MongoDB](#mongodb) (server)
- [SQL](#sql) (server)
- [Filesystem](#filesystem) (server)
- [Elastic Search](#elasticsearch) (server and browser)
- [NeDB](#nedb) (server and browser)
- [Memory](#memory) (server and browser)
- [REST](#rest) (server and browser)
- [Local Storage](#local-storage) (browser)

### MongoDB

Backend for MongoDB using [node-mongodb-native](http://github.com/mongodb/node-mongodb-native/).

```javascript

var options = {
    // default connection options
    host: 'localhost',
    port: 27017,
    database: 'default',

    // optional authentication credentials
    user: 'user',
    password: 'pass'
};

var MongoBackend = require('warehousejs/backend/mongodb'),
    backend = new MongoBackend(options),
    store = backend.objectStore('item');
```

You can use _db_ and _collection_ methods to get native driver objects.

```javascript
store.db().then(function(db) {
    // native driver method
    db.ensureIndex('item', {price: 1}, function(err, result) {});
});

store.collection().then(function(collection) {
    // native collection method
    collection.find({tags: {$size: 2}}, function(err, result) {});
});
```

### SQL

Backend for SQL databases, supports MySQL and SQLite. The underlying library [node-persist](http://github.com/nearinfinity/node-persist) also supports PostgreSQL and Oracle. However, those databases were not tested.

```javascript

// options when using MySQL
var options = {
    driver: 'mysql',

    // default connection options
    host: 'localhost',
    port: 3306,
    name: 'default', // database name

    // optional authentication credentials
    user: 'user',
    password: 'pass'
};

// options when using SQLite
var options = {
    driver: 'sqlite3',
    filename: '/path/to/file.db',
};

var SqlBackend = require('warehousejs/backend/sql'),
    backend = new SqlBackend(options),
    store = backend.objectStore('item');
```

If you need to execute advanced queries, _runSql_ and _runSqlAll_ methods can be used.

```javascript

// runSql(sql, values) - runs a sql statement that does not return results (INSERT, UPDATE, etc).
store.runSql("UPDATE people SET age = ?", [32])
     .then(function(status) {
         // people updated
     });

// runSqlAll(sql, values) - runs a sql statement that returns results (ie SELECT).
store.runSqlAll("SELECT * FROM people WHERE age = ?", [32])
     .then(function(items) {
         // items is an array containing all the people with age 32
     });
```

### Filesystem

Backend which stores items as files on disk. This backend works only on server. Please note that querying speed will be slow for large amounts of data because no index is utilized.

It is useful for providing syncing capabilities in combination with Dropbox.

Pass _path_ option to specify directory where the files will be stored. The path must exists.

```javascript

var FsBackend = require('warehousejs/backend/fs'),
    backend = new FsBackend({path: '/path/to/storage'}),
    store = backend.createObjectStore('item');
```

### ElasticSearch

Backend using [ElasticSearch](http://www.elasticsearch.org/).

This backend works under both server and browser.

Pass _url_ option to specify remote server address.

```javascript

var ElasticSearchBackend = require('warehousejs/backend/elasticsearch'),
    backend = new ElasticSearchBackend({url: 'http://example.com/index'}),
    store = backend.objectStore('item');
```

### NeDB

Backend for [NeDB](https://github.com/louischatriot/nedb/).

```javascript

var NeBackend = require('warehousejs/backend/nedb'),
    backend = new NeBackend(),
    store = backend.objectStore('', options);
```

Be default the datastore is in-memory only. You can specify `filename` option for the persistent datastore.

```javascript

store = backend.objectStore('', {filename: 'path/to/datafile'});
```

Popsat id?

### Memory

Store items in memory using native Arrays and Objects. It is useful for making quick prototypes without the need of external dependencies.

This backend works under both server and browser.

Store takes optional argument _json_, which loads initial data into the datastore. Argument can be one of

- Array
- Object
- Array JSON-encoded in String
- Object JSON-encoded in String
- String url of an remote resource, starts with 'http'

You can alternatively use _fromJson_ and _getJSON_

```javascript

var MemoryBackend = require('warehousejs/backend/memory'),
    backend = new MemoryBackend(),
    store, data;

// Array
data = [
  {id: 1, name: 'John'},
  {id: 2, name: 'Sarah'}
];

// Array in JSON
data = '[{"id":1,"name":"John"},{"id":2,"name":"Sarah"}]';

// Object
data = {
  1: {id: 1, name: 'John'},
  2: {id: 2, name: 'Sarah'}
};

// Object in JSON
data = {"1":{"id":1,"name":"John"},"2":{"id":2,"name":"Sarah"}};

// create the store with initial data
store = backend.objectStore('item', {json: data});

// create the store and set data later
store = backend.objectStore('item');
store.fromJSON(data);
```

### REST

This backend is using remote REST server for storage. It is useful to access remote services.

If you combine it with a server (acting as a transparent proxy), you can basically use all implemented backends as if they were available for client.

This backend works under both server and browser.

Pass _url_ option to specify remote server address (default is '/').

```javascript

var RestBackend = require('warehousejs/backend/rest'),
    backend = new RestBackend({url: 'http://example.com'}),
    store = backend.objectStore('item');
```

### Local Storage

Implements storage using [W3C Web Storage](http://www.w3.org/TR/webstorage/) (also known as DOM Storage or Local Storage).

Names of Object Stores have a special meaning:

- _session_ is a storage that is available for the duration of the page session
- _local_  is persistent (same-origin rules are applied}

This backend works only in browser.

```javascript

var LocalBackend = require('warehousejs/backend/local'),
    backend = new LocalBackend();

// session only
var sessionStore = backend.objectStore('session');

// persistent
var localStore = backend.objectStore('local');
```
