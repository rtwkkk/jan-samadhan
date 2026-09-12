/**
 * Jagriti AI Service
 *
 * Wraps the existing aiService to produce the three AI-generated fields
 * (title, department/category, priority) from voice-collected citizen data.
 * Validates every AI output before returning.
 */
const aiService = require('../aiService');

// ── Known valid values (must match the existing Challenge schema) ──
const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const VALID_DEPARTMENTS = [
  'Higher Education',
  'Health & Family Welfare',
  'Agriculture & Farmers Welfare',
  'Rural Development',
  'Water Resources',
  'Urban Development & Housing',
  'Forest & Environment',
  'Other'
];

/**
 * Generates a concise, meaningful title from the complaint description.
 * The existing aiService does not have a title-generation method, so we
 * implement a keyword-extraction heuristic here.
 *
 * @param {string} description - The raw call summary / complaint description
 * @returns {string}
 */
function generateTitle(description) {
  if (!description || typeof description !== 'string') {
    return 'Citizen Complaint via Jagriti';
  }

  const text = description.trim();

  // Take the first sentence (up to 120 chars) and clean it up
  let title = text.split(/[.!?\n]/)[0].trim();

  // Ensure title is strictly capped at 80 chars
  if (title.length > 80) {
    title = title.substring(0, 80).replace(/\s+\S*$/, '') + '...';
  }

  // If the extraction ended up empty, fall back to first N words
  if (!title || title.length < 5) {
    const words = text.split(/\s+/).slice(0, 8);
    title = words.join(' ');
    if (title.length > 80) {
      title = title.substring(0, 80).replace(/\s+\S*$/, '') + '...';
    }
  }

  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);

  return title || 'Citizen Complaint via Jagriti';
}

/**
 * Runs the full AI analysis pipeline on voice-collected data.
 *
 * @param {Object} params
 * @param {string} params.callSummary - Raw description from citizen
 * @param {string} params.complaintType - Category hint from voice agent
 * @param {number} params.peopleAffected
 * @param {string} params.providedTitle - Title directly provided from AI payload
 * @returns {Promise<{success: boolean, title: string, department: string, category: string, priority: string, confidence: number, error?: string}>}
 */
async function processVoiceData({ callSummary, complaintType, peopleAffected, providedTitle }) {
  try {
    // Build the description text the existing AI service expects
    const description = callSummary || '';
    const people = parseInt(peopleAffected, 10) || 1;

    // 1. Process provided title, explicitly preventing fallback to description
    let title = (providedTitle && typeof providedTitle === 'string' && providedTitle.trim().length > 3) 
      ? providedTitle.trim() 
      : 'Title Pending Generation'; // Explicitly flag missing titles instead of generating from summary
      
    // Extreme fallback protection against a long paragraph slipping into the title
    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }

    // 2. Determine department & category via existing aiService
    const categoryResult = await aiService.detectCategoryDepartment(description);

    // 3. Determine priority via existing aiService
    const urgencyResult = await aiService.verifyUrgency(description, people);

    // Use the complaintType hint as a category fallback if AI returned 'Other'
    let category = categoryResult.category || 'Other';
    let department = categoryResult.department || 'Other';
    if (category === 'Other' && complaintType && complaintType.trim()) {
      category = complaintType.trim();
    }

    const priority = urgencyResult.urgencySeverity || 'Medium';
    const confidence = Math.min(
      categoryResult.confidence || 0,
      urgencyResult.confidence || 0
    );

    // ── Validate AI outputs ──
    if (!title || title.length === 0) {
      return { success: false, error: 'AI failed to generate a valid title' };
    }

    if (!VALID_DEPARTMENTS.includes(department)) {
      // Don't fail hard — fall back to 'Other' with a warning
      console.warn(`[JagritiAI] AI returned unknown department "${department}", falling back to "Other"`);
      department = 'Other';
    }

    if (!VALID_PRIORITIES.includes(priority)) {
      console.warn(`[JagritiAI] AI returned unknown priority "${priority}", falling back to "Medium"`);
    }

    const validatedPriority = VALID_PRIORITIES.includes(priority) ? priority : 'Medium';

    return {
      success: true,
      title,
      department,
      category,
      priority: validatedPriority,
      confidence
    };
  } catch (error) {
    console.error('[JagritiAI] Processing error:', error);
    return {
      success: false,
      error: 'AI processing failed: ' + (error.message || 'Unknown error')
    };
  }
}

module.exports = {
  processVoiceData,
  generateTitle,
  VALID_PRIORITIES,
  VALID_DEPARTMENTS
};
