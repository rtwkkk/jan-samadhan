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
  const [applications, setApplications] = useState([]);
  const [projects, setProjects] = useState([]);
  const [collaborations, setCollaborations] = useState([]);
  const [impact, setImpact] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [solutions, setSolutions] = useState([]);

  const [showInterestForm, setShowInterestForm] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usr, app, prj, col, stats, not, sols] = await Promise.all([
          industryService.getIndustryProfile(),
          industryService.getCSRRequests(),
          industryService.getActiveCollaborations(),
          industryService.getCSRRequests(),
          industryService.getIndustryStats(),
          industryService.getNotifications(),
          industryService.getSolutions()
        ]);
        setIndustryUser(usr);
        setApplications(app);
        setProjects(prj);
        setCollaborations(col);
        setSolutions(sols);
        
        // Mock impact data since there's no explicit backend route for industry impact yet
        setImpact({
          peopleReached: '25,000+',
          villagesCovered: '120',
          solutionsDeployed: stats?.solutionsDeployed || '0',
          districtsImpacted: '8',
          recentImpact: []
        });
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
    alert("Interest Submitted Successfully! It is now Under Review.");
    setShowInterestForm(false);
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
          <NavItem icon="📝" label="My Applications" active={view === 'applications'} onClick={() => setView('applications')} />
          <NavItem icon="🚀" label="Active Projects" active={view === 'projects'} onClick={() => setView('projects')} />
          <NavItem icon="💡" label="Proposed Solutions" active={view === 'solutions'} onClick={() => setView('solutions')} />
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
                      <b style={{ display: 'block', fontSize: '32px', color: '#0f172a' }}>{applications.length}</b><span style={{ color: '#64748b', fontSize: '14px' }}>MY APPLICATIONS</span>
                    </div>
                    <div className="off-kpi-card" style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <b style={{ display: 'block', fontSize: '32px', color: '#0f172a' }}>{projects.length}</b><span style={{ color: '#64748b', fontSize: '14px' }}>ACTIVE PROJECTS</span>
                    </div>
                    <div className="off-kpi-card" style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <b style={{ display: 'block', fontSize: '32px', color: '#0f172a' }}>{solutions.length}</b><span style={{ color: '#64748b', fontSize: '14px' }}>PROPOSED SOLUTIONS</span>
                    </div>
                  </div>

                  <section className="ud-section" style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div className="ud-section-head" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Recent Solutions</h3>
                      <button className="outline" onClick={() => setView('solutions')} style={{ background: 'none', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '4px', color: '#475569', cursor: 'pointer' }}>View All →</button>
                    </div>
                    <div className="ud-table">
                      <div className="ud-table-head" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr', padding: '12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#64748b', fontSize: '13px' }}>
                        <span>Target Problem</span><span>Solution</span><span>Institution</span><span>Status</span>
                      </div>
                      {solutions.slice(0, 3).map(s => (
                        <div key={s.id} className="ud-table-row" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr', padding: '16px 12px', borderBottom: '1px solid #f1f5f9', alignItems: 'center', cursor: 'pointer' }} onClick={() => setView('solutions')}>
                          <span style={{ fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '12px' }}>{s.problemStatement}</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '12px' }}>{s.solutionStatement}</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '12px' }}>{s.institutionName}</span>
                          <span><StatusBadge status={s.status} /></span>
                        </div>
                      ))}
                      {solutions.length === 0 && (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No recent solutions available.</div>
                      )}
                    </div>
                  </section>
                </div>
              )}

              {/* MY APPLICATIONS VIEW */}
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
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{app.title}</span>
                        <span>{app.institution || 'N/A'}</span>
                        <span>N/A</span>
                        <span style={{ fontSize: '13px' }}>{app.requestedAmount || 'N/A'}</span>
                        <span><StatusBadge status={app.status} /></span>
                        <button onClick={() => setSelectedApplication(app)} style={{ background: 'none', border: 'none', color: '#08743f', fontWeight: 600, cursor: 'pointer', textAlign: 'left', padding: 0 }}>View Application</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SOLUTIONS VIEW */}
              {view === 'solutions' && (
                <div className="off-anim-in">
                  <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#0f172a' }}>Proposed Solutions</h2>
                  <p style={{ color: '#64748b', marginBottom: '24px' }}>Real solutions proposed by institutions for existing challenges.</p>

                  <div style={{ display: 'grid', gap: '20px' }}>
                    {solutions && solutions.map(s => (
                      <div key={s.id} style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Target: {s.challengeTitle}</span>
                            <h3 style={{ margin: '4px 0 8px 0', fontSize: '18px', color: '#0f172a' }}>{s.solutionStatement}</h3>
                            <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#64748b' }}>
                              <span>🏛 Institution: {s.institutionName}</span>
                              <span>🏢 Department: {s.collegeDepartment}</span>
                            </div>
                          </div>
                          <StatusBadge status={s.status} />
                        </div>

                        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '6px', fontSize: '14px', color: '#475569', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                          <div>
                            <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>Problem Description</strong>
                            <p style={{ margin: 0 }}>{s.problemStatement}</p>
                            <div style={{ marginTop: '12px', fontSize: '13px', color: '#64748b' }}>
                              <strong>Area Affected:</strong> {s.areaAffected} <br/>
                              <strong>Severity:</strong> {s.severity}
                            </div>
                          </div>
                          <div>
                            <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>Proposed Solution Details</strong>
                            <p style={{ margin: 0 }}>{s.solutionDescription}</p>
                            <div style={{ marginTop: '12px', fontSize: '13px', color: '#64748b' }}>
                              <strong>Team Composition:</strong> {s.teamComposition?.numberOfMembers} members ({s.teamComposition?.details}) <br/>
                              <strong>Expected Time:</strong> {s.expectedCompletionTime}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {solutions.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '40px', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#64748b' }}>
                        No proposed solutions available at the moment.
                      </div>
                    )}
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
                              <span>🏛 Partner: {p.partner}</span>
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
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#0f172a' }}>{c.title}</h3>
                            <div style={{ fontSize: '13px', color: '#475569', marginBottom: '16px' }}>
                              From: <b>{c.institution || 'Institution'}</b>
                            </div>
                            <div>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Requested Amount: {c.requestedAmount}</span>
                            </div>
                          </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              <button onClick={() => { alert('Collaboration Accepted!'); setCollaborations(collaborations.filter(x => x.id !== c.id)); }} style={{ background: '#08743f', border: 'none', padding: '8px 16px', borderRadius: '6px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Accept</button>
                              <button onClick={() => alert('Review details sent to your email.')} style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Review</button>
                              <button onClick={() => { alert('Collaboration Declined.'); setCollaborations(collaborations.filter(x => x.id !== c.id)); }} style={{ background: '#fff', border: '1px solid #fecaca', padding: '8px 16px', borderRadius: '6px', color: '#dc2626', fontWeight: 600, cursor: 'pointer' }}>Decline</button>
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
                    <h3 style={{ fontSize: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px' }}>Organization Details</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                      <DetailField label="Legal Entity Name" value={industryUser?.name} />
                      <DetailField label="Brand / Trade Name" value={industryUser?.brandName} />
                      <DetailField label="Organization Type" value={industryUser?.organizationType} />
                      <DetailField label="Industry Sector" value={industryUser?.industrySector} />
                      <DetailField label="Primary Business Area" value={industryUser?.primaryBusinessArea} />
                      <DetailField label="Year Established" value={industryUser?.yearEstablished} />
                      <DetailField label="Headquarters" value={industryUser?.headquarters} />
                      <DetailField label="Website" value={industryUser?.website} />
                      <DetailField label="Location" value={`${industryUser?.district || ''}, ${industryUser?.state || ''}`} />
                    </div>

                    <h3 style={{ fontSize: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px' }}>Registration Information</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                      <DetailField label="CIN" value={industryUser?.cin} />
                      <DetailField label="LLPIN" value={industryUser?.llpin} />
                      <DetailField label="GSTIN" value={industryUser?.gstin} />
                      <DetailField label="Udyam Number" value={industryUser?.udyamNumber} />
                      <DetailField label="PAN" value={industryUser?.pan} />
                    </div>

                    <h3 style={{ fontSize: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px' }}>Capabilities & Expertise</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                      <DetailField label="Collaboration Capabilities" value={industryUser?.collaborationCapabilities?.join(', ')} />
                      <DetailField label="Technology / Expertise Areas" value={industryUser?.expertiseAreas} />
                      <DetailField label="R&D Capability" value={industryUser?.rndCapability} />
                      <DetailField label="Geographical Areas of Operation" value={industryUser?.geoAreas} />
                      <div style={{ gridColumn: '1 / -1' }}>
                        <DetailField label="Relevant Projects" value={industryUser?.relevantProjects} />
                      </div>
                    </div>

                    <h3 style={{ fontSize: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px' }}>Authorized Representative</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
                      <DetailField label="Full Name" value={industryUser?.authRepName} />
                      <DetailField label="Designation" value={industryUser?.authRepDesignation} />
                      <DetailField label="Official Email" value={industryUser?.authRepEmail || industryUser?.email} />
                      <DetailField label="Official Mobile" value={industryUser?.authRepPhone || industryUser?.phone} />
                    </div>
                    <div style={{ marginTop: '32px' }}>
                      <button onClick={() => alert('Profile edit mode enabled (mock)')} style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '6px', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Edit Profile</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>



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

