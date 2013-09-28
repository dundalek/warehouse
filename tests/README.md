
# Testing

Init QUnit by running:

`git clone https://github.com/jquery/qunit.git ../node_modules/qunit/support/qunit -b v1.10.0`

## Backend

Run `node backend-run.js` for running tests, all should pass.

## Browser

Run `node browser-run.js` and then open <http://localhost:12345/> in browser for running tests, all should pass.

RQL tests are at <http://localhost:12345/tests/rql.html>

## RQL

Run `node rql-run.js`

Current fail status:

- mongo: 6 (distinct, and/or)
- memory: 2 (distinct)
- elasticsearch: 12 (distinct, and/or)