
# Testing

## Backend

Run `node backend-run.js` for running tests, all should pass.

## Browser

Run `node backend-run.js` and then open http://localhost:12345/ in browser for running tests, all should pass.

## RQL

Run `node rql-run.js`

Current fail status:

- mongo: 6 (distinct, and/or)
- memory: 2 (distinct)
- elasticsearch: 12 (distinct, and/or)