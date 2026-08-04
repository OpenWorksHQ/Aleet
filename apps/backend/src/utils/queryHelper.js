// utils/queryHelper.js

/**
 * Pagination helper
 * @param {Object} query - Express req.query object
 */
const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.max(1, parseInt(query.limit) || 10);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Sorting helper
 * @param {string} sortBy - Field to sort
 * @param {string} order - 'asc' or 'desc'
 */
const getSorting = (sortBy = 'createdAt', order = 'desc') => {
  const sortOrder = order === 'asc' ? 1 : -1;

  // Example special case
  if (sortBy === 'ticketNumber') {
    return { ticketNumberInt: sortOrder, _id: 1 };
  }

  return { [sortBy]: sortOrder, _id: 1 };
};

/** Longest search string accepted — anything beyond this is a DoS attempt. */
const MAX_SEARCH_LENGTH = 100;

/**
 * Escape every regex metacharacter so user input is matched literally.
 * Without this, `?search=(a+)+$` compiles into a catastrophically backtracking
 * pattern (ReDoS) and `?search=.*` matches every document.
 *
 * @param {string} value
 * @returns {string}
 */
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Search helper — builds a case-insensitive "contains" match across `fields`.
 * Input is escaped and length-capped before it reaches the regex engine.
 *
 * @param {string} searchText
 * @param {Array<string>} fields - fields to search across
 */
const getSearchQuery = (searchText, fields) => {
  if (!searchText || typeof searchText !== 'string') return {};

  const trimmed = searchText.trim().slice(0, MAX_SEARCH_LENGTH);
  if (!trimmed) return {};

  const regex = new RegExp(escapeRegex(trimmed), 'i'); // case-insensitive, literal
  return {
    $or: fields.map(field => ({ [field]: regex }))
  };
};

module.exports = {
  getPagination,
  getSorting,
  getSearchQuery,
  escapeRegex,
  MAX_SEARCH_LENGTH
};
