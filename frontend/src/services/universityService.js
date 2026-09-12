export const universityService = {
  getUniversityStats: async () => ({
    assignedChallenges: 3,
    activeProjects: 12,
    pendingProposals: 4,
    studentTeams: 8,
    industryCollaborations: 5,
    solutionsDeployed: 2
  }),
  getAssignedChallenges: async () => [
    { id: 'JH-CH-001', title: 'Smart Water Monitoring', domain: 'Water Resources', district: 'Ranchi', severity: 'High', peopleAffected: '5000+', currentStage: 'Awaiting University Review', assignedBy: 'Govt. Official', description: 'Need an IoT based system to monitor water ATMs.', block: 'Kanke', village: 'Hatia' },
    { id: 'JH-CH-002', title: 'Crop Disease Early Detection', domain: 'Agriculture', district: 'Gumla', severity: 'Medium', peopleAffected: '2000+', currentStage: 'Assigned', assignedBy: 'Govt. Official', description: 'AI based crop disease detection using mobile app.', block: 'Bishunpur', village: 'Navatoli' }
  ],
  getActiveProjects: async () => [
    { id: 'PRJ-001', challengeId: 'JH-CH-001', title: 'Smart Water IoT System', facultyMentor: 'Dr. Anil Kumar', district: 'Ranchi', status: 'Active', progress: 60, nextMilestone: 'Prototype Testing', lifecycle: [{name: 'Challenge Assigned', completed: true}, {name: 'Team Formed', completed: true}, {name: 'Proposal Approved', completed: true}, {name: 'Prototype Development', completed: false}, {name: 'Deployment', completed: false}] }
  ],
  getProjectProposals: async () => [
    { id: 'PROP-001', title: 'Smart Water IoT System', challengeId: 'JH-CH-001', submittedOn: '2023-10-15', budget: '₹2.5 Lakhs', status: 'Under Government Review' }
  ],
  getStudentTeams: async () => [
    { id: 'TM-001', name: 'Water Innovators', project: 'Smart Water IoT System', facultyMentor: 'Dr. Anil Kumar', students: ['Aman Singh', 'Priya Kumari'], departments: ['Computer Science', 'Electronics'], skills: ['IoT', 'AI/ML'], status: 'Active' }
  ],
  getIndustryCollaborations: async () => ({
    requests: [
      { id: 'REQ-001', industry: 'TechCorp India', projectTitle: 'Smart Water IoT System', supportOffered: ['Hardware Sponsorship', 'Mentorship'] }
    ],
    active: [
      { id: 'ACT-001', industry: 'AgriTech Solutions', projectTitle: 'Crop Disease Early Detection', contribution: 'Data APIs & Cloud Hosting' }
    ]
  }),
  getMilestones: async () => [
    { id: 'MIL-001', project: 'Smart Water IoT System', title: 'Prototype Demo', dueDate: '2023-11-20', status: 'Pending' }
  ],
  getResearchInnovation: async () => ({
    activeResearch: 5, prototypes: 3, patents: 1, publications: 12,
    highlights: [{ title: 'IoT Patent Filed for Water ATMs', date: '2023-10-05', status: 'Verified' }]
  }),
  getImpactMetrics: async () => ({
    peopleBenefited: '12,500', villagesCovered: 15, districtsImpacted: 3, solutionsDeployed: 2
  }),
  getNotifications: async () => [
    { id: 'N-1', text: 'New challenge JH-CH-001 assigned to your university.', date: '2 hours ago', read: false }
  ],
  getUniversityProfile: async () => ({
    name: 'Demo University', type: 'State University', location: 'Ranchi, Jharkhand', contact: 'admin@demouniversity.ac.in',
    departments: ['Computer Science', 'Electronics', 'Mechanical'], researchAreas: ['IoT', 'AI/ML', 'Robotics'], innovationCentre: 'Yes', incubationCentre: 'Yes'
  })
};
