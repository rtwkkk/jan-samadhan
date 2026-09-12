export const DUMMY_INDUSTRY_USER = {
  id: 'IND-9021',
  name: 'Tata Consultancy Services',
  role: 'Industry',
  type: 'Private Limited Company',
  domain: 'Technology',
  expertise: ['IoT', 'Software Development', 'Cloud Computing', 'AI/ML'],
  location: 'Jamshedpur, Jharkhand',
  contactPerson: 'Rahul Sharma',
  email: 'rahul.s@example.com',
  phone: '+91-9876543210',
  description: 'Leading IT services, consulting and business solutions organization.',
};

export const RECOMMENDED_CHALLENGES = [
  {
    id: 'JH-CH-001',
    title: 'Smart Water Monitoring for Rural Communities',
    district: 'Dumka',
    domain: 'Water Management',
    severity: 'High',
    peopleAffected: '~2,400',
    currentStage: 'University Collaboration',
    supportRequired: ['Technology', 'Pilot Deployment'],
    university: 'Birsa Institute of Technology',
    universityTeam: 'Smart Systems Research Team',
    dateReported: '2026-08-15',
    status: 'Verified',
    description: 'The lack of real-time monitoring for village water tanks leads to frequent dry-outs and water wastage. We need a low-cost, IoT-based water level monitoring system to alert authorities and locals.',
  },
  {
    id: 'JH-CH-002',
    title: 'Crop Disease Early Detection',
    district: 'Gumla',
    domain: 'Agriculture',
    severity: 'High',
    peopleAffected: '~850 farmers',
    currentStage: 'Solution Development',
    supportRequired: ['Technology', 'Mentorship'],
    university: 'Agriculture & Technology University',
    universityTeam: 'AgriTech Innovators',
    dateReported: '2026-08-20',
    status: 'Verified',
    description: 'Farmers in Gumla are losing up to 30% of their yield due to late identification of leaf blights. A mobile application with offline AI inference is required to detect early signs of diseases.',
  },
  {
    id: 'JH-CH-003',
    title: 'Rural Healthcare Access Monitoring',
    district: 'Latehar',
    domain: 'Healthcare',
    severity: 'Medium',
    peopleAffected: '~5,000',
    currentStage: 'University Assigned',
    supportRequired: ['Technology', 'Implementation'],
    university: 'Medical Research Institute',
    universityTeam: 'Health Informatics Group',
    dateReported: '2026-09-01',
    status: 'Verified',
    description: 'Primary health centers lack a reliable tracking system for medicine inventory and doctor availability, resulting in patients traveling long distances only to find no care available.',
  }
];

export const MY_APPLICATIONS = [
  {
    id: 'APP-101',
    challengeId: 'JH-CH-005',
    challengeTitle: 'AI Traffic Management',
    district: 'Ranchi',
    domain: 'Urban Development',
    submittedOn: '2026-09-05',
    supportOffered: ['Technology', 'Prototype Development'],
    status: 'Under Review',
    proposal: 'We propose to deploy our edge-AI cameras at 5 major intersections in Ranchi for real-time traffic signal optimization.',
  },
  {
    id: 'APP-102',
    challengeId: 'JH-CH-008',
    challengeTitle: 'Solar-Powered Cold Storage',
    district: 'Hazaribagh',
    domain: 'Agriculture',
    submittedOn: '2026-08-25',
    supportOffered: ['Funding', 'Pilot Deployment'],
    status: 'Shortlisted',
    proposal: 'Ready to fund the initial prototype and provide deployment logistics for 3 villages in Hazaribagh.',
  }
];

export const ACTIVE_PROJECTS = [
  {
    id: 'PRJ-301',
    challengeId: 'JH-CH-012',
    title: 'Smart Solar Irrigation System',
    district: 'Simdega',
    government: 'Jharkhand Agriculture Dept',
    university: 'Birsa Institute of Technology',
    industry: 'Tata Consultancy Services',
    progress: 68,
    nextMilestone: 'Field Testing',
    dueDate: '2026-09-25',
    milestones: [
      { name: 'Problem Validated', completed: true },
      { name: 'Solution Designed', completed: true },
      { name: 'Prototype Developed', completed: true },
      { name: 'Field Testing', completed: false },
      { name: 'Deployment', completed: false }
    ]
  },
  {
    id: 'PRJ-302',
    challengeId: 'JH-CH-015',
    title: 'Blockchain Land Registry',
    district: 'Ranchi',
    government: 'Revenue Department',
    university: 'IIIT Ranchi',
    industry: 'Tata Consultancy Services',
    progress: 40,
    nextMilestone: 'Prototype Developed',
    dueDate: '2026-10-10',
    milestones: [
      { name: 'Problem Validated', completed: true },
      { name: 'Solution Designed', completed: true },
      { name: 'Prototype Developed', completed: false },
      { name: 'Field Testing', completed: false },
      { name: 'Deployment', completed: false }
    ]
  }
];

export const COLLABORATION_REQUESTS = [
  {
    id: 'COL-501',
    projectId: 'PRJ-405',
    projectTitle: 'IoT Flood Warning System',
    from: 'NIT Jamshedpur',
    lookingFor: ['IoT Sensors', 'Field Testing Support'],
    date: '2026-09-10',
    status: 'Pending'
  }
];

export const IMPACT_METRICS = {
  peopleReached: '12,400',
  villagesCovered: '8',
  solutionsDeployed: '3',
  districtsImpacted: '2',
  recentImpact: [
    { project: 'Water ATM Installation', district: 'Simdega', people: '2,000+', status: 'Active' },
    { project: 'Digital Literacy Kiosk', district: 'Ranchi', people: '1,200+', status: 'Active' },
    { project: 'AI Crop Advisory', district: 'Gumla', people: '400+', status: 'Active' }
  ]
};

export const NOTIFICATIONS = [
  { id: 1, text: 'Your proposal for Solar-Powered Cold Storage has been shortlisted.', date: '2h ago', read: false },
  { id: 2, text: 'New challenge matching your expertise (IoT) is available in Dumka.', date: '1d ago', read: false },
  { id: 3, text: 'Field testing milestone for Smart Solar Irrigation System is due in 13 days.', date: '2d ago', read: true },
];

export const industryService = {
  getIndustryUser: () => Promise.resolve(DUMMY_INDUSTRY_USER),
  getRecommendedChallenges: () => Promise.resolve(RECOMMENDED_CHALLENGES),
  getMyApplications: () => Promise.resolve(MY_APPLICATIONS),
  getActiveProjects: () => Promise.resolve(ACTIVE_PROJECTS),
  getCollaborationRequests: () => Promise.resolve(COLLABORATION_REQUESTS),
  getImpactMetrics: () => Promise.resolve(IMPACT_METRICS),
  getNotifications: () => Promise.resolve(NOTIFICATIONS),
  submitInterest: (challengeId, proposalData) => {
    console.log('Interest submitted for', challengeId, proposalData);
    return Promise.resolve({ success: true, message: 'Interest submitted successfully.' });
  }
};

