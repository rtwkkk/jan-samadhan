import { useState } from 'react';

// ── Dummy Data ──
const OFFICIAL_USER = { name: 'Rajesh Kumar', role: 'State Official' };

const KPIS = [
  { label: 'Total Challenges', value: '1,248' },
  { label: 'Pending Review', value: '34' },
  { label: 'High Priority', value: '12' },
  { label: 'Verified', value: '836' },
  { label: 'Assigned', value: '412' },
  { label: 'Active Projects', value: '156' },
  { label: 'Resolved', value: '98' }
];

const QUEUE = [
  { id: 'SICP-0204', title: 'Water Supply Disruption', domain: 'Water', district: 'Dumka', priority: 'High', evidence: 'Strong', aiScore: '91%', status: 'Pending Review', time: '2 hours ago' },
  { id: 'SICP-0205', title: 'Primary Healthcare Access', domain: 'Healthcare', district: 'Latehar', priority: 'High', evidence: 'Strong', aiScore: '94%', status: 'Info Received', time: 'Yesterday' },
  { id: 'SICP-0206', title: 'Crop Disease Detection', domain: 'Agriculture', district: 'Ranchi', priority: 'Medium', evidence: 'Good', aiScore: '86%', status: 'Pending Review', time: '2 days ago' }
];

const MATCHES = [
  { name: 'BIT Mesra', match: 94, distance: '42 km', depts: 'CSE, Civil', facilities: 3, similar: 5 },
  { name: 'NIT Jamshedpur', match: 88, distance: '130 km', depts: 'Water Resources', facilities: 2, similar: 3 },
  { name: 'Central University of Jharkhand', match: 81, distance: '28 km', depts: 'Environmental Science', facilities: 1, similar: 1 }
];

const ANALYTICS_DISTRICTS = [
  ['Ranchi','284','62','156','18'],
  ['Dhanbad','196','41','98','14'],
  ['Jamshedpur (East Singhbhum)','213','55','104','16'],
  ['Bokaro','142','30','76','10'],
  ['Hazaribagh','98','22','48','7'],
  ['Deoghar','87','19','41','6']
];

// ── Components ──
export function OfficialDashboard({ Shell, PageHead }) {
  const [view, setView] = useState('overview'); // overview, review, assign, confirm
  
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const NavItem = ({ label, active, onClick }) => (
    <div className={`off-nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <span>{label}</span>
    </div>
  );

  return (
    <Shell active="Dashboard">
      <div className="ud-header" style={{borderBottom:'none'}}>
        <div>
          <h1>{greeting}, {OFFICIAL_USER.name}</h1>
          <p>Review, validate and monitor societal challenges across Jharkhand.</p>
        </div>
        <aside>
          <span className="ud-notif-icon">🔔<i>4</i></span>
          <span className="ud-avatar">{OFFICIAL_USER.name[0]}</span>
          <span className="ud-role-badge">{OFFICIAL_USER.role}</span>
        </aside>
      </div>

      <div className="off-layout">
        {/* Sidebar */}
        <aside className="off-sidebar">
          <div className="off-nav-group">
            <NavItem label="Overview" active={view==='overview'} onClick={()=>setView('overview')}/>
          </div>
          <div className="off-nav-group-label">Challenges</div>
          <div className="off-nav-group">
            <NavItem label="Review Queue" active={view==='review' || view==='assign' || view==='confirm' || view==='queue'} onClick={()=>setView('overview')}/>
            <NavItem label="Verified" active={view==='verified'} onClick={()=>setView('verified')} />
            <NavItem label="Assigned" active={view==='assigned'} onClick={()=>setView('assigned')} />
            <NavItem label="All Challenges" active={view==='all'} onClick={()=>setView('all')} />
          </div>
          <div className="off-nav-group-label">Monitoring</div>
          <div className="off-nav-group">
            <NavItem label="Institutions" active={view==='institutions'} onClick={()=>setView('institutions')} />
            <NavItem label="Projects" active={view==='projects'} onClick={()=>setView('projects')} />
            <NavItem label="Industry Collaboration" active={view==='industry'} onClick={()=>setView('industry')} />
            <NavItem label="Analytics & Impact" active={view==='analytics'} onClick={()=>setView('analytics')} />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="off-main">
          
          {/* VIEW: OVERVIEW */}
          {view === 'overview' && (
            <div className="off-anim-in">
              <div className="off-kpi-grid">
                {KPIS.map(k => (
                  <div key={k.label} className="off-kpi-card">
                    <b>{k.value}</b><span>{k.label}</span>
                  </div>
                ))}
              </div>

              <section className="ud-section" style={{marginTop:'32px', borderColor:'#ffb000', borderLeftWidth:'4px'}}>
                <div className="ud-section-head" style={{paddingBottom:'8px'}}><h3 style={{color:'#ae7200'}}>Requires Your Attention</h3></div>
                <div className="off-urgent-list" style={{padding:'0 24px 24px'}}>
                  {QUEUE.filter(q => q.priority === 'High').map(q => (
                    <div key={q.id} className="off-urgent-item">
                      <div>
                        <span style={{background:'#fde7e5', color:'#c4241e', padding:'2px 8px', borderRadius:'3px', fontSize:'11px', fontWeight:600, display:'inline-block', marginBottom:'4px'}}>High Priority</span>
                        <h4 style={{margin:'0 0 4px', fontSize:'14px', color:'#111'}}>{q.title}</h4>
                        <span style={{fontSize:'12px', color:'#555'}}>{q.district} • {q.status} • {q.time}</span>
                      </div>
                      <button className="outline" onClick={()=>setView('review')}>Review →</button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="ud-section" style={{marginTop:'24px'}}>
                <div className="ud-section-head"><h3>Challenge Review Queue</h3></div>
                <div className="ud-table" style={{marginTop:'8px', borderTop:'none'}}>
                  <div className="ud-table-head" style={{gridTemplateColumns:'2fr 1.2fr 1fr .8fr .8fr 1fr 1fr'}}>
                    <span>Challenge</span><span>Domain</span><span>District</span><span>Priority</span><span>AI Score</span><span>Status</span><span>Action</span>
                  </div>
                  {QUEUE.map(q => (
                    <div key={q.id} className="ud-table-row" style={{gridTemplateColumns:'2fr 1.2fr 1fr .8fr .8fr 1fr 1fr'}}>
                      <span><b>{q.title}</b></span>
                      <span>{q.domain}</span>
                      <span>{q.district}</span>
                      <span style={{color: q.priority==='High'?'#c4241e':'#ae7200', fontWeight:600}}>{q.priority}</span>
                      <span>{q.aiScore} Match</span>
                      <span>{q.status}</span>
                      <span style={{color:'#064477', fontWeight:600, cursor:'pointer'}} onClick={()=>setView('review')}>Review →</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* VIEW: REVIEW DETAIL */}
          {view === 'review' && (
            <div className="off-anim-in">
              <PageHead crumb="Dashboard  /  Review Queue" title="Review Challenge: Water Supply Disruption" subtitle="ID: SICP-0204 • Submitted 2 hours ago" actions={<button className="outline" onClick={()=>setView('overview')}>← Back to Queue</button>}/>
              
              <div className="form-layout" style={{minHeight:'auto', padding:'24px 0 0'}}>
                <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
                  <div style={{background:'#fff', border:'1px solid #d2d7d3', borderRadius:'4px', padding:'24px'}}>
                    <h3 style={{margin:'0 0 16px', color:'#064477', fontSize:'16px', paddingBottom:'12px', borderBottom:'1px solid #eee'}}>Challenge Information</h3>
                    <div style={{display:'grid', gap:'20px'}}>
                      <div><small style={{display:'block', color:'#747a76', fontSize:'11px', fontWeight:600, textTransform:'uppercase'}}>Detailed Description</small><p style={{margin:'4px 0 0', fontSize:'14px', lineHeight:1.5, color:'#333'}}>The main water supply line to our village has been damaged for 3 weeks. Over 200 households rely on a single handpump which is now failing due to overuse. Immediate intervention required.</p></div>
                      <div className="two">
                        <div><small style={{display:'block', color:'#747a76', fontSize:'11px', fontWeight:600, textTransform:'uppercase'}}>Location</small><b style={{marginTop:'4px', fontSize:'13px', display:'block', fontWeight:500}}>Dumka, Jama Block, Village ABC</b></div>
                        <div><small style={{display:'block', color:'#747a76', fontSize:'11px', fontWeight:600, textTransform:'uppercase'}}>People Affected</small><b style={{marginTop:'4px', fontSize:'13px', display:'block', fontWeight:500}}>800+</b></div>
                      </div>
                      <div><small style={{display:'block', color:'#747a76', fontSize:'11px', fontWeight:600, textTransform:'uppercase'}}>Evidence Provided</small><span style={{color:'#064477', fontWeight:500, fontSize:'13px', display:'block', marginTop:'4px', cursor:'pointer'}}>📎 broken_pipe_site1.jpg, 📎 community_letter.pdf</span></div>
                    </div>
                  </div>

                  <div className="off-ai-box">
                    <h3 style={{margin:'0 0 16px', color:'#08743f', fontSize:'15px', display:'flex', alignItems:'center', gap:'8px'}}>✨ Automated AI Assessment</h3>
                    <div className="two" style={{gap:'16px'}}>
                      <div><span style={{display:'block', fontSize:'11px', color:'#666'}}>Domain</span><b style={{fontSize:'13px', color:'#111'}}>Water Management</b></div>
                      <div><span style={{display:'block', fontSize:'11px', color:'#666'}}>Priority</span><b style={{fontSize:'13px', color:'#c4241e'}}>High</b></div>
                      <div><span style={{display:'block', fontSize:'11px', color:'#666'}}>Duplicate Probability</span><b style={{fontSize:'13px', color:'#111'}}>8% (Unique)</b></div>
                      <div><span style={{display:'block', fontSize:'11px', color:'#666'}}>Evidence Quality</span><b style={{fontSize:'13px', color:'#111'}}>Strong</b></div>
                      <div><span style={{display:'block', fontSize:'11px', color:'#666'}}>Completeness</span><b style={{fontSize:'13px', color:'#111'}}>92%</b></div>
                      <div><span style={{display:'block', fontSize:'11px', color:'#666'}}>Recommended Action</span><b style={{fontSize:'13px', color:'#08743f'}}>Proceed to Verification</b></div>
                    </div>
                    <p style={{margin:'16px 0 0', fontSize:'11px', color:'#666', fontStyle:'italic', borderTop:'1px solid #d5e5db', paddingTop:'12px'}}>Note: AI assessment is advisory. Final validation is performed by the authorized official.</p>
                  </div>
                </div>

                <aside className="help" style={{gap:'20px'}}>
                  <div style={{borderColor:'#d2d7d3', background:'#fff', padding:'20px'}}>
                    <h3 style={{margin:'0 0 16px', color:'#111', fontSize:'15px', borderBottom:'1px solid #eee', paddingBottom:'12px'}}>Verification Checklist</h3>
                    <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                      {['Problem description is clear','Location is valid','Supporting evidence is sufficient','Problem falls within platform scope','No duplicate challenge identified','Community impact is credible'].map(c => (
                        <label key={c} style={{display:'flex', gap:'8px', alignItems:'flex-start', cursor:'pointer'}}>
                          <input type="checkbox" style={{marginTop:'3px'}}/> <span style={{fontSize:'13px', lineHeight:1.4, color:'#333'}}>{c}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                    <button style={{width:'100%'}} onClick={()=>setView('assign')}>Approve & Assign →</button>
                    <button className="outline" style={{width:'100%', borderColor:'#064477', color:'#064477'}}>Request More Information</button>
                    <button className="outline" style={{width:'100%', borderColor:'#c4241e', color:'#c4241e'}}>Reject Challenge</button>
                  </div>
                </aside>
              </div>
            </div>
          )}

          {/* VIEW: ASSIGN TO UNIVERSITY */}
          {view === 'assign' && (
            <div className="off-anim-in">
              <PageHead crumb="Dashboard  /  Review Queue  /  SICP-0204" title="University Matching" subtitle="Select the best institution to develop a solution for SICP-0204" actions={<button className="outline" onClick={()=>setView('review')}>← Back to Review</button>}/>
              
              <div style={{display:'flex', flexDirection:'column', gap:'16px', marginTop:'24px', maxWidth:'800px'}}>
                <h3 style={{margin:0, color:'#064477', fontSize:'16px'}}>Recommended Institutions</h3>
                <p style={{margin:'0 0 8px', color:'#555', fontSize:'13px'}}>AI match considers research domain, faculty expertise, lab facilities, and geographic proximity.</p>
                
                {MATCHES.map((m, i) => (
                  <div key={m.name} className="off-match-card">
                    <div className="off-match-header">
                      <div>
                        <h4 style={{margin:'0 0 4px', fontSize:'16px', color:'#111'}}>{m.name}</h4>
                        <span style={{fontSize:'13px', color:'#555'}}>Distance: {m.distance}</span>
                      </div>
                      <div className="off-match-score">
                        <b>{m.match}%</b>
                        <span>Match</span>
                      </div>
                    </div>
                    <div className="off-match-details">
                      <div><small>Relevant Departments</small><b>{m.depts}</b></div>
                      <div><small>Relevant Facilities</small><b>{m.facilities} Labs</b></div>
                      <div><small>Similar Projects</small><b>{m.similar} Completed</b></div>
                    </div>
                    <div style={{display:'flex', justifyContent:'flex-end', marginTop:'16px', borderTop:'1px solid #eee', paddingTop:'16px'}}>
                      <button onClick={()=>setView('confirm')}>Select Institution →</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: CONFIRMATION */}
          {view === 'confirm' && (
            <div className="off-anim-in" style={{display:'flex', flexDirection:'column', alignItems:'center', paddingTop:'60px'}}>
              <div style={{width:'64px', height:'64px', borderRadius:'50%', background:'#e8f4ed', color:'#08743f', fontSize:'32px', display:'grid', placeItems:'center', marginBottom:'24px'}}>✓</div>
              <h2 style={{margin:'0 0 12px', color:'#064e3b', fontSize:'24px'}}>Challenge Assigned Successfully</h2>
              <p style={{margin:'0 0 32px', color:'#555', fontSize:'14px', textAlign:'center', maxWidth:'400px'}}>Village Water Supply Issue (SICP-0204) has been verified and assigned to <b>BIT Mesra</b> for solution development.</p>
              
              <div style={{background:'#fff', border:'1px solid #d2d7d3', borderRadius:'4px', padding:'24px', width:'100%', maxWidth:'500px', marginBottom:'32px'}}>
                <div style={{display:'flex', justifyContent:'space-between', paddingBottom:'12px', borderBottom:'1px solid #eee', marginBottom:'12px'}}>
                  <span style={{color:'#777', fontSize:'13px'}}>Priority</span><b style={{color:'#c4241e', fontSize:'13px'}}>High</b>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', paddingBottom:'12px', borderBottom:'1px solid #eee', marginBottom:'12px'}}>
                  <span style={{color:'#777', fontSize:'13px'}}>Domain</span><b style={{fontSize:'13px'}}>Water Management</b>
                </div>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <span style={{color:'#777', fontSize:'13px'}}>Notifications Sent To</span><b style={{fontSize:'13px'}}>Nodal Officer, Citizen</b>
                </div>
              </div>

              <button onClick={()=>setView('overview')}>Return to Queue</button>
            </div>
          )}

          {/* DUMMY VIEWS FOR OTHER NAV ITEMS */}
          {['verified', 'assigned', 'all', 'institutions', 'projects', 'industry'].includes(view) && (
            <div className="off-anim-in">
              <PageHead title={view.charAt(0).toUpperCase() + view.slice(1).replace('-', ' ')} subtitle={`Manage and monitor ${view} across the state.`} />
              
              <div style={{background:'#fff', border:'1px solid #d2d7d3', borderRadius:'4px', padding:'32px', textAlign:'center', marginTop:'24px'}}>
                <h3 style={{margin:'0 0 12px', color:'#064477', fontSize:'18px'}}>Data Coming Soon</h3>
                <p style={{color:'#666', fontSize:'14px', margin:0}}>This section will be fully functional once the backend is connected. Currently, you can view the Review Queue and Assignment workflow.</p>
              </div>

              <section className="ud-section" style={{marginTop:'24px'}}>
                <div className="ud-section-head"><h3>Placeholder Data</h3></div>
                <div className="ud-table" style={{marginTop:'8px', borderTop:'none'}}>
                  <div className="ud-table-head" style={{gridTemplateColumns:'1fr 1fr 1fr'}}>
                    <span>Item</span><span>Category</span><span>Status</span>
                  </div>
                  {[1,2,3,4].map(i => (
                    <div key={i} className="ud-table-row" style={{gridTemplateColumns:'1fr 1fr 1fr'}}>
                      <span><b>Dummy Record {i}</b></span>
                      <span>Category {i}</span>
                      <span style={{color:'#08743f', fontWeight:600}}>Active</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* VIEW: ANALYTICS & IMPACT */}
          {view === 'analytics' && (
            <div className="off-anim-in">
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'24px'}}>
                <div>
                  <h2 style={{margin:'0 0 4px', fontSize:'20px', color:'#064477'}}>Government Analytics Dashboard</h2>
                  <p style={{margin:0, color:'#666', fontSize:'13px'}}>Statewide performance overview — Higher Education Department, Jharkhand</p>
                </div>
                <div style={{display:'flex', gap:'12px'}}>
                  <select style={{height:'36px', padding:'0 16px', border:'1px solid #064477', borderRadius:'4px', background:'#fff', color:'#064477', fontWeight:600}}><option>District: All Districts</option></select>
                  <button className="outline">Export PDF</button>
                  <button className="outline">Export Excel</button>
                </div>
              </div>
              <section className="metrics">
                {[['1,284','Total Challenges','▲ +8.2% vs last quarter'],['347','Solutions Deployed','▲ +12.4% vs last quarter'],['96','Institutions Onboarded','▲ +3 vs last quarter'],['61%','Avg. Resolution Rate','▼ -1.1% vs last quarter'],['18 days','Avg. AI Routing Time','▲ -2 days vs last quarter']].map(x=><div key={x[1]}><b>{x[0]}</b><span>{x[1]}</span><small>{x[2]}</small></div>)}
              </section>
              <div className="chart-row">
                <section className="line-chart">
                  <h3>Monthly Challenge Submissions (2026)</h3>
                  <div className="line"><i/><i/><i/><i/><i/><i/></div>
                  <div className="months">Jan Feb Mar Apr May Jun Jul Aug</div>
                  <div className="month-values">62 78 91 84 110 132 145 168</div>
                </section>
                <section className="donut">
                  <h3>Status Distribution</h3>
                  <div>
                    <i/>
                    <aside><span>■ &nbsp;Completed (27%)</span><span>■ &nbsp;In Progress (34%)</span><span>■ &nbsp;Team Formed (21%)</span><span>■ &nbsp;Pending Review (18%)</span></aside>
                  </div>
                </section>
              </div>
              <section className="district" style={{marginTop:'32px', background:'#fff', padding:'24px', borderRadius:'4px', border:'1px solid #d2d7d3'}}>
                <h3 style={{marginTop:0, marginBottom:'16px', color:'#111', fontSize:'18px'}}>District-wise Challenge Volume</h3>
                <div className="records">
                  <div className="record-row head" style={{gridTemplateColumns:'1.5fr 1fr 1fr 1fr 1fr'}}>
                    <b style={{color:'#64748b'}}>District</b><b style={{color:'#64748b'}}>Submitted</b><b style={{color:'#64748b'}}>In Progress</b><b style={{color:'#64748b'}}>Completed</b><b style={{color:'#64748b'}}>Institutions Active</b>
                  </div>
                  {ANALYTICS_DISTRICTS.map((r,i)=>(
                    <div className="record-row" key={i} style={{gridTemplateColumns:'1.5fr 1fr 1fr 1fr 1fr'}}>
                      {r.map((x,j)=><span key={j} style={j===0?{fontWeight:600, color:'#111'}:{}}>{x}</span>)}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

        </main>
      </div>
    </Shell>
  );
}
