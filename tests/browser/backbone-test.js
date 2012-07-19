// Based on http://github.com/documentcloud/backbone/blob/master/test/sync.js @f4ebee0

$(document).ready(function() {

  var ajax = Backbone.ajax;
  var lastRequest = null;

  var Library = Backbone.Collection.extend({
    url : function() { return '/library'; }
  });
  var library;

  var test = function(name, expected, fn) {
      asyncTest(name, expected+2, fn);
  }

function asyncCheck(data, serverData) {
    if (serverData === undefined) {
      serverData = data;
    }
    _.defer(function() {
      $.ajax({type: 'GET', url: '/library'}).done(function(response) {
        deepEqual(JSON.parse(response), serverData);
        deepEqual(JSON.parse(JSON.stringify(library)), data);
        start();
      });
    });
  }

  function asyncCheckCallbak(data, serverData) {
    return function() {
      asyncCheck(data, serverData);
    }
  }

  var attrs = {
    title  : "The Tempest",
    author : "Bill Shakespeare",
    length : 123
  };

  module("Backbone.sync", {

    setup : function() {
      QUnit.stop();
      $.ajax({type: 'DELETE', url: '/library'}).done(function() {
        library = new Library();

        Backbone.ajax = function(obj) {
          lastRequest = obj;
          return $.ajax(obj);
        };   

        library.create(attrs, {
          success: function() {
            _.defer(function() {
                QUnit.start();
            });
          }
        });

      });
    },

    teardown: function() {
      Backbone.ajax = ajax;
    }

  });

  test("sync: read", 4, function() {
    library.fetch({success: asyncCheckCallbak([attrs])});
    equal(lastRequest.url, '/library');
    equal(lastRequest.type, 'GET');
    equal(lastRequest.dataType, 'json');
    ok(_.isEmpty(lastRequest.data));
  });

  test("sync: passing data", 3, function() {
    library.fetch({data: {a: 'a', one: 1}, success: asyncCheckCallbak([], [attrs])});
    equal(lastRequest.url, '/library');
    equal(lastRequest.data.a, 'a');
    equal(lastRequest.data.one, 1);
  });

  test("sync: create", 6, function() {
    equal(lastRequest.url, '/library');
    equal(lastRequest.type, 'POST');
    equal(lastRequest.dataType, 'json');
    var data = JSON.parse(lastRequest.data);
    equal(data.title, 'The Tempest');
    equal(data.author, 'Bill Shakespeare');
    equal(data.length, 123);
    asyncCheck([attrs]);
  });

  test("sync: update", 7, function() {
    var successFn = asyncCheckCallbak([
      {
        "author": "William Shakespeare",
        "id": "1-the-tempest",
        "length": 123,
        "title": "The Tempest"
      }
    ], [
      attrs,
      {
        "author": "William Shakespeare",
        "id": "1-the-tempest",
        "length": 123,
        "title": "The Tempest"
      }
    ]);

    library.first().save({id: '1-the-tempest', author: 'William Shakespeare'},
                         {success: successFn});
    equal(lastRequest.url, '/library/1-the-tempest');
    equal(lastRequest.type, 'PUT');
    equal(lastRequest.dataType, 'json');
    var data = JSON.parse(lastRequest.data);
    equal(data.id, '1-the-tempest');
    equal(data.title, 'The Tempest');
    equal(data.author, 'William Shakespeare');
    equal(data.length, 123);
  });

  test("sync: update with emulateHTTP and emulateJSON", 7, function() {
    var successFn = asyncCheckCallbak([
      {
        "author": "Tim Shakespeare",
        "id": "2-the-tempest",
        "length": 123,
        "title": "The Tempest"
      }
    ], [
      attrs,
      {
        "author": "Tim Shakespeare",
        "id": "2-the-tempest",
        "length": 123,
        "title": "The Tempest"
      }
    ]);

    Backbone.emulateHTTP = Backbone.emulateJSON = true;
    library.first().save({id: '2-the-tempest', author: 'Tim Shakespeare'},
                         {success: successFn});
    equal(lastRequest.url, '/library/2-the-tempest');
    equal(lastRequest.type, 'POST');
    equal(lastRequest.dataType, 'json');
    equal(lastRequest.data._method, 'PUT');
    var data = JSON.parse(lastRequest.data.model);
    equal(data.id, '2-the-tempest');
    equal(data.author, 'Tim Shakespeare');
    equal(data.length, 123);
    Backbone.emulateHTTP = Backbone.emulateJSON = false;
  });

  test("sync: update with just emulateHTTP", 6, function() {
    var successFn = asyncCheckCallbak([
      {
        "author": "Tim Shakespeare",
        "id": "2-the-tempest",
        "length": 123,
        "title": "The Tempest"
      }
    ], [
      attrs,
      {
        "author": "Tim Shakespeare",
        "id": "2-the-tempest",
        "length": 123,
        "title": "The Tempest"
      }
    ]);

    Backbone.emulateHTTP = true;
    library.first().save({id: '2-the-tempest', author: 'Tim Shakespeare'},
                         {success: successFn});
    equal(lastRequest.url, '/library/2-the-tempest');
    equal(lastRequest.type, 'POST');
    equal(lastRequest.contentType, 'application/json');
    var data = JSON.parse(lastRequest.data);
    equal(data.id, '2-the-tempest');
    equal(data.author, 'Tim Shakespeare');
    equal(data.length, 123);
    Backbone.emulateHTTP = false;
  });

  test("sync: update with just emulateJSON", 6, function() {
    var successFn = asyncCheckCallbak([
      {
        "author": "Tim Shakespeare",
        "id": "2-the-tempest",
        "length": 123,
        "title": "The Tempest"
      }
    ], [
      attrs,
      {
        "author": "Tim Shakespeare",
        "id": "2-the-tempest",
        "length": 123,
        "title": "The Tempest"
      }
    ]);

    Backbone.emulateJSON = true;
    library.first().save({id: '2-the-tempest', author: 'Tim Shakespeare'},
                         {success: successFn});
    equal(lastRequest.url, '/library/2-the-tempest');
    equal(lastRequest.type, 'PUT');
    equal(lastRequest.contentType, 'application/x-www-form-urlencoded');
    var data = JSON.parse(lastRequest.data.model);
    equal(data.id, '2-the-tempest');
    equal(data.author, 'Tim Shakespeare');
    equal(data.length, 123);
    Backbone.emulateJSON = false;
  });

  test("sync: read model", 3, function() {
    var successFn = asyncCheckCallbak([
      {
        "author": "Tim Shakespeare",
        "id": "2-the-tempest",
        "length": 123,
        "title": "The Tempest"
      }
    ], [
      attrs,
      {
        "author": "Tim Shakespeare",
        "id": "2-the-tempest",
        "length": 123,
        "title": "The Tempest"
      }
    ]);

    library.first().save({id: '2-the-tempest', author: 'Tim Shakespeare'});
    library.first().fetch({success: successFn});
    equal(lastRequest.url, '/library/2-the-tempest');
    equal(lastRequest.type, 'GET');
    ok(_.isEmpty(lastRequest.data));
  });

  test("sync: destroy", 3, function() {
    library.first().save({id: '2-the-tempest', author: 'Tim Shakespeare'});
    library.first().destroy({success: asyncCheckCallbak([], [attrs])});
    equal(lastRequest.url, '/library/2-the-tempest');
    equal(lastRequest.type, 'DELETE');
    equal(lastRequest.data, null);
  });

  test("sync: destroy with emulateHTTP", 3, function() {
    library.first().save({id: '2-the-tempest', author: 'Tim Shakespeare'});
    Backbone.emulateHTTP = Backbone.emulateJSON = true;
    library.first().destroy({success: asyncCheckCallbak([], [attrs])});
    equal(lastRequest.url, '/library/2-the-tempest');
    equal(lastRequest.type, 'POST');
    equal(JSON.stringify(lastRequest.data), '{"_method":"DELETE"}');
    Backbone.emulateHTTP = Backbone.emulateJSON = false;
  });

  test("sync: urlError", 2, function() {
    var model = new Backbone.Model();
    raises(function() {
      model.fetch();
    });
    model.fetch({url: '/one/two'}).fail(function() {
      ok(true);
      ok(true);
      start();
    });
    equal(lastRequest.url, '/one/two');
  });

  test("#1052 - `options` is optional.", 0, function() {
    var model = new Backbone.Model();
    model.url = '/test';
    Backbone.sync('create', model)
      .done(function(response) {
        deepEqual(response, {});
        ok(true);
        start();
      });
  });

  test("Backbone.ajax", 1, function() {
    Backbone.ajax = function(settings){
      strictEqual(settings.url, '/test');
      ok(true);
      ok(true);
      start();
    };
    var model = new Backbone.Model();
    model.url = '/test';
    Backbone.sync('create', model);
  });

});
