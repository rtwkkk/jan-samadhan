import { createRoot } from 'react-dom/client';
import { useState, useEffect } from 'react';
import './style.css';
import './pages.css';
import { UserDashboard, ProjectDetails } from './user.jsx';
import { OfficialDashboard } from './official.jsx';

// Dummy credentials
const DEMO_CREDS = { email: 'shubham@jharkhand.gov.in', password: 'demo1234' };

const CATEGORIES = ['Education','Agriculture','Healthcare','Water Resources','Environment','Urban Development','Accessibility','Rural Livelihoods'];
const STEPS = ['Submit','AI Categorization','Institution Routing','Team Formation','Industry Collaboration','Deployment'];
const STORIES = [
  ['[Image: Water ATM installation, Simdega]','SIMDEGA','Smart Water ATM Deployed in Simdega','A low-cost IoT-enabled water dispensing unit now serves over 2,000 residents with clean drinking water access.'],
  ['[Image: Farmer using mobile crop advisory app, Gumla]','GUMLA','AI Crop Advisory Pilot Launched in Gumla','Machine-learning based crop advisory helped 400+ farmers optimize sowing schedules and reduce pesticide use.'],
  ['[Image: Digital literacy kiosk in use, Ranchi]','RANCHI','Digital Literacy Kiosk Opens in Ranchi','A self-service kiosk trained over 1,200 citizens in basic digital skills and government e-service access.']
];
const GALLERY = ['[Image: District workshop, Ranchi]','[Image: Site visit, Deoghar]','[Image: Institutional review meeting, Dhanbad]','[Image: Student project demo, BIT Mesra]','[Image: Field survey, Gumla]','[Image: Community consultation, Khunti]','[Image: Industry mentorship session, Jamshedpur]','[Image: Solution deployment, Simdega]'];

function Seal({label, src}) { return <div className={`seal ${label.toLowerCase()}`}><img src={src || "/assets/figma-asset-1.svg"} alt={label} /></div> }
function Header({active='Home',loggedIn,onLogout}) { return <>
  <div className="utility"><span>Skip to Content</span><span>Screen Reader Access</span><span>Sitemap</span><i></i><span className="tiny">A-</span><span>A</span><span className="large">A+</span><span>High Contrast</span><b>हिंदी | English</b></div>
  <header><Seal label="SEAL" src="https://upload.wikimedia.org/wikipedia/commons/a/a9/Jharkhand_Rajakiya_Chihna.svg"/><div className="wordmark"><strong>झारखण्ड सरकार</strong><span>Government of Jharkhand</span><b>Higher Education Department — Societal Innovation Collaboration Portal</b></div><div className="header-space"/><Seal label="NAT" src="https://www.digitalindia.gov.in/wp-content/themes/di-child/assets/images/digital-india.svg"/>{loggedIn ? <div className="hdr-user"><button className="outline" onClick={()=>{onLogout&&onLogout();location.hash='#/'}}>Logout</button></div> : <button onClick={() => location.hash = '#/login'}>Login / Register</button>}</header>
  {!loggedIn && <nav className="modern-nav"><div className="nav-container">{['Home','Submit a Challenge','Browse Challenges','For Institutions','For Industry','Dashboard','About','Contact'].map(x=>{const href = x==='Home'?'#/': x==='Dashboard'&&loggedIn?'#/my-dashboard':`#/${x.toLowerCase().replaceAll(' ','-')}`; return <a className={active===x?'selected':''} key={x} href={href}><span>{x}</span></a>})}</div></nav>}
 </> }
function Placeholder({children,className=''}) { return <div className={'placeholder '+className}>{children}</div> }

const HERO_SLIDES = [
  {
    image: "/jharkhand_artisans.jpg",
    subtitle: "GOVERNMENT OF JHARKHAND INITIATIVE",
    hindi: "सशक्त झारखंड, समृद्ध झारखंड",
    title: "Empowering Every Village Voice"
  },
  {
    image: "/jharkhand_agriculture.jpg",
    subtitle: "RURAL LIVELIHOODS & AGRICULTURE",
    hindi: "कृषि विकास, राज्य का विकास",
    title: "Innovating for Farmers"
  },
  {
    image: "/jharkhand_digital_education.jpg",
    subtitle: "DIGITAL LITERACY & EDUCATION",
    hindi: "शिक्षा से सशक्तिकरण",
    title: "Bridging the Digital Divide"
  }
];
function Hero() { 
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(c => (c + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);
  const slide = HERO_SLIDES[current];
  return <><section className="hero">
    {HERO_SLIDES.map((s, i) => (
      <img key={i} src={s.image} className={`hero-bg ${i === current ? 'active' : ''}`} alt="Hero background" />
    ))}
    <div className="scrim"/>
    <button className="arrow left" onClick={() => setCurrent(c => (c - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}>‹</button>
    <button className="arrow right" onClick={() => setCurrent(c => (c + 1) % HERO_SLIDES.length)}>›</button>
    <div className="hero-caption">
      <small>{slide.subtitle}</small>
      <span>{slide.hindi}</span>
      <h1>{slide.title}</h1>
      <button>Submit a Challenge</button>
    </div>
    <div className="dots">
      {HERO_SLIDES.map((_, i) => (
         <i key={i} className={i === current ? 'active' : ''} onClick={() => setCurrent(i)}/>
      ))}
    </div>
  </section>
  <div className="ticker"><b>LATEST UPDATES</b><span>Applications open for Institution Nodal Officer registration till 15 Sept 2026&nbsp;&nbsp; • &nbsp;&nbsp;New thematic category “Disaster Resilience” added&nbsp;&nbsp; • &nbsp;&nbsp;District-level review meeting scheduled for Ranchi division on 5 Sept 2026</span></div></> 
}
function SectionTitle({children,sub}) { return <div className="section-title"><h2>{children}</h2>{sub&&<p>{sub}</p>}</div> }
function Stats() { return <section className="stats">{[['1,284','Challenges Submitted'],['96','Institutions Onboarded'],['212','Industry Partners'],['347','Solutions Deployed']].map(x=><div className="stat" key={x[0]}><b>{x[0]}</b><span>{x[1]}</span></div>)}</section> }
function MapSection(){let rows=[['Ranchi','284','18'],['Jamshedpur (East Singhbhum)','213','16'],['Dhanbad','196','14'],['Bokaro','142','10'],['Hazaribagh','98','7']]; return <section className="map-section"><SectionTitle sub="Challenge submissions and institutional participation across 24 districts">Jharkhand at a Glance</SectionTitle><div className="map-layout"><div><div className="map-box"><div className="hexes">{Array.from({length:24},(_,i)=><i key={i}/>)}</div></div><small>[Map: Jharkhand districts — placeholder geometry, to be replaced with GeoJSON district outline]</small></div><div className="table-side"><div className="legend">Participation: <span><i/>Low</span><span><i/>Moderate</span><span><i/>High</span><span><i/>Very High</span></div><div className="data-table"><b>District</b><b>Challenges</b><b>Institutions</b>{rows.flatMap(r=>r.map((c,i)=><span key={r[0]+i}>{c}</span>))}</div></div></div></section>}
function Footer(){let cols=[['About','About the Portal','Mission & Vision','Higher Education Dept.','Contact Us'],['Related Links','jharkhand.gov.in','MyGov.in','Digital India','National Informatics Centre (NIC)'],['Policies','Terms & Conditions','Privacy Policy','Accessibility Statement','Copyright Policy'],['Grievance & Support','Grievance Redressal','RTI','Helpdesk: 1800-XXX-XXXX','Directorate of Higher Education, Ranchi, Jharkhand']];return <footer><div className="footer-top">{cols.map((c,i)=><div key={c[0]}><b>{c[0]}</b>{c.slice(1).map(x=><span key={x}>{x}</span>)}{i===3&&<aside><i>𝕏</i><i>f</i><i>▶</i></aside>}</div>)}</div><div className="availability"><b>Also Available On:</b><span>[Badge: Google Play]</span><span>[Badge: App Store]</span></div><div className="footer-bottom"><span>© Government of Jharkhand. Content Owned by Higher Education Department. Last Updated: 27 August 2026.</span><span>Visitors: 4,82,193 &nbsp;|&nbsp; Best viewed in 1920x1080 resolution</span></div></footer>}
const rows=[['SICP-0142','Rainwater Harvesting Systems for Rural Schools','Water Resources','Ranchi','In Progress','Dr. A. Verma'],['SICP-0139','Low-Cost Soil Health Monitoring Kit','Agriculture','Dhanbad','Team Formed','Prof. S. Kumar'],['SICP-0136','Mobile Health Camps Scheduling Platform','Healthcare','Jamshedpur','Pending Review','—'],['SICP-0131','Digital Literacy for Tribal Communities','Education','Khunti','Completed','Dr. R. Oraon'],['SICP-0128','Urban Flood Early Warning System','Urban Development','Ranchi','In Progress','Prof. N. Singh'],['SICP-0124','Solar Micro-Grid for Remote Villages','Environment','Gumla','Team Formed','Dr. P. Mahato']];
function Shell({active,children,loggedIn,onLogout}){return <div className="page"><Header active={active} loggedIn={loggedIn} onLogout={onLogout}/>{children}<Footer/><FloatingCallAgent/></div>}
function PageHead({crumb,title,subtitle,actions}){return <div className="page-head"><div>{crumb&&<small>{crumb}</small>}<h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div>{actions&&<aside>{actions}</aside>}</div>}
function SubmitPage(){return <Shell active="Submit a Challenge"><PageHead crumb="Home  /  Submit a Challenge" title="Submit a Societal Challenge"/><main className="form-layout"><form><label>Challenge Title <b>*</b><input/><small>Provide a concise title (max 120 characters)</small></label><label>Detailed Description <b>*</b><textarea/><small>Describe the problem, its impact, and affected community</small></label><div className="two"><label>Category & Department <div className="ai-detected">✨ AI will auto-detect from description</div></label><label>Urgency/Severity <div className="ai-detected">✨ AI will auto-verify after analysis</div></label></div><div className="two"><label>District / Location <b>*</b><select><option value="">Select district</option>{['Bokaro','Chatra','Deoghar','Dhanbad','Dumka','East Singhbhum','Garhwa','Giridih','Godda','Gumla','Hazaribagh','Jamtara','Khunti','Koderma','Latehar','Lohardaga','Pakur','Palamu','Ramgarh','Ranchi','Sahibganj','Seraikela Kharsawan','Simdega','West Singhbhum'].map(d=><option key={d} value={d}>{d}</option>)}</select></label><label>Village/City/Block <b>*</b><input/></label></div><div className="two"><label>GPS/Current Location <button type="button" className="outline location-btn" style={{height:'40px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', width:'max-content', padding:'0 20px', cursor:'pointer'}}>📍 Auto Detect Location</button></label><label>People Affected (Approx) <b>*</b><input type="number" placeholder="e.g. 500"/></label></div><label>Supporting Documents (optional)<div className="upload-box"><input type="file" accept="image/*,video/*,.pdf,.doc,.docx" /><label><i>📁</i><span>Click to upload or drag files here</span><small>(JPG, PNG, MP4, PDF, DOC — max 10MB)</small></label></div></label><div className="three"><label>Full Name <b>*</b><input/></label><label>Mobile Number <b>*</b><input/></label><label>Email Address<input/></label></div><label className="checkbox-label" style={{flexDirection:'row', alignItems:'center', gap:'10px', fontSize:'13px'}}><input type="checkbox" required style={{height:'auto', width:'auto'}}/> I consent to share my contact details and location for the purpose of resolving this challenge.</label><button>Submit for Review</button></form><aside className="help"><div><h3>Before You Submit</h3><p>• Your challenge will be reviewed and categorized using AI-assisted classification within 3 working days.</p><p>• Verified challenges are routed to relevant Higher Education Institutions for solution development.</p><p>• You will receive a reference number and SMS/email updates on the status of your submission.</p><p>• All fields marked with * are mandatory.</p></div><div><h3>Need Help?</h3><p>Contact the Helpdesk: 1800-XXX-XXXX (Toll Free)<br/>Or write to sicp-help@jharkhand.gov.in</p></div></aside></main></Shell>}
function InstitutionPage(){return <Shell active="For Institutions"><PageHead title="Institution Dashboard" subtitle="Birla Institute of Technology, Mesra — Assigned Challenges Overview" actions={<button className="outline">Export Report</button>}/><main className="institution"><aside className="filters"><h3>Filters</h3>{['Status','Category','Priority'].map((g,i)=><div key={g}><b>{g}</b>{(i===0?['Pending Review','Team Formed','In Progress','Completed']:i===1?['Education','Agriculture','Healthcare','Water Resources','Environment']:['High','Medium','Low']).map(x=><label key={x}><input type="checkbox"/> {x}</label>)}</div>)}<button>Apply Filters</button></aside><div><section className="bar-chart"><h3>Category-wise Assignment Distribution</h3><div>{[['18','Education'],['12','Agriculture'],['9','Healthcare'],['7','Water Res.'],['14','Environment'],['5','Urban Dev.']].map((x,i)=><span key={x[1]}><i style={{height:`${+x[0]*6.8}px`}}/><b>{x[0]}</b><small>{x[1]}</small></span>)}</div></section><Table rows={rows}/></div></main></Shell>}
function Table({rows:data,analytics=false}){let headers=analytics?['District','Submitted','In Progress','Completed','Institutions Active']:['ID','Challenge Title','Category','District','Status','Team Lead'];return <div className="records"><div className="record-row head">{headers.map(x=><b key={x}>{x}</b>)}</div>{data.map((r,i)=><div className="record-row" key={i}>{r.map((x,j)=><span key={j} className={j===4&&!analytics?'status':''}>{x}</span>)}</div>)}</div>}
function DashboardPage(){let districts=[['Ranchi','284','62','156','18'],['Dhanbad','196','41','98','14'],['Jamshedpur (East Singhbhum)','213','55','104','16'],['Bokaro','142','30','76','10'],['Hazaribagh','98','22','48','7'],['Deoghar','87','19','41','6']];return <Shell active="Dashboard"><PageHead title="Government Analytics Dashboard" subtitle="Statewide performance overview — Higher Education Department, Jharkhand" actions={<><select><option>District: All Districts</option></select><button className="outline">Export PDF</button><button className="outline">Export Excel</button></>}/><main className="analytics"><section className="metrics">{[['1,284','Total Challenges','▲ +8.2% vs last quarter'],['347','Solutions Deployed','▲ +12.4% vs last quarter'],['96','Institutions Onboarded','▲ +3 vs last quarter'],['61%','Avg. Resolution Rate','▼ -1.1% vs last quarter'],['18 days','Avg. AI Routing Time','▲ -2 days vs last quarter']].map(x=><div key={x[1]}><b>{x[0]}</b><span>{x[1]}</span><small>{x[2]}</small></div>)}</section><div className="chart-row"><section className="line-chart"><h3>Monthly Challenge Submissions (2026)</h3><div className="line"><i/><i/><i/><i/><i/><i/></div><div className="months">Jan Feb Mar Apr May Jun Jul Aug</div><div className="month-values">62 78 91 84 110 132 145 168</div></section><section className="donut"><h3>Status Distribution</h3><div><i/><aside><span>■ &nbsp;Completed (27%)</span><span>■ &nbsp;In Progress (34%)</span><span>■ &nbsp;Team Formed (21%)</span><span>■ &nbsp;Pending Review (18%)</span></aside></div></section></div><section className="district"><h3>District-wise Challenge Volume</h3><Table rows={districts} analytics/></section></main></Shell>}
function IndustryPage(){let cards=[['SICP-0142','Water Resources','High Priority','Rainwater Harvesting Systems for Rural Schools','BIT Mesra  •  Ranchi District','Seeking industry partners for low-cost filtration hardware and IoT-based tank monitoring to scale a pilot across 40 government schools.','Seeking: Hardware Sponsorship, Technical Mentorship'],['SICP-0136','Healthcare','Medium Priority','Mobile Health Camps Scheduling Platform','XLRI Jamshedpur  •  Jamshedpur District','Requires cloud infrastructure support and API integration expertise to connect with district health databases.','Seeking: Cloud Credits, API Integration Support'],['SICP-0128','Urban Development','High Priority','Urban Flood Early Warning System','NIT Jamshedpur  •  Ranchi District','Looking for sensor hardware manufacturers and data science mentors to refine the flood prediction model.','Seeking: Sensor Hardware, Data Science Mentorship'],['SICP-0124','Environment','Medium Priority','Solar Micro-Grid for Remote Villages','Central University of Jharkhand  •  Gumla District','Seeking solar equipment vendors and funding support to expand the micro-grid pilot to 12 additional villages.','Seeking: Equipment Funding, Field Deployment Support']];return <Shell active="For Industry"><PageHead crumb="Home  /  For Industry" title="Industry Collaboration Opportunities" subtitle="Challenges seeking industry mentorship, funding, or technical partnership"/><main className="industry"><div className="search"><input placeholder="Search challenges by keyword, category, or district..."/><select><option>Category: All</option></select><select><option>District: All</option></select><select><option>Sort: Newest First</option></select></div><p>Showing 6 of 84 challenges seeking industry collaboration</p>{cards.map((c,i)=><article className={'opportunity '+(c[2][0]==='H'?'high':'medium')} key={c[0]}><div><small>{c[0]} &nbsp; <b>{c[1]}</b> &nbsp; <em>{c[2]}</em></small><h2>{c[3]}</h2><span>{c[4]}</span><p>{c[5]}</p><strong>{c[6]}</strong></div><aside><button>Express Interest</button><a>View Details →</a></aside></article>)}</main></Shell>}
function HomePage(){
  const [activeStep, setActiveStep] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep(prev => (prev + 1) % 5);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const steps = [
    { title: "Report a Problem", desc: "Citizens share real challenges with location and supporting information." },
    { title: "AI-Powered Analysis", desc: "Platform categorizes, prioritizes and identifies similar challenges." },
    { title: "University Collaboration", desc: "Universities bring together students and faculty to develop solutions." },
    { title: "Industry Partnership", desc: "Companies contribute technology, mentorship and funding." },
    { title: "Impact on Ground", desc: "Solutions are tested and deployed to create meaningful outcomes." }
  ];

  return (
    <div className="page">
      <Header/>
      <Hero/>
      <Stats/>
      <section className="message">
        <div className="portrait">PHOTO</div>
        <div>
          <em>“A Vision for a Digitally Empowered Jharkhand — connecting every citizen’s problem to the state’s brightest minds.”</em>
          <span>— Secretary, Higher Education Department, Government of Jharkhand</span>
        </div>
      </section>

      <section className="why-section" style={{backgroundImage: "url('/images/why-bg.jpg')"}}>
        <div className="why-overlay"></div>
        <div className="why-content">
          <div className="why-marker">A STRUCTURED APPROACH TO COMMUNITY INNOVATION</div>
          
          <SectionTitle>
            <small style={{display:'block', fontSize:'12px', color:'#08743f', letterSpacing:'1px', marginBottom:'8px', textTransform:'uppercase'}}>Why This Platform</small>
            <span style={{fontFamily:"'Noto Sans Devanagari', sans-serif", fontSize:'28px', color:'#111', display:'block', marginBottom:'12px'}}>समस्याओं को सिर्फ दर्ज नहीं, समाधान तक पहुँचाना है।</span>
            <span style={{fontSize:'14px', color:'#333', fontWeight:'normal', display:'block', maxWidth:'700px', margin:'0 auto'}}>Connecting grassroots challenges with institutional expertise to drive measurable, on-the-ground solutions across Jharkhand.</span>
          </SectionTitle>

          <div className="why-context">
            <h4>From a local challenge to a collaborative solution</h4>
            <p>A citizen identifies the problem. <br/> Government validates it. <br/> Universities bring expertise. <br/> Industry helps turn ideas into implementation.</p>
          </div>

          <div className="why-grid">
            <div className="why-card">
              <div className="why-icon">01</div>
              <div className="why-label">IDENTIFY</div>
              <h3>Real Problems</h3>
              <span className="why-hindi">समस्या वहीं से जहाँ वह वास्तव में मौजूद है।</span>
              <p>Challenges are submitted directly by citizens and communities with location, evidence and context.</p>
            </div>
            
            <div className="why-card">
              <div className="why-icon">02</div>
              <div className="why-label">CONNECT</div>
              <h3>Right Expertise</h3>
              <span className="why-hindi">सही समस्या, सही संस्थान और सही विशेषज्ञों तक।</span>
              <p>Validated challenges are connected with universities, researchers, students and industry partners whose expertise matches the problem.</p>
            </div>
            
            <div className="why-card">
              <div className="why-icon">03</div>
              <div className="why-label">IMPLEMENT</div>
              <h3>Real Impact</h3>
              <span className="why-hindi">विचार से समाधान तक, और समाधान से बदलाव तक।</span>
              <p>Projects move from research and development to testing, implementation and measurable community impact.</p>
            </div>
          </div>
          
          <div className="why-connector">
            <div className="why-line"></div>
            <div className="why-steps">
              <span>Problem Identified</span>
              <span>Expertise Connected</span>
              <span>Solution Implemented</span>
            </div>
          </div>

          <div className="why-bottom">
            <h3 style={{fontFamily:"'Noto Sans Devanagari', sans-serif", fontSize:'22px', color:'#111', margin:'0 0 8px'}}>एक समस्या, कई हाथ — एक समाधान।</h3>
            <p style={{margin:0, fontSize:'14px', color:'#333'}}>Citizens, government, universities and industry working together to create solutions that reach the ground.</p>
          </div>
        </div>
      </section>
      
      <section className="journey-section">
        <SectionTitle sub="Turning challenges identified by communities into innovative solutions through government, academia and industry collaboration.">
          <small style={{display:'block', fontSize:'12px', color:'#08743f', letterSpacing:'1px', marginBottom:'8px'}}>HOW IT WORKS</small>
          From Community Problems to Real Solutions
        </SectionTitle>
        
        <div className="journey-tracker">
          <div className="journey-progress-bg"></div>
          <div className="journey-progress-fill" style={{ width: `${(activeStep / (steps.length - 1)) * 100}%` }}></div>
          
          <div className="journey-nodes">
            {steps.map((step, idx) => {
              const isActive = idx === activeStep;
              const isPast = idx < activeStep;
              return (
                <div key={idx} className={`journey-node ${isActive ? 'active' : ''} ${isPast ? 'past' : ''}`}>
                  <div className="j-icon">{idx + 1}</div>
                  <div className="j-content">
                    <h4>{step.title}</h4>
                    <p>{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="participate-section" style={{backgroundImage: "url('/images/hemant-soren-bg.jpg')"}}>
        <div className="p-overlay"></div>
        <div className="p-content">
          <SectionTitle>
            <small style={{display:'block', fontSize:'12px', color:'#08743f', letterSpacing:'1px', marginBottom:'8px', textTransform:'uppercase'}}>Who Can Participate</small>
            <span style={{fontFamily:"'Noto Sans Devanagari', sans-serif", fontSize:'28px', color:'#111', display:'block', marginBottom:'12px'}}>मिलकर बदलेंगे झारखंड</span>
            <span style={{fontSize:'14px', color:'#555', fontWeight:'normal', display:'block', maxWidth:'700px', margin:'0 auto'}}>हर समस्या के समाधान में सबकी भूमिका है।</span>
          </SectionTitle>

          <div className="p-ecosystem">
            <div className="p-node p-citizen">
              <i className="p-icon">👥</i>
              <b>CITIZENS</b>
              <span className="p-hindi">समस्या बताएं</span>
              <p>Report local challenges.</p>
            </div>
            
            <i className="p-moving-arrow down-arrow1">↓</i>
            
            <div className="p-node p-gov">
              <i className="p-icon">🏛️</i>
              <b>GOVERNMENT</b>
              <span className="p-hindi">दिशा दें</span>
              <p>Validate and coordinate.</p>
            </div>
            
            <i className="p-moving-arrow down-arrow2">↓</i>
            
            <div className="p-row">
              <div className="p-node p-uni">
                <i className="p-icon">🏫</i>
                <b>UNIVERSITIES</b>
                <span className="p-hindi">समाधान विकसित करें</span>
                <p>Research, innovate and build.</p>
              </div>
              
              <div className="p-node p-ind">
                <i className="p-icon">🏢</i>
                <b>INDUSTRY</b>
                <span className="p-hindi">साथ मिलकर लागू करें</span>
                <p>Support, mentor and deploy.</p>
              </div>
            </div>
            
            <div className="p-moving-arrow-group">
              <i className="p-moving-arrow inward-arrow1">↘</i>
              <i className="p-moving-arrow inward-arrow2">↙</i>
            </div>
            
            <div className="p-node p-solution">
              <i className="p-icon" style={{background:'#08743f', color:'#fff', borderColor:'#08743f'}}>✓</i>
              <b style={{color:'#08743f'}}>SOLUTION</b>
              <span className="p-hindi" style={{color:'#111'}}>समाधान</span>
            </div>
          </div>
        </div>
      </section>

      <Footer/>
      <FloatingCallAgent/>
    </div>
  );
}
function FloatingCallAgent() {
  const [open, setOpen] = useState(false);
  return (
    <div className="floating-agent">
      {open && (
        <div className="agent-popup">
          <div className="agent-header">
            <b>जागृति (Jagriti) - AI Agent</b>
            <button onClick={() => setOpen(false)}>×</button>
          </div>
          <div className="agent-body">
            <p>हमारा AI एजेंट आपको कॉल करेगा। कृपया अपना नंबर दर्ज करें।<br/>(Get a call from us)</p>
            <input type="tel" placeholder="10-digit Mobile Number" />
            <button>कॉल मी (Call Me)</button>
          </div>
        </div>
      )}
      <button className="agent-fab" onClick={() => setOpen(!open)}>
        <i>📞</i><span>सहायता</span>
      </button>
    </div>
  )
}

// ── Login ──
function LoginPage({onLogin}){
  const [email,setEmail] = useState('');
  const [pw,setPw] = useState('');
  const [err,setErr] = useState('');
  const handleLogin = (e) => { 
    e.preventDefault(); 
    if(email===DEMO_CREDS.email && pw===DEMO_CREDS.password){ 
      onLogin({email}); 
    } else if (email==='official@jharkhand.gov.in' && pw==='demo1234') {
      onLogin({email});
    } else { 
      setErr('Invalid credentials. Citizen demo: shubham@jharkhand.gov.in / Official demo: official@jharkhand.gov.in (pw: demo1234)'); 
    } 
  };
  return <Shell><PageHead crumb="Home  /  Login" title="Login to the Portal" subtitle="Access your account on the Societal Innovation Collaboration Portal"/><main className="form-layout"><form onSubmit={handleLogin}>
    <label>Email Address / Mobile Number <b>*</b><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter registered email or 10-digit mobile number"/><small>Demo: shubham@jharkhand.gov.in</small></label>
    <label>Password <b>*</b><input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Enter your password"/><small>Demo: demo1234</small></label>
    {err && <div className="gov-note warn" style={{fontSize:'12px'}}>⚠️ {err}</div>}
    <div className="two">
      <label style={{flexDirection:'row',alignItems:'center',gap:'8px'}}><input type="checkbox" style={{height:'auto',width:'auto'}}/> Remember me on this device</label>
      <label style={{textAlign:'right'}}><a href="#" style={{color:'#064477',fontSize:'13px'}}>Forgot Password?</a></label>
    </div>
    <button>Sign In</button>
    <div className="auth-toggle">Don't have an account? <a href="#/register">Register here</a></div>
  </form><aside className="help">
    <div><h3>Portal Access</h3>
      <p>• This portal is operated by the Higher Education Department, Government of Jharkhand.</p>
      <p>• Citizens, State Officials, Universities / HEIs, and Industry Partners can register and participate.</p>
      <p>• For any login issues, contact the Helpdesk.</p>
    </div>
    <div><h3>Helpdesk</h3>
      <p>Toll Free: 1800-XXX-XXXX<br/>Email: sicp-help@jharkhand.gov.in<br/>Working Hours: Mon–Sat, 9:00 AM – 6:00 PM</p>
    </div>
  </aside></main></Shell>
}

// ── Register ──
const DISTRICTS = ['Bokaro','Chatra','Deoghar','Dhanbad','Dumka','East Singhbhum','Garhwa','Giridih','Godda','Gumla','Hazaribagh','Jamtara','Khunti','Koderma','Latehar','Lohardaga','Pakur','Palamu','Ramgarh','Ranchi','Sahibganj','Seraikela Kharsawan','Simdega','West Singhbhum'];
const DEPARTMENTS = ['Higher Education','Health & Family Welfare','Agriculture & Farmers Welfare','Rural Development','Water Resources','Urban Development & Housing','Industries','Mines & Geology','Energy','Labour Employment & Training','Social Welfare','Tribal Welfare','Forest & Environment','Revenue & Land Reforms','Transport','Information Technology','Science & Technology','Food & Civil Supplies','Home','Finance','Planning & Development','Women & Child Development','Drinking Water & Sanitation','Panchayati Raj'];
const COLLAB_CHIPS = ['Funding','Technical Mentorship','Product Development','Hardware','Software / Technology','Manufacturing','Testing','Field Deployment','Infrastructure','CSR Funding','Market / Distribution','Research Collaboration','Technology Transfer'];

function RegisterPage(){
  const [role,setRole] = useState('');
  const [step,setStep] = useState(1);
  const [chips,setChips] = useState([]);
  const toggleChip = c => setChips(prev => prev.includes(c) ? prev.filter(x=>x!==c) : [...prev,c]);

  // Calculate total steps per role
  const totalSteps = role==='institution'?4 : role==='industry'?4 : 1;

  return <Shell><PageHead crumb="Home  /  Register" title="New User Registration" subtitle="Societal Innovation Collaboration Portal — Government of Jharkhand"/><main className="form-layout"><form>

    {/* ── Role Selection (always visible) ── */}
    <label>Register As <b>*</b>
      <select value={role} onChange={e=>{setRole(e.target.value);setStep(1)}}>
        <option value="">— Select your role —</option>
        <option value="citizen">Citizen</option>
        <option value="official">State Official / Government Officer</option>
        <option value="institution">University / Higher Education Institution (HEI)</option>
        <option value="industry">Industry / Organization</option>
      </select>
      <small>Select the category that best describes your participation</small>
    </label>

    {/* ── Step indicator for multi-step forms ── */}
    {totalSteps > 1 && <div className="step-bar">{Array.from({length:totalSteps},(_,i)=><i key={i} className={step>=i+1?'done':''}/> )}</div>}

    {/* ══════ CITIZEN ══════ */}
    {role==='citizen' && <>
      <div className="section-divider">Personal Information</div>
      <label>Full Name <b>*</b><input/></label>
      <div className="two">
        <label>Mobile Number <b>*</b><input type="tel" placeholder="10-digit mobile number"/></label>
        <label>Email Address<input type="email"/></label>
      </div>
      <div className="two">
        <label>Password <b>*</b><input type="password"/></label>
        <label>Confirm Password <b>*</b><input type="password"/></label>
      </div>
      <div className="section-divider">Location</div>
      <div className="two">
        <label>District <b>*</b><select><option value="">Select district</option>{DISTRICTS.map(d=><option key={d}>{d}</option>)}</select></label>
        <label>Block / Municipality<input/></label>
      </div>
      <label>Village / Ward<input/></label>
      <div className="section-divider">Preferences</div>
      <label>Preferred Language<select><option>English</option><option>हिन्दी (Hindi)</option></select></label>
      <div className="gov-note">ℹ️ Your mobile number will be verified via OTP before account activation.</div>
      <button>Register</button>
    </>}

    {/* ══════ STATE OFFICIAL ══════ */}
    {role==='official' && <>
      <div className="section-divider">Official Details</div>
      <div className="two">
        <label>Full Name <b>*</b><input/></label>
        <label>Designation <b>*</b><input placeholder="e.g. District Magistrate, BDO"/></label>
      </div>
      <label>Department <b>*</b><select><option value="">Select Department</option>{DEPARTMENTS.map(d=><option key={d}>{d}</option>)}</select></label>
      <div className="two">
        <label>Official Government Email <b>*</b><input type="email" placeholder="name@jharkhand.gov.in"/></label>
        <label>Official Mobile Number <b>*</b><input type="tel"/></label>
      </div>
      <div className="two">
        <label>Password <b>*</b><input type="password"/></label>
        <label>Confirm Password <b>*</b><input type="password"/></label>
      </div>
      <div className="gov-note warn">⚠️ Official accounts require verification by the Department before access is granted. You will be notified via email once approved.</div>
      <button>Submit for Verification</button>
    </>}

    {/* ══════ INSTITUTION — Step 1 ══════ */}
    {role==='institution' && step===1 && <>
      <div className="section-divider">Institution Details</div>
      <label>Institution Name <b>*</b><input/></label>
      <div className="two">
        <label>Institution Type <b>*</b><select><option value="">Select type</option><option>University</option><option>Engineering College</option><option>Medical College</option><option>Agricultural University / College</option><option>Polytechnic</option><option>Research Institute</option><option>Other Higher Education Institution</option></select></label>
        <label>AISHE Code <b>*</b><input placeholder="e.g. C-12345"/></label>
      </div>
      <div className="two">
        <label>District <b>*</b><select><option value="">Select district</option>{DISTRICTS.map(d=><option key={d}>{d}</option>)}</select></label>
        <label>Official Email Domain <b>*</b><input placeholder="e.g. bitmesra.ac.in"/></label>
      </div>
      <label>Full Address <b>*</b><textarea/></label>
      <label>Official Website<input type="url" placeholder="https://"/></label>
      <button type="button" onClick={()=>setStep(2)}>Next Step →</button>
    </>}

    {/* ══════ INSTITUTION — Step 2 ══════ */}
    {role==='institution' && step===2 && <>
      <div className="section-divider">Institutional Capabilities</div>
      <label>Departments <b>*</b><input placeholder="e.g. Computer Science, Mechanical Engineering"/><small>Separate multiple entries with commas</small></label>
      <label>Research Domains <b>*</b><input placeholder="e.g. AI/ML, Renewable Energy, Biotech"/></label>
      <label>Faculty Expertise <b>*</b><input/></label>
      <div className="two">
        <label>Laboratories / Facilities<input/></label>
        <label>Innovation / Incubation Centre<input/></label>
      </div>
      <label>Previous Relevant Projects<textarea style={{height:'64px'}}/></label>
      <label>Industry Collaborations<textarea style={{height:'64px'}}/></label>
      <label>Available Technical Skills<input/></label>
      <div className="two">
        <button type="button" className="outline" style={{background:'#fff',color:'#064477'}} onClick={()=>setStep(1)}>← Previous</button>
        <button type="button" onClick={()=>setStep(3)}>Next Step →</button>
      </div>
    </>}

    {/* ══════ INSTITUTION — Step 3 ══════ */}
    {role==='institution' && step===3 && <>
      <div className="section-divider">Nodal Officer Details</div>
      <div className="two">
        <label>Nodal Officer Name <b>*</b><input/></label>
        <label>Designation <b>*</b><input/></label>
      </div>
      <div className="two">
        <label>Official Email <b>*</b><input type="email"/></label>
        <label>Official Mobile Number <b>*</b><input type="tel"/></label>
      </div>
      <div className="two">
        <button type="button" className="outline" style={{background:'#fff',color:'#064477'}} onClick={()=>setStep(2)}>← Previous</button>
        <button type="button" onClick={()=>setStep(4)}>Next Step →</button>
      </div>
    </>}

    {/* ══════ INSTITUTION — Step 4 ══════ */}
    {role==='institution' && step===4 && <>
      <div className="section-divider">Account Credentials</div>
      <div className="two">
        <label>Password <b>*</b><input type="password"/></label>
        <label>Confirm Password <b>*</b><input type="password"/></label>
      </div>
      <div className="gov-note warn">⚠️ Institution profiles are subject to verification by the Higher Education Department before activation.</div>
      <div className="two">
        <button type="button" className="outline" style={{background:'#fff',color:'#064477'}} onClick={()=>setStep(3)}>← Previous</button>
        <button>Submit for Verification</button>
      </div>
    </>}

    {/* ══════ INDUSTRY — Step 1 ══════ */}
    {role==='industry' && step===1 && <>
      <div className="section-divider">Organization Details</div>
      <div className="two">
        <label>Legal Entity Name <b>*</b><input/></label>
        <label>Brand / Trade Name<input/></label>
      </div>
      <div className="two">
        <label>Organization Type <b>*</b><select><option value="">Select type</option><option>Private Limited Company</option><option>Public Limited Company</option><option>LLP</option><option>Partnership Firm</option><option>Proprietorship</option><option>Section 8 Company</option><option>NGO / Non-Profit</option><option>MSME</option><option>Public Sector Enterprise</option><option>Research & Technology Organization</option><option>CSR Foundation / Corporate Foundation</option><option>Other</option></select></label>
        <label>Industry Sector <b>*</b><input/></label>
      </div>
      <div className="two">
        <label>Primary Business Area <b>*</b><input/></label>
        <label>Year Established<input type="number" placeholder="e.g. 2005"/></label>
      </div>
      <div className="two">
        <label>Headquarters<input/></label>
        <label>Website<input type="url" placeholder="https://"/></label>
      </div>
      <div className="two">
        <label>District<select><option value="">Select district</option>{DISTRICTS.map(d=><option key={d}>{d}</option>)}</select></label>
        <label>State<input defaultValue="Jharkhand"/></label>
      </div>
      <button type="button" onClick={()=>setStep(2)}>Next Step →</button>
    </>}

    {/* ══════ INDUSTRY — Step 2 ══════ */}
    {role==='industry' && step===2 && <>
      <div className="section-divider">Registration Information</div>
      <small style={{color:'#747a76',fontSize:'11px',marginTop:'-10px'}}>Fill applicable fields only. Not all identifiers are required.</small>
      <div className="two">
        <label>CIN<input/></label>
        <label>LLPIN<input/></label>
      </div>
      <div className="two">
        <label>GSTIN<input/></label>
        <label>Udyam Registration Number<input/></label>
      </div>
      <label>PAN<input/></label>
      <div className="two">
        <button type="button" className="outline" style={{background:'#fff',color:'#064477'}} onClick={()=>setStep(1)}>← Previous</button>
        <button type="button" onClick={()=>setStep(3)}>Next Step →</button>
      </div>
    </>}

    {/* ══════ INDUSTRY — Step 3 ══════ */}
    {role==='industry' && step===3 && <>
      <div className="section-divider">Collaboration Capabilities</div>
      <label>How can your organization contribute?</label>
      <div className="chips-wrap">{COLLAB_CHIPS.map(c=><span key={c} className={'chip'+(chips.includes(c)?' on':'')} onClick={()=>toggleChip(c)}>{c}</span>)}</div>
      <div className="section-divider">Expertise</div>
      <label>Technology / Expertise Areas <b>*</b><input/></label>
      <label>Relevant Projects<textarea style={{height:'64px'}}/></label>
      <div className="two">
        <label>R&D Capability<input/></label>
        <label>Geographical Areas of Operation<input/></label>
      </div>
      <div className="two">
        <button type="button" className="outline" style={{background:'#fff',color:'#064477'}} onClick={()=>setStep(2)}>← Previous</button>
        <button type="button" onClick={()=>setStep(4)}>Next Step →</button>
      </div>
    </>}

    {/* ══════ INDUSTRY — Step 4 ══════ */}
    {role==='industry' && step===4 && <>
      <div className="section-divider">Authorized Representative</div>
      <div className="two">
        <label>Full Name <b>*</b><input/></label>
        <label>Designation <b>*</b><input/></label>
      </div>
      <div className="two">
        <label>Official Email <b>*</b><input type="email"/></label>
        <label>Official Mobile Number <b>*</b><input type="tel"/></label>
      </div>
      <div className="section-divider">Account Credentials</div>
      <div className="two">
        <label>Password <b>*</b><input type="password"/></label>
        <label>Confirm Password <b>*</b><input type="password"/></label>
      </div>
      <div className="gov-note warn">⚠️ Organization verification is required before participation. You will be notified via email once approved.</div>
      <div className="two">
        <button type="button" className="outline" style={{background:'#fff',color:'#064477'}} onClick={()=>setStep(3)}>← Previous</button>
        <button>Submit for Verification</button>
      </div>
    </>}

    {!role && <div className="gov-note">ℹ️ Please select your role above to view the registration form.</div>}

    <div className="auth-toggle">Already have an account? <a href="#/login">Login here</a></div>
  </form><aside className="help">
    <div><h3>Registration Guidelines</h3>
      <p>• All fields marked with <b style={{color:'#cf2721'}}>*</b> are mandatory.</p>
      <p>• Citizen accounts are activated immediately after mobile OTP verification.</p>
      <p>• State Official, University/HEI, and Industry/Organization accounts require verification by the concerned authority.</p>
      <p>• You will receive SMS and email notifications on your registration status.</p>
    </div>
    <div><h3>Helpdesk</h3>
      <p>Toll Free: 1800-XXX-XXXX<br/>Email: sicp-help@jharkhand.gov.in<br/>Working Hours: Mon–Sat, 9:00 AM – 6:00 PM</p>
    </div>
  </aside></main></Shell>
}

function App(){
  const [path, setPath] = useState(location.hash.slice(1));
  const [loggedIn, setLoggedIn] = useState(false);
  const doLogout = () => { setLoggedIn(false); location.hash='#/'; };
  useEffect(() => {
    const handleHashChange = () => setPath(location.hash.slice(1));
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Wrap Shell with auth props for logged-in pages
  const AuthShell = (props) => <Shell {...props} loggedIn={loggedIn} onLogout={doLogout}/>;

  if(path === '/my-dashboard' && loggedIn) return <UserDashboard Shell={AuthShell} PageHead={PageHead}/>;
  if(path === '/official-dashboard' && loggedIn) return <OfficialDashboard Shell={AuthShell} PageHead={PageHead}/>;
  if(path.startsWith('/project/') && loggedIn) return <ProjectDetails Shell={AuthShell} PageHead={PageHead}/>;
  if(path === '/login' && !loggedIn) return <LoginPage onLogin={(creds)=>{
    const role = creds?.email === 'official@jharkhand.gov.in' ? 'official' : 'citizen';
    setLoggedIn(role);
    location.hash = role === 'official' ? '#/official-dashboard' : '#/my-dashboard';
  }}/>;
  if(path === '/login' && loggedIn) { location.hash = loggedIn === 'official' ? '#/official-dashboard' : '#/my-dashboard'; return null; }
  if(path === '/register') return <RegisterPage/>;

  let Page = HomePage;
  if(path === '/submit-a-challenge') Page = SubmitPage;
  if(path === '/for-institutions') Page = InstitutionPage;
  if(path === '/dashboard') Page = loggedIn ? () => <UserDashboard Shell={AuthShell} PageHead={PageHead}/> : DashboardPage;
  if(path === '/for-industry') Page = IndustryPage;
  return <Page/>
}
createRoot(document.getElementById('root')).render(<App/>);
