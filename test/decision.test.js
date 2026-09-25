// Unit tests for the pure decision function — no server or HTTP involved.
const { describe, test } = require('node:test');
const assert = require('node:assert');
const { decide } = require('../src/services/underwriting');

const application = {
  annualIncome: 120000,
  monthlyDebt: 2500,
  propertyValue: 400000,
  requestedLoan: 280000,
  creditScore: 720,
};

const codes = (result) => result.reasons.map((r) => r.code);

describe('APPROVE', () => {
  test('approves an application that meets every rule', () => {
    assert.deepStrictEqual(decide(application), {
      decision: 'APPROVE',
      approvedAmount: 280000,
      metrics: { debtToIncome: 0.25, loanToValue: 0.7 },
      reasons: [],
    });
  });

  test('approves values exactly on the refer thresholds (680, 0.40, 0.80)', () => {
    const result = decide({ ...application, creditScore: 680, monthlyDebt: 4000, requestedLoan: 320000 });
    assert.strictEqual(result.decision, 'APPROVE');
    assert.strictEqual(result.approvedAmount, 320000);
  });
});

describe('DECLINE', () => {
  test('declines a credit score below 600', () => {
    const result = decide({ ...application, creditScore: 599 });
    assert.strictEqual(result.decision, 'DECLINE');
    assert.strictEqual(result.approvedAmount, null);
    assert.deepStrictEqual(codes(result), ['CREDIT_SCORE_BELOW_MINIMUM']);
  });

  test('declines debt-to-income above 0.50', () => {
    const result = decide({ ...application, monthlyDebt: 5100 });
    assert.strictEqual(result.decision, 'DECLINE');
    assert.deepStrictEqual(codes(result), ['DTI_ABOVE_MAXIMUM']);
  });

  test('declines loan-to-value above 0.90', () => {
    const result = decide({ ...application, requestedLoan: 361000 });
    assert.strictEqual(result.decision, 'DECLINE');
    assert.deepStrictEqual(codes(result), ['LTV_ABOVE_MAXIMUM']);
  });

  test('does not decline values exactly on the decline thresholds (600, 0.50, 0.90)', () => {
    const result = decide({ ...application, creditScore: 600, monthlyDebt: 5000, requestedLoan: 360000 });
    assert.strictEqual(result.decision, 'REFER');
  });

  test('reports refer-level factors alongside the decline reason', () => {
    const result = decide({ ...application, creditScore: 550, monthlyDebt: 4100, requestedLoan: 340000 });
    assert.strictEqual(result.decision, 'DECLINE');
    assert.deepStrictEqual(codes(result), [
      'CREDIT_SCORE_BELOW_MINIMUM',
      'DTI_ABOVE_PREFERRED',
      'LTV_ABOVE_PREFERRED',
    ]);
    for (const r of result.reasons) assert.ok(r.message.length > 0);
  });
});

describe('REFER', () => {
  test('refers a credit score below 680', () => {
    const result = decide({ ...application, creditScore: 679 });
    assert.strictEqual(result.decision, 'REFER');
    assert.strictEqual(result.approvedAmount, null);
    assert.deepStrictEqual(codes(result), ['CREDIT_SCORE_BELOW_PREFERRED']);
  });

  test('refers debt-to-income above 0.40', () => {
    const result = decide({ ...application, monthlyDebt: 4100 });
    assert.strictEqual(result.decision, 'REFER');
    assert.deepStrictEqual(codes(result), ['DTI_ABOVE_PREFERRED']);
  });

  test('refers loan-to-value above 0.80', () => {
    const result = decide({ ...application, requestedLoan: 340000 });
    assert.strictEqual(result.decision, 'REFER');
    assert.deepStrictEqual(codes(result), ['LTV_ABOVE_PREFERRED']);
  });
});
