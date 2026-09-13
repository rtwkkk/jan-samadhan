import { useState, useEffect } from 'react';

// ── Dummy data (will be replaced by API later) ──
const DUMMY_USER = { id: 'USR-0042', name: 'Shubham', role: 'Citizen', organization: null, email: 'shubham@example.com' };



const DUMMY_CHALLENGES = [
  { id: 'SICP-0201', title: 'Village Water Supply Issue', domain: 'Water Resources', location: 'Dumka', status: 'Under Review', updated: '2h ago' },
  { id: 'SICP-0198', title: 'Crop Disease Detection System', domain: 'Agriculture', location: 'Ranchi', status: 'University Assigned', updated: 'Yesterday' },
  { id: 'SICP-0195', title: 'Street Lighting Problem', domain: 'Infrastructure', location: 'Deoghar', status: 'In Progress', updated: '3d ago' },
  { id: 'SICP-0189', title: 'School Drinking Water Quality', domain: 'Water Resources', location: 'Gumla', status: 'Completed', updated: '1w ago' },
  { id: 'SICP-0183', title: 'Waste Collection Scheduling', domain: 'Urban Development', location: 'Ranchi', status: 'Submitted', updated: '2w ago' },
];



const DUMMY_IMPACT = [
  { label: 'People Benefited', value: '1,240' },
  { label: 'Problems Solved', value: '18' },
  { label: 'Projects Deployed', value: '6' },
];

const STATUS_COLORS = {
  'Submitted': { bg: '#e2e8f0', color: '#475569' },
  'Under Review': { bg: '#fef0cf', color: '#ae7200' },
  'Verified': { bg: '#e8f4ed', color: '#08743f' },
  'University Assigned': { bg: '#dbeafe', color: '#1d4ed8' },
  'In Progress': { bg: '#fef0cf', color: '#ae7200' },
  'Pilot': { bg: '#ede9fe', color: '#6d28d9' },
  'Completed': { bg: '#e8f4ed', color: '#08743f' },
  'Rejected': { bg: '#fde7e5', color: '#c4241e' },
};

// ── Export the dashboard component ──
export function UserDashboard({ Shell, PageHead, user = DUMMY_USER }) {
  const [challenges, setChallenges] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChallenge, setSelectedChallenge] = useState(null);

  useEffect(() => {
    const fetchChallenges = async () => {
      const token = localStorage.getItem('token');
      if (!token) { setLoading(false); return; }
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/challenges/my`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setChallenges(data.data || []);
          setIndustries(data.industries || []);
        }
      } catch (err) {
        console.error("Failed to fetch challenges:", err);
      }
      setLoading(false);
    };
    fetchChallenges();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedChallenge) setSelectedChallenge(null);
    };
    if (selectedChallenge) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedChallenge]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const userName = user?.name || 'Citizen';

  return (
    <Shell active="Dashboard">
      <div className="ud-marquee">
        <marquee behavior="scroll" direction="left" scrollamount="5">
          आपकी आवाज़, आपकी समस्या और आपका सुझाव — मिलकर बनाएँ झारखंड को बेहतर।
        </marquee>
      </div>
      {/* Page header */}
      <div className="ud-header">
        <div>
          <h1>{greeting}, {userName}</h1>
          <p>Here's what's happening with your challenges and collaborations.</p>
        </div>
        <aside>
          <span className="ud-notif-icon" title="Notifications">🔔<i>2</i></span>
          <span className="ud-avatar" style={{cursor: 'pointer'}} onClick={() => location.hash = '#/profile'}>{userName[0]}</span>
          <span className="ud-role-badge">{user?.role || 'Citizen'}</span>
        </aside>
      </div>

      <main className="ud-main">

        {/* ── Section 1: Stats ── */}
        <section className="ud-stats">
          <div className="ud-stat-card">
            <b>{challenges.length}</b>
            <span>My Challenges</span>
          </div>
          <div className="ud-stat-card">
            <b>{challenges.filter(c => c.status === 'in_progress').length}</b>
            <span>In Progress</span>
          </div>
          <div className="ud-stat-card">
            <b>{challenges.filter(c => ['resolved', 'completed'].includes(c.status)).length}</b>
            <span>Completed</span>
          </div>
          <div className="ud-stat-card">
            <b>{challenges.filter(c => industries.some(ind => ind.associatedProjects?.includes(c._id))).length}</b>
            <span>Collaborations</span>
          </div>
        </section>

        {/* ── Section 2: CTA ── */}
        {user?.role !== 'institution' && (
          <section className="ud-cta">
            <div>
              <h3>Have a problem to solve?</h3>
              <p>Share a real societal challenge with the community. Your submission will be reviewed, categorized, and routed to the right institution.</p>
            </div>
            <a href="#/submit-a-challenge"><button>Submit a Challenge →</button></a>
          </section>
        )}

        {/* ── Section 3: Challenges Table ── */}
        <section className="ud-section">
          <div className="ud-section-head">
            <h3>My Challenges</h3>
            <a href="#/my-dashboard">View all →</a>
          </div>
          <div className="ud-table">
            <div className="ud-table-head">
              <span>Challenge</span><span>Domain</span><span>Location</span><span>Status</span><span>Last Updated</span>
            </div>
            {loading ? <div style={{ padding: '20px', textAlign: 'center' }}>Loading challenges...</div> : challenges.length === 0 ? <div style={{ padding: '20px', textAlign: 'center' }}>No challenges submitted yet.</div> : challenges.map(c => (
              <div key={c._id} className="ud-table-row" style={{ cursor: 'pointer' }} onClick={() => setSelectedChallenge(c)}>
                <span><small style={{ color: '#064477', fontWeight: 600 }}>{c._id.slice(-6).toUpperCase()}</small><br />{c.title}</span>
                <span>{c.category}</span>
                <span>{c.district}</span>
                <span><em style={{ 
                  background: c.status === 'rejected' ? '#fde7e5' : (STATUS_COLORS[c.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())]?.bg || '#e2e8f0'), 
                  color: c.status === 'rejected' ? '#c4241e' : (STATUS_COLORS[c.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())]?.color || '#475569'), 
                  padding: '4px 10px', borderRadius: '3px', fontStyle: 'normal', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap', textTransform: 'capitalize' 
                }}>{c.status.replace('_', ' ')}</em></span>
                <span style={{ color: '#777' }}>{new Date(c.updatedAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Two-column: Projects + Notifications ── */}
        <div className="ud-grid-2">
          {(() => {
            const activeProjects = challenges.filter(c => c.institution);
            
            let allEvents = [];
            challenges.forEach(c => {
              allEvents.push({ type: 'submission', time: new Date(c.createdAt), challenge: c, msg: `Challenge submitted: ${c.title}`, icon: '📋' });
              
              if (c.status === 'verified' || c.status === 'assigned' || c.status === 'in_progress' || c.status === 'resolved' || c.status === 'rejected') {
                allEvents.push({ type: 'status_change', time: new Date(c.updatedAt), challenge: c, msg: `Challenge "${c.title}" is now ${c.status.replace('_', ' ')}`, icon: '✓' });
              }

              if (c.institution) {
                allEvents.push({ type: 'assigned', time: new Date(c.updatedAt), challenge: c, msg: `${c.institution.name || 'An institution'} accepted your challenge`, icon: '🏛' });
              }

              if (c.informationRequest) {
                allEvents.push({ type: 'info_request', time: new Date(c.informationRequest.requestedAt || c.updatedAt), challenge: c, msg: `Additional information requested for "${c.title}"`, icon: 'ℹ️' });
              }

              if (c.rejectionReason) {
                allEvents.push({ type: 'rejection', time: new Date(c.rejectedAt || c.updatedAt), challenge: c, msg: `Challenge "${c.title}" was rejected`, icon: '❌' });
              }
              
              const assocIndustry = industries.find(ind => ind.associatedProjects?.includes(c._id));
              if (assocIndustry) {
                allEvents.push({ type: 'industry', time: new Date(c.updatedAt), challenge: c, msg: `Industry partner ${assocIndustry.name} joined the project`, icon: '🏢' });
              }
            });

            allEvents.sort((a, b) => b.time - a.time);

            const recentActivity = allEvents.slice(0, 5);
            const notifications = allEvents.filter(e => e.type !== 'submission').slice(0, 5);

            return (
              <>
                {/* ── Section 4: Active Projects ── */}
                <section className="ud-section">
                  <div className="ud-section-head"><h3>Active Projects</h3></div>
                  {activeProjects.length === 0 ? <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>No active projects.</div> : activeProjects.map(p => {
                    const partner = industries.find(ind => ind.associatedProjects?.includes(p._id))?.name || 'Pending Allocation';
                    return (
                      <div key={p._id} className="ud-project-card">
                        <h4>{p.title}</h4>
                        <div className="ud-project-meta">
                          <span>University: <b>{p.institution.name || 'Assigned'}</b></span>
                          <span>Industry: <b>{partner}</b></span>
                        </div>
                        <div className="ud-progress-row">
                          <div className="ud-progress-bar"><div style={{ width: `50%` }} /></div>
                          <b>50%</b>
                        </div>
                        <div className="ud-project-meta">
                          <span>Stage: <b>Solution Development</b></span>
                          <span>Next: <b>Pilot Testing</b></span>
                          <span>Due: <b>TBD</b></span>
                        </div>
                        <span style={{ color: '#064477', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }} onClick={() => setSelectedChallenge(p)}>View Project →</span>
                      </div>
                    );
                  })}
                </section>

                {/* ── Section 5: Notifications ── */}
                <section className="ud-section">
                  <div className="ud-section-head"><h3>Notifications</h3></div>
                  <div className="ud-notif-list">
                    {notifications.length === 0 ? <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>No new notifications.</div> : notifications.map((n, i) => (
                      <div key={i} className={'ud-notif-item' + (i < 2 ? ' unread' : '')}>
                        <span className="ud-notif-dot" />
                        <div>
                          <span>{n.msg}</span>
                          <small>{n.time.toLocaleString()}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            );
          })()}
        </div>

        {/* ── Two-column: Activity + Impact ── */}
        <div className="ud-grid-2">
          {(() => {
            let allEvents = [];
            challenges.forEach(c => {
              allEvents.push({ label: 'Challenge submitted', detail: c.title, time: new Date(c.createdAt), icon: '📋' });
              
              if (c.status === 'verified' || c.status === 'assigned' || c.status === 'in_progress' || c.status === 'resolved' || c.status === 'rejected') {
                allEvents.push({ label: `Status: ${c.status.replace('_', ' ')}`, detail: c.title, time: new Date(c.updatedAt), icon: '✓' });
              }

              if (c.institution) {
                allEvents.push({ label: 'University accepted challenge', detail: c.institution.name || 'Assigned', time: new Date(c.updatedAt), icon: '🏛' });
              }

              const assocIndustry = industries.find(ind => ind.associatedProjects?.includes(c._id));
              if (assocIndustry) {
                allEvents.push({ label: 'Industry partner joined', detail: assocIndustry.name, time: new Date(c.updatedAt), icon: '🏢' });
              }
            });

            allEvents.sort((a, b) => b.time - a.time);
            const recentActivity = allEvents.slice(0, 5);

            return (
              <section className="ud-section">
                <div className="ud-section-head"><h3>Recent Activity</h3></div>
                <div className="ud-timeline">
                  {recentActivity.length === 0 ? <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>No recent activity.</div> : recentActivity.map((a, i) => (
                    <div key={i} className="ud-timeline-item">
                      <span className="ud-timeline-icon">{a.icon}</span>
                      <div>
                        <b>{a.label}</b>
                        <span>{a.detail}</span>
                        <small>{a.time.toLocaleString()}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })()}

          {/* ── Section 7: Community Impact ── */}
          <section className="ud-section">
            <div className="ud-section-head"><h3>Community Impact</h3></div>
            <div className="ud-impact">
              {DUMMY_IMPACT.map(m => (
                <div key={m.label}>
                  <b>{m.value}</b>
                  <span>{m.label}</span>
                </div>
              ))}
            </div>
            <p className="ud-impact-note">Measured impact from completed projects across Jharkhand.</p>
          </section>
        </div>

      </main>

      {/* Challenge Details Modal */}
      {selectedChallenge && (
        <div 
          className="ud-modal-backdrop" 
          onClick={() => setSelectedChallenge(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '20px'
          }}
        >
          <div 
            className="ud-modal-content"
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '8px', maxWidth: '850px', width: '100%',
              maxHeight: '85vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '24px 32px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div>
                <span style={{ color: '#064477', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Challenge ID: {selectedChallenge._id.slice(-6).toUpperCase()}
                </span>
                <h2 style={{ margin: '8px 0 0', fontSize: '22px', color: '#1e293b', lineHeight: '1.3' }}>{selectedChallenge.title}</h2>
              </div>
              <button 
                onClick={() => setSelectedChallenge(null)}
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
            
            <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
              {/* Status Tracker */}
              <div style={{ marginBottom: '32px', padding: '24px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Challenge Progress</h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '13px', left: '10%', right: '10%', height: '2px', background: '#e2e8f0', zIndex: 1 }}></div>
                  {(() => {
                    const status = selectedChallenge.status || 'submitted';
                    const isRejected = status === 'rejected';
                    const stages = [
                      { id: 'submitted', label: 'Submitted' },
                      { id: 'under_review', label: 'Under Review' },
                      { id: 'information_requested', label: 'Info Requested' },
                      { id: 'verified', label: 'Verified' },
                      { id: 'assigned', label: 'Assigned' },
                      { id: 'in_progress', label: 'In Progress' },
                      { id: 'resolved', label: 'Resolved' }
                    ];
                    
                    // Filter out 'information_requested' if the challenge never went through it
                    const filteredStages = stages.filter(s => 
                      s.id !== 'information_requested' || status === 'information_requested' || selectedChallenge.informationRequest
                    );

                    let currentIndex = filteredStages.findIndex(s => s.id === status);
                    if (currentIndex === -1 && !isRejected) currentIndex = 0;
                    if (isRejected) currentIndex = 1; // Put rejected right after submission/review

                    return filteredStages.map((stage, i) => {
                      const isCompleted = !isRejected && i < currentIndex;
                      const isCurrent = !isRejected && i === currentIndex;
                      const showRejected = isRejected && i === 1;
                      let bg = '#fff', border = '2px solid #cbd5e1', labelColor = '#94a3b8', labelText = stage.label;
                      let icon = <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#cbd5e1' }} />;
                      
                      if (isCompleted) {
                        bg = '#10b981'; border = '2px solid #10b981'; labelColor = '#10b981';
                        icon = <svg width="14" height="14" viewBox="0 0 20 20" fill="white"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>;
                      } else if (isCurrent) {
                        bg = '#fff'; border = '2px solid #3b82f6'; labelColor = '#3b82f6';
                        icon = <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6' }} />;
                        if (stage.id === 'information_requested') {
                          border = '2px solid #eab308'; labelColor = '#eab308';
                          icon = <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#eab308' }} />;
                        }
                      } else if (showRejected) {
                        bg = '#ef4444'; border = '2px solid #ef4444'; labelColor = '#ef4444'; labelText = 'Rejected';
                        icon = <svg width="14" height="14" viewBox="0 0 20 20" fill="white"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>;
                      }

                      if (isRejected && i > 1) return <div key={stage.id} style={{ flex: 1, visibility: 'hidden' }}><div style={{ width: '28px' }}></div></div>;
                      
                      return (
                        <div key={stage.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, flex: 1 }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: bg, border: border, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                            {icon}
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: (isCurrent || showRejected) ? 700 : 500, color: labelColor, textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {labelText}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div>
                  <small style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Category / Domain</small>
                  <div style={{ marginTop: '4px', color: '#334155', fontWeight: 500 }}>{selectedChallenge.category}</div>
                </div>
                <div>
                  <small style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Location</small>
                  <div style={{ marginTop: '4px', color: '#334155', fontWeight: 500 }}>{selectedChallenge.district}{selectedChallenge.villageCityBlock ? `, ${selectedChallenge.villageCityBlock}` : ''}</div>
                </div>
                <div>
                  <small style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Current Status</small>
                  <div style={{ marginTop: '4px' }}>
                    <em style={{ 
                      background: selectedChallenge.status === 'rejected' ? '#fde7e5' : (STATUS_COLORS[selectedChallenge.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())]?.bg || '#e2e8f0'), 
                      color: selectedChallenge.status === 'rejected' ? '#c4241e' : (STATUS_COLORS[selectedChallenge.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())]?.color || '#475569'), 
                      padding: '4px 10px', borderRadius: '3px', fontStyle: 'normal', fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' 
                    }}>
                      {selectedChallenge.status.replace('_', ' ')}
                    </em>
                  </div>
                </div>
                <div>
                  <small style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Date Submitted</small>
                  <div style={{ marginTop: '4px', color: '#334155', fontWeight: 500 }}>{new Date(selectedChallenge.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
              
              {selectedChallenge.institution && (
                <div style={{ background: '#f0fdf4', padding: '24px', borderRadius: '6px', border: '1px solid #bbf7d0', marginBottom: '32px' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#166534' }}>Assigned Institution Details</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
                    <div>
                      <small style={{ color: '#166534', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>College Name</small>
                      <div style={{ marginTop: '4px', color: '#14532d', fontWeight: 500 }}>{selectedChallenge.institution.name}</div>
                    </div>
                    <div>
                      <small style={{ color: '#166534', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Department</small>
                      <div style={{ marginTop: '4px', color: '#14532d', fontWeight: 500 }}>
                        {selectedChallenge.institution.departments && selectedChallenge.institution.departments.length > 0 
                          ? selectedChallenge.institution.departments.join(', ') 
                          : 'Not Specified'}
                      </div>
                    </div>
                    <div>
                      <small style={{ color: '#166534', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Professor / Leader</small>
                      <div style={{ marginTop: '4px', color: '#14532d', fontWeight: 500 }}>
                        {selectedChallenge.institution.professorName || 'Pending Assignment'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {selectedChallenge.status === 'rejected' && selectedChallenge.rejectionReason && (
                <div style={{ background: '#fde7e5', padding: '24px', borderRadius: '6px', border: '1px solid #c4241e', marginTop: '24px' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#c4241e' }}>Rejection Reason</h3>
                  <p style={{ margin: 0, color: '#c4241e', lineHeight: '1.6', fontSize: '15px', whiteSpace: 'pre-wrap' }}>
                    {selectedChallenge.rejectionReason}
                  </p>
                </div>
              )}

              {selectedChallenge.status === 'information_requested' && selectedChallenge.informationRequest && (
                <div style={{ background: '#fef0cf', padding: '24px', borderRadius: '6px', border: '1px solid #ae7200', marginTop: '24px' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#ae7200' }}>Information Requested by Official</h3>
                  <p style={{ margin: '0 0 16px', color: '#ae7200', lineHeight: '1.6', fontSize: '15px', whiteSpace: 'pre-wrap' }}>
                    {selectedChallenge.informationRequest.message}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <textarea 
                      id={`respond-${selectedChallenge._id}`} 
                      placeholder="Type your response here..." 
                      style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid #ae7200', minHeight: '80px', fontFamily: 'inherit' }}
                    ></textarea>
                    <button 
                      style={{ alignSelf: 'flex-start', background: '#ae7200', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                      onClick={async () => {
                        const msg = document.getElementById(`respond-${selectedChallenge._id}`).value;
                        if (!msg.trim()) return alert("Please enter a response.");
                        try {
                          const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/challenges/${selectedChallenge._id}/respond`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                            body: JSON.stringify({ message: msg })
                          });
                          if (res.ok) {
                            alert("Information submitted successfully!");
                            setSelectedChallenge({ ...selectedChallenge, status: 'under_review' });
                            // Re-fetch challenges in background could be done here
                          } else {
                            alert("Failed to submit information.");
                          }
                        } catch (err) {
                          console.error(err);
                          alert("Error submitting information.");
                        }
                      }}
                    >Submit Response</button>
                  </div>
                </div>
              )}

              <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '24px' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#0f172a' }}>Detailed Description</h3>
                <p style={{ margin: 0, color: '#475569', lineHeight: '1.6', fontSize: '15px', whiteSpace: 'pre-wrap' }}>
                  {selectedChallenge.description}
                </p>
              </div>
              
              {selectedChallenge.peopleAffected && (
                <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 500 }}>
                  <span style={{ fontSize: '18px' }}>👥</span> <span>Approximately {selectedChallenge.peopleAffected} people affected</span>
                </div>
              )}

              {user?.role === 'institution' && (
                <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px' }}>
                  <button 
                    style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, flex: 1 }}
                    onClick={async () => {
                      if(!window.confirm("Mark this challenge as In Progress?")) return;
                      try {
                        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/challenges/${selectedChallenge._id}/status`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                          body: JSON.stringify({ status: 'in_progress' })
                        });
                        if(res.ok) {
                          alert("Status updated to In Progress");
                          setSelectedChallenge({...selectedChallenge, status: 'in_progress'});
                        }
                      } catch(e) { alert("Error updating status"); }
                    }}
                  >Mark In Progress</button>
                  <button 
                    style={{ background: '#10b981', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, flex: 1 }}
                    onClick={async () => {
                      if(!window.confirm("Mark this challenge as Resolved?")) return;
                      try {
                        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/challenges/${selectedChallenge._id}/status`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                          body: JSON.stringify({ status: 'resolved' })
                        });
                        if(res.ok) {
                          alert("Status updated to Resolved");
                          setSelectedChallenge({...selectedChallenge, status: 'resolved'});
                        }
                      } catch(e) { alert("Error updating status"); }
                    }}
                  >Mark Resolved</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

// ── Project Details Component ──
export function ProjectDetails({ Shell, PageHead }) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const id = location.hash.split('/').pop();

  useEffect(() => {
    const fetchProject = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/challenges/${id}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          setProject(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch challenge details:", err);
      }
      setLoading(false);
    };
    fetchProject();
  }, [id]);

  if (loading) return <Shell><main style={{ padding: '40px', textAlign: 'center' }}>Loading project details...</main></Shell>;
  if (!project) return <Shell><main style={{ padding: '40px', textAlign: 'center' }}>Project not found.</main></Shell>;

  const TRACKING_STAGES = [
    { name: 'Submitted', desc: 'Challenge logged by citizen', time: new Date(project.createdAt).toLocaleDateString(), by: 'Citizen' },
    { name: 'Under Review', desc: 'Initial AI & manual screening', time: project.status === 'under_review' ? new Date(project.updatedAt).toLocaleDateString() : 'Pending', by: 'Nodal Officer' },
    { name: 'Verified', desc: 'Challenge verified and approved', time: 'Upcoming', by: 'State Dept.' },
    { name: 'Assigned', desc: 'Routed to Higher Education Institution', time: 'Upcoming', by: 'University' },
    { name: 'Solution Development', desc: 'Sensors deployed in trial field', time: 'Upcoming', by: 'Team Formed' },
    { name: 'Pilot Testing', desc: 'Pending field testing phase', time: 'Upcoming', by: '-' },
    { name: 'Implemented', desc: 'Final solution deployment', time: 'Upcoming', by: '-' },
    { name: 'Resolved', desc: 'Impact verified and closed', time: 'Upcoming', by: '-' }
  ];

  const currentStageIndex = project.status === 'submitted' ? 0 : project.status === 'under_review' ? 1 : 2;

  return (
    <Shell active="Dashboard">
      <PageHead crumb={`Dashboard  /  Active Projects  /  ${project._id.slice(-6).toUpperCase()}`} title={project.title} subtitle={`Project ID: ${project._id.slice(-6).toUpperCase()} • Category: ${project.category}`} actions={<button className="outline" onClick={() => location.hash = '#/my-dashboard'}>← Back to Dashboard</button>} />
      <main className="form-layout" style={{ minHeight: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ background: '#fff', border: '1px solid #d2d7d3', borderRadius: '4px', padding: '24px 32px 32px' }}>
            <h3 style={{ marginTop: 0, color: '#064e3b', fontSize: '16px' }}>Challenge Lifecycle Tracker</h3>

            <div className="tracker">
              <div className="tracker-progress" style={{ width: `${(currentStageIndex / (TRACKING_STAGES.length - 1)) * 100}%` }} />
              {TRACKING_STAGES.map((s, i) => {
                const isCompleted = i < currentStageIndex;
                const isCurrent = i === currentStageIndex;
                let statusClass = isCompleted ? 'completed' : isCurrent ? 'current' : '';
                return (
                  <div key={s.name} className={`track-node ${statusClass}`}>
                    <div className="track-icon">{isCompleted ? '✓' : ''}</div>
                    <div className="track-label">{isCurrent ? <><span style={{ display: 'block', color: '#064477' }}>Current Phase</span>{s.name}</> : s.name}</div>
                    <div className="track-popover">
                      <b>{s.name}</b>
                      <em>{s.time}</em>
                      <span>{s.desc}</span>
                      <span style={{ marginTop: '6px', color: '#94a3b8' }}>Stakeholder: {s.by}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="ud-project-meta" style={{ marginBottom: 0, fontSize: '13px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
              <span>Current Stage: <b style={{ color: '#08743f' }}>{TRACKING_STAGES[currentStageIndex].name}</b></span>
              <span>Industry Partner: <b>Pending Allocation</b></span>
              <span>Status: <b style={{ background: '#fef0cf', color: '#ae7200', padding: '2px 8px', borderRadius: '3px', textTransform: 'capitalize' }}>{project.status.replace('_', ' ')}</b></span>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #d2d7d3', borderRadius: '4px', padding: '28px' }}>
            <h3 style={{ marginTop: 0, color: '#064477', fontSize: '16px', borderBottom: '1px solid #eee', paddingBottom: '12px', marginBottom: '20px' }}>Original Challenge Details</h3>

            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <small style={{ color: '#747a76', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Detailed Description</small>
                <p style={{ margin: '4px 0 0', fontSize: '14px', lineHeight: '1.5', color: '#333' }}>{project.description}</p>
              </div>

              <div className="two" style={{ marginTop: '8px' }}>
                <div>
                  <small style={{ color: '#747a76', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Category</small>
                  <div style={{ marginTop: '4px', fontSize: '13px', fontWeight: 500 }}>{project.category}</div>
                </div>
                <div>
                  <small style={{ color: '#747a76', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Urgency/Severity</small>
                  <div style={{ marginTop: '4px', fontSize: '13px', fontWeight: 500, color: '#c4241e' }}>{project.aiAnalysis?.severityScore > 70 ? 'High' : project.aiAnalysis?.severityScore > 40 ? 'Medium' : 'Low'}</div>
                </div>
              </div>

              <div className="two">
                <div>
                  <small style={{ color: '#747a76', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Location / District</small>
                  <div style={{ marginTop: '4px', fontSize: '13px', fontWeight: 500 }}>{project.villageCityBlock}, {project.district}</div>
                </div>
                <div>
                  <small style={{ color: '#747a76', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Estimated People Affected</small>
                  <div style={{ marginTop: '4px', fontSize: '13px', fontWeight: 500 }}>{project.peopleAffected}+ People</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="help">
          <div style={{ borderColor: '#d2d7d3', background: '#fff' }}>
            <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '12px', marginBottom: '16px' }}>Recent Activities</h3>
            <div className="ud-timeline">
              {(() => {
                let allEvents = [];
                allEvents.push({ label: 'Challenge Submitted', detail: `Submitted by ${project.fullName || 'Citizen'}.`, time: new Date(project.createdAt), icon: '📋', iconStyle: { background: '#e3f0e9', color: '#064477' } });
                
                if (project.status === 'verified' || project.status === 'assigned' || project.status === 'in_progress' || project.status === 'resolved' || project.status === 'rejected') {
                  allEvents.push({ label: 'Status Update', detail: `Challenge is now ${project.status.replace('_', ' ')}.`, time: new Date(project.updatedAt), icon: '✓', iconStyle: { background: '#e8f4ed', color: '#08743f' } });
                }

                if (project.institution) {
                  allEvents.push({ label: 'University Accepted Challenge', detail: `Assigned to an institution.`, time: new Date(project.updatedAt), icon: '🏛', iconStyle: {} });
                }

                allEvents.sort((a, b) => b.time - a.time);
                
                if (allEvents.length === 0) return <div style={{ padding: '12px', color: '#666' }}>No recent activities.</div>;

                return allEvents.map((a, i) => (
                  <div key={i} className="ud-timeline-item">
                    <span className="ud-timeline-icon" style={a.iconStyle}>{a.icon}</span>
                    <div>
                      <b style={{ fontSize: '13px' }}>{a.label}</b>
                      <span style={{ fontSize: '12px', color: '#555' }}>{a.detail}</span>
                      <small style={{ fontSize: '11px', color: '#888' }}>{a.time.toLocaleDateString()}</small>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </aside>
      </main>
    </Shell>
  );
}

// ── User Profile Component ──
export function UserProfile({ Shell, PageHead, user, setUserData }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [stats, setStats] = useState({ submitted: 0, active: 0, resolved: 0 });

  useEffect(() => {
    if (user) {
      setFormData({ name: user.name || '', email: user.email || '' });
    }
    
    const fetchStats = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/challenges/my`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const challenges = data.data || [];
          setStats({
            submitted: challenges.length,
            active: challenges.filter(c => c.status === 'in_progress' || c.institution).length,
            resolved: challenges.filter(c => c.status === 'resolved' || c.status === 'completed').length
          });
        }
      } catch (err) {
        console.error("Failed to fetch challenge stats:", err);
      }
    };
    fetchStats();
  }, [user]);

  if (!user) return <Shell><main style={{ padding: '40px', textAlign: 'center' }}>Loading profile...</main></Shell>;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setUserData(data);
        setIsEditing(false);
        setMsg({ type: 'success', text: 'Profile updated successfully.' });
      } else {
        setMsg({ type: 'error', text: data.message || 'Failed to update profile.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to connect to backend server.' });
    }
    setSaving(false);
  };

  return (
    <Shell active="Dashboard">
      <PageHead 
        crumb="Dashboard  /  My Profile" 
        title="My Profile" 
        subtitle="Manage your personal information and account settings" 
        actions={<button className="outline" onClick={() => location.hash = (user?.role === 'admin' || user?.role === 'official') ? '#/official-dashboard' : '#/my-dashboard'}>← Back to Dashboard</button>} 
      />
      <main className="ud-main">
        <div style={{ background: '#fff', border: '1px solid #d2d7d3', borderRadius: '4px', padding: '32px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid #eee' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#064477', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 600 }}>
              {user.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: '24px', color: '#111' }}>{user.name}</h2>
              <span style={{ background: '#e3f0e9', color: '#08743f', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, textTransform: 'capitalize' }}>
                {user.role} Account
              </span>
            </div>
          </div>

          {msg && (
            <div className={`gov-note ${msg.type === 'error' ? 'warn' : ''}`} style={{ marginBottom: '24px', padding: '12px' }}>
              {msg.type === 'error' ? '⚠️' : '✅'} {msg.text}
            </div>
          )}

          {!isEditing ? (
            <div style={{ display: 'grid', gap: '32px' }}>
              <div>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#111', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Personal Information</h3>
                <div style={{ display: 'grid', gap: '20px' }}>
                  <div className="two">
                    <div>
                      <small style={{ color: '#747a76', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Full Name</small>
                      <div style={{ marginTop: '4px', fontSize: '15px', color: '#333', fontWeight: 500 }}>{user.name}</div>
                    </div>
                    <div>
                      <small style={{ color: '#747a76', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>{user.role === 'admin' || user.role === 'official' ? 'Official Email' : 'Email Address'}</small>
                      <div style={{ marginTop: '4px', fontSize: '15px', color: '#333', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {user.email || '—'}
                        {user.email && <span style={{ background: '#e8f4ed', color: '#08743f', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>✓ Verified</span>}
                      </div>
                    </div>
                  </div>
                  <div className="two">
                    <div>
                      <small style={{ color: '#747a76', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>{user.role === 'admin' || user.role === 'official' ? 'Official Phone' : 'Mobile Number'}</small>
                      <div style={{ marginTop: '4px', fontSize: '15px', color: '#333', fontWeight: 500 }}>{user.phone} <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 400, marginLeft: '4px' }}>(Read-only)</span></div>
                    </div>
                    <div>
                      <small style={{ color: '#747a76', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Location / District</small>
                      <div style={{ marginTop: '4px', fontSize: '15px', color: '#333', fontWeight: 500 }}>
                        {user.city || 'Not Specified'}, {user.district || 'Jharkhand'}, {user.state || 'India'}
                      </div>
                    </div>
                  </div>
                  
                  {(user.role === 'admin' || user.role === 'official') && (
                    <div className="two">
                      <div>
                        <small style={{ color: '#747a76', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Designation</small>
                        <div style={{ marginTop: '4px', fontSize: '15px', color: '#333', fontWeight: 500 }}>{user.designation || 'Government Official'}</div>
                      </div>
                      <div>
                        <small style={{ color: '#747a76', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Department</small>
                        <div style={{ marginTop: '4px', fontSize: '15px', color: '#333', fontWeight: 500 }}>{user.department || 'State Administration'}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#111', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Account Details</h3>
                <div className="two">
                  <div>
                    <small style={{ color: '#747a76', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Account Status</small>
                    <div style={{ marginTop: '4px', fontSize: '15px', color: '#08743f', fontWeight: 600 }}>Active / Verified</div>
                  </div>
                  <div>
                    <small style={{ color: '#747a76', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Member Since</small>
                    <div style={{ marginTop: '4px', fontSize: '15px', color: '#333', fontWeight: 500 }}>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</div>
                  </div>
                </div>
                {(user.role === 'admin' || user.role === 'official') && (
                  <div style={{ marginTop: '20px' }}>
                    <small style={{ color: '#747a76', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Admin ID</small>
                    <div style={{ marginTop: '4px', fontSize: '15px', color: '#333', fontWeight: 500 }}>{user._id ? user._id.slice(-8).toUpperCase() : 'N/A'}</div>
                  </div>
                )}
              </div>

              {user.role !== 'admin' && user.role !== 'official' && (
                <div>
                  <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#111', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Challenge Summary</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px' }}>
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <b style={{ display: 'block', fontSize: '24px', color: '#0f172a' }}>{stats.submitted}</b>
                      <small style={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Challenges Submitted</small>
                    </div>
                    <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '6px', border: '1px solid #bfdbfe', textAlign: 'center' }}>
                      <b style={{ display: 'block', fontSize: '24px', color: '#1d4ed8' }}>{stats.active}</b>
                      <small style={{ color: '#1d4ed8', fontSize: '12px', fontWeight: 600 }}>Active Projects</small>
                    </div>
                    <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '6px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                      <b style={{ display: 'block', fontSize: '24px', color: '#15803d' }}>{stats.resolved}</b>
                      <small style={{ color: '#15803d', fontSize: '12px', fontWeight: 600 }}>Resolved Challenges</small>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ marginTop: '8px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {user.role !== 'admin' && user.role !== 'official' && (
                  <>
                    <button onClick={() => { setIsEditing(true); setMsg(null); }}>Edit Profile</button>
                    <button className="outline" onClick={() => alert('Change password flow will be implemented here.')}>Change Password</button>
                  </>
                )}
                <button className="outline" style={{ borderColor: '#ef4444', color: '#ef4444' }} onClick={() => { localStorage.removeItem('token'); location.hash = '#/login'; location.reload(); }}>Logout</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <label>
                Full Name <b>*</b>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  required 
                />
              </label>
              <div className="two">
                <label>
                  Email Address <b>*</b>
                  <input 
                    type="email" 
                    value={formData.email} 
                    onChange={e => setFormData({ ...formData, email: e.target.value })} 
                    required 
                  />
                </label>
                <label>
                  Mobile Number <span style={{color:'#777'}}>(Read Only)</span>
                  <input 
                    type="tel" 
                    value={user.phone} 
                    disabled 
                    style={{ background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed' }} 
                  />
                </label>
              </div>
              <div className="gov-note" style={{ fontSize: '13px' }}>
                ℹ️ For security reasons, your registered mobile number cannot be changed here. Contact the Helpdesk to request a phone number update.
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                <button type="button" className="outline" onClick={() => { setIsEditing(false); setFormData({ name: user.name, email: user.email }); }}>Cancel</button>
              </div>
            </form>
          )}

        </div>
      </main>
    </Shell>
  );
}
