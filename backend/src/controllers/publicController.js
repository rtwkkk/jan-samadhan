const Challenge = require('../models/Challenge');
const Institution = require('../models/Institution');
const Industry = require('../models/Industry');

// @desc    Get public stats for KPIs
// @route   GET /api/public/stats
// @access  Public
const getStats = async (req, res) => {
  try {
    const totalChallenges = await Challenge.countDocuments();
    const totalInstitutions = await Institution.countDocuments();
    const totalIndustries = await Industry.countDocuments();
    const resolvedChallenges = await Challenge.countDocuments({ status: 'resolved' });

    res.json({
      challenges: totalChallenges,
      institutions: totalInstitutions,
      industries: totalIndustries,
      resolved: resolvedChallenges
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper to get human-readable label for status
const getStageLabel = (status) => {
  const map = {
    submitted: 'Complaint Submitted',
    under_review: 'Under Review / Verification',
    information_requested: 'Additional Information Requested',
    verified: 'Complaint Verified',
    assigned: 'Assigned to Department / Authority',
    in_progress: 'Action Initiated / In Progress',
    resolved: 'Action Taken & Resolved',
    rejected: 'Complaint Rejected'
  };
  return map[status] || status;
};

// Helper to determine expected next step
const getExpectedNextStep = (status) => {
  const nextSteps = {
    submitted: 'Grievance verification and jurisdictional assessment by District Scrutiny Team.',
    under_review: 'Validation of site details and allocation to relevant department.',
    information_requested: 'Awaiting citizen clarification and document re-submission.',
    verified: 'Official assignment to designated technical institution / department officer.',
    assigned: 'Site assessment, root cause analysis, and action plan initiation by assigned authority.',
    in_progress: 'Execution of ground-level remedial work and progress reporting.',
    resolved: 'Resolution confirmed. Case closed with public grievance satisfaction review.',
    rejected: 'Case evaluated and closed. Complainant may review remarks or submit an appeal.'
  };
  return nextSteps[status] || 'Under regular administrative review.';
};

// @desc    Track entity status by ID
// @route   GET /api/public/track/:id
// @access  Public
const trackEntity = async (req, res) => {
  try {
    const { id } = req.params;

    // A valid MongoDB _id is exactly 24 hex characters
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ message: 'Invalid Complaint / Tracking ID format. Please enter a valid 24-character ID.' });
    }

    const challenge = await Challenge.findById(id)
      .populate('institution', 'name')
      .select('title status category department urgencySeverity district createdAt updatedAt verifiedAt resolvedAt rejectedAt rejectionReason informationRequest assignment statusHistory')
      .lean();

    if (!challenge) {
      return res.status(404).json({ message: 'No complaint found matching this Tracking ID. Please verify and try again.' });
    }

    const assignedDepartment = challenge.assignment?.department || challenge.department || 'Competent Authority';
    const assignedAuthority = challenge.assignment?.institution_name ||
      (challenge.institution?.name ? challenge.institution.name : null) ||
      (assignedDepartment ? `${assignedDepartment} Division` : 'Jan Samadhan Authority');

    // Determine latest action / remark
    let latestAction = 'Complaint registered on Jan Samadhan portal';
    if (challenge.statusHistory && challenge.statusHistory.length > 0) {
      const lastH = challenge.statusHistory[challenge.statusHistory.length - 1];
      latestAction = lastH.reason || `Status updated to ${getStageLabel(lastH.to)}`;
    } else if (challenge.status === 'assigned') {
      latestAction = `Complaint assigned to ${assignedAuthority}`;
    } else if (challenge.status === 'rejected') {
      latestAction = challenge.rejectionReason ? `Rejected: ${challenge.rejectionReason}` : 'Complaint rejected after scrutiny';
    } else if (challenge.status === 'resolved') {
      latestAction = 'Issue successfully resolved and verified';
    } else if (challenge.status === 'under_review') {
      latestAction = 'Complaint is currently undergoing jurisdictional scrutiny';
    }

    // Build timeline stages
    const history = challenge.statusHistory || [];
    const findHistory = (toStatus) => history.find(h => h.to === toStatus);

    const statusHierarchy = {
      submitted: 1,
      under_review: 2,
      information_requested: 2.5,
      verified: 3,
      assigned: 4,
      in_progress: 5,
      resolved: 6,
      rejected: 6
    };

    const currentRank = statusHierarchy[challenge.status] || 1;

    let timeline = [];

    if (challenge.status === 'rejected') {
      // Rejected journey
      timeline = [
        {
          stageId: 'submitted',
          title: 'Complaint Submitted',
          state: 'completed',
          date: challenge.createdAt,
          remark: 'Complaint registered successfully on Jan Samadhan portal.',
          authority: 'Jan Samadhan Citizen Portal'
        },
        {
          stageId: 'under_review',
          title: 'Under Verification',
          state: 'completed',
          date: findHistory('under_review')?.changedAt || challenge.createdAt,
          remark: 'Initial scrutiny of complaint details and jurisdiction.',
          authority: 'Grievance Scrutiny Cell'
        },
        {
          stageId: 'rejected',
          title: 'Complaint Rejected',
          state: 'rejected',
          date: challenge.rejectedAt || findHistory('rejected')?.changedAt || challenge.updatedAt,
          remark: challenge.rejectionReason || 'Complaint evaluated and could not be accepted.',
          authority: 'Reviewing Authority'
        }
      ];
    } else if (challenge.status === 'information_requested') {
      // Information requested journey
      timeline = [
        {
          stageId: 'submitted',
          title: 'Complaint Submitted',
          state: 'completed',
          date: challenge.createdAt,
          remark: 'Complaint registered successfully on Jan Samadhan portal.',
          authority: 'Jan Samadhan Citizen Portal'
        },
        {
          stageId: 'information_requested',
          title: 'Additional Information Requested',
          state: 'current',
          date: challenge.informationRequest?.requestedAt || challenge.updatedAt,
          remark: challenge.informationRequest?.message || 'Further clarification requested from citizen.',
          authority: 'Scrutiny Officer'
        },
        {
          stageId: 'verified',
          title: 'Verification & Approval',
          state: 'pending',
          date: null,
          remark: 'Verification will resume once additional information is provided.',
          authority: 'District Scrutiny Cell'
        },
        {
          stageId: 'assigned',
          title: 'Assigned to Department / Authority',
          state: 'pending',
          date: null,
          remark: 'Pending verification completion.',
          authority: 'Nodal Authority'
        },
        {
          stageId: 'in_progress',
          title: 'Action Initiated / In Progress',
          state: 'pending',
          date: null,
          remark: 'Awaiting assignment.',
          authority: 'Assigned Authority'
        },
        {
          stageId: 'resolved',
          title: 'Action Taken & Resolved',
          state: 'pending',
          date: null,
          remark: 'Final resolution and grievance closure.',
          authority: 'Assigned Authority'
        }
      ];
    } else {
      // Standard progression
      const baseStages = [
        {
          stageId: 'submitted',
          title: 'Complaint Submitted',
          rank: 1,
          authority: 'Jan Samadhan Citizen Portal',
          defaultRemark: 'Complaint registered successfully on Jan Samadhan portal.',
          getDate: () => challenge.createdAt
        },
        {
          stageId: 'under_review',
          title: 'Under Verification',
          rank: 2,
          authority: 'Grievance Scrutiny Cell',
          defaultRemark: 'Complaint details and jurisdiction under initial verification.',
          getDate: () => findHistory('under_review')?.changedAt || (currentRank >= 2 ? challenge.createdAt : null)
        },
        {
          stageId: 'verified',
          title: 'Complaint Verified',
          rank: 3,
          authority: 'District Verification Officer',
          defaultRemark: 'Complaint validated and approved for official assignment.',
          getDate: () => challenge.verifiedAt || findHistory('verified')?.changedAt || (currentRank >= 3 ? challenge.updatedAt : null)
        },
        {
          stageId: 'assigned',
          title: 'Assigned to Department / Authority',
          rank: 4,
          authority: assignedAuthority,
          defaultRemark: `Assigned to ${assignedAuthority} for technical appraisal and action.`,
          getDate: () => challenge.assignment?.assigned_at || findHistory('assigned')?.changedAt || (currentRank >= 4 ? challenge.updatedAt : null)
        },
        {
          stageId: 'in_progress',
          title: 'Action Initiated / In Progress',
          rank: 5,
          authority: assignedAuthority,
          defaultRemark: 'Field inspection and remedial measures in active execution.',
          getDate: () => findHistory('in_progress')?.changedAt || (currentRank >= 5 ? challenge.updatedAt : null)
        },
        {
          stageId: 'resolved',
          title: 'Action Taken & Resolved',
          rank: 6,
          authority: assignedAuthority,
          defaultRemark: 'Remedial actions completed and verified by authority.',
          getDate: () => challenge.resolvedAt || findHistory('resolved')?.changedAt || (currentRank >= 6 ? challenge.updatedAt : null)
        }
      ];

      timeline = baseStages.map(stage => {
        let state = 'pending';
        let date = null;
        let remark = stage.defaultRemark;

        const hMatch = findHistory(stage.stageId);
        if (hMatch && hMatch.reason) {
          remark = hMatch.reason;
        }

        if (stage.rank < currentRank) {
          state = 'completed';
          date = stage.getDate();
        } else if (stage.rank === currentRank) {
          state = 'current';
          date = stage.getDate() || challenge.updatedAt;
        } else {
          state = 'pending';
          date = null;
        }

        return {
          stageId: stage.stageId,
          title: stage.title,
          state,
          date,
          remark,
          authority: stage.authority
        };
      });
    }

    // Chronological status history list
    const historyList = [
      {
        stage: 'Complaint Submitted',
        status: 'submitted',
        date: challenge.createdAt,
        authority: 'Jan Samadhan Citizen Portal',
        remark: 'Complaint registered successfully'
      },
      ...history.map(h => ({
        stage: getStageLabel(h.to),
        status: h.to,
        date: h.changedAt,
        authority: h.changedByRole ? (h.changedByRole === 'admin' ? 'District Administration' : h.changedByRole) : assignedAuthority,
        remark: h.reason || `Status progressed to ${getStageLabel(h.to)}`
      }))
    ];

    res.json({
      _id: challenge._id,
      title: challenge.title,
      type: 'Grievance / Challenge',
      category: challenge.category || 'General',
      department: challenge.department || 'Water Resources',
      district: challenge.district || 'Jharkhand',
      urgencySeverity: challenge.urgencySeverity || 'Medium',
      currentStatus: challenge.status,
      currentStage: getStageLabel(challenge.status),
      lastUpdated: challenge.updatedAt || challenge.createdAt,
      assignedDepartment,
      assignedAuthority,
      latestAction,
      expectedNextStep: getExpectedNextStep(challenge.status),
      timeline,
      history: historyList
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getStats,
  trackEntity
};
