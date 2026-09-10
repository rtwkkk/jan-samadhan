/**
 * Validates and normalizes an Indian mobile number.
 * Strips +91 prefix, spaces, and dashes.
 * Returns the clean 10-digit number if valid, or null if invalid.
 *
 * @param {string|number} phone
 * @returns {string|null}
 */
const isValidIndianMobile = (phone) => {
  if (!phone) return null;

  // Convert to string and strip non-digit characters
  const normalized = String(phone).replace(/\D/g, '');

  // Handle +91 / 91 prefix
  let numberToTest = normalized;
  if (normalized.length === 12 && normalized.startsWith('91')) {
    numberToTest = normalized.substring(2);
  }

  // Must be exactly 10 digits starting with 6, 7, 8, or 9
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(numberToTest) ? numberToTest : null;
};

module.exports = { isValidIndianMobile };
