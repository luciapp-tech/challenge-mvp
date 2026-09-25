// Rule-based underwriting engine.
// Thresholds are placeholders — tune them to your actual credit policy.
const RULES = {
  minCreditScore: 600,
  referCreditScore: 680,
  maxDebtToIncome: 0.5,
  referDebtToIncome: 0.4,
  maxLoanToValue: 0.9,
  referLoanToValue: 0.8,
};

const REQUIRED_FIELDS = ['annualIncome', 'monthlyDebt', 'propertyValue', 'requestedLoan', 'creditScore'];

function validate(input) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return ['Request body must be a JSON object'];
  }
  for (const field of REQUIRED_FIELDS) {
    if (typeof input[field] !== 'number' || !Number.isFinite(input[field])) {
      errors.push(`${field} is required and must be a number`);
    } else if (input[field] < 0) {
      errors.push(`${field} must be non-negative`);
    }
  }
  if (typeof input.creditScore === 'number' && (input.creditScore < 300 || input.creditScore > 850)) {
    errors.push('creditScore must be between 300 and 850');
  }
  if (input.annualIncome === 0) {
    errors.push('annualIncome must be greater than 0');
  }
  if (input.propertyValue === 0) {
    errors.push('propertyValue must be greater than 0');
  }
  return errors;
}

const MAX_APPROVED_LTV = 0.8;

function decide(input) {
  const { annualIncome, monthlyDebt, propertyValue, requestedLoan, creditScore } = input;
  const debtToIncome = monthlyDebt / (annualIncome / 12);
  const loanToValue = requestedLoan / propertyValue;

  // Every non-ideal factor is reported; severity drives the final decision.
  const findings = [];
  const flag = (severity, code, message) => findings.push({ severity, code, message });

  if (creditScore < RULES.minCreditScore) {
    flag('DECLINE', 'CREDIT_SCORE_BELOW_MINIMUM', `Credit score ${creditScore} is below the minimum of ${RULES.minCreditScore}`);
  } else if (creditScore < RULES.referCreditScore) {
    flag('REFER', 'CREDIT_SCORE_BELOW_PREFERRED', `Credit score ${creditScore} is below ${RULES.referCreditScore} and requires manual review`);
  }

  if (debtToIncome > RULES.maxDebtToIncome) {
    flag('DECLINE', 'DTI_ABOVE_MAXIMUM', `Debt-to-income ratio ${round(debtToIncome)} exceeds the maximum of ${RULES.maxDebtToIncome}`);
  } else if (debtToIncome > RULES.referDebtToIncome) {
    flag('REFER', 'DTI_ABOVE_PREFERRED', `Debt-to-income ratio ${round(debtToIncome)} is above ${RULES.referDebtToIncome} and requires manual review`);
  }

  if (loanToValue > RULES.maxLoanToValue) {
    flag('DECLINE', 'LTV_ABOVE_MAXIMUM', `Loan-to-value ratio ${round(loanToValue)} exceeds the maximum of ${RULES.maxLoanToValue}`);
  } else if (loanToValue > RULES.referLoanToValue) {
    flag('REFER', 'LTV_ABOVE_PREFERRED', `Loan-to-value ratio ${round(loanToValue)} is above ${RULES.referLoanToValue} and requires manual review`);
  }

  let decision = 'APPROVE';
  if (findings.some((f) => f.severity === 'DECLINE')) {
    decision = 'DECLINE';
  } else if (findings.length) {
    decision = 'REFER';
  }

  return {
    decision,
    approvedAmount: decision === 'APPROVE'
      ? Math.min(requestedLoan, propertyValue * MAX_APPROVED_LTV)
      : null,
    metrics: {
      debtToIncome: round(debtToIncome),
      loanToValue: round(loanToValue),
    },
    reasons: findings,
  };
}

function round(value) {
  return Number(value.toFixed(4));
}

module.exports = { validate, decide, RULES };
