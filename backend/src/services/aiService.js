/**
 * AI Service Mock
 * 
 * In a real production environment, this service would connect to OpenAI, Google Gemini, 
 * or the project's preferred LLM via an API to analyze text.
 * 
 * For this integration, we mock the behavior to satisfy the requirements seamlessly.
 */

const CATEGORIES = ['Education','Agriculture','Healthcare','Water Resources','Environment','Urban Development','Accessibility','Rural Livelihoods', 'Other'];
const DEPARTMENTS = ['Higher Education','Health & Family Welfare','Agriculture & Farmers Welfare','Rural Development','Water Resources','Urban Development & Housing','Forest & Environment','Other'];

/**
 * Analyzes the challenge description to extract the category and department.
 * @param {string} description 
 * @returns {Promise<{category: string, department: string, confidence: number, status: string}>}
 */
exports.detectCategoryDepartment = async (description) => {
  return new Promise((resolve) => {
    // Simulate API delay
    setTimeout(() => {
      try {
        const text = description.toLowerCase();
        let category = 'Other';
        let department = 'Other';

        if (text.includes('school') || text.includes('education') || text.includes('student')) {
          category = 'Education';
          department = 'Higher Education';
        } else if (text.includes('farm') || text.includes('crop') || text.includes('agriculture')) {
          category = 'Agriculture';
          department = 'Agriculture & Farmers Welfare';
        } else if (text.includes('health') || text.includes('hospital') || text.includes('disease')) {
          category = 'Healthcare';
          department = 'Health & Family Welfare';
        } else if (text.includes('water') || text.includes('river') || text.includes('drought')) {
          category = 'Water Resources';
          department = 'Water Resources';
        } else if (text.includes('tree') || text.includes('pollution') || text.includes('environment')) {
          category = 'Environment';
          department = 'Forest & Environment';
        }

        resolve({
          category,
          department,
          confidence: 0.85 + (Math.random() * 0.1),
          status: 'completed'
        });
      } catch (err) {
        resolve({ category: 'Other', department: 'Other', confidence: 0, status: 'failed' });
      }
    }, 1500);
  });
};

/**
 * Analyzes the challenge to determine urgency and severity.
 * @param {string} description 
 * @param {number} peopleAffected 
 * @returns {Promise<{urgencySeverity: string, confidence: number, status: string}>}
 */
exports.verifyUrgency = async (description, peopleAffected) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        const text = description.toLowerCase();
        let urgency = 'Low';

        if (peopleAffected > 5000 || text.includes('emergency') || text.includes('death')) {
          urgency = 'Critical';
        } else if (peopleAffected > 1000 || text.includes('severe') || text.includes('urgent')) {
          urgency = 'High';
        } else if (peopleAffected > 100 || text.includes('important')) {
          urgency = 'Medium';
        }

        resolve({
          urgencySeverity: urgency,
          confidence: 0.9 + (Math.random() * 0.08),
          status: 'completed'
        });
      } catch (err) {
        resolve({ urgencySeverity: 'Unverified', confidence: 0, status: 'failed' });
      }
    }, 1000);
  });
};
