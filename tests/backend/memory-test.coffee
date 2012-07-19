
@run_tests_memory = ->
	module = QUnit.module

	dataOrig = [
	  {id: 1, name: 'John'},
	  {id: 2, name: 'Sarah'}
	]

	compareData = (data) ->
		data.sort (a, b) -> a.id - b.id
		deepEqual data, dataOrig

	testData = (data) ->
		backend = new MemoryBackend()

		store = backend.objectStore('item', {json: data})
		store.query().then (qdata) ->
			compareData qdata

			store.fromJSON({})

			store.query().then (qdata) ->
				deepEqual qdata, []

				store.fromJSON(data)

				store.query().then (qdata) ->
					compareData(qdata);
					start()

	module "MemoryStore"

	asyncTest 'json parameter in constructor: Array', 3, ->
		data = [
		  {id: 1, name: 'John'},
		  {id: 2, name: 'Sarah'}
		]

		testData data

	asyncTest 'json parameter in constructor: Array in JSON', 3, ->
		data = '[{"id":1,"name":"John"},{"id":2,"name":"Sarah"}]'

		testData data

	asyncTest 'json parameter in constructor: Object', 3, ->
		data = {
		  1: {id: 1, name: 'John'},
		  2: {id: 2, name: 'Sarah'}
		}

		testData data

	asyncTest 'json parameter in constructor: Object in JSON', 3, ->
		data = {"1":{"id":1,"name":"John"},"2":{"id":2,"name":"Sarah"}}

		testData data

if typeof require != 'undefined'
    @run_tests_memory()