// Taken from:
//   http://github.com/dvv/underscore-data/blob/master/test/rql.js

module = QUnit.module;

module("Array");

test("filtering #1", function(){
	var data = data1,
		query = query1;

	equal(query("price<10").length, 1);
	equal(query("price<11").length, 2);
	equal(query("nested/property=value").length, 1);
	equal(query("with%2Fslash=slashed").length, 1);
	equal(query("out(price,(5,10))").length, 0);
	equal(query("out(price,(5))").length, 1);
	equal(query("contains(tags,even)").length, 1);
	equal(query("contains(tags,fun)").length, 2);
	equal(query("excludes(tags,fun)").length, 0);

	//console.log(query("excludes(tags,ne(fun))"), _.query(null, "excludes(tags,ne(fun))"));
	// FIXME: failing!
	//equal(query("excludes(tags,ne(fun))").length, 1);
	//equal(query("excludes(tags,ne(even))").length, 0);

	deepEqual(query("match(price,10)"), [data[0]]);
	deepEqual(query("price=re:10"), [data[0]]);
	deepEqual(query("price!=re:10"), [data[1]]);
	deepEqual(query("match(name,f.*)"), [data[1]]);
	deepEqual(query("match(name,glob:f*)"), [data[1]]);
});

test("filtering #2", function(){
	var data = data2,
		query = query2;

	deepEqual(query("contains(path,3)&sort()"), []); // path is undefined
	deepEqual(query("contains(path.1,3)&sort(-path.1)"), [data[1], data[0]]); // 3 found in both
	deepEqual(query("excludes(path.1,3)&sort()"), []); // 3 found in both
	deepEqual(query("excludes(path.1,7)&sort()"), [data[0]]); // 7 found in second
});

test("filtering #3", function(){
	var data = data3,
		query = query3;

	deepEqual(query(''), data, 'empty query');
	deepEqual(query('a=2,b<4'), [data[0]], 'vanilla');
	deepEqual(query('a=2,and(b<4)'), [data[0]], 'vanilla, extra and');
	deepEqual(query("a=2,b<4,pick(-b,a)"), [{a:2}], 'pick -/+');
	deepEqual(query('or((pick(-b,a)&values(a/b/c)))'), [[],[],[]], 'pick -/+, values', 'fake or');
	deepEqual(query('a>1,b<4,pick(b,foo/bar,-foo/baz,+fo.ba),limit(1,1)'), [{b:0,foo:{bar: 'baz3'}}], 'pick deep properties, limit');
	deepEqual(query('or(eq(a,2),eq(b,4)),pick(b)'), [{b: 2}, {b: 4}], 'truly or');
	deepEqual(query('and(and(and(hasOwnProperty!=%22123)))'), data, 'attempt to access prototype -- noop');
	deepEqual(query('match(foo/bar,z3)'), [data[2]], 'match');
	deepEqual(query('foo/bar!=re:z3'), [data[0], data[1]], 'non-match');
	deepEqual(query('foo/baz=re:z'), [data[0]], 'implicit match');
	deepEqual(query('in(foo/bar,(baz1))'), [data[0]], 'occurance');
	deepEqual(query('in(foo/bar,baz2)'), [data[1]], 'occurance in non-array');
	deepEqual(query('nin(foo/bar,baz2)'), [data[0], data[2]], 'non-occurance in non-array');
	deepEqual(query('between(foo/bar,baz1,baz3)'), [data[0], data[1]], 'between strings');
	deepEqual(query('between(b,2,4)'), [data[0]], 'between numbers');
	// deepEqual(query('sort(c,-foo/bar,foo/baz)'), [data[2], data[1], data[0]], 'sort');
});