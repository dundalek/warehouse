var testrunner = require("qunit");

testrunner.run({
    code: "./backend/fs-init.js",
    tests: "./test.js"
});

testrunner.run({
    code: "./backend/ne-init.js",
    tests: "./test.js"
});

testrunner.run({
    code: "./backend/mysql-init.js",
    tests: ["./test.js"]
});

testrunner.run({
    code: "./backend/sqlite3-init.js",
    tests: ["./test.js"]
});

testrunner.run({
    code: "./backend/mongo-init.js",
    tests: "./test.js"
});

testrunner.run({
    code: "./backend/memory-init.js",
    tests: ["./test.js", "./backend/memory-test.js"]
});

testrunner.run({
    code: "./backend/rest-memory-init.js",
    tests: "./test.js"
});

testrunner.run({
    code: "./backend/rest-rest-memory-init.js",
    tests: "./test.js"
});

testrunner.run({
    code: "./backend/rest-mongo-init.js",
    tests: "./test.js"
});

testrunner.run({
    code:  "./backend/rql-init.js",
    tests: "./query-test.js"
});

testrunner.run({
    code: "./backend/elasticsearch-init.js",
    tests: "./test.js"
});

testrunner.run({
    code: "./backend/memory-init.js",
    tests: ["./rql-builder.js"]
});