/**
 * Centralized Backend Data Validation & Realism Guardrails
 * Prevents invalid, negative, NaN, or physically unrealistic inputs.
 */

function validateNumberInRange(value, fieldName, min, max, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) return `${fieldName} is required.`;
    return null;
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return `${fieldName} must be a valid number.`;
  }
  if (num < min || num > max) {
    return `${fieldName} must be between ${min} and ${max}.`;
  }
  return null;
}

function validateHttpUrl(url, fieldName = 'URL') {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return `${fieldName} must start with http:// or https://.`;
    }
    return null;
  } catch {
    return `${fieldName} is not a valid URL.`;
  }
}

function collectErrors(checks) {
  return checks.filter(Boolean);
}

module.exports = {
  validateNumberInRange,
  validateHttpUrl,
  collectErrors
};
