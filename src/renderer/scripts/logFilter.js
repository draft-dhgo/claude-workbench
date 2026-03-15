// Pipeline log filter utilities
// Used by app.js and tested independently

/**
 * Filter logs by issue tag
 * @param {Array} logs - array of log entries with { tag, type, content }
 * @param {string} filterTag - 'all' or specific issue ID (e.g., 'ISSUE-001')
 * @returns {Array} filtered logs
 */
function filterLogsByIssue(logs, filterTag) {
  if (filterTag === 'all') return logs;
  return logs.filter(function (l) { return l.tag === filterTag; });
}

/**
 * Extract unique non-empty issue tags from logs
 * @param {Array} logs
 * @returns {string[]} sorted unique tags
 */
function getUniqueTags(logs) {
  var seen = {};
  var result = [];
  for (var i = 0; i < logs.length; i++) {
    var tag = logs[i].tag;
    if (tag && !seen[tag]) {
      seen[tag] = true;
      result.push(tag);
    }
  }
  return result;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { filterLogsByIssue: filterLogsByIssue, getUniqueTags: getUniqueTags };
}
