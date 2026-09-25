// HTTP tests for POST /api/underwriting/decision — wiring and validation only;
// decision rules are covered in decision.test.js.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');

let server;
let baseUrl;

before(() => new Promise((resolve) => {
  server = app.listen(0, () => {
    baseUrl = `http://localhost:${server.address().port}`;
    resolve();
  });
}));

after(() => server.close());

const post = (body) => fetch(`${baseUrl}/api/underwriting/decision`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

test('returns 200 with a decision for a valid application', async () => {
  const res = await post({
    annualIncome: 120000,
    monthlyDebt: 2500,
    propertyValue: 400000,
    requestedLoan: 280000,
    creditScore: 720,
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual((await res.json()).decision, 'APPROVE');
});

test('returns 400 for missing fields', async () => {
  const res = await post({ creditScore: 700 });
  assert.strictEqual(res.status, 400);
  assert.ok((await res.json()).details.length > 0);
});

test('returns 400 for malformed JSON', async () => {
  const res = await post('{bad json');
  assert.strictEqual(res.status, 400);
});
