const Project = require('../models/Project');
const StudentTeam = require('../models/StudentTeam');
const IndustryCollaboration = require('../models/IndustryCollaboration');
const Institution = require('../models/Institution');
const Challenge = require('../models/Challenge');

exports.getUniversityStats = async (req, res) => {
  try {
    const assignedChallenges = await Challenge.countDocuments({});
    const activeProjects = await Project.countDocuments({ institutionId: req.user._id, status: 'Active' });
    const pendingProposals = await Project.countDocuments({ institutionId: req.user._id, status: 'Under Government Review' });
    const studentTeams = await StudentTeam.countDocuments({ institutionId: req.user._id });
    const industryCollaborations = await IndustryCollaboration.countDocuments({ institutionId: req.user._id });
    const solutionsDeployed = await Project.countDocuments({ institutionId: req.user._id, status: 'Completed' });

    res.json({
      assignedChallenges,
      activeProjects,
      pendingProposals,
      studentTeams,
      industryCollaborations,
      solutionsDeployed
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAssignedChallenges = async (req, res) => {
  try {
    const challenges = await Challenge.find({});
    const result = challenges.map(c => ({
      id: c._id,
      title: c.title,
      domain: c.department || 'Unknown',
      district: c.district || 'Unknown',
      severity: c.urgencySeverity || 'Medium',
      peopleAffected: c.peopleAffected || 'Unknown',
      currentStage: c.status === 'assigned' ? 'Awaiting University Review' : c.status,
      assignedBy: 'Govt. Official',
      description: c.description || '',
      block: c.villageCityBlock || '',
      village: c.villageCityBlock || '',
      dateReported: c.createdAt ? c.createdAt.toISOString().split('T')[0] : 'Unknown',
      evidence: {
        photo: c.supportingDocuments && c.supportingDocuments.some(doc => doc.match(/\.(jpeg|jpg|gif|png)$/) != null),
        video: c.supportingDocuments && c.supportingDocuments.some(doc => doc.match(/\.(mp4|mkv|avi)$/) != null),
        doc: c.supportingDocuments && c.supportingDocuments.some(doc => doc.match(/\.(pdf|doc|docx)$/) != null)
      },
      validation: ['Verified by Admin', 'Routed to Institution']
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getActiveProjects = async (req, res) => {
  try {
    const projects = await Project.find({ institutionId: req.user._id, status: 'Active' }).populate('challengeId');
    const result = projects.map(p => ({
      id: p._id,
      challengeId: p.challengeId ? p.challengeId._id : '',
      title: p.title,
      facultyMentor: p.facultyMentor,
      district: p.challengeId ? p.challengeId.district : 'Unknown',
      status: p.status,
      progress: p.progress,
      nextMilestone: p.nextMilestone,
      lifecycle: p.lifecycle
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProjectProposals = async (req, res) => {
  try {
    const projects = await Project.find({ institutionId: req.user._id, status: 'Under Government Review' });
    const result = projects.map(p => ({
      id: p._id,
      title: p.title,
      challengeId: p.challengeId,
      submittedOn: p.submittedOn.toISOString().split('T')[0],
      budget: p.budget,
      status: p.status
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStudentTeams = async (req, res) => {
  try {
    const teams = await StudentTeam.find({ institutionId: req.user._id }).populate('projectId');
    const result = teams.map(t => ({
      id: t._id,
      name: t.name,
      project: t.projectId ? t.projectId.title : 'Unassigned',
      facultyMentor: t.facultyMentor,
      students: t.students,
      departments: t.departments,
      skills: t.skills,
      status: t.status
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createStudentTeam = async (req, res) => {
  try {
    const { name, project, facultyMentor, students, departments, skills, status } = req.body;
    let projectId = null;
    
    // Find project by title if provided (basic linking)
    if (project && project !== 'Unassigned') {
      const p = await Project.findOne({ title: project, institutionId: req.user._id });
      if (p) projectId = p._id;
    }

    const team = new StudentTeam({
      name,
      institutionId: req.user._id,
      projectId,
      facultyMentor,
      students,
      departments,
      skills,
      status: status || 'Active'
    });
    
    await team.save();
    res.status(201).json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateStudentTeam = async (req, res) => {
  try {
    const team = await StudentTeam.findOneAndUpdate(
      { _id: req.params.id, institutionId: req.user._id },
      req.body,
      { new: true }
    );
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteStudentTeam = async (req, res) => {
  try {
    await StudentTeam.findOneAndDelete({ _id: req.params.id, institutionId: req.user._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getIndustryCollaborations = async (req, res) => {
  try {
    const collabs = await IndustryCollaboration.find({ institutionId: req.user._id }).populate('industryId').populate('projectId');
    
    const requests = collabs.filter(c => c.status === 'Pending').map(c => ({
      id: c._id,
      industry: c.industryId ? c.industryId.name : 'Unknown',
      projectTitle: c.projectId ? c.projectId.title : 'Unknown',
      supportOffered: c.supportOffered
    }));

    const active = collabs.filter(c => c.status === 'Active').map(c => ({
      id: c._id,
      industry: c.industryId ? c.industryId.name : 'Unknown',
      projectTitle: c.projectId ? c.projectId.title : 'Unknown',
      contribution: c.contributionDetails
    }));

    res.json({ requests, active });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getResearchInnovation = async (req, res) => {
  try {
    const inst = await Institution.findById(req.user._id);
    if (!inst) return res.status(404).json({ error: 'Not found' });
    
    res.json({
      activeResearch: inst.researchInnovation?.activeResearch || 0,
      prototypes: inst.researchInnovation?.prototypes || 0,
      patents: inst.researchInnovation?.patents || 0,
      publications: inst.researchInnovation?.publications || 0,
      highlights: inst.researchInnovation?.highlights || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getImpactMetrics = async (req, res) => {
  try {
    const inst = await Institution.findById(req.user._id);
    if (!inst) return res.status(404).json({ error: 'Not found' });
    
    res.json(inst.impactMetrics || {
      peopleBenefited: '0', villagesCovered: 0, districtsImpacted: 0, solutionsDeployed: 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUniversityProfile = async (req, res) => {
  try {
    const inst = await Institution.findById(req.user._id);
    if (!inst) return res.status(404).json({ error: 'Not found' });
    
    res.json({
      name: inst.name,
      type: inst.type,
      location: inst.district,
      contact: inst.emailDomain,
      email: inst.email || 'N/A',
      phone: inst.phone || 'N/A',
      aisheCode: inst.aisheCode || 'N/A',
      verificationStatus: inst.verificationStatus || 'Pending',
      joinedDate: inst.createdAt ? inst.createdAt.toISOString().split('T')[0] : 'N/A',
      departments: inst.departments && inst.departments.length > 0 ? inst.departments : ['General'],
      researchAreas: inst.researchDomains && inst.researchDomains.length > 0 ? inst.researchDomains : ['Various'],
      facilities: inst.facilities || 0,
      similarProjectsCompleted: inst.similarProjectsCompleted || 0,
      innovationCentre: 'Yes',
      incubationCentre: 'Yes'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMilestones = async (req, res) => {
  try {
    const projects = await Project.find({ institutionId: req.user._id, status: 'Active' });
    const milestones = [];
    projects.forEach(p => {
      if (p.nextMilestone) {
        milestones.push({
          id: p._id,
          project: p.title,
          title: p.nextMilestone,
          dueDate: p.submittedOn ? new Date(p.submittedOn.getTime() + 30*24*60*60*1000).toISOString().split('T')[0] : 'TBD', // roughly +1 month from submittedOn
          status: 'Pending'
        });
      }
    });
    res.json(milestones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getNotifications = async (req, res) => {
  res.json([]);
};
