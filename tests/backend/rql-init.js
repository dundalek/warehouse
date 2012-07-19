
var _ = require('underscore-data');

var data1 = [{
	"with/slash": "slashed",
	"nested": {
		"property": "value"
	},
	"price": 10,
	"name": "ten",
	"tags": ["fun", "even"]
},{
	"price": 5,
	"name": "five",
	"tags": ["fun"]
}];

var data2 = [{
	"path.1":[1,2,3]
},{
	"path.1":[9,3,7]
}];

var data3 = [{
	a:2,b:2,c:1,foo:{bar:'baz1',baz:'raz'}
},{
	a:1,b:4,c:1,foo:{bar:'baz2'}
},{
	a:3,b:0,c:1,foo:{bar:'baz3'}
}];

exports.data1 = data1;
exports.data2 = data2;
exports.data3 = data3;

exports.query1 = function(query) {
	return _.query(data1, query);
};

exports.query2 = function(query) {
	return _.query(data2, query);
};

exports.query3 = function(query) {
	return _.query(data3, query);
};