import { useState } from 'react';

// ── Dummy data (will be replaced by API later) ──
const DUMMY_USER = { id: 'USR-0042', name: 'Shubham', role: 'Citizen', organization: null, email: 'shubham@example.com' };

const DUMMY_STATS = [
  { label: 'My Challenges', value: '12', trend: '▲ +2 this month' },
  { label: 'In Progress', value: '5', trend: '▲ +1 this week' },
  { label: 'Completed', value: '4', trend: '▲ +1 this month' },
  { label: 'Collaborations', value: '3', trend: '' },
];

const DUMMY_CHALLENGES = [
  { id: 'SICP-0201', title: 'Village Water Supply Issue', domain: 'Water Resources', location: 'Dumka', status: 'Under Review', updated: '2h ago' },
  { id: 'SICP-0198', title: 'Crop Disease Detection System', domain: 'Agriculture', location: 'Ranchi', status: 'University Assigned', updated: 'Yesterday' },
  { id: 'SICP-0195', title: 'Street Lighting Problem', domain: 'Infrastructure', location: 'Deoghar', status: 'In Progress', updated: '3d ago' },
  { id: 'SICP-0189', title: 'School Drinking Water Quality', domain: 'Water Resources', location: 'Gumla', status: 'Completed', updated: '1w ago' },
  { id: 'SICP-0183', title: 'Waste Collection Scheduling', domain: 'Urban Development', location: 'Ranchi', status: 'Submitted', updated: '2w ago' },
];

const DUMMY_PROJECTS = [
  { title: 'Smart Irrigation System', university: 'BIT Mesra', partner: 'ABC Technologies', progress: 78, stage: 'Prototype Testing', next: 'Field Pilot', due: '18 Sep 2026' },
  { title: 'Water Quality Monitoring', university: 'NIT Jamshedpur', partner: 'AquaSense Pvt. Ltd.', progress: 45, stage: 'Development', next: 'Internal Testing', due: '30 Oct 2026' },
];

const DUMMY_NOTIFICATIONS = [
  { msg: 'University accepted your challenge "Crop Disease Detection"', time: '10 min ago', unread: true },
  { msg: 'New milestone submitted for Smart Irrigation System', time: '2 hours ago', unread: true },
  { msg: 'Challenge "Village Water Supply" verified by department', time: '5 hours ago', unread: false },
  { msg: 'Additional information requested for Waste Collection', time: 'Yesterday', unread: false },
  { msg: 'Industry partner ABC Technologies joined Smart Irrigation project', time: '2 days ago', unread: false },
];

const DUMMY_ACTIVITY = [
  { icon: '✓', label: 'Challenge verified', detail: 'Water Supply Issue', time: '10 min ago' },
  { icon: '🏛', label: 'University accepted challenge', detail: 'BIT Mesra', time: '2 hours ago' },
  { icon: '👤', label: 'Faculty mentor assigned', detail: 'Smart Irrigation Project', time: 'Yesterday' },
  { icon: '🏢', label: 'Industry partner joined', detail: 'ABC Technologies', time: '2 days ago' },
  { icon: '📋', label: 'Challenge submitted', detail: 'School Drinking Water Quality', time: '1 week ago' },
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
export function UserDashboard({ Shell, PageHead }) {
  const user = DUMMY_USER;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

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
          <h1>{greeting}, {user.name}</h1>
          <p>Here's what's happening with your challenges and collaborations.</p>
        </div>
        <aside>
          <span className="ud-notif-icon" title="Notifications">🔔<i>2</i></span>
          <span className="ud-avatar">{user.name[0]}</span>
          <span className="ud-role-badge">{user.role}</span>
        </aside>
      </div>

      <main className="ud-main">

        {/* ── Section 1: Stats ── */}
        <section className="ud-stats">
          {DUMMY_STATS.map(s => (
            <div key={s.label} className="ud-stat-card">
              <b>{s.value}</b>
              <span>{s.label}</span>
              {s.trend && <small>{s.trend}</small>}
            </div>
          ))}
        </section>

        {/* ── Section 2: CTA ── */}
        <section className="ud-cta">
          <div>
            <h3>Have a problem to solve?</h3>
            <p>Share a real societal challenge with the community. Your submission will be reviewed, categorized, and routed to the right institution.</p>
          </div>
          <a href="#/submit-a-challenge"><button>Submit a Challenge →</button></a>
        </section>

        {/* ── Section 3: Challenges Table ── */}
        <section className="ud-section">
          <div className="ud-section-head">
            <h3>My Challenges</h3>
            <a href="#">View all →</a>
          </div>
          <div className="ud-table">
            <div className="ud-table-head">
              <span>Challenge</span><span>Domain</span><span>Location</span><span>Status</span><span>Last Updated</span>
            </div>
            {DUMMY_CHALLENGES.map(c => (
              <div key={c.id} className="ud-table-row">
                <span><small style={{color:'#064477',fontWeight:600}}>{c.id}</small><br/>{c.title}</span>
                <span>{c.domain}</span>
                <span>{c.location}</span>
                <span><em style={{background: STATUS_COLORS[c.status]?.bg, color: STATUS_COLORS[c.status]?.color, padding:'4px 10px', borderRadius:'3px', fontStyle:'normal', fontSize:'11px', fontWeight:600, whiteSpace:'nowrap'}}>{c.status}</em></span>
                <span style={{color:'#777'}}>{c.updated}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Two-column: Projects + Notifications ── */}
        <div className="ud-grid-2">
          {/* ── Section 4: Active Projects ── */}
          <section className="ud-section">
            <div className="ud-section-head"><h3>Active Projects</h3></div>
            {DUMMY_PROJECTS.map(p => (
              <div key={p.title} className="ud-project-card">
                <h4>{p.title}</h4>
                <div className="ud-project-meta">
                  <span>University: <b>{p.university}</b></span>
                  <span>Industry: <b>{p.partner}</b></span>
                </div>
                <div className="ud-progress-row">
                  <div className="ud-progress-bar"><div style={{width: `${p.progress}%`}}/></div>
                  <b>{p.progress}%</b>
                </div>
                <div className="ud-project-meta">
                  <span>Stage: <b>{p.stage}</b></span>
                  <span>Next: <b>{p.next}</b></span>
                  <span>Due: <b>{p.due}</b></span>
                </div>
                <a href="#/project/smart-irrigation" className="ud-project-link">View Project →</a>
              </div>
            ))}
          </section>

          {/* ── Section 5: Notifications ── */}
          <section className="ud-section">
            <div className="ud-section-head"><h3>Notifications</h3></div>
            <div className="ud-notif-list">
              {DUMMY_NOTIFICATIONS.map((n, i) => (
                <div key={i} className={'ud-notif-item' + (n.unread ? ' unread' : '')}>
                  <span className="ud-notif-dot"/>
                  <div>
                    <span>{n.msg}</span>
                    <small>{n.time}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── Two-column: Activity + Impact ── */}
        <div className="ud-grid-2">
          {/* ── Section 6: Recent Activity ── */}
          <section className="ud-section">
            <div className="ud-section-head"><h3>Recent Activity</h3></div>
            <div className="ud-timeline">
              {DUMMY_ACTIVITY.map((a, i) => (
                <div key={i} className="ud-timeline-item">
                  <span className="ud-timeline-icon">{a.icon}</span>
                  <div>
                    <b>{a.label}</b>
                    <span>{a.detail}</span>
                    <small>{a.time}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>

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
    </Shell>
  );
}

// ── Project Details Component ──
export function ProjectDetails({ Shell, PageHead }) {
  // Dummy project full details matching submission form
  const project = {
    id: 'SICP-0198',
    title: 'Smart Irrigation System',
    description: 'Farmers in our village are facing severe water scarcity during the dry season. We need an automated way to measure soil moisture and release water only when necessary to save our crops and conserve water.',
    category: 'Agriculture',
    district: 'Ranchi',
    location: 'Ormanjhi Block, Village XYZ',
    severity: 'High - Crop Failure Risk',
    affected: '400+ Farmers',
    progress: 78,
    stage: 'Solution Development',
    university: 'BIT Mesra',
    partner: 'ABC Technologies',
    status: 'In Progress'
  };

  const TRACKING_STAGES = [
    { name: 'Submitted', desc: 'Challenge logged by citizen', time: '12 Aug 2026', by: 'Citizen' },
    { name: 'Under Review', desc: 'Initial AI & manual screening', time: '13 Aug 2026', by: 'Nodal Officer' },
    { name: 'Verified', desc: 'Challenge verified and approved', time: '14 Aug 2026', by: 'State Dept.' },
    { name: 'Assigned', desc: 'Routed to Higher Education Institution', time: '16 Aug 2026', by: 'BIT Mesra' },
    { name: 'Solution Development', desc: 'Sensors deployed in trial field', time: 'Current Phase', by: 'Team Formed' },
    { name: 'Pilot Testing', desc: 'Pending field testing phase', time: 'Upcoming', by: '-' },
    { name: 'Implemented', desc: 'Final solution deployment', time: 'Upcoming', by: '-' },
    { name: 'Resolved', desc: 'Impact verified and closed', time: 'Upcoming', by: '-' }
  ];
  
  const currentStageIndex = 4; // Solution Development

  return (
    <Shell active="Dashboard">
      <PageHead crumb="Dashboard  /  Active Projects  /  SICP-0198" title={project.title} subtitle={`Project ID: ${project.id} • Managed by ${project.university}`} actions={<button className="outline" onClick={()=>location.hash='#/my-dashboard'}>← Back to Dashboard</button>}/>
      <main className="form-layout" style={{minHeight:'auto'}}>
        <div style={{display:'flex', flexDirection:'column', gap:'24px'}}>
          <div style={{background:'#fff', border:'1px solid #d2d7d3', borderRadius:'4px', padding:'24px 32px 32px'}}>
            <h3 style={{marginTop:0, color:'#064e3b', fontSize:'16px'}}>Challenge Lifecycle Tracker</h3>
            
            <div className="tracker">
              <div className="tracker-progress" style={{width: `${(currentStageIndex / (TRACKING_STAGES.length - 1)) * 100}%`}}/>
              {TRACKING_STAGES.map((s, i) => {
                const isCompleted = i < currentStageIndex;
                const isCurrent = i === currentStageIndex;
                let statusClass = isCompleted ? 'completed' : isCurrent ? 'current' : '';
                return (
                  <div key={s.name} className={`track-node ${statusClass}`}>
                    <div className="track-icon">{isCompleted ? '✓' : ''}</div>
                    <div className="track-label">{isCurrent ? <><span style={{display:'block', color:'#064477'}}>Current Phase</span>{s.name}</> : s.name}</div>
                    <div className="track-popover">
                      <b>{s.name}</b>
                      <em>{s.time}</em>
                      <span>{s.desc}</span>
                      <span style={{marginTop:'6px', color:'#94a3b8'}}>Stakeholder: {s.by}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="ud-project-meta" style={{marginBottom:0, fontSize:'13px', marginTop:'24px', paddingTop:'16px', borderTop:'1px solid #eee'}}>
              <span>Current Stage: <b style={{color:'#08743f'}}>{project.stage}</b></span>
              <span>Industry Partner: <b>{project.partner}</b></span>
              <span>Status: <b style={{background:'#fef0cf', color:'#ae7200', padding:'2px 8px', borderRadius:'3px'}}>{project.status}</b></span>
            </div>
          </div>
          
          <div style={{background:'#fff', border:'1px solid #d2d7d3', borderRadius:'4px', padding:'28px'}}>
            <h3 style={{marginTop:0, color:'#064477', fontSize:'16px', borderBottom:'1px solid #eee', paddingBottom:'12px', marginBottom:'20px'}}>Original Challenge Details</h3>
            
            <div style={{display:'grid', gap:'20px'}}>
              <div>
                <small style={{color:'#747a76', fontSize:'11px', fontWeight:600, textTransform:'uppercase'}}>Detailed Description</small>
                <p style={{margin:'4px 0 0', fontSize:'14px', lineHeight:'1.5', color:'#333'}}>{project.description}</p>
              </div>
              
              <div className="two" style={{marginTop:'8px'}}>
                <div>
                  <small style={{color:'#747a76', fontSize:'11px', fontWeight:600, textTransform:'uppercase'}}>Category</small>
                  <div style={{marginTop:'4px', fontSize:'13px', fontWeight:500}}>{project.category}</div>
                </div>
                <div>
                  <small style={{color:'#747a76', fontSize:'11px', fontWeight:600, textTransform:'uppercase'}}>Urgency/Severity</small>
                  <div style={{marginTop:'4px', fontSize:'13px', fontWeight:500, color:'#c4241e'}}>{project.severity}</div>
                </div>
              </div>

              <div className="two" style={{marginTop:'8px'}}>
                <div>
                  <small style={{color:'#747a76', fontSize:'11px', fontWeight:600, textTransform:'uppercase'}}>District / Location</small>
                  <div style={{marginTop:'4px', fontSize:'13px', fontWeight:500}}>{project.district}</div>
                </div>
                <div>
                  <small style={{color:'#747a76', fontSize:'11px', fontWeight:600, textTransform:'uppercase'}}>Village/City/Block</small>
                  <div style={{marginTop:'4px', fontSize:'13px', fontWeight:500}}>{project.location}</div>
                </div>
              </div>

              <div className="two" style={{marginTop:'8px'}}>
                <div>
                  <small style={{color:'#747a76', fontSize:'11px', fontWeight:600, textTransform:'uppercase'}}>People Affected</small>
                  <div style={{marginTop:'4px', fontSize:'13px', fontWeight:500}}>{project.affected}</div>
                </div>
                <div>
                  <small style={{color:'#747a76', fontSize:'11px', fontWeight:600, textTransform:'uppercase'}}>Supporting Documents</small>
                  <div style={{marginTop:'4px', fontSize:'13px', color:'#064477', fontWeight:500, cursor:'pointer'}}>📎 View Attachments (2)</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="help">
          <div style={{borderColor:'#d2d7d3', background:'#fff'}}>
            <h3 style={{borderBottom:'1px solid #eee', paddingBottom:'12px', marginBottom:'16px'}}>Recent Activities</h3>
            <div className="ud-timeline">
              <div className="ud-timeline-item">
                <span className="ud-timeline-icon" style={{background:'#e8f4ed', color:'#08743f'}}>✓</span>
                <div>
                  <b style={{fontSize:'13px'}}>Prototype Testing Started</b>
                  <span style={{fontSize:'12px', color:'#555'}}>Sensors deployed in trial field.</span>
                  <small style={{fontSize:'11px', color:'#888'}}>2 days ago</small>
                </div>
              </div>
              <div className="ud-timeline-item">
                <span className="ud-timeline-icon">🏢</span>
                <div>
                  <b style={{fontSize:'13px'}}>ABC Technologies Joined</b>
                  <span style={{fontSize:'12px', color:'#555'}}>Industry partner onboarded for hardware.</span>
                  <small style={{fontSize:'11px', color:'#888'}}>1 week ago</small>
                </div>
              </div>
              <div className="ud-timeline-item">
                <span className="ud-timeline-icon">🏛</span>
                <div>
                  <b style={{fontSize:'13px'}}>BIT Mesra Accepted Challenge</b>
                  <span style={{fontSize:'12px', color:'#555'}}>Assigned to Prof. S. Kumar's lab.</span>
                  <small style={{fontSize:'11px', color:'#888'}}>3 weeks ago</small>
                </div>
              </div>
              <div className="ud-timeline-item">
                <span className="ud-timeline-icon" style={{background:'#e3f0e9', color:'#064477'}}>📋</span>
                <div>
                  <b style={{fontSize:'13px'}}>Challenge Submitted</b>
                  <span style={{fontSize:'12px', color:'#555'}}>Submitted by Citizen (Shubham).</span>
                  <small style={{fontSize:'11px', color:'#888'}}>1 month ago</small>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </Shell>
  );
}
