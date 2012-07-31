
@run_tests = (store, name) ->
	name = if typeof name == 'undefined' then store.constructor.name else name

	john = {_id: 1, firstname: 'John', lastname: 'Silver', age: 30}
	james = {_id: 2, firstname: 'James', lastname: 'Wood', age: 42}
	jane = {_id: 3, firstname: 'Jane', lastname: 'White', age: 28}
	alice1 = {_id: 4, firstname: 'Alice', lastname: 'Summer', age: 30}
	alice2 = {_id: 5, firstname: 'Alice', lastname: 'Spring', age: 28}

	people = [john, james, jane, alice1, alice2]

	toObj = (arr) ->
		ret = {}
		for i in arr
			ret[i] = null
		ret		

	q = (str, expected, fn) ->
		console.log(str, store.parse(str))
		store.query(str)
			.then (result) ->
				if typeof fn == 'function'
					result = fn(result)
				deepEqual result, expected, str
				start()
			.fail (msg) ->
				ok false, msg

	ql = (str, expected, fn) ->
		console.log(str, store.parse(str))
		store.query(str)
			.then (result) ->
				if typeof fn == 'function'
					result = fn(result)
				equal result.length, expected, str
				start()
			.fail (msg) ->
				ok false, msg

	setup_data = ->
		stop(5)
		store.clear().then ->
			for i in people
				store.add(i).then ->
					start()
			null

	QUnit.moduleStart(if typeof setup != 'undefined' then (-> QUnit.stop(); setup().then(-> setup_data(); QUnit.start();)) else setup_data)

	QUnit.module "#{name}: RQL"

	asyncTest 'select', 2, ->
		q 'select(firstname)', toObj(people.map((x) -> {firstname: x.firstname})), toObj
		q 'select(firstname,age)', toObj(people.map((x) -> {firstname: x.firstname, age: x.age})), toObj

	asyncTest 'values', 3, ->
		q 'values(firstname)', people.map((x) -> [x.firstname])
		q 'values(age)', people.map((x) -> [x.age])
		q 'values(firstname,age)',  people.map((x) -> [x.firstname, x.age])

	asyncTest 'distinct', 4, ->
		ql 'select(age)&distinct()', 3 
		ql 'select(age)&distinct', 3
		q 'values(age)&distinct()&sort(+age)', [28, 30, 42]
		q 'select(age)&distinct()&sort(+age)', [28, 30, 42].map((x) -> {age: x})

	asyncTest 'limit', 2, ->
		q 'limit(2)&sort(+_id)', [john, james]
		q 'limit(2,1)&sort(+_id)', [james, jane]
		# limit maxCount ?

	asyncTest 'sort', 7, ->
		q 'sort(firstname)', [james, jane, john], (x) -> x.slice(2)
		q 'sort(+firstname)', [james, jane, john], (x) -> x.slice(2)
		q 'sort(-firstname)', [john, jane, james], (x) -> x.slice(0,3)
		q 'sort(+firstname,+age)', [alice2, alice1, james, jane, john]
		q 'sort(+firstname,-age)', [alice1, alice2, james, jane, john]
		q 'sort(-firstname,+age)', [john, jane, james, alice2, alice1]
		q 'sort(-firstname,-age)', [john, jane, james, alice1, alice2]

	asyncTest 'eq', 6, ->
		q 'firstname=Jane', [jane]
		q 'firstname=eq=Jane', [jane]
		q 'eq(firstname,Jane)', [jane]
		q 'age=42', [james]
		q 'age=eq=42', [james]
		q 'eq(age,42)', [james]

	asyncTest 'ne', 8, ->
		ql 'firstname!=Jane', 4
		ql 'firstname=ne=Jane', 4
		ql 'ne(firstname,Jane)', 4
		q 'ne(firstname,Jane)&sort(+_id)', [john, james, alice1, alice2]
		ql 'age!=42', 4
		ql 'age=ne=42', 4
		ql 'ne(age,42)', 4
		q 'ne(age,42)&sort(+_id)', [john, jane, alice1, alice2]

	asyncTest 'lt', 4, ->
		ql 'age<30', 2
		ql 'age=lt=30', 2
		ql 'lt(age,30)', 2
		q 'lt(age,30)&sort(+_id)', [jane, alice2]

	asyncTest 'le', 4, ->
		ql 'age<=30', 4
		ql 'age=le=30', 4
		ql 'le(age,30)', 4
		q 'le(age,30)&sort(+_id)', [john, jane, alice1, alice2]

	asyncTest 'gt', 4, ->
		ql 'age>30', 1
		ql 'age=gt=30', 1
		ql 'gt(age,30)', 1
		q 'gt(age,30)&sort(+_id)', [james]

	asyncTest 'ge', 4, ->
		ql 'age>=30', 3
		ql 'age=ge=30', 3
		ql 'ge(age,30)', 3
		q 'ge(age,30)&sort(+_id)', [john, james, alice1]

	asyncTest 'in', 4, ->
		q 'in(firstname,(John))', [john]
		ql 'in(firstname,(Alice,James))', 3
		q 'in(age,(42))', [james]
		ql 'in(age,(28,42))', 3

	asyncTest 'out', 4, ->
		ql 'out(firstname,(John))', 4
		ql 'out(firstname,(Alice,James))', 2
		ql 'out(age,(42))', 4
		q 'out(age,(30,28))', [james]

	# contains
	# excludes
	# rel

	asyncTest 'and', 2, ->
		ql 'age>28&age!=42', 2
		ql 'and(age>28,age!=42)', 2

	asyncTest 'or', 2, ->
		ql 'age>30|age=28', 3
		ql 'or(age>30,age=28)', 3

	asyncTest 'or nested in and', 3, ->
		ql 'and(or(age=28,age=30),or(firstname=Alice,firstname=John))', 3
		ql 'or(age=28,age=30)&or(firstname=Alice,firstname=John)', 3
		ql '(age=28|age=30)&(firstname=Alice|firstname=John)', 3

	asyncTest 'and nested in or', 3, ->
		ql 'or(and(age=28,firstname=Alice),and(age=30,firstname=John))', 2
		ql 'and(age=28,firstname=Alice)|and(age=30,firstname=John)', 2
		ql '(age=28&firstname=Alice)|(age=30&firstname=John)', 2

	asyncTest 'aggregate', 4, ->
		q 'aggregate(firstname,sum(age))', null
		q 'aggregate(firstname,mean(age))', null
		q 'aggregate(firstname,max(age))', null
		q 'aggregate(firstname,min(age))', null

	asyncTest 'functions', 4, ->
		q 'mean(age)', null
		q 'sum(age)', null
		q 'max(age)', null
		q 'min(age)', null

	asyncTest 'count', 4, ->
		q 'count()', 5
		q 'count', 5
		q 'firstname=John&count()', 1
		q 'age>28&count()', 3

	# nested properties
	# typed values

	# recurse
	# first
	# one

if typeof require != 'undefined'
    @run_tests(store, if typeof name == 'undefined' then undefined else name)