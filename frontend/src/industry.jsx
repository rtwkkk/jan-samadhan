import { useEffect, useState } from 'react';
import { industryService } from './services/industryService';

// ── Detail Modal Component (reuses project's existing styling patterns) ──
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
            onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'}
            onMouseOut={e => e.currentTarget.style.background = 'none'}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        <div style={{ padding: '28px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value, color }) {
  return (
    <div>
      <small style={{ display: 'block', color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</small>
      <div style={{ marginTop: '4px', color: color || '#334155', fontWeight: 500, fontSize: '14px' }}>{value || '—'}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    'Under Review': { bg: '#fef0cf', color: '#ae7200' },
    'Verified': { bg: '#e8f4ed', color: '#08743f' },
    'University Assigned': { bg: '#dbeafe', color: '#1d4ed8' },
    'University Collaboration': { bg: '#dbeafe', color: '#1d4ed8' },
    'Shortlisted': { bg: '#e0f2fe', color: '#0369a1' },
    'Accepted': { bg: '#dcfce7', color: '#166534' },
    'Declined': { bg: '#fde7e5', color: '#c4241e' },
    'Pending': { bg: '#f1f5f9', color: '#475569' }
  };
  const s = colors[status] || { bg: '#e2e8f0', color: '#475569' };
  return (
    <em style={{ background: s.bg, color: s.color, padding: '4px 10px', borderRadius: '3px', fontStyle: 'normal', fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' }}>
      {status}
    </em>
  );
}

// ── Main Dashboard Component ──
export function IndustryDashboard({ Shell, PageHead, user }) {
  const [view, setView] = useState('dashboard'); // dashboard, challenges, applications, projects, collaboration, impact, notifications, profile
  const [loading, setLoading] = useState(true);

  const [industryUser, setIndustryUser] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [applications, setApplications] = useState([]);
  const [projects, setProjects] = useState([]);
  const [collaborations, setCollaborations] = useState([]);
  const [impact, setImpact] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [showInterestForm, setShowInterestForm] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usr, ch, app, prj, col, imp, not] = await Promise.all([
          industryService.getIndustryUser(),
          industryService.getRecommendedChallenges(),
          industryService.getMyApplications(),
          industryService.getActiveProjects(),
          industryService.getCollaborationRequests(),
          industryService.getImpactMetrics(),
          industryService.getNotifications()
        ]);
        setIndustryUser(usr);
        setChallenges(ch);
        setApplications(app);
        setProjects(prj);
        setCollaborations(col);
        setImpact(imp);
        setNotifications(not);
      } catch (err) {
        console.error("Error loading industry data", err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleExpressInterest = () => {
    setShowInterestForm(true);
  };

  const submitInterestForm = async (e) => {
    e.preventDefault();
    if (selectedChallenge) {
      await industryService.submitInterest(selectedChallenge.id, {});
      alert("Interest Submitted Successfully! It is now Under Review.");
      setShowInterestForm(false);
      setSelectedChallenge(null);
      // Dummy update to applications list could be done here
    }
  };

  const NavItem = ({ label, icon, active, onClick }) => (
    <div className={`off-nav-item ${active ? 'active' : ''}`} onClick={onClick} style={{ cursor: 'pointer', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: active ? '3px solid #08743f' : '3px solid transparent', background: active ? '#f0fdf4' : 'transparent', color: active ? '#08743f' : '#475569', fontWeight: active ? 600 : 500 }}>
      <span style={{ fontSize: '18px' }}>{icon}</span>
      <span>{label}</span>
    </div>
  );

  return (
    <Shell active="Dashboard">
      <div className="ud-header" style={{ padding: '24px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#0f172a' }}>Industry Dashboard</h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>Discover challenges where your expertise can create real impact.</p>
        </div>
        <aside style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span className="ud-notif-icon" title="Notifications" onClick={() => setView('notifications')} style={{ cursor: 'pointer', position: 'relative' }}>
            🔔
            {notifications.filter(n => !n.read).length > 0 && <i style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: '#fff', fontSize: '10px', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontStyle: 'normal' }}>{notifications.filter(n => !n.read).length}</i>}
          </span>
          <span className="ud-avatar" style={{ cursor: 'pointer', background: '#08743f', color: '#fff', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }} onClick={() => setView('profile')}>
            {industryUser?.name?.charAt(0) || 'I'}
          </span>
        </aside>
      </div>

      <div className="off-layout" style={{ display: 'flex', minHeight: 'calc(100vh - 160px)', background: '#f8fafc' }}>
        {/* Sidebar */}
        <aside className="off-sidebar" style={{ width: '260px', background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '20px 0' }}>
          <NavItem icon="📊" label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          <NavItem icon="🎯" label="Challenges" active={view === 'challenges'} onClick={() => setView('challenges')} />
          <NavItem icon="📝" label="My Applications" active={view === 'applications'} onClick={() => setView('applications')} />
          <NavItem icon="🚀" label="Active Projects" active={view === 'projects'} onClick={() => setView('projects')} />
          <NavItem icon="🤝" label="Collaboration" active={view === 'collaboration'} onClick={() => setView('collaboration')} />
          <NavItem icon="📈" label="Impact" active={view === 'impact'} onClick={() => setView('impact')} />
          <NavItem icon="🔔" label="Notifications" active={view === 'notifications'} onClick={() => setView('notifications')} />
          <NavItem icon="🏢" label="Organisation Profile" active={view === 'profile'} onClick={() => setView('profile')} />
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
                  <div className="off-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                    <div className="off-kpi-card" style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <b style={{ display: 'block', fontSize: '32px', color: '#0f172a' }}>{challenges.length}</b><span style={{ color: '#64748b', fontSize: '14px' }}>OPEN CHALLENGES</span>
                    </div>
                    <div className="off-kpi-card" style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <b style={{ display: 'block', fontSize: '32px', color: '#0f172a' }}>{applications.length}</b><span style={{ color: '#64748b', fontSize: '14px' }}>MY APPLICATIONS</span>
                    </div>
                    <div className="off-kpi-card" style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <b style={{ display: 'block', fontSize: '32px', color: '#0f172a' }}>{projects.length}</b><span style={{ color: '#64748b', fontSize: '14px' }}>ACTIVE PROJECTS</span>
                    </div>
                    <div className="off-kpi-card" style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <b style={{ display: 'block', fontSize: '32px', color: '#0f172a' }}>2</b><span style={{ color: '#64748b', fontSize: '14px' }}>PILOTS IN PROGRESS</span>
                    </div>
                    <div className="off-kpi-card" style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <b style={{ display: 'block', fontSize: '32px', color: '#0f172a' }}>{impact?.solutionsDeployed || '0'}</b><span style={{ color: '#64748b', fontSize: '14px' }}>SOLUTIONS DEPLOYED</span>
                    </div>
                  </div>

                  <section className="ud-section" style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div className="ud-section-head" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Recommended Challenges</h3>
                      <button className="outline" onClick={() => setView('challenges')} style={{ background: 'none', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '4px', color: '#475569', cursor: 'pointer' }}>View All →</button>
                    </div>
                    <div className="ud-table">
                      <div className="ud-table-head" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 1fr 1fr', padding: '12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#64748b', fontSize: '13px' }}>
                        <span>Challenge ID</span><span>Title</span><span>Domain</span><span>District</span><span>Action</span>
                      </div>
                      {challenges.slice(0, 3).map(c => (
                        <div key={c.id} className="ud-table-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 1fr 1fr', padding: '16px 12px', borderBottom: '1px solid #f1f5f9', alignItems: 'center', cursor: 'pointer' }} onClick={() => setSelectedChallenge(c)}>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>{c.id}</span>
                          <span>{c.title}</span>
                          <span><span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>{c.domain}</span></span>
                          <span>{c.district}</span>
                          <span style={{ color: '#08743f', fontWeight: 600 }}>View Challenge →</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {/* CHALLENGES VIEW */}
              {view === 'challenges' && (
                <div className="off-anim-in">
                  <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#0f172a' }}>Recommended Challenges</h2>
                  <p style={{ color: '#64748b', marginBottom: '24px' }}>Verified challenges matching your organisation's expertise.</p>
                  
                  <div style={{ display: 'grid', gap: '20px' }}>
                    {challenges.map(c => (
                      <div key={c.id} style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#08743f', background: '#e6f4ea', padding: '4px 8px', borderRadius: '4px', marginBottom: '8px', display: 'inline-block' }}>{c.domain}</span>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#0f172a' }}>{c.title}</h3>
                            <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#64748b' }}>
                              <span>📍 District: {c.district}</span>
                              <span style={{ color: c.severity === 'High' ? '#dc2626' : '#d97706' }}>⚡ Severity: {c.severity}</span>
                              <span>👥 People Affected: {c.peopleAffected}</span>
                            </div>
                          </div>
                          <StatusBadge status={c.currentStage} />
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '6px' }}>
                          <div>
                            <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>University Collaboration</span>
                            <span style={{ fontSize: '14px', color: '#0f172a' }}>{c.university}</span>
                          </div>
                          <div>
                            <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Support Required</span>
                            <span style={{ fontSize: '14px', color: '#0f172a' }}>{c.supportRequired.join(' + ')}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                          <button onClick={() => setSelectedChallenge(c)} style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '6px', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>View Challenge</button>
                          <button onClick={() => { setSelectedChallenge(c); setShowInterestForm(true); }} style={{ background: '#08743f', border: 'none', padding: '10px 20px', borderRadius: '6px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Express Interest</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* APPLICATIONS VIEW */}
              {view === 'applications' && (
                <div className="off-anim-in">
                  <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#0f172a' }}>My Applications</h2>
                  <p style={{ color: '#64748b', marginBottom: '24px' }}>Applications submitted by your organisation.</p>

                  <div className="ud-table" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div className="ud-table-head" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr 1fr 1fr', padding: '16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#64748b', fontSize: '13px' }}>
                      <span>Challenge</span><span>District</span><span>Domain</span><span>Support Offered</span><span>Status</span><span>Action</span>
                    </div>
                    {applications.map(app => (
                      <div key={app.id} className="ud-table-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr 1fr 1fr', padding: '16px', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{app.challengeTitle}</span>
                        <span>{app.district}</span>
                        <span>{app.domain}</span>
                        <span style={{ fontSize: '13px' }}>{app.supportOffered.join(', ')}</span>
                        <span><StatusBadge status={app.status} /></span>
                        <button onClick={() => setSelectedApplication(app)} style={{ background: 'none', border: 'none', color: '#08743f', fontWeight: 600, cursor: 'pointer', textAlign: 'left', padding: 0 }}>View Application</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PROJECTS VIEW */}
              {view === 'projects' && (
                <div className="off-anim-in">
                  <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#0f172a' }}>Active Projects</h2>
                  <p style={{ color: '#64748b', marginBottom: '24px' }}>Projects where your organisation is actively participating.</p>

                  <div style={{ display: 'grid', gap: '20px' }}>
                    {projects.map(p => (
                      <div key={p.id} style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>PROJECT: {p.id}</span>
                            <h3 style={{ margin: '4px 0 8px 0', fontSize: '18px', color: '#0f172a' }}>{p.title}</h3>
                            <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#64748b' }}>
                              <span>📍 District: {p.district}</span>
                              <span>🏛 Government: {p.government}</span>
                              <span>🏫 University: {p.university}</span>
                            </div>
                          </div>
                          <button onClick={() => setSelectedProject(p)} style={{ background: 'none', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>View Project</button>
                        </div>
                        
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>Progress</span>
                            <span style={{ fontWeight: 600, color: '#08743f' }}>{p.progress}%</span>
                          </div>
                          <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${p.progress}%`, background: '#08743f', borderRadius: '4px' }}></div>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '6px' }}>
                          <div>
                            <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Next Milestone</span>
                            <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 500 }}>{p.nextMilestone}</span>
                          </div>
                          <div>
                            <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Due Date</span>
                            <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 500 }}>{p.dueDate}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* COLLABORATION VIEW */}
              {view === 'collaboration' && (
                <div className="off-anim-in">
                  <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#0f172a' }}>Collaboration Requests</h2>
                  <p style={{ color: '#64748b', marginBottom: '24px' }}>Collaboration requests from Universities and Government.</p>

                  <div style={{ display: 'grid', gap: '20px' }}>
                    {collaborations.map(c => (
                      <div key={c.id} style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #0284c7', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', marginBottom: '4px', display: 'inline-block' }}>New Collaboration Request</span>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#0f172a' }}>{c.projectTitle}</h3>
                            <div style={{ fontSize: '13px', color: '#475569', marginBottom: '16px' }}>
                              From: <b>{c.from}</b> &nbsp;&nbsp;|&nbsp;&nbsp; Date: {c.date}
                            </div>
                            <div>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Looking for:</span>
                              <ul style={{ margin: '8px 0 0 20px', padding: 0, fontSize: '14px', color: '#0f172a' }}>
                                {c.lookingFor.map(item => <li key={item}>{item}</li>)}
                              </ul>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button style={{ background: '#08743f', border: 'none', padding: '8px 16px', borderRadius: '6px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Accept</button>
                            <button style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Review</button>
                            <button style={{ background: '#fff', border: '1px solid #fecaca', padding: '8px 16px', borderRadius: '6px', color: '#dc2626', fontWeight: 600, cursor: 'pointer' }}>Decline</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* IMPACT VIEW */}
              {view === 'impact' && (
                <div className="off-anim-in">
                  <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#0f172a' }}>Impact Dashboard</h2>
                  <p style={{ color: '#64748b', marginBottom: '24px' }}>Measurable results of your organisation's participation.</p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <b style={{ display: 'block', fontSize: '36px', color: '#08743f', marginBottom: '8px' }}>{impact?.peopleReached}</b>
                      <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase' }}>People Reached</span>
                    </div>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <b style={{ display: 'block', fontSize: '36px', color: '#08743f', marginBottom: '8px' }}>{impact?.villagesCovered}</b>
                      <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase' }}>Villages Covered</span>
                    </div>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <b style={{ display: 'block', fontSize: '36px', color: '#08743f', marginBottom: '8px' }}>{impact?.solutionsDeployed}</b>
                      <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase' }}>Solutions Deployed</span>
                    </div>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <b style={{ display: 'block', fontSize: '36px', color: '#08743f', marginBottom: '8px' }}>{impact?.districtsImpacted}</b>
                      <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase' }}>Districts Impacted</span>
                    </div>
                  </div>

                  <h3 style={{ fontSize: '18px', color: '#0f172a', marginBottom: '16px' }}>Recent Impact Highlights</h3>
                  <div className="ud-table" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div className="ud-table-head" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#64748b', fontSize: '13px' }}>
                      <span>Project</span><span>District</span><span>People Impacted</span><span>Status</span>
                    </div>
                    {impact?.recentImpact.map((item, idx) => (
                      <div key={idx} className="ud-table-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '16px', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.project}</span>
                        <span>{item.district}</span>
                        <span style={{ color: '#08743f', fontWeight: 600 }}>{item.people}</span>
                        <span><StatusBadge status={item.status} /></span>
                      </div>
                    ))}
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
                  <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#0f172a' }}>Organisation Profile</h2>
                  <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '32px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                      <div>
                        <DetailField label="Organisation Name" value={industryUser?.name} />
                        <br/>
                        <DetailField label="Organisation Type" value={industryUser?.type} />
                        <br/>
                        <DetailField label="Industry Domain" value={industryUser?.domain} />
                        <br/>
                        <DetailField label="Location" value={industryUser?.location} />
                      </div>
                      <div>
                        <DetailField label="Contact Person" value={industryUser?.contactPerson} />
                        <br/>
                        <DetailField label="Email Address" value={industryUser?.email} />
                        <br/>
                        <DetailField label="Phone Number" value={industryUser?.phone} />
                        <br/>
                        <DetailField label="Areas of Expertise" value={industryUser?.expertise.join(', ')} />
                      </div>
                    </div>
                    <div style={{ marginTop: '32px', paddingTop: '32px', borderTop: '1px solid #e2e8f0' }}>
                      <DetailField label="Organisation Description" value={industryUser?.description} />
                    </div>
                    <div style={{ marginTop: '32px' }}>
                      <button style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '6px', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Edit Profile</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* CHALLENGE DETAIL MODAL */}
      {selectedChallenge && !showInterestForm && (
        <DetailModal title="Challenge Details" onClose={() => setSelectedChallenge(null)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: '22px', color: '#0f172a' }}>{selectedChallenge.title}</h3>
              <div style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
                <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', color: '#475569' }}>ID: {selectedChallenge.id}</span>
                <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', color: '#475569' }}>{selectedChallenge.domain}</span>
              </div>
            </div>
            <StatusBadge status={selectedChallenge.status} />
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
              <h4 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px', marginBottom: '12px' }}>Evidence</h4>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: '80px', height: '60px', background: '#e2e8f0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>📷 Photo</div>
                <div style={{ width: '80px', height: '60px', background: '#e2e8f0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>📄 Doc</div>
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px', marginBottom: '12px' }}>Location</h4>
              <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '6px', color: '#475569', fontSize: '14px' }}>
                📍 {selectedChallenge.district}, Jharkhand
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '24px', marginBottom: '24px' }}>
            <h4 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px', marginBottom: '16px' }}>Current Ecosystem</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Government</div>
                <div style={{ color: '#08743f', fontWeight: 600, marginTop: '4px', fontSize: '14px' }}>✓ Verified</div>
              </div>
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>University</div>
                <div style={{ color: '#0f172a', fontWeight: 600, marginTop: '4px', fontSize: '14px' }}>{selectedChallenge.university}</div>
                <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>{selectedChallenge.universityTeam}</div>
              </div>
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Industry</div>
                <div style={{ color: '#0284c7', fontWeight: 600, marginTop: '4px', fontSize: '14px' }}>Open for Collaboration</div>
              </div>
            </div>
          </div>

          <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#166534', marginBottom: '4px' }}>Collaboration Requirements</div>
              <div style={{ color: '#15803d', fontSize: '15px' }}>Support Needed: <b>{selectedChallenge.supportRequired.join(', ')}</b></div>
            </div>
            <button onClick={() => setShowInterestForm(true)} style={{ background: '#08743f', border: 'none', padding: '12px 24px', borderRadius: '6px', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '15px' }}>
              Express Interest →
            </button>
          </div>
        </DetailModal>
      )}

      {/* EXPRESS INTEREST FORM MODAL */}
      {showInterestForm && (
        <DetailModal title="Express Interest for Collaboration" onClose={() => { setShowInterestForm(false); setSelectedChallenge(null); }}>
          <div style={{ marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Applying for Challenge:</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>{selectedChallenge?.title}</div>
          </div>
          
          <form onSubmit={submitInterestForm} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', fontWeight: 500, color: '#334155' }}>
                Organisation Name
                <input type="text" defaultValue={industryUser?.name} required style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', fontWeight: 500, color: '#334155' }}>
                Contact Person
                <input type="text" defaultValue={industryUser?.contactPerson} required style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </label>
            </div>
            
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', fontWeight: 500, color: '#334155' }}>
              Area of Expertise
              <input type="text" defaultValue={industryUser?.expertise.join(', ')} required style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', fontWeight: 500, color: '#334155' }}>
              Support Type
              <select required style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                <option value="">Select Support Type</option>
                <option>Technology</option>
                <option>Mentorship</option>
                <option>Funding</option>
                <option>Prototype Development</option>
                <option>Testing</option>
                <option>Pilot Deployment</option>
                <option>Implementation</option>
                <option>Other</option>
              </select>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', fontWeight: 500, color: '#334155' }}>
                Estimated Timeline (Months)
                <input type="number" min="1" placeholder="e.g. 6" required style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', fontWeight: 500, color: '#334155' }}>
                Funding / Resource Commitment (Optional)
                <input type="text" placeholder="e.g. Equipment worth ₹2L" style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </label>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', fontWeight: 500, color: '#334155' }}>
              Proposed Contribution / Message
              <textarea rows="4" required placeholder="Describe how your organisation will help solve this challenge..." style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px' }}></textarea>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <button type="button" onClick={() => setShowInterestForm(false)} style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '6px', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ background: '#08743f', border: 'none', padding: '10px 24px', borderRadius: '6px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Submit Interest</button>
            </div>
          </form>
        </DetailModal>
      )}

      {/* APPLICATION DETAIL MODAL */}
      {selectedApplication && (
        <DetailModal title="Application Details" onClose={() => setSelectedApplication(null)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: '22px', color: '#0f172a' }}>{selectedApplication.challengeTitle}</h3>
              <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#64748b' }}>
                <span>Challenge ID: {selectedApplication.challengeId}</span>
                <span>District: {selectedApplication.district}</span>
              </div>
            </div>
            <StatusBadge status={selectedApplication.status} />
          </div>

          {/* Progress Tracker */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '24px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '32px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '35px', left: '40px', right: '40px', height: '2px', background: '#e2e8f0', zIndex: 1 }}></div>
            {['Submitted', 'Under Review', 'Shortlisted', 'Accepted', 'Collaboration'].map((step, idx) => {
              const statusIndex = ['Submitted', 'Under Review', 'Shortlisted', 'Accepted', 'Collaboration'].indexOf(selectedApplication.status);
              const isPast = idx <= statusIndex;
              const isCurrent = idx === statusIndex;
              return (
                <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, gap: '12px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: isPast ? '#08743f' : '#fff', border: isPast ? '2px solid #08743f' : '2px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px' }}>
                    {isPast ? '✓' : ''}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: isCurrent ? 600 : 500, color: isCurrent ? '#0f172a' : '#64748b' }}>{step}</span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <DetailField label="Submitted Date" value={selectedApplication.submittedOn} />
            <DetailField label="Support Offered" value={selectedApplication.supportOffered.join(', ')} />
          </div>

          <div>
            <DetailField label="Industry Proposal" value={selectedApplication.proposal} />
          </div>
        </DetailModal>
      )}

      {/* PROJECT DETAIL MODAL */}
      {selectedProject && (
        <DetailModal title="Project Lifecycle" onClose={() => setSelectedProject(null)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: '22px', color: '#0f172a' }}>{selectedProject.title}</h3>
              <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#64748b' }}>
                <span>Challenge ID: {selectedProject.challengeId}</span>
                <span>District: {selectedProject.district}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#08743f' }}>{selectedProject.progress}%</div>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Overall Progress</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '32px' }}>
            <DetailField label="Government Partner" value={selectedProject.government} />
            <DetailField label="University Partner" value={selectedProject.university} />
            <DetailField label="Industry Partner" value={selectedProject.industry} />
          </div>

          <h4 style={{ fontSize: '15px', color: '#0f172a', marginBottom: '16px' }}>Project Milestones</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {selectedProject.milestones.map((m, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '16px', position: 'relative', paddingBottom: idx === selectedProject.milestones.length - 1 ? '0' : '24px' }}>
                {idx !== selectedProject.milestones.length - 1 && (
                  <div style={{ position: 'absolute', left: '11px', top: '24px', bottom: '0', width: '2px', background: m.completed ? '#08743f' : '#e2e8f0' }}></div>
                )}
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: m.completed ? '#08743f' : '#fff', border: m.completed ? '2px solid #08743f' : '2px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', zIndex: 2 }}>
                  {m.completed ? '✓' : ''}
                </div>
                <div style={{ paddingTop: '2px' }}>
                  <span style={{ fontSize: '15px', fontWeight: m.completed ? 600 : 500, color: m.completed ? '#0f172a' : '#64748b' }}>{m.name}</span>
                  {!m.completed && m.name === selectedProject.nextMilestone && (
                    <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, marginLeft: '12px' }}>Current Phase</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DetailModal>
      )}

    </Shell>
  );
}

