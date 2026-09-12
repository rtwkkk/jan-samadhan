const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

const BASE_URL = 'http://localhost:5000/api/industry';

const fetchWrapper = async (endpoint, options = {}) => {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

export const industryService = {
  getIndustryStats: () => fetchWrapper('/stats'),
  getOpenChallenges: () => fetchWrapper('/challenges/open'),
  getActiveCollaborations: () => fetchWrapper('/collaborations/active'),
  getCSRRequests: () => fetchWrapper('/csr/requests'),
  getIndustryProfile: () => fetchWrapper('/profile'),
  getNotifications: () => fetchWrapper('/notifications')
};
