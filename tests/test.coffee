
@run_tests = (store, name) ->
    name = if typeof name == 'undefined' then store.constructor.name else name

    if typeof qinit != 'undefined'
        qinit(QUnit)

    eq = strictEqual
    deq = deepEqual

    john = {_id: 1, firstname: 'John', lastname: 'Silver', age: 30}
    james = {_id: 2, firstname: 'James', lastname: 'Wood', age: 42}
    jane = {_id: 3, firstname: 'Jane', lastname: 'White', age: 28}

    config_reorder = QUnit.config.reorder
    config_autostart = QUnit.config.autostart
    config_autorun = QUnit.config.autorun

    QUnit.config.reorder = false
    QUnit.config.autostart = false
    QUnit.config.autorun = false

    checkFail = (promise) ->
        promise.fail (err) ->
            ok false, 'fail'
            eq err, '', 'error message'
            start()

    QUnit.moduleStart(if typeof setup != 'undefined' then (-> QUnit.stop(); setup().then( -> QUnit.start())) else ->)

    QUnit.module "#{name}: CRUD"

    asyncTest 'clear', ->
        checkFail store.clear()
            .then ->
                ok true
                start()

    asyncTest 'is empty', ->
        checkFail store.query()
            .then (res) ->
                eq res.length, 0, 'store is empty'
                start()

    # asyncTest 'error when getting non existing item', ->
    #     checkFail store.get 4
    #        .then (res) ->
    #         ok err
    #         ok !res
    #         start()

    asyncTest 'add item', ->
        checkFail store.add(john)
            .then (res) ->
                deq res, john
                start()

    asyncTest 'get item', ->
        checkFail store.get(1)
            .then (res) ->
                deepEqual res, john
                start()

    asyncTest 'get item type coerce', ->
        checkFail store.get('1')
            .then (res) ->
                deepEqual res, john
                start()

    # asyncTest 'error when adding items with same id', ->
    #     checkFail store.add john
    #        .then (res) ->
    #         ok err, ''
    #         ok !res
    #         start()

    asyncTest 'add item', ->
        checkFail store.add(james)
            .then (res) ->
                deq res, james
                start()

    # asyncTest 'error when updating non existing item', ->
    #     checkFail store.put jane.id, jane
    #        .then (res) ->
    #         ok err
    #         ok !res
    #         start()

    asyncTest 'update item', ->
        john.age = 35

        checkFail store.put(john, john._id)
            .then (res) ->
                deq res, john
                start()

    asyncTest 'get item', ->
        checkFail store.get(1)
            .then (res) ->
                deepEqual res, john
                start()

    asyncTest 'add item', ->
        checkFail store.add(jane)
            .then (res) ->
                deq res, jane
                start()

    asyncTest 'find by id', ->
        checkFail store.query('_id=2')
            .then (res) ->
                deq res, [james]
                start()

    asyncTest 'delete', ->
        checkFail store.delete(2)
            .then (res) ->
                deq res, 1
                start()

    asyncTest 'check deleted', ->
        checkFail store.query()
            .then (res) ->
                deq res.length, 2
                start()

    asyncTest 'delete non-existing item', ->
        checkFail store.delete(10)
            .then (res) ->
                deq res, 0
                start()

    QUnit.module "#{name}: Querying"

    asyncTest 'find by name', ->
        checkFail store.query('firstname=John')
            .then (res) ->
                deq res, [john]
                start()

    asyncTest 'sorting', ->
        checkFail store.query('sort(+age)')
            .then (res) ->
                deq res, [jane, john]
                start()

    # testing in node needs a little push
    if typeof require != 'undefined'
        QUnit.start()

    QUnit.config.reorder = config_reorder
    QUnit.config.autostart = config_autostart
    QUnit.config.autorun = config_autorun


if typeof require != 'undefined'
    @run_tests(store, if typeof name == 'undefined' then undefined else name)
