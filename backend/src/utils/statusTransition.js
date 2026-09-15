const allowedTransitions = {
  submitted: ['under_review', 'verified', 'rejected', 'information_requested'],
  under_review: ['verified', 'rejected', 'information_requested'],
  information_requested: ['under_review', 'rejected'],
  verified: ['assigned', 'rejected'],
  assigned: ['in_progress', 'rejected'],
  in_progress: ['resolved', 'rejected'],
  resolved: [],
  rejected: [] // Terminal state, cannot transition further
};

/**
 * Validates if a status transition is allowed.
 * @param {string} currentStatus 
 * @param {string} nextStatus 
 * @returns {boolean}
 */
const canTransition = (currentStatus, nextStatus) => {
  if (currentStatus === nextStatus) return true; // Redundant but technically allowed
  const validNextStates = allowedTransitions[currentStatus] || [];
  return validNextStates.includes(nextStatus);
};

module.exports = {
  allowedTransitions,
  canTransition
};
