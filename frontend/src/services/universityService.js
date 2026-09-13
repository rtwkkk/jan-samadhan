const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BASE_URL = `${API_URL}/university`;

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

export const universityService = {
  getUniversityStats: () => fetchWrapper('/stats'),
  getAssignedChallenges: () => fetchWrapper('/challenges/assigned'),
  getActiveProjects: () => fetchWrapper('/projects/active'),
  getProjectProposals: () => fetchWrapper('/projects/proposals'),
  getStudentTeams: () => fetchWrapper('/teams'),
  createStudentTeam: (teamData) => fetchWrapper('/teams', {
    method: 'POST',
    body: JSON.stringify(teamData)
  }),
  updateStudentTeam: (id, teamData) => fetchWrapper(`/teams/${id}`, {
    method: 'PUT',
    body: JSON.stringify(teamData)
  }),
  deleteStudentTeam: (id) => fetchWrapper(`/teams/${id}`, {
    method: 'DELETE'
  }),
  getIndustryCollaborations: () => fetchWrapper('/collaborations/industry'),
  getMilestones: () => fetchWrapper('/milestones'),
  getResearchInnovation: () => fetchWrapper('/research-innovation'),
  getImpactMetrics: () => fetchWrapper('/impact-metrics'),
  getNotifications: () => fetchWrapper('/notifications'),
  getUniversityProfile: () => fetchWrapper('/profile')
};
