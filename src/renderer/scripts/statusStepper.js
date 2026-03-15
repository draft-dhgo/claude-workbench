// Status stepper logic — pure function for computing stepper state
// Used by app.js to render issue progress steppers

var STEPS = [
  { key: 'created', label: 'Created' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'merged', label: 'Merged' },
];

/**
 * Compute stepper state for a given issue status
 * @param {string} status - issue status
 * @returns {Array<{label: string, status: 'done'|'active'|'pending'|'failed'}>}
 */
function getStepperState(status) {
  // Handle failed — show as failure at the 'completed' step position
  if (status === 'failed') {
    return [
      { label: 'Created', status: 'done' },
      { label: 'In Progress', status: 'done' },
      { label: 'Failed', status: 'failed' },
      { label: 'Merged', status: 'pending' },
    ];
  }

  // Handle merging as equivalent to completed (in-between state)
  var effectiveStatus = status === 'merging' ? 'completed' : status;
  // Handle closed as equivalent to merged
  if (effectiveStatus === 'closed') effectiveStatus = 'merged';

  var activeIndex = -1;
  for (var i = 0; i < STEPS.length; i++) {
    if (STEPS[i].key === effectiveStatus) {
      activeIndex = i;
      break;
    }
  }

  // If status not found in steps, default all to pending
  if (activeIndex === -1) {
    return STEPS.map(function (s) { return { label: s.label, status: 'pending' }; });
  }

  return STEPS.map(function (s, i) {
    if (i < activeIndex) return { label: s.label, status: 'done' };
    if (i === activeIndex) {
      // If merged, it's 'done' (final state)
      if (s.key === 'merged' && effectiveStatus === 'merged') return { label: s.label, status: 'done' };
      return { label: s.label, status: 'active' };
    }
    return { label: s.label, status: 'pending' };
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStepperState: getStepperState };
}
