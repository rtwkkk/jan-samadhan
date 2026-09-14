import React, { useState, useEffect } from 'react';
import { universityService } from './services/universityService';

// ── Status Badge (Reused pattern) ──
function StatusBadge({ status }) {
  let bg = '#f1f5f9', color = '#475569';
  if (status === 'Verified' || status === 'Assigned') { bg = '#e0e7ff'; color = '#4338ca'; }
  else if (status === 'Accepted') { bg = '#dcfce7'; color = '#15803d'; }
  else if (status === 'Team Formation') { bg = '#fef3c7'; color = '#b45309'; }
  else if (status === 'Proposal Submitted' || status === 'Under Government Review') { bg = '#ffedd5'; color = '#c2410c'; }
  else if (status === 'Prototype Development' || status === 'Active') { bg = '#e0f2fe'; color = '#0369a1'; }
  else if (status === 'Completed' || status === 'Deployed') { bg = '#dcfce7'; color = '#15803d'; }
  else if (status === 'Revision Required' || status === 'Delayed') { bg = '#fee2e2'; color = '#b91c1c'; }

  return (
    <span style={{
      background: bg, color: color, padding: '4px 8px', borderRadius: '4px',
      fontSize: '12px', fontWeight: 600, display: 'inline-block'
    }}>
      {status}
    </span>
  );
}

// ── Detail Modal Component (Reused pattern) ──
function DetailModal({ title, onClose, children }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', handleKey); };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: '20px'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '8px', maxWidth: '900px', width: '100%',
          maxHeight: '85vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#1e293b', lineHeight: 1.3 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b',
              padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '4px'
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: '28px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Reusable Detail Field ──
const DetailField = ({ label, value, color = '#0f172a' }) => (
  <div style={{ marginBottom: '16px' }}>
    <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</span>
    <span style={{ fontSize: '14px', color: color, fontWeight: 500 }}>{value}</span>
  </div>
);

export function UniversityDashboard({ Shell }) {
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [stats, setStats] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [projects, setProjects] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [teams, setTeams] = useState([]);
  const [industry, setIndustry] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [research, setResearch] = useState(null);
  const [impact, setImpact] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [profile, setProfile] = useState(null);

  // Modal States
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [st, ch, prj, prop, tm, ind, ml, rsch, imp, notif, prof] = await Promise.all([
          universityService.getUniversityStats(),
          universityService.getAssignedChallenges(),
          universityService.getActiveProjects(),
          universityService.getProjectProposals(),
          universityService.getStudentTeams(),
          universityService.getIndustryCollaborations(),
          universityService.getMilestones(),
          universityService.getResearchInnovation(),
          universityService.getImpactMetrics(),
          universityService.getNotifications(),
          universityService.getUniversityProfile()
        ]);
        setStats(st);
        setChallenges(ch);
        setProjects(prj);
        setProposals(prop);
        setTeams(tm);
        setIndustry(ind);
        setMilestones(ml);
        setResearch(rsch);
        setImpact(imp);
        setNotifications(notif);
        setProfile(prof);
      } catch (err) {
        console.error("Error loading university data", err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleAcceptChallenge = () => {
    if (selectedChallenge) {
      alert("Challenge Accepted! You can now form a team and start a project.");
      setShowReviewForm(false);
      setSelectedChallenge(null);
      // Dummy logic: would update state in real app
    }
  };

  const handleCreateProject = (e) => {
    e.preventDefault();
    alert("Project Created Successfully!");
    setShowProjectForm(false);
    setSelectedChallenge(null);
  };

  const handleTeamSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newTeam = {
      id: selectedTeam ? selectedTeam.id : `TM-00${teams.length + 1}`,
      name: formData.get('teamName'),
      project: formData.get('project'),
      facultyMentor: formData.get('mentor'),
      students: formData.get('students').split(',').map(s => s.trim()),
      departments: formData.get('departments').split(',').map(s => s.trim()),
      skills: formData.get('skills').split(',').map(s => s.trim()),
      status: 'Active'
    };

    if (selectedTeam) {
      setTeams(teams.map(t => t.id === selectedTeam.id ? newTeam : t));
      alert("Team Updated Successfully!");
    } else {
      setTeams([...teams, newTeam]);
      alert("Team Formed Successfully!");
    }
    
    setShowTeamForm(false);
    setSelectedTeam(null);
  };

  const NavItem = ({ label, active, onClick }) => (
    <div className={`off-nav-item ${active ? 'active' : ''}`} onClick={onClick} style={{ cursor: 'pointer', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: active ? '3px solid #08743f' : '3px solid transparent', background: active ? '#f0fdf4' : 'transparent', color: active ? '#08743f' : '#475569', fontWeight: active ? 600 : 500 }}>
      <span>{label}</span>
    </div>
  );

  return (
    <Shell active="Dashboard">
      <div className="ud-header" style={{ padding: '24px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#0f172a' }}>University Dashboard</h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>Turn verified community challenges into research, innovation and practical solutions.</p>
        </div>
        <aside style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span className="ud-notif-icon" title="Notifications" onClick={() => setView('notifications')} style={{ cursor: 'pointer', position: 'relative' }}>
            🔔
            {notifications.filter(n => !n.read).length > 0 && <i style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: '#fff', fontSize: '10px', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontStyle: 'normal' }}>{notifications.filter(n => !n.read).length}</i>}
          </span>
          <span className="ud-avatar" style={{ cursor: 'pointer', background: '#08743f', color: '#fff', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }} onClick={() => setView('profile')}>
            {profile?.name?.charAt(0) || 'U'}
          </span>
        </aside>
      </div>

      <div className="off-layout" style={{ display: 'flex', minHeight: 'calc(100vh - 160px)', background: '#f8fafc' }}>
        {/* Sidebar */}
        <aside className="off-sidebar" style={{ width: '260px', background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '20px 0' }}>
          <NavItem label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          <NavItem label="Challenges" active={view === 'challenges'} onClick={() => setView('challenges')} />
          <NavItem label="My Projects" active={view === 'projects'} onClick={() => setView('projects')} />
          <NavItem label="Project Proposals" active={view === 'proposals'} onClick={() => setView('proposals')} />
          <NavItem label="Student Teams" active={view === 'teams'} onClick={() => setView('teams')} />
          <NavItem label="Industry Collaboration" active={view === 'collaboration'} onClick={() => setView('collaboration')} />
          <NavItem label="Milestones" active={view === 'milestones'} onClick={() => setView('milestones')} />
          <NavItem label="Research & Innovation" active={view === 'research'} onClick={() => setView('research')} />
          <NavItem label="Impact" active={view === 'impact'} onClick={() => setView('impact')} />
          <NavItem label="Notifications" active={view === 'notifications'} onClick={() => setView('notifications')} />
          <NavItem label="University Profile" active={view === 'profile'} onClick={() => setView('profile')} />
        </aside>

        {/* Main Content Area */}
        <main className="off-main" style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading...</div>
          ) : (
            <>
              {/* DASHBOARD VIEW */}
              {view === 'dashboard' && (
                <div className="off-anim-in">
                  <div className="off-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                    {[
                      { label: 'ASSIGNED CHALLENGES', value: stats?.assignedChallenges },
                      { label: 'ACTIVE PROJECTS', value: stats?.activeProjects },
                      { label: 'PENDING PROPOSALS', value: stats?.pendingProposals },
                      { label: 'STUDENT TEAMS', value: stats?.studentTeams },
                      { label: 'INDUSTRY COLLABORATIONS', value: stats?.industryCollaborations },
                      { label: 'SOLUTIONS DEPLOYED', value: stats?.solutionsDeployed }
                    ].map((kpi, idx) => (
                      <div key={idx} className="off-kpi-card" style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <b style={{ display: 'block', fontSize: '32px', color: '#0f172a' }}>{kpi.value}</b>
                        <span style={{ color: '#64748b', fontSize: '14px', textTransform: 'uppercase' }}>{kpi.label}</span>
                      </div>
                    ))}
                  </div>

                  <section style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Recent Assigned Challenges</h3>
                      <button className="outline" onClick={() => setView('challenges')} style={{ background: 'none', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '4px', color: '#475569', cursor: 'pointer' }}>View All →</button>
                    </div>
                    <div className="ud-table" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div className="ud-table-head" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr', padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#64748b', fontSize: '13px' }}>
                        <span>Challenge ID</span><span>Title</span><span>Domain</span><span>Action</span>
                      </div>
                      {challenges.slice(0, 3).map(c => (
                        <div key={c.id} className="ud-table-row" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr', padding: '16px', borderBottom: '1px solid #f1f5f9', alignItems: 'center', cursor: 'pointer' }} onClick={() => setSelectedChallenge(c)}>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>{c.id}</span>
                          <span>{c.title}</span>
                          <span><span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>{c.domain}</span></span>
                          <span style={{ color: '#08743f', fontWeight: 600 }}>Review →</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {/* CHALLENGES VIEW */}
              {view === 'challenges' && (
                <div className="off-anim-in">
                  <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#0f172a' }}>Assigned Challenges</h2>
                  <p style={{ color: '#64748b', marginBottom: '24px' }}>Verified challenges available for university evaluation.</p>
                  
                  <div style={{ display: 'grid', gap: '20px' }}>
                    {challenges.map(c => (
                      <div key={c.id} style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#08743f', background: '#e6f4ea', padding: '4px 8px', borderRadius: '4px', marginBottom: '8px', display: 'inline-block' }}>{c.domain}</span>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#0f172a' }}>{c.id} - {c.title}</h3>
                            <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#64748b' }}>
                              <span>District: {c.district}</span>
                              <span style={{ color: c.severity === 'High' ? '#dc2626' : '#d97706' }}>Severity: {c.severity}</span>
                              <span>People Affected: {c.peopleAffected}</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Assigned By: {c.assignedBy}</span>
                            <StatusBadge status={c.currentStage} />
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                          <button onClick={() => setSelectedChallenge(c)} style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '6px', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>View Challenge</button>
                          {c.currentStage === 'Awaiting University Review' ? (
                            <button onClick={() => { setSelectedChallenge(c); setShowReviewForm(true); }} style={{ background: '#08743f', border: 'none', padding: '10px 20px', borderRadius: '6px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Review</button>
                          ) : (
                            <button onClick={() => { setSelectedChallenge(c); setShowProjectForm(true); }} style={{ background: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '6px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Start Project</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PROJECTS VIEW */}
              {view === 'projects' && (
                <div className="off-anim-in">
                  <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#0f172a' }}>Active Projects</h2>
                  <p style={{ color: '#64748b', marginBottom: '24px' }}>Currently running multidisciplinary projects.</p>

                  <div style={{ display: 'grid', gap: '20px' }}>
                    {projects.map(p => (
                      <div key={p.id} style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', marginBottom: '8px', display: 'inline-block' }}>{p.id} (Challenge: {p.challengeId})</span>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#0f172a' }}>{p.title}</h3>
                            <div style={{ fontSize: '13px', color: '#64748b' }}>Mentor: <b>{p.facultyMentor}</b> | District: {p.district}</div>
                          </div>
                          <StatusBadge status={p.status} />
                        </div>

                        {/* Project Lifecycle Tracker */}
                        <div style={{ marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <h4 style={{ fontSize: '13px', margin: '0 0 12px 0', color: '#475569', textTransform: 'uppercase' }}>Project Lifecycle</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {p.lifecycle.map((stage, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: stage.completed ? '#08743f' : '#94a3b8' }}>
                                <span>{stage.completed ? '✓' : (p.nextMilestone === stage.name ? '●' : '○')}</span>
                                <span style={{ fontWeight: stage.completed || p.nextMilestone === stage.name ? 600 : 400, color: stage.completed ? '#0f172a' : (p.nextMilestone === stage.name ? '#0f172a' : '#64748b') }}>{stage.name}</span>
                              </div>
                            ))}
                          </div>
                          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${p.progress}%`, height: '100%', background: '#08743f' }}></div>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#08743f' }}>{p.progress}%</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button onClick={() => location.hash = `#/project/${p.id}`} style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '4px', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>View Details</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PROPOSALS VIEW */}
              {view === 'proposals' && (
                <div className="off-anim-in">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                      <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#0f172a' }}>Project Proposals</h2>
                      <p style={{ color: '#64748b', margin: 0 }}>Proposals submitted to the Government.</p>
                    </div>
                    <button onClick={() => setShowProposalForm(true)} style={{ background: '#08743f', border: 'none', padding: '10px 20px', borderRadius: '6px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>+ Create Proposal</button>
                  </div>

                  <div className="ud-table" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div className="ud-table-head" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', padding: '16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#64748b', fontSize: '13px' }}>
                      <span>Project</span><span>Challenge ID</span><span>Submitted On</span><span>Budget</span><span>Status</span>
                    </div>
                    {proposals.map(p => (
                      <div key={p.id} className="ud-table-row" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', padding: '16px', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{p.title}</span>
                        <span style={{ color: '#475569' }}>{p.challengeId}</span>
                        <span>{p.submittedOn}</span>
                        <span style={{ fontWeight: 600 }}>{p.budget}</span>
                        <span><StatusBadge status={p.status} /></span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STUDENT TEAMS VIEW */}
              {view === 'teams' && (
                <div className="off-anim-in">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                      <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#0f172a' }}>Student Teams</h2>
                      <p style={{ color: '#64748b', margin: 0 }}>Manage multidisciplinary student and faculty teams.</p>
                    </div>
                    <button onClick={() => { setSelectedTeam(null); setShowTeamForm(true); }} style={{ background: '#08743f', border: 'none', padding: '10px 20px', borderRadius: '6px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>+ Form Team</button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                    {teams.map(t => (
                      <div key={t.id} style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                          <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>{t.name}</h3>
                          <StatusBadge status={t.status} />
                        </div>
                        <div style={{ fontSize: '13px', color: '#475569', marginBottom: '16px' }}>Project: <b>{t.project}</b></div>
                        
                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
                          <DetailField label="Faculty Mentor" value={t.facultyMentor} />
                          <DetailField label="Departments" value={t.departments.join(' + ')} />
                          <DetailField label="Skills" value={t.skills.join(', ')} />
                        </div>
                        
                        <div>
                          <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748b', marginBottom: '8px' }}>Students ({t.students.length})</h4>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {t.students.map(s => (
                              <span key={s} style={{ background: '#e2e8f0', padding: '4px 10px', borderRadius: '16px', fontSize: '12px', color: '#334155' }}>{s}</span>
                            ))}
                          </div>
                        </div>

                        <button onClick={() => { setSelectedTeam(t); setShowTeamForm(true); }} style={{ marginTop: '20px', width: '100%', background: '#fff', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '4px', color: '#0f172a', fontWeight: 600, cursor: 'pointer' }}>Manage Team</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* INDUSTRY COLLABORATION VIEW */}
              {view === 'collaboration' && (
                <div className="off-anim-in">
                  <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#0f172a' }}>Industry Collaboration</h2>
                  <p style={{ color: '#64748b', marginBottom: '24px' }}>Partner with industry for resources, mentorship, and pilot deployment.</p>

                  <h3 style={{ fontSize: '18px', color: '#0f172a', marginBottom: '16px' }}>Collaboration Requests</h3>
                  <div style={{ display: 'grid', gap: '16px', marginBottom: '32px' }}>
                    {industry?.requests.map(r => (
                      <div key={r.id} style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h4 style={{ margin: '0 0 4px', fontSize: '16px', color: '#0f172a' }}>{r.industry}</h4>
                          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>Project: {r.projectTitle}</div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Support Offered:</span>
                            {r.supportOffered.map(s => <span key={s} style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: '#64748b' }}>{s}</span>)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button style={{ background: '#08743f', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Accept</button>
                          <button style={{ background: '#fff', color: '#ef4444', border: '1px solid #ef4444', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Decline</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <h3 style={{ fontSize: '18px', color: '#0f172a', marginBottom: '16px' }}>Active Partners</h3>
                  <div className="ud-table" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div className="ud-table-head" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr', padding: '16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#64748b', fontSize: '13px' }}>
                      <span>Industry Partner</span><span>Project</span><span>Contribution</span>
                    </div>
                    {industry?.active.map(a => (
                      <div key={a.id} className="ud-table-row" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr', padding: '16px', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{a.industry}</span>
                        <span>{a.projectTitle}</span>
                        <span style={{ color: '#08743f', fontWeight: 600 }}>{a.contribution}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MILESTONES VIEW */}
              {view === 'milestones' && (
                <div className="off-anim-in">
                  <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#0f172a' }}>Milestones</h2>
                  <p style={{ color: '#64748b', marginBottom: '24px' }}>Track project deliverables and deadlines.</p>

                  <div className="ud-table" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div className="ud-table-head" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 1fr 1fr', padding: '16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#64748b', fontSize: '13px' }}>
                      <span>Project</span><span>Title</span><span>Due Date</span><span>Status</span><span>Action</span>
                    </div>
                    {milestones.map(m => (
                      <div key={m.id} className="ud-table-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 1fr 1fr', padding: '16px', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
                        <span style={{ fontWeight: 500, color: '#475569', fontSize: '13px' }}>{m.project}</span>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{m.title}</span>
                        <span>{m.dueDate}</span>
                        <span><StatusBadge status={m.status} /></span>
                        <span>
                          {m.status !== 'Completed' ? (
                            <button style={{ background: 'none', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Mark Complete</button>
                          ) : (
                            <span style={{ color: '#08743f', fontWeight: 600 }}>Done</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* RESEARCH & INNOVATION VIEW */}
              {view === 'research' && (
                <div className="off-anim-in">
                  <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#0f172a' }}>Research & Innovation</h2>
                  <p style={{ color: '#64748b', marginBottom: '24px' }}>Institutional research outcomes from solved challenges.</p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <b style={{ display: 'block', fontSize: '36px', color: '#0f172a', marginBottom: '8px' }}>{research?.activeResearch}</b>
                      <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase' }}>Active Research</span>
                    </div>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <b style={{ display: 'block', fontSize: '36px', color: '#0f172a', marginBottom: '8px' }}>{research?.prototypes}</b>
                      <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase' }}>Prototypes Developed</span>
                    </div>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <b style={{ display: 'block', fontSize: '36px', color: '#0f172a', marginBottom: '8px' }}>{research?.patents}</b>
                      <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase' }}>Patents / IP</span>
                    </div>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <b style={{ display: 'block', fontSize: '36px', color: '#0f172a', marginBottom: '8px' }}>{research?.publications}</b>
                      <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase' }}>Publications</span>
                    </div>
                  </div>
                  
                  <h3 style={{ fontSize: '18px', color: '#0f172a', marginBottom: '16px' }}>Innovation Highlights</h3>
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {research?.highlights.map((h, idx) => (
                      <div key={idx} style={{ background: '#fff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h4 style={{ margin: '0 0 4px', fontSize: '16px', color: '#0f172a' }}>{h.title}</h4>
                          <div style={{ fontSize: '13px', color: '#64748b' }}>Date: {h.date}</div>
                        </div>
                        <StatusBadge status={h.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* IMPACT VIEW */}
              {view === 'impact' && (
                <div className="off-anim-in">
                  <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#0f172a' }}>Impact Dashboard</h2>
                  <p style={{ color: '#64748b', marginBottom: '24px' }}>Measurable social impact generated by university projects.</p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <b style={{ display: 'block', fontSize: '36px', color: '#08743f', marginBottom: '8px' }}>{impact?.peopleBenefited}</b>
                      <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase' }}>People Benefited</span>
                    </div>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <b style={{ display: 'block', fontSize: '36px', color: '#08743f', marginBottom: '8px' }}>{impact?.villagesCovered}</b>
                      <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase' }}>Villages Covered</span>
                    </div>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <b style={{ display: 'block', fontSize: '36px', color: '#08743f', marginBottom: '8px' }}>{impact?.districtsImpacted}</b>
                      <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase' }}>Districts Impacted</span>
                    </div>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <b style={{ display: 'block', fontSize: '36px', color: '#08743f', marginBottom: '8px' }}>{impact?.solutionsDeployed}</b>
                      <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase' }}>Solutions Deployed</span>
                    </div>
                  </div>
                </div>
              )}

              {/* NOTIFICATIONS VIEW */}
              {view === 'notifications' && (
                <div className="off-anim-in">
                  <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#0f172a' }}>Notifications</h2>
                  <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    {notifications.map(n => (
                      <div key={n.id} style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '16px', background: n.read ? '#fff' : '#f0fdf4' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: n.read ? 'transparent' : '#08743f', marginTop: '6px' }}></div>
                        <div>
                          <p style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '15px' }}>{n.text}</p>
                          <span style={{ color: '#64748b', fontSize: '12px' }}>{n.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PROFILE VIEW */}
              {view === 'profile' && (
                <div className="off-anim-in">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                      <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#0f172a' }}>University Profile</h2>
                      <p style={{ color: '#64748b', margin: 0 }}>Manage your institutional details and capabilities.</p>
                    </div>
                    {profile?.verificationStatus === 'Approved' ? (
                      <span style={{ background: '#dcfce7', color: '#15803d', padding: '6px 12px', borderRadius: '4px', fontWeight: 600, fontSize: '13px' }}>✓ Account Verified</span>
                    ) : (
                      <span style={{ background: '#fef3c7', color: '#b45309', padding: '6px 12px', borderRadius: '4px', fontWeight: 600, fontSize: '13px' }}>⌛ Verification Pending</span>
                    )}
                  </div>
                  
                  <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '32px' }}>
                    <h3 style={{ margin: '0 0 24px 0', fontSize: '16px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>Institutional Information</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
                      <div>
                        <DetailField label="Institution Name" value={profile?.name} />
                        <DetailField label="Institution Type" value={profile?.type} />
                        <DetailField label="AISHE Code" value={profile?.aisheCode} />
                        <DetailField label="Location (District)" value={profile?.location} />
                      </div>
                      <div>
                        <DetailField label="Nodal Officer Email" value={profile?.email} />
                        <DetailField label="Nodal Officer Phone" value={profile?.phone} />
                        <DetailField label="Official Email Domain" value={profile?.contact} />
                        <DetailField label="Joined Date" value={profile?.joinedDate} />
                      </div>
                    </div>

                    <h3 style={{ margin: '0 0 24px 0', fontSize: '16px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>Capabilities & Resources</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                      <div>
                        <DetailField label="Departments" value={profile?.departments?.join(', ')} />
                        <DetailField label="Research Areas" value={profile?.researchAreas?.join(', ')} />
                      </div>
                      <div>
                        <DetailField label="Facilities Count" value={profile?.facilities} />
                        <DetailField label="Similar Projects Completed" value={profile?.similarProjectsCompleted} />
                        <div style={{ display: 'flex', gap: '24px', marginTop: '16px' }}>
                          <DetailField label="Innovation Centre" value={profile?.innovationCentre} color="#08743f" />
                          <DetailField label="Incubation Centre" value={profile?.incubationCentre} color="#08743f" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </>
          )}
        </main>
      </div>

      {/* CHALLENGE DETAIL MODAL */}
      {selectedChallenge && !showReviewForm && !showProjectForm && !showProposalForm && (
        <DetailModal title="Challenge Details" onClose={() => setSelectedChallenge(null)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: '22px', color: '#0f172a' }}>{selectedChallenge.title}</h3>
              <div style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
                <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', color: '#475569' }}>ID: {selectedChallenge.id}</span>
                <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', color: '#475569' }}>{selectedChallenge.domain}</span>
              </div>
            </div>
            <StatusBadge status={selectedChallenge.currentStage} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', padding: '16px', background: '#f8fafc', borderRadius: '8px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
            <DetailField label="District" value={selectedChallenge.district} />
            <DetailField label="Severity" value={selectedChallenge.severity} color={selectedChallenge.severity === 'High' ? '#dc2626' : '#d97706'} />
            <DetailField label="People Affected" value={selectedChallenge.peopleAffected} />
            <DetailField label="Date Reported" value={selectedChallenge.dateReported} />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px', marginBottom: '8px' }}>Problem Description</h4>
            <p style={{ color: '#334155', lineHeight: '1.6', fontSize: '15px' }}>{selectedChallenge.description}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
            <div>
              <h4 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px', marginBottom: '12px' }}>Citizen Evidence</h4>
              <div style={{ display: 'flex', gap: '12px' }}>
                {selectedChallenge.evidence?.photo && <div style={{ width: '80px', height: '60px', background: '#e2e8f0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Photo</div>}
                {selectedChallenge.evidence?.video && <div style={{ width: '80px', height: '60px', background: '#e2e8f0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Video</div>}
                {selectedChallenge.evidence?.doc && <div style={{ width: '80px', height: '60px', background: '#e2e8f0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Doc</div>}
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px', marginBottom: '12px' }}>Location</h4>
              <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '6px', color: '#475569', fontSize: '14px' }}>
                Block: {selectedChallenge.block}, Village: {selectedChallenge.village}, {selectedChallenge.district}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '24px', marginBottom: '24px' }}>
            <h4 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px', marginBottom: '16px' }}>Government Validation</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {selectedChallenge.validation?.map(v => (
                <div key={v} style={{ padding: '8px 12px', background: '#f0fdf4', borderRadius: '4px', border: '1px solid #bbf7d0', color: '#166534', fontSize: '13px', fontWeight: 600 }}>✓ {v}</div>
              ))}
            </div>
          </div>

          {selectedChallenge.currentStage === 'Awaiting University Review' ? (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
              <button onClick={() => setSelectedChallenge(null)} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => setShowReviewForm(true)} style={{ background: '#08743f', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Review Challenge</button>
            </div>
          ) : (
             <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
              <button onClick={() => setSelectedChallenge(null)} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>Close</button>
              <button onClick={() => setShowProjectForm(true)} style={{ background: '#0f172a', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Start Project</button>
            </div>
          )}
        </DetailModal>
      )}

      {/* REVIEW CHALLENGE MODAL */}
      {showReviewForm && selectedChallenge && (
        <DetailModal title={`Review Challenge: ${selectedChallenge.id}`} onClose={() => { setShowReviewForm(false); setSelectedChallenge(null); }}>
          <p style={{ color: '#475569', marginBottom: '24px' }}>Evaluate this challenge to see if it aligns with your university's expertise and resources.</p>
          
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '16px' }}>{selectedChallenge.title}</h4>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Domain: {selectedChallenge.domain} | Severity: {selectedChallenge.severity}</span>
          </div>

          <label style={{ display: 'block', marginBottom: '24px' }}>
            <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#0f172a' }}>AI Matching Recommendation</span>
            <div style={{ padding: '12px', background: '#e0e7ff', borderRadius: '6px', color: '#3730a3', fontSize: '13px' }}>
              Matched based on university expertise in IoT, water systems and rural infrastructure.
            </div>
          </label>

          <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
            <button onClick={() => { setShowReviewForm(false); setSelectedChallenge(null); }} style={{ flex: 1, padding: '12px', background: '#fff', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Decline Challenge</button>
            <button onClick={handleAcceptChallenge} style={{ flex: 1, padding: '12px', background: '#08743f', border: 'none', color: '#fff', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Accept Challenge</button>
          </div>
        </DetailModal>
      )}

      {/* START PROJECT MODAL */}
      {showProjectForm && (
        <DetailModal title="Start New Project" onClose={() => { setShowProjectForm(false); setSelectedChallenge(null); }}>
          <form onSubmit={handleCreateProject}>
            <div style={{ display: 'grid', gap: '16px' }}>
              <label>
                <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>Project Title</span>
                <input required type="text" defaultValue={selectedChallenge ? selectedChallenge.title : ''} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </label>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label>
                  <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>Faculty Mentor</span>
                  <input required type="text" placeholder="e.g. Dr. Anil Kumar" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </label>
                <label>
                  <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>Project Domain</span>
                  <input required type="text" defaultValue={selectedChallenge ? selectedChallenge.domain : ''} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </label>
              </div>

              <label>
                <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>Proposed Solution & Objectives</span>
                <textarea required rows={4} placeholder="Describe the technical approach and innovation..." style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}></textarea>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label>
                  <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>Required Technologies</span>
                  <input type="text" placeholder="e.g. IoT, ML, React" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </label>
                <label>
                  <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>Estimated Timeline</span>
                  <input type="text" placeholder="e.g. 6 Months" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </label>
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
              <button type="button" onClick={() => setShowProjectForm(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ background: '#0f172a', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Create Project</button>
            </div>
          </form>
        </DetailModal>
      )}

      {/* CREATE PROPOSAL MODAL */}
      {showProposalForm && (
        <DetailModal title="Submit Project Proposal" onClose={() => setShowProposalForm(false)}>
          <form onSubmit={(e) => { e.preventDefault(); alert("Proposal Submitted Successfully!"); setShowProposalForm(false); }}>
            <div style={{ display: 'grid', gap: '16px' }}>
              <label>
                <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>Project Title</span>
                <input required type="text" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </label>

              <label>
                <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>Challenge ID</span>
                <input required type="text" placeholder="e.g. JH-CH-001" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label>
                  <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>Estimated Cost / Budget</span>
                  <input required type="text" placeholder="e.g. ₹2.5 Lakhs" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </label>
                <label>
                  <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>Industry Support Required?</span>
                  <select style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <option>Yes</option>
                    <option>No</option>
                  </select>
                </label>
              </div>

              <label>
                <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>Methodology & Expected Impact</span>
                <textarea required rows={4} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}></textarea>
              </label>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
              <button type="button" onClick={() => setShowProposalForm(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ background: '#08743f', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Submit to Government</button>
            </div>
          </form>
        </DetailModal>
      )}

      {/* TEAM FORM MODAL */}
      {showTeamForm && (
        <DetailModal title={selectedTeam ? "Manage Team" : "Form New Team"} onClose={() => { setShowTeamForm(false); setSelectedTeam(null); }}>
          <form onSubmit={handleTeamSubmit}>
            <div style={{ display: 'grid', gap: '16px' }}>
              <label>
                <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>Team Name</span>
                <input required name="teamName" type="text" defaultValue={selectedTeam?.name || ''} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </label>

              <label>
                <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>Assign to Project</span>
                <input required name="project" type="text" defaultValue={selectedTeam?.project || ''} placeholder="e.g. Smart Water Monitoring (JH-CH-001)" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </label>

              <label>
                <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>Faculty Mentor</span>
                <input required name="mentor" type="text" defaultValue={selectedTeam?.facultyMentor || ''} placeholder="e.g. Dr. Anil Kumar" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </label>

              <label>
                <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>Students (comma separated)</span>
                <input required name="students" type="text" defaultValue={selectedTeam?.students.join(', ') || ''} placeholder="e.g. Aman Singh, Priya Kumari" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label>
                  <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>Departments (comma separated)</span>
                  <input required name="departments" type="text" defaultValue={selectedTeam?.departments.join(', ') || ''} placeholder="e.g. Computer Science, Electronics" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </label>
                <label>
                  <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>Skills (comma separated)</span>
                  <input required name="skills" type="text" defaultValue={selectedTeam?.skills.join(', ') || ''} placeholder="e.g. IoT, AI/ML" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </label>
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
              <button type="button" onClick={() => { setShowTeamForm(false); setSelectedTeam(null); }} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ background: '#08743f', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>{selectedTeam ? "Update Team" : "Form Team"}</button>
            </div>
          </form>
        </DetailModal>
      )}

    </Shell>
  );
}

