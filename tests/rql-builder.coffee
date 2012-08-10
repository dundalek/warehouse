
@run_tests_rql_builder = (_) ->
	rql = (q) -> _.rql q

	q = (a,b) ->
		equal a.toString(), b.replace(/\+/g, '%2B'), b

	QUnit.module 'RQL builder'

	test 'empty', ->
		equal rql().toString(), '', 'empty'
		equal rql('').toString(), '', 'empty string'

	test 'select', ->
		q rql().select('a'), 'select(a)'
		q rql().select('a', 'b'), 'select(a,b)'
		q rql().select('a', 'b', 'c'), 'select(a,b,c)'
		q rql().select(['a', 'b', 'c']), 'select(a,b,c)'

	test 'values', ->
		q rql().values('a'), 'values(a)'
		q rql().values('a', 'b'), 'values(a,b)'
		q rql().values(['a', 'b']), 'values(a,b)'

	test 'distinct', ->
		q rql().distinct(), 'distinct()'

	test 'limit', ->
		q rql().limit(10), 'limit(10)'
		q rql().limit(20, 10), 'limit(20,10)'

	test 'sort', ->
		q rql().sort('-a'), 'sort(-a)'
		q rql().sort('-a', '+b'), 'sort(-a,+b)'
		q rql().sort('-a', '+b', '-c'), 'sort(-a,+b,-c)'
		q rql().sort(['-a', '+b', '-c']), 'sort(-a,+b,-c)'

	test 'operators', ->
		ops = ["eq", "ne", "lt", "le", "gt", "ge", "in", "out", "contains", "excludes", "and", "or"]

		b = rql()
		expected = []

		for o in ops
			q rql()[o]('a', 1), "#{o}(a,1)"
			q rql()[o]('a', 'b'), "#{o}(a,b)"

			a = rql()
			a[o]('a', 1)
			a[o]('a', 'b')
			q a, "#{o}(a,1)&#{o}(a,b)"

			b[o]('a', 1)
			expected.push("#{o}(a,1)")

		equal b.toString(), expected.join('&'), 'multiple clauses'

		# TODO:
		# rel
		# aggregation

if typeof require != 'undefined'
	@run_tests_rql_builder(require 'underscore-data')