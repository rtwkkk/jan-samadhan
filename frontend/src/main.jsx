import { createRoot } from 'react-dom/client';
import { useState, useEffect } from 'react';
import './style.css';
import './pages.css';
import { UserDashboard, ProjectDetails, UserProfile } from './user.jsx';
import { OfficialDashboard } from './official.jsx';
import { IndustryDashboard } from './industry.jsx';
import { UniversityDashboard } from './university.jsx';

// Dummy credentials removed
const CATEGORIES = ['Education', 'Agriculture', 'Healthcare', 'Water Resources', 'Environment', 'Urban Development', 'Accessibility', 'Rural Livelihoods'];
const STEPS = ['Submit', 'AI Categorization', 'Institution Routing', 'Team Formation', 'Industry Collaboration', 'Deployment'];
const STORIES = [
  ['[Image: Water ATM installation, Simdega]', 'SIMDEGA', 'Smart Water ATM Deployed in Simdega', 'A low-cost IoT-enabled water dispensing unit now serves over 2,000 residents with clean drinking water access.'],
  ['[Image: Farmer using mobile crop advisory app, Gumla]', 'GUMLA', 'AI Crop Advisory Pilot Launched in Gumla', 'Machine-learning based crop advisory helped 400+ farmers optimize sowing schedules and reduce pesticide use.'],
  ['[Image: Digital literacy kiosk in use, Ranchi]', 'RANCHI', 'Digital Literacy Kiosk Opens in Ranchi', 'A self-service kiosk trained over 1,200 citizens in basic digital skills and government e-service access.']
];
const GALLERY = ['[Image: District workshop, Ranchi]', '[Image: Site visit, Deoghar]', '[Image: Institutional review meeting, Dhanbad]', '[Image: Student project demo, BIT Mesra]', '[Image: Field survey, Gumla]', '[Image: Community consultation, Khunti]', '[Image: Industry mentorship session, Jamshedpur]', '[Image: Solution deployment, Simdega]'];

function Seal({ label, src }) { return <div className={`seal ${label.toLowerCase()}`}><img src={src || "/assets/figma-asset-1.svg"} alt={label} /></div> }
function TrackingModal({ onClose }) {
  const [trackingId, setTrackingId] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatDateTime = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusTheme = (status) => {
    switch (status) {
      case 'resolved':
        return { bg: '#e8f5e9', color: '#1b5e20', border: '#a5d6a7', label: 'RESOLVED' };
      case 'rejected':
        return { bg: '#ffebee', color: '#b71c1c', border: '#ef9a9a', label: 'REJECTED' };
      case 'in_progress':
        return { bg: '#e3f2fd', color: '#0d47a1', border: '#90caf9', label: 'IN PROGRESS' };
      case 'assigned':
        return { bg: '#ede7f6', color: '#4a148c', border: '#b39ddb', label: 'ASSIGNED' };
      case 'information_requested':
        return { bg: '#fff8e1', color: '#f57f17', border: '#ffe082', label: 'INFO REQUESTED' };
      case 'under_review':
        return { bg: '#e0f2f1', color: '#004d40', border: '#80cbc4', label: 'UNDER REVIEW' };
      case 'verified':
        return { bg: '#e0f7fa', color: '#006064', border: '#80deea', label: 'VERIFIED' };
      default:
        return { bg: '#f1f8e9', color: '#33691e', border: '#c5e1a5', label: (status || 'SUBMITTED').replace('_', ' ').toUpperCase() };
    }
  };

  const handleTrack = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setData(null);
    const cleanId = trackingId.trim();
    if (!cleanId) return;

    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/public/track/${cleanId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Tracking ID not found');
      setData(json);
    } catch (err) {
      setError(err.message || 'Failed to retrieve complaint status. Please check the ID.');
    } finally {
      setLoading(false);
    }
  };

  const copyId = (id) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(3px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{
        backgroundColor: '#ffffff',
        padding: '30px 36px',
        borderRadius: '12px',
        maxWidth: '820px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
        boxShadow: '0 20px 45px rgba(0, 0, 0, 0.22)',
        border: '1px solid #e2e8f0',
        fontFamily: 'inherit'
      }}>
        <button
          onClick={onClose}
          aria-label="Close modal"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            fontSize: '20px',
            lineHeight: '36px',
            textAlign: 'center',
            cursor: 'pointer',
            color: '#475569',
            transition: 'background 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
          onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
        >×</button>

        {/* Modal Header */}
        <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '18px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: '#e6f4ea',
              color: '#08743f',
              fontWeight: 700,
              fontSize: '16px'
            }}>✓</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px', color: '#0f172a', fontWeight: 700 }}>
                Complaint Tracking Status
              </h2>
              <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                Jan Samadhan Public Grievance Tracking & Verification Portal
              </p>
            </div>
          </div>
        </div>

        {!data ? (
          <div>
            <form onSubmit={handleTrack} style={{ maxWidth: '560px', margin: '16px 0 24px 0' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px', color: '#334155' }}>
                Enter Complaint / Tracking ID
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={trackingId}
                  onChange={e => setTrackingId(e.target.value)}
                  placeholder="e.g. 6aa03ae27badd5d2d5e3f097"
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = '#08743f'}
                  onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#08743f',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    opacity: loading ? 0.75 : 1
                  }}
                >
                  {loading ? 'Tracking...' : 'Track Status'}
                </button>
              </div>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Please enter the 24-character reference ID issued at the time of complaint submission.
              </p>
              {error && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#b91c1c',
                  fontSize: '13.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}
            </form>
          </div>
        ) : (
          <div>
            {/* Top Toolbar: ID & Status Badge */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '16px 20px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Complaint ID:
                  </span>
                  <code style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '4px' }}>
                    {data._id}
                  </code>
                  <button
                    onClick={() => copyId(data._id)}
                    title="Copy ID"
                    style={{
                      background: 'none',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      color: '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <h3 style={{ margin: '4px 0', fontSize: '18px', color: '#0f172a', fontWeight: 700 }}>
                  {data.title}
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px', fontSize: '12px', color: '#475569' }}>
                  <span style={{ backgroundColor: '#ffffff', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                    📁 {data.category}
                  </span>
                  <span style={{ backgroundColor: '#ffffff', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                    📍 District: {data.district}
                  </span>
                  {data.urgencySeverity && (
                    <span style={{ backgroundColor: '#ffffff', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      ⚡ Priority: <b>{data.urgencySeverity}</b>
                    </span>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              <div style={{ textAlign: 'right' }}>
                {(() => {
                  const theme = getStatusTheme(data.currentStatus);
                  return (
                    <span style={{
                      display: 'inline-block',
                      padding: '6px 14px',
                      backgroundColor: theme.bg,
                      color: theme.color,
                      border: `1.5px solid ${theme.border}`,
                      borderRadius: '20px',
                      fontWeight: 700,
                      fontSize: '13px',
                      letterSpacing: '0.5px'
                    }}>
                      {theme.label}
                    </span>
                  );
                })()}
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                  Last Updated: {formatDateTime(data.lastUpdated)}
                </div>
              </div>
            </div>

            {/* Current Status Overview Card */}
            <div style={{
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '20px',
              backgroundColor: '#ffffff',
              marginBottom: '28px'
            }}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Current Status Summary
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Current Stage</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                    {data.currentStage}
                  </div>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Assigned Authority</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                    {data.assignedAuthority || 'Pending Assignment'}
                  </div>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Responsible Department</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                    {data.assignedDepartment || 'Water Resources'}
                  </div>
                </div>
              </div>

              {/* Latest Action & Next Step */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {data.latestAction && (
                  <div style={{
                    padding: '10px 14px',
                    backgroundColor: '#f0fdf4',
                    borderLeft: '4px solid #16a34a',
                    borderRadius: '4px',
                    fontSize: '13px',
                    color: '#15803d'
                  }}>
                    <b style={{ color: '#166534' }}>Latest Action / Remark:</b> {data.latestAction}
                  </div>
                )}
                {data.expectedNextStep && (
                  <div style={{
                    padding: '10px 14px',
                    backgroundColor: '#eff6ff',
                    borderLeft: '4px solid #2563eb',
                    borderRadius: '4px',
                    fontSize: '13px',
                    color: '#1d4ed8'
                  }}>
                    <b style={{ color: '#1e40af' }}>Expected Next Step:</b> {data.expectedNextStep}
                  </div>
                )}
              </div>
            </div>

            {/* Complete Journey Timeline */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 18px 0', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                Complaint Progress Journey
              </h4>

              <div style={{ position: 'relative', paddingLeft: '32px' }}>
                {data.timeline && data.timeline.map((stage, idx) => {
                  const isCompleted = stage.state === 'completed';
                  const isCurrent = stage.state === 'current';
                  const isRejected = stage.state === 'rejected';
                  const isPending = stage.state === 'pending';
                  const isLast = idx === data.timeline.length - 1;

                  let markerBg = '#94a3b8';
                  let markerColor = '#ffffff';
                  let markerIcon = '○';
                  let borderColor = '#e2e8f0';

                  if (isCompleted) {
                    markerBg = '#16a34a';
                    markerColor = '#ffffff';
                    markerIcon = '✓';
                    borderColor = '#16a34a';
                  } else if (isCurrent) {
                    markerBg = '#0284c7';
                    markerColor = '#ffffff';
                    markerIcon = '➔';
                    borderColor = '#0284c7';
                  } else if (isRejected) {
                    markerBg = '#dc2626';
                    markerColor = '#ffffff';
                    markerIcon = '✕';
                    borderColor = '#dc2626';
                  }

                  return (
                    <div key={idx} style={{ position: 'relative', paddingBottom: isLast ? '0' : '26px' }}>
                      {/* Vertical line */}
                      {!isLast && (
                        <div style={{
                          position: 'absolute',
                          left: '-20px',
                          top: '24px',
                          bottom: 0,
                          width: '2px',
                          backgroundColor: isCompleted ? '#86efac' : '#e2e8f0',
                          borderStyle: isPending ? 'dashed' : 'solid'
                        }} />
                      )}

                      {/* Timeline Node Marker */}
                      <div style={{
                        position: 'absolute',
                        left: '-32px',
                        top: '0',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: isPending ? '#ffffff' : markerBg,
                        color: isPending ? '#94a3b8' : markerColor,
                        border: `2px solid ${isPending ? '#cbd5e1' : markerBg}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: isCompleted ? '12px' : isCurrent ? '11px' : '10px',
                        fontWeight: 700,
                        boxShadow: isCurrent ? '0 0 0 4px rgba(2, 132, 199, 0.2)' : 'none'
                      }}>
                        {markerIcon}
                      </div>

                      {/* Stage Body */}
                      <div style={{
                        backgroundColor: isCurrent ? '#f8fafc' : 'transparent',
                        padding: isCurrent ? '12px 16px' : '0 4px',
                        borderRadius: '6px',
                        border: isCurrent ? '1px solid #e2e8f0' : 'none'
                      }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '14.5px',
                            fontWeight: isCurrent || isCompleted ? 700 : 500,
                            color: isPending ? '#64748b' : '#0f172a'
                          }}>
                            {stage.title}
                          </span>

                          {/* State Tag */}
                          {isCompleted && (
                            <span style={{ fontSize: '11px', padding: '1px 8px', borderRadius: '10px', backgroundColor: '#dcfce7', color: '#166534', fontWeight: 600 }}>
                              Completed
                            </span>
                          )}
                          {isCurrent && (
                            <span style={{ fontSize: '11px', padding: '1px 8px', borderRadius: '10px', backgroundColor: '#e0f2fe', color: '#075985', fontWeight: 600 }}>
                              Current Stage
                            </span>
                          )}
                          {isRejected && (
                            <span style={{ fontSize: '11px', padding: '1px 8px', borderRadius: '10px', backgroundColor: '#fee2e2', color: '#991b1b', fontWeight: 600 }}>
                              Rejected
                            </span>
                          )}
                          {isPending && (
                            <span style={{ fontSize: '11px', padding: '1px 8px', borderRadius: '10px', backgroundColor: '#f1f5f9', color: '#64748b', fontWeight: 500 }}>
                              Upcoming
                            </span>
                          )}

                          {stage.date && (
                            <span style={{ fontSize: '12px', color: '#64748b', marginLeft: 'auto' }}>
                              🗓 {formatDateTime(stage.date)}
                            </span>
                          )}
                        </div>

                        {/* Authority & Remark */}
                        <div style={{ marginTop: '4px', fontSize: '12.5px', color: '#475569' }}>
                          {stage.authority && (
                            <span style={{ color: '#334155', fontWeight: 500 }}>
                              Department / Authority: <b>{stage.authority}</b>
                            </span>
                          )}
                          {stage.remark && (
                            <p style={{ margin: '3px 0 0 0', color: isPending ? '#94a3b8' : '#334155' }}>
                              {stage.remark}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '20px',
              borderTop: '1px solid #f1f5f9'
            }}>
              <button
                onClick={() => { setData(null); setError(''); }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#ffffff',
                  color: '#08743f',
                  border: '1.5px solid #08743f',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  cursor: 'pointer'
                }}
              >
                ← Track Another Complaint
              </button>

              <button
                onClick={onClose}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#08743f',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  cursor: 'pointer'
                }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Header({ active = 'Home', loggedIn, onLogout }) {
  const [trackOpen, setTrackOpen] = useState(false);

  return <>
    {trackOpen && <TrackingModal onClose={() => setTrackOpen(false)} />}
    <div className="utility"><span>Skip to Content</span><span>Screen Reader Access</span><span>Sitemap</span><i></i><span className="tiny">A-</span><span>A</span><span className="large">A+</span><span>High Contrast</span><span onClick={() => setTrackOpen(true)} style={{ cursor: 'pointer', fontWeight: 600, color: '#ffeb3b', padding: '0 12px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>Track</span><b>हिंदी | English</b></div>
    <header><a href="#/" style={{ cursor: 'pointer', display: 'flex', textDecoration: 'none' }}><Seal label="SEAL" src="/assets/jharkhand_logo.webp" /></a><div className="wordmark"><strong>झारखण्ड सरकार</strong><span>Government of Jharkhand</span><b>Higher Education Department — Societal Innovation Collaboration Portal</b></div><div className="header-space" /><Seal label="NAT" src="https://www.digitalindia.gov.in/wp-content/themes/di-child/assets/images/digital-india.svg" />{loggedIn ? <div className="hdr-user"><button className="outline" onClick={() => { onLogout && onLogout(); location.hash = '#/' }}>Logout</button></div> : <button onClick={() => location.hash = '#/login'}>Login / Register</button>}</header>
    {!loggedIn && <nav className="modern-nav"><div className="nav-container">{['Home', 'Submit a Challenge', 'Browse Challenges', 'For Institutions', 'For Industry', 'Dashboard', 'About', 'Contact'].map(x => { const href = x === 'Home' ? '#/' : x === 'Dashboard' && loggedIn ? '#/my-dashboard' : `#/${x.toLowerCase().replaceAll(' ', '-')}`; return <a className={active === x ? 'selected' : ''} key={x} href={href}><span>{x}</span></a> })}</div></nav>}
  </>
}
function Placeholder({ children, className = '' }) { return <div className={'placeholder ' + className}>{children}</div> }

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
    <div className="scrim" />
    <button className="arrow left" onClick={() => setCurrent(c => (c - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}>‹</button>
    <button className="arrow right" onClick={() => setCurrent(c => (c + 1) % HERO_SLIDES.length)}>›</button>
    <div className="hero-caption">
      <small>{slide.subtitle}</small>
      <span>{slide.hindi}</span>
      <h1>{slide.title}</h1>
      <button onClick={() => location.hash = '#/login'}>Submit a Challenge</button>
    </div>
    <div className="dots">
      {HERO_SLIDES.map((_, i) => (
        <i key={i} className={i === current ? 'active' : ''} onClick={() => setCurrent(i)} />
      ))}
    </div>
  </section>
    <div className="ticker"><b>LATEST UPDATES</b><span>Applications open for Institution Nodal Officer registration till 15 Sept 2026&nbsp;&nbsp; • &nbsp;&nbsp;New thematic category “Disaster Resilience” added&nbsp;&nbsp; • &nbsp;&nbsp;District-level review meeting scheduled for Ranchi division on 5 Sept 2026</span></div></>
}
function SectionTitle({ children, sub }) { return <div className="section-title"><h2>{children}</h2>{sub && <p>{sub}</p>}</div> }
function Stats() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/public/stats`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error);
  }, []);

  const metrics = stats ? [
    [stats.challenges.toLocaleString(), 'Challenges Submitted'],
    [stats.institutions.toLocaleString(), 'Institutions Onboarded'],
    [stats.industries.toLocaleString(), 'Industry Partners'],
    [stats.resolved.toLocaleString(), 'Solutions Deployed']
  ] : [
    ['...', 'Challenges Submitted'],
    ['...', 'Institutions Onboarded'],
    ['...', 'Industry Partners'],
    ['...', 'Solutions Deployed']
  ];

  return <section className="stats">{metrics.map(x => <div className="stat" key={x[1]}><b>{x[0]}</b><span>{x[1]}</span></div>)}</section>;
}
function MapSection() { let rows = [['Ranchi', '284', '18'], ['Jamshedpur (East Singhbhum)', '213', '16'], ['Dhanbad', '196', '14'], ['Bokaro', '142', '10'], ['Hazaribagh', '98', '7']]; return <section className="map-section"><SectionTitle sub="Challenge submissions and institutional participation across 24 districts">Jharkhand at a Glance</SectionTitle><div className="map-layout"><div><div className="map-box"><div className="hexes">{Array.from({ length: 24 }, (_, i) => <i key={i} />)}</div></div><small>[Map: Jharkhand districts — placeholder geometry, to be replaced with GeoJSON district outline]</small></div><div className="table-side"><div className="legend">Participation: <span><i />Low</span><span><i />Moderate</span><span><i />High</span><span><i />Very High</span></div><div className="data-table"><b>District</b><b>Challenges</b><b>Institutions</b>{rows.flatMap(r => r.map((c, i) => <span key={r[0] + i}>{c}</span>))}</div></div></div></section> }
function Footer() {
  let cols = [['About', 'About the Portal', 'Mission & Vision', 'Higher Education Dept.', 'Contact Us'], ['Related Links', 'jharkhand.gov.in', 'MyGov.in', 'Digital India', 'National Informatics Centre (NIC)'], ['Policies', 'Terms & Conditions', 'Privacy Policy', 'Accessibility Statement', 'Copyright Policy'], ['Grievance & Support', 'Grievance Redressal', 'RTI', 'Helpdesk: 1800-XXX-XXXX', 'Directorate of Higher Education, Ranchi, Jharkhand']]; return <footer><div className="footer-top">{cols.map((c, i) => <div key={c[0]}><b>{c[0]}</b>{c.slice(1).map(x => {
    if (x === 'jharkhand.gov.in') return <a key={x} href="https://jharkhand.gov.in/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{x}</a>;
    if (x === 'MyGov.in') return <a key={x} href="https://www.mygov.in/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{x}</a>;
    if (x === 'Digital India') return <a key={x} href="https://www.digitalindia.gov.in/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{x}</a>;
    if (x === 'National Informatics Centre (NIC)') return <a key={x} href="https://xn--m1bet4hqd2b.xn--11b7cb3a6a.xn--h2brj9c/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{x}</a>;
    return <span key={x}>{x}</span>;
  })}{i === 3 && <aside><i>𝕏</i><i>f</i><i>▶</i></aside>}</div>)}</div><div className="availability"><b>Also Available On:</b><span>[Badge: Google Play]</span><span>[Badge: App Store]</span></div><div className="footer-bottom"><span>© Government of Jharkhand. Content Owned by Higher Education Department. Last Updated: 27 August 2026.</span><span>Visitors: 4,82,193 &nbsp;|&nbsp; Best viewed in 1920x1080 resolution</span></div></footer>
}
const rows = [['SICP-0142', 'Rainwater Harvesting Systems for Rural Schools', 'Water Resources', 'Ranchi', 'In Progress', 'Dr. A. Verma'], ['SICP-0139', 'Low-Cost Soil Health Monitoring Kit', 'Agriculture', 'Dhanbad', 'Team Formed', 'Prof. S. Kumar'], ['SICP-0136', 'Mobile Health Camps Scheduling Platform', 'Healthcare', 'Jamshedpur', 'Pending Review', '—'], ['SICP-0131', 'Digital Literacy for Tribal Communities', 'Education', 'Khunti', 'Completed', 'Dr. R. Oraon'], ['SICP-0128', 'Urban Flood Early Warning System', 'Urban Development', 'Ranchi', 'In Progress', 'Prof. N. Singh'], ['SICP-0124', 'Solar Micro-Grid for Remote Villages', 'Environment', 'Gumla', 'Team Formed', 'Dr. P. Mahato']];
function Shell({ active, children, loggedIn, onLogout }) { 
  const isHomeOrLogin = location.hash === '#/' || location.hash === '' || location.hash === '#/login';
  return <div className="page"><Header active={active} loggedIn={loggedIn} onLogout={onLogout} />{children}<Footer />{isHomeOrLogin && <FloatingCallAgent />}</div> 
}
function PageHead({ crumb, title, subtitle, actions }) { return <div className="page-head"><div>{crumb && <small>{crumb}</small>}<h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{actions && <aside>{actions}</aside>}</div> }
function SubmitPage() {
  const [formData, setFormData] = useState({
    title: '', description: '', district: '', villageCityBlock: '', latitude: '', longitude: '',
    peopleAffected: '', fullName: '', mobileNumber: '', email: '', consent: false
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setFormData(prev => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
      });
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const form = new FormData();
      Object.keys(formData).forEach(key => form.append(key, formData[key]));
      if (file) form.append('supportingDocument', file);

      const token = localStorage.getItem('token');

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/challenges`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: form
      });
      const data = await res.json();
      if (res.ok) {
        if (token) {
          location.hash = '#/my-dashboard';
        } else {
          setMsg({ type: 'success', text: 'Challenge submitted successfully! ID: ' + data.challenge.id });
          setFormData({ title: '', description: '', district: '', villageCityBlock: '', latitude: '', longitude: '', peopleAffected: '', fullName: '', mobileNumber: '', email: '', consent: false });
          setFile(null);
        }
      } else {
        setMsg({ type: 'error', text: data.message || 'Submission failed' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to connect to backend server.' });
    }
    setLoading(false);
  };

  return <Shell active="Submit a Challenge">
    <PageHead crumb="Home  /  Submit a Challenge" title="Submit a Societal Challenge" />
    <main className="form-layout">
      <form onSubmit={handleSubmit}>
        {msg && <div className={`gov-note ${msg.type === 'error' ? 'warn' : ''}`} style={{ fontSize: '13px', marginBottom: '15px' }}>{msg.type === 'error' ? '⚠️' : '✅'} {msg.text}</div>}
        <label>Challenge Title <b>*</b><input name="title" value={formData.title} onChange={handleChange} required maxLength="120" /><small>Provide a concise title (max 120 characters)</small></label>
        <label>Detailed Description <b>*</b><textarea name="description" value={formData.description} onChange={handleChange} required /><small>Describe the problem, its impact, and affected community</small></label>
        <div className="two">
          <label>Category & Department <div className="ai-detected">✨ AI will auto-detect from description</div></label>
          <label>Urgency/Severity <div className="ai-detected">✨ AI will auto-verify after analysis</div></label>
        </div>
        <div className="two">
          <label>District / Location <b>*</b>
            <select name="district" value={formData.district} onChange={handleChange} required>
              <option value="">Select district</option>
              {['Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum', 'Garhwa', 'Giridih', 'Godda', 'Gumla', 'Hazaribagh', 'Jamtara', 'Khunti', 'Koderma', 'Latehar', 'Lohardaga', 'Pakur', 'Palamu', 'Ramgarh', 'Ranchi', 'Sahibganj', 'Seraikela Kharsawan', 'Simdega', 'West Singhbhum'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label>Village/City/Block <b>*</b><input name="villageCityBlock" value={formData.villageCityBlock} onChange={handleChange} required /></label>
        </div>
        <div className="two">
          <label>GPS/Current Location
            <button type="button" onClick={detectLocation} className="outline location-btn" style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: 'max-content', padding: '0 20px', cursor: 'pointer' }}>
              📍 {formData.latitude ? `Lat: ${formData.latitude.toFixed(4)}, Lng: ${formData.longitude.toFixed(4)}` : 'Auto Detect Location'}
            </button>
          </label>
          <label>People Affected (Approx) <b>*</b><input type="number" name="peopleAffected" value={formData.peopleAffected} onChange={handleChange} placeholder="e.g. 500" required min="1" /></label>
        </div>
        <label>Supporting Documents (optional)
          <div className="upload-box">
            <input type="file" accept="image/*,video/*,.pdf,.doc,.docx" onChange={e => setFile(e.target.files[0])} />
            <label><i>📁</i><span>{file ? file.name : 'Click to upload or drag files here'}</span><small>(JPG, PNG, MP4, PDF, DOC — max 10MB)</small></label>
          </div>
        </label>
        <div className="three">
          <label>Full Name <b>*</b><input name="fullName" value={formData.fullName} onChange={handleChange} required /></label>
          <label>Mobile Number <b>*</b><input name="mobileNumber" type="tel" value={formData.mobileNumber} onChange={handleChange} required /></label>
          <label>Email Address<input name="email" type="email" value={formData.email} onChange={handleChange} /></label>
        </div>
        <label className="checkbox-label" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
          <input type="checkbox" name="consent" checked={formData.consent} onChange={handleChange} required style={{ height: 'auto', width: 'auto' }} /> I consent to share my contact details and location for the purpose of resolving this challenge.
        </label>
        <button disabled={loading}>{loading ? 'Submitting...' : 'Submit for Review'}</button>
      </form>
      <aside className="help">
        <div><h3>Before You Submit</h3><p>• Your challenge will be reviewed and categorized using AI-assisted classification within 3 working days.</p><p>• Verified challenges are routed to relevant Higher Education Institutions for solution development.</p><p>• You will receive a reference number and SMS/email updates on the status of your submission.</p><p>• All fields marked with * are mandatory.</p></div>
        <div><h3>Need Help?</h3><p>Contact the Helpdesk: 1800-XXX-XXXX (Toll Free)<br />Or write to sicp-help@jharkhand.gov.in</p></div>
      </aside>
    </main>
  </Shell>;
}
function InstitutionPage() { return <Shell active="For Institutions"><PageHead title="Institution Dashboard" subtitle="Birla Institute of Technology, Mesra — Assigned Challenges Overview" actions={<button className="outline">Export Report</button>} /><main className="institution"><aside className="filters"><h3>Filters</h3>{['Status', 'Category', 'Priority'].map((g, i) => <div key={g}><b>{g}</b>{(i === 0 ? ['Pending Review', 'Team Formed', 'In Progress', 'Completed'] : i === 1 ? ['Education', 'Agriculture', 'Healthcare', 'Water Resources', 'Environment'] : ['High', 'Medium', 'Low']).map(x => <label key={x}><input type="checkbox" /> {x}</label>)}</div>)}<button>Apply Filters</button></aside><div><section className="bar-chart"><h3>Category-wise Assignment Distribution</h3><div>{[['18', 'Education'], ['12', 'Agriculture'], ['9', 'Healthcare'], ['7', 'Water Res.'], ['14', 'Environment'], ['5', 'Urban Dev.']].map((x, i) => <span key={x[1]}><i style={{ height: `${+x[0] * 6.8}px` }} /><b>{x[0]}</b><small>{x[1]}</small></span>)}</div></section><Table rows={rows} /></div></main></Shell> }
function Table({ rows: data, analytics = false }) { let headers = analytics ? ['District', 'Submitted', 'In Progress', 'Completed', 'Institutions Active'] : ['ID', 'Challenge Title', 'Category', 'District', 'Status', 'Team Lead']; return <div className="records"><div className="record-row head">{headers.map(x => <b key={x}>{x}</b>)}</div>{data.map((r, i) => <div className="record-row" key={i}>{r.map((x, j) => <span key={j} className={j === 4 && !analytics ? 'status' : ''}>{x}</span>)}</div>)}</div> }
function DashboardPage() { let districts = [['Ranchi', '284', '62', '156', '18'], ['Dhanbad', '196', '41', '98', '14'], ['Jamshedpur (East Singhbhum)', '213', '55', '104', '16'], ['Bokaro', '142', '30', '76', '10'], ['Hazaribagh', '98', '22', '48', '7'], ['Deoghar', '87', '19', '41', '6']]; return <Shell active="Dashboard"><PageHead title="Government Analytics Dashboard" subtitle="Statewide performance overview — Higher Education Department, Jharkhand" actions={<><select><option>District: All Districts</option></select><button className="outline">Export PDF</button><button className="outline">Export Excel</button></>} /><main className="analytics"><section className="metrics">{[['1,284', 'Total Challenges', '▲ +8.2% vs last quarter'], ['347', 'Solutions Deployed', '▲ +12.4% vs last quarter'], ['96', 'Institutions Onboarded', '▲ +3 vs last quarter'], ['61%', 'Avg. Resolution Rate', '▼ -1.1% vs last quarter'], ['18 days', 'Avg. AI Routing Time', '▲ -2 days vs last quarter']].map(x => <div key={x[1]}><b>{x[0]}</b><span>{x[1]}</span><small>{x[2]}</small></div>)}</section><div className="chart-row"><section className="line-chart"><h3>Monthly Challenge Submissions (2026)</h3><div className="line"><i /><i /><i /><i /><i /><i /></div><div className="months">Jan Feb Mar Apr May Jun Jul Aug</div><div className="month-values">62 78 91 84 110 132 145 168</div></section><section className="donut"><h3>Status Distribution</h3><div><i /><aside><span>■ &nbsp;Completed (27%)</span><span>■ &nbsp;In Progress (34%)</span><span>■ &nbsp;Team Formed (21%)</span><span>■ &nbsp;Pending Review (18%)</span></aside></div></section></div><section className="district"><h3>District-wise Challenge Volume</h3><Table rows={districts} analytics /></section></main></Shell> }
function IndustryPage() { let cards = [['SICP-0142', 'Water Resources', 'High Priority', 'Rainwater Harvesting Systems for Rural Schools', 'BIT Mesra  •  Ranchi District', 'Seeking industry partners for low-cost filtration hardware and IoT-based tank monitoring to scale a pilot across 40 government schools.', 'Seeking: Hardware Sponsorship, Technical Mentorship'], ['SICP-0136', 'Healthcare', 'Medium Priority', 'Mobile Health Camps Scheduling Platform', 'XLRI Jamshedpur  •  Jamshedpur District', 'Requires cloud infrastructure support and API integration expertise to connect with district health databases.', 'Seeking: Cloud Credits, API Integration Support'], ['SICP-0128', 'Urban Development', 'High Priority', 'Urban Flood Early Warning System', 'NIT Jamshedpur  •  Ranchi District', 'Looking for sensor hardware manufacturers and data science mentors to refine the flood prediction model.', 'Seeking: Sensor Hardware, Data Science Mentorship'], ['SICP-0124', 'Environment', 'Medium Priority', 'Solar Micro-Grid for Remote Villages', 'Central University of Jharkhand  •  Gumla District', 'Seeking solar equipment vendors and funding support to expand the micro-grid pilot to 12 additional villages.', 'Seeking: Equipment Funding, Field Deployment Support']]; return <Shell active="For Industry"><PageHead crumb="Home  /  For Industry" title="Industry Collaboration Opportunities" subtitle="Challenges seeking industry mentorship, funding, or technical partnership" /><main className="industry"><div className="search"><input placeholder="Search challenges by keyword, category, or district..." /><select><option>Category: All</option></select><select><option>District: All</option></select><select><option>Sort: Newest First</option></select></div><p>Showing 6 of 84 challenges seeking industry collaboration</p>{cards.map((c, i) => <article className={'opportunity ' + (c[2][0] === 'H' ? 'high' : 'medium')} key={c[0]}><div><small>{c[0]} &nbsp; <b>{c[1]}</b> &nbsp; <em>{c[2]}</em></small><h2>{c[3]}</h2><span>{c[4]}</span><p>{c[5]}</p><strong>{c[6]}</strong></div><aside><button onClick={() => location.hash = '#/login'}>Express Interest</button><a style={{cursor: 'pointer'}} onClick={() => location.hash = '#/login'}>View Details →</a></aside></article>)}</main></Shell> }
function HomePage() {
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
      <Header />
      <Hero />
      <Stats />
      <section className="message">
        <div className="portrait">PHOTO</div>
        <div>
          <em>“A Vision for a Digitally Empowered Jharkhand — connecting every citizen’s problem to the state’s brightest minds.”</em>
          <span>— Secretary, Higher Education Department, Government of Jharkhand</span>
        </div>
      </section>

      <section className="why-section" style={{ backgroundImage: "url('/images/why-bg.jpg')" }}>
        <div className="why-overlay"></div>
        <div className="why-content">
          <div className="why-marker">A STRUCTURED APPROACH TO COMMUNITY INNOVATION</div>

          <SectionTitle>
            <small style={{ display: 'block', fontSize: '12px', color: '#08743f', letterSpacing: '1px', marginBottom: '8px', textTransform: 'uppercase' }}>Why This Platform</small>
            <span style={{ fontFamily: "'Noto Sans Devanagari', sans-serif", fontSize: '28px', color: '#111', display: 'block', marginBottom: '12px' }}>समस्याओं को सिर्फ दर्ज नहीं, समाधान तक पहुँचाना है।</span>
            <span style={{ fontSize: '14px', color: '#333', fontWeight: 'normal', display: 'block', maxWidth: '700px', margin: '0 auto' }}>Connecting grassroots challenges with institutional expertise to drive measurable, on-the-ground solutions across Jharkhand.</span>
          </SectionTitle>

          <div className="why-context">
            <h4>From a local challenge to a collaborative solution</h4>
            <p>A citizen identifies the problem. <br /> Government validates it. <br /> Universities bring expertise. <br /> Industry helps turn ideas into implementation.</p>
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
            <h3 style={{ fontFamily: "'Noto Sans Devanagari', sans-serif", fontSize: '22px', color: '#111', margin: '0 0 8px' }}>एक समस्या, कई हाथ — एक समाधान।</h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#333' }}>Citizens, government, universities and industry working together to create solutions that reach the ground.</p>
          </div>
        </div>
      </section>

      <section className="journey-section">
        <SectionTitle sub="Turning challenges identified by communities into innovative solutions through government, academia and industry collaboration.">
          <small style={{ display: 'block', fontSize: '12px', color: '#08743f', letterSpacing: '1px', marginBottom: '8px' }}>HOW IT WORKS</small>
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

      <section className="participate-section" style={{ backgroundImage: "url('/images/hemant-soren-bg.jpg')" }}>
        <div className="p-overlay"></div>
        <div className="p-content">
          <SectionTitle>
            <small style={{ display: 'block', fontSize: '12px', color: '#08743f', letterSpacing: '1px', marginBottom: '8px', textTransform: 'uppercase' }}>Who Can Participate</small>
            <span style={{ fontFamily: "'Noto Sans Devanagari', sans-serif", fontSize: '28px', color: '#111', display: 'block', marginBottom: '12px' }}>मिलकर बदलेंगे झारखंड</span>
            <span style={{ fontSize: '14px', color: '#555', fontWeight: 'normal', display: 'block', maxWidth: '700px', margin: '0 auto' }}>हर समस्या के समाधान में सबकी भूमिका है।</span>
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
              <i className="p-icon" style={{ background: '#08743f', color: '#fff', borderColor: '#08743f' }}>✓</i>
              <b style={{ color: '#08743f' }}>SOLUTION</b>
              <span className="p-hindi" style={{ color: '#111' }}>समाधान</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <FloatingCallAgent />
    </div>
  );
}
function FloatingCallAgent() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleCallRequest = async (e) => {
    e.preventDefault();
    if (!name || !phone) {
      setMessage('Name and Phone are required');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/sarvam/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone })
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Jagriti is calling you now!');
        setName('');
        setEmail('');
        setPhone('');
      } else {
        setMessage(data.message || 'Failed to trigger call');
      }
    } catch (err) {
      setMessage('Error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="floating-agent">
      {open && (
        <div className="agent-popup">
          <div className="agent-header">
            <b>जागृति (Jagriti) - AI Agent</b>
            <button onClick={() => { setOpen(false); setMessage(''); }}>×</button>
          </div>
          <form className="agent-body" onSubmit={handleCallRequest}>
            <p>हमारा AI एजेंट आपको कॉल करेगा। कृपया अपना विवरण दर्ज करें।<br />(Get a call from us)</p>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full Name (पूरा नाम)" required style={{ marginBottom: '8px', width: '100%', boxSizing: 'border-box' }} />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email ID (ईमेल आईडी)" style={{ marginBottom: '8px', width: '100%', boxSizing: 'border-box' }} />
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit Mobile Number" required style={{ marginBottom: '8px', width: '100%', boxSizing: 'border-box' }} />
            <button type="submit" disabled={loading} style={{ width: '100%', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'कॉलिंग... (Calling...)' : 'कॉल मी (Call Me)'}
            </button>
            {message && <div style={{ marginTop: '10px', fontSize: '13px', color: message.includes('Error') || message.includes('Failed') ? '#dc2626' : '#16a34a', fontWeight: 'bold' }}>{message}</div>}
          </form>
        </div>
      )}
      <button className="agent-fab" onClick={() => setOpen(!open)}>
        <i>📞</i><span>सहायता</span>
      </button>
    </div>
  )
}

// ── Custom Password Input ──
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#64748b' }}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#64748b' }}>
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

function PasswordInput(props) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'flex' }}>
      <input type={show ? 'text' : 'password'} style={{ width: '100%', paddingRight: '40px', boxSizing: 'border-box' }} {...props} />
      <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, height: '100%', display: 'flex', alignItems: 'center' }}>
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

// ── Login ──
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pw })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        onLogin({ email: data.email, role: data.role }, data);
      } else {
        setErr(data.message || 'Invalid credentials.');
      }
    } catch (err) {
      setErr('Failed to connect to backend server.');
    }
  };
  return <Shell><PageHead crumb="Home  /  Login" title="Login to the Portal" subtitle="Access your account on the Societal Innovation Collaboration Portal" /><main className="form-layout"><form onSubmit={handleLogin}>
    <label>Email Address <b>*</b><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter registered email" /></label>
    <label>Password <b>*</b><PasswordInput value={pw} onChange={e => setPw(e.target.value)} placeholder="Enter your password" /></label>
    {err && <div className="gov-note warn" style={{ fontSize: '12px' }}>⚠️ {err}</div>}
    <div className="two">
      <label style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}><input type="checkbox" style={{ height: 'auto', width: 'auto' }} /> Remember me on this device</label>
      <label style={{ textAlign: 'right' }}><a href="#" style={{ color: '#064477', fontSize: '13px' }}>Forgot Password?</a></label>
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
        <p>Toll Free: 1800-XXX-XXXX<br />Email: sicp-help@jharkhand.gov.in<br />Working Hours: Mon–Sat, 9:00 AM – 6:00 PM</p>
      </div>
    </aside></main></Shell>
}

// ── Register ──
const DISTRICTS = ['Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum', 'Garhwa', 'Giridih', 'Godda', 'Gumla', 'Hazaribagh', 'Jamtara', 'Khunti', 'Koderma', 'Latehar', 'Lohardaga', 'Pakur', 'Palamu', 'Ramgarh', 'Ranchi', 'Sahibganj', 'Seraikela Kharsawan', 'Simdega', 'West Singhbhum'];
const DEPARTMENTS = ['Higher Education', 'Health & Family Welfare', 'Agriculture & Farmers Welfare', 'Rural Development', 'Water Resources', 'Urban Development & Housing', 'Industries', 'Mines & Geology', 'Energy', 'Labour Employment & Training', 'Social Welfare', 'Tribal Welfare', 'Forest & Environment', 'Revenue & Land Reforms', 'Transport', 'Information Technology', 'Science & Technology', 'Food & Civil Supplies', 'Home', 'Finance', 'Planning & Development', 'Women & Child Development', 'Drinking Water & Sanitation', 'Panchayati Raj'];
const COLLAB_CHIPS = ['Funding', 'Technical Mentorship', 'Product Development', 'Hardware', 'Software / Technology', 'Manufacturing', 'Testing', 'Field Deployment', 'Infrastructure', 'CSR Funding', 'Market / Distribution', 'Research Collaboration', 'Technology Transfer'];

function RegisterPage() {
  const [role, setRole] = useState('');
  const [step, setStep] = useState(1);
  const [chips, setChips] = useState([]);
  const toggleChip = c => setChips(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  
  const [industryData, setIndustryData] = useState({
    brandName: '', organizationType: '', industrySector: '', primaryBusinessArea: '',
    yearEstablished: '', headquarters: '', website: '', district: '', state: 'Jharkhand',
    cin: '', llpin: '', gstin: '', udyamNumber: '', pan: '',
    expertiseAreas: '', relevantProjects: '', rndCapability: '', geoAreas: '',
    authRepName: '', authRepDesignation: '', authRepEmail: '', authRepPhone: ''
  });

  const handleIndChange = (e) => setIndustryData({ ...industryData, [e.target.name]: e.target.value });

  const handleRegister = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const payload = {
        name, email, password, phone, role: role === 'official' ? 'admin' : role,
        ...industryData,
        collaborationCapabilities: chips
      };
      
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        alert('Registration successful! Please login.');
        location.hash = '#/login';
      } else {
        setErr(data.message || 'Registration failed.');
      }
    } catch (err) {
      setErr('Failed to connect to backend server.');
    }
  };

  // Calculate total steps per role
  const totalSteps = role === 'institution' ? 4 : role === 'industry' ? 4 : 1;

  return <Shell><PageHead crumb="Home  /  Register" title="New User Registration" subtitle="Societal Innovation Collaboration Portal — Government of Jharkhand" /><main className="form-layout"><form onSubmit={handleRegister}>
    {err && <div className="gov-note warn" style={{ fontSize: '12px' }}>⚠️ {err}</div>}

    {/* ── Role Selection (always visible) ── */}
    <label>Register As <b>*</b>
      <select value={role} onChange={e => { setRole(e.target.value); setStep(1) }}>
        <option value="">— Select your role —</option>
        <option value="citizen">Citizen</option>
        <option value="official">State Official / Government Officer</option>
        <option value="institution">University / Higher Education Institution (HEI)</option>
        <option value="industry">Industry / Organization</option>
      </select>
      <small>Select the category that best describes your participation</small>
    </label>

    {/* ── Step indicator for multi-step forms ── */}
    {totalSteps > 1 && <div className="step-bar">{Array.from({ length: totalSteps }, (_, i) => <i key={i} className={step >= i + 1 ? 'done' : ''} />)}</div>}

    {/* ══════ CITIZEN ══════ */}
    {role === 'citizen' && <>
      <div className="section-divider">Personal Information</div>
      <label>Full Name <b>*</b><input value={name} onChange={e => setName(e.target.value)} required /></label>
      <div className="two">
        <label>Mobile Number <b>*</b><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit mobile number" required /></label>
        <label>Email Address <b>*</b><input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
      </div>
      <div className="two">
        <label>Password <b>*</b><PasswordInput value={password} onChange={e => setPassword(e.target.value)} required /></label>
        <label>Confirm Password <b>*</b><PasswordInput required /></label>
      </div>
      <div className="section-divider">Location</div>
      <div className="two">
        <label>District <b>*</b><select><option value="">Select district</option>{DISTRICTS.map(d => <option key={d}>{d}</option>)}</select></label>
        <label>Block / Municipality<input /></label>
      </div>
      <label>Village / Ward<input /></label>
      <div className="section-divider">Preferences</div>
      <label>Preferred Language<select><option>English</option><option>हिन्दी (Hindi)</option></select></label>
      <div className="gov-note">ℹ️ Your mobile number will be verified via OTP before account activation.</div>
      <button>Register</button>
    </>}

    {/* ══════ STATE OFFICIAL ══════ */}
    {role === 'official' && <>
      <div className="section-divider">Official Details</div>
      <div className="two">
        <label>Full Name <b>*</b><input value={name} onChange={e => setName(e.target.value)} required /></label>
        <label>Designation <b>*</b><input placeholder="e.g. District Magistrate, BDO" /></label>
      </div>
      <label>Department <b>*</b><select><option value="">Select Department</option>{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}</select></label>
      <div className="two">
        <label>Official Government Email <b>*</b><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@jharkhand.gov.in" required /></label>
        <label>Official Mobile Number <b>*</b><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required /></label>
      </div>
      <div className="two">
        <label>Password <b>*</b><PasswordInput value={password} onChange={e => setPassword(e.target.value)} required /></label>
        <label>Confirm Password <b>*</b><PasswordInput required /></label>
      </div>
      <div className="gov-note warn">⚠️ Official accounts require verification by the Department before access is granted. You will be notified via email once approved.</div>
      <button>Submit for Verification</button>
    </>}

    {/* ══════ INSTITUTION — Step 1 ══════ */}
    {role === 'institution' && step === 1 && <>
      <div className="section-divider">Institution Details</div>
      <label>Institution Name <b>*</b><input value={name} onChange={e => setName(e.target.value)} required /></label>
      <div className="two">
        <label>Institution Type <b>*</b><select><option value="">Select type</option><option>University</option><option>Engineering College</option><option>Medical College</option><option>Agricultural University / College</option><option>Polytechnic</option><option>Research Institute</option><option>Other Higher Education Institution</option></select></label>
        <label>AISHE Code <b>*</b><input placeholder="e.g. C-12345" /></label>
      </div>
      <div className="two">
        <label>District <b>*</b><select><option value="">Select district</option>{DISTRICTS.map(d => <option key={d}>{d}</option>)}</select></label>
        <label>Official Email Domain <b>*</b><input placeholder="e.g. bitmesra.ac.in" /></label>
      </div>
      <label>Full Address <b>*</b><textarea /></label>
      <label>Official Website<input type="url" placeholder="https://" /></label>
      <button type="button" onClick={() => setStep(2)}>Next Step →</button>
    </>}

    {/* ══════ INSTITUTION — Step 2 ══════ */}
    {role === 'institution' && step === 2 && <>
      <div className="section-divider">Institutional Capabilities</div>
      <label>Departments <b>*</b><input placeholder="e.g. Computer Science, Mechanical Engineering" /><small>Separate multiple entries with commas</small></label>
      <label>Research Domains <b>*</b><input placeholder="e.g. AI/ML, Renewable Energy, Biotech" /></label>
      <label>Faculty Expertise <b>*</b><input /></label>
      <div className="two">
        <label>Laboratories / Facilities<input /></label>
        <label>Innovation / Incubation Centre<input /></label>
      </div>
      <label>Previous Relevant Projects<textarea style={{ height: '64px' }} /></label>
      <label>Industry Collaborations<textarea style={{ height: '64px' }} /></label>
      <label>Available Technical Skills<input /></label>
      <div className="two">
        <button type="button" className="outline" style={{ background: '#fff', color: '#064477' }} onClick={() => setStep(1)}>← Previous</button>
        <button type="button" onClick={() => setStep(3)}>Next Step →</button>
      </div>
    </>}

    {/* ══════ INSTITUTION — Step 3 ══════ */}
    {role === 'institution' && step === 3 && <>
      <div className="section-divider">Nodal Officer Details</div>
      <div className="two">
        <label>Nodal Officer Name <b>*</b><input /></label>
        <label>Designation <b>*</b><input /></label>
      </div>
      <div className="two">
        <label>Official Email <b>*</b><input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
        <label>Official Mobile Number <b>*</b><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required /></label>
      </div>
      <div className="two">
        <button type="button" className="outline" style={{ background: '#fff', color: '#064477' }} onClick={() => setStep(2)}>← Previous</button>
        <button type="button" onClick={() => setStep(4)}>Next Step →</button>
      </div>
    </>}

    {/* ══════ INSTITUTION — Step 4 ══════ */}
    {role === 'institution' && step === 4 && <>
      <div className="section-divider">Account Credentials</div>
      <div className="two">
        <label>Password <b>*</b><PasswordInput value={password} onChange={e => setPassword(e.target.value)} required /></label>
        <label>Confirm Password <b>*</b><PasswordInput required /></label>
      </div>
      <div className="gov-note warn">⚠️ Institution profiles are subject to verification by the Higher Education Department before activation.</div>
      <div className="two">
        <button type="button" className="outline" style={{ background: '#fff', color: '#064477' }} onClick={() => setStep(3)}>← Previous</button>
        <button>Submit for Verification</button>
      </div>
    </>}

    {/* ══════ INDUSTRY — Step 1 ══════ */}
    {role === 'industry' && step === 1 && <>
      <div className="section-divider">Organization Details</div>
      <div className="two">
        <label>Legal Entity Name <b>*</b><input value={name} onChange={e => setName(e.target.value)} required /></label>
        <label>Brand / Trade Name<input name="brandName" value={industryData.brandName} onChange={handleIndChange} /></label>
      </div>
      <div className="two">
        <label>Organization Type <b>*</b><select name="organizationType" value={industryData.organizationType} onChange={handleIndChange}><option value="">Select type</option><option>Private Limited Company</option><option>Public Limited Company</option><option>LLP</option><option>Partnership Firm</option><option>Proprietorship</option><option>Section 8 Company</option><option>NGO / Non-Profit</option><option>MSME</option><option>Public Sector Enterprise</option><option>Research & Technology Organization</option><option>CSR Foundation / Corporate Foundation</option><option>Other</option></select></label>
        <label>Industry Sector <b>*</b><input name="industrySector" value={industryData.industrySector} onChange={handleIndChange} /></label>
      </div>
      <div className="two">
        <label>Primary Business Area <b>*</b><input name="primaryBusinessArea" value={industryData.primaryBusinessArea} onChange={handleIndChange} /></label>
        <label>Year Established<input type="number" name="yearEstablished" value={industryData.yearEstablished} onChange={handleIndChange} placeholder="e.g. 2005" /></label>
      </div>
      <div className="two">
        <label>Headquarters<input name="headquarters" value={industryData.headquarters} onChange={handleIndChange} /></label>
        <label>Website<input type="url" name="website" value={industryData.website} onChange={handleIndChange} placeholder="https://" /></label>
      </div>
      <div className="two">
        <label>District<select name="district" value={industryData.district} onChange={handleIndChange}><option value="">Select district</option>{DISTRICTS.map(d => <option key={d}>{d}</option>)}</select></label>
        <label>State<input name="state" value={industryData.state} onChange={handleIndChange} defaultValue="Jharkhand" /></label>
      </div>
      <button type="button" onClick={() => setStep(2)}>Next Step →</button>
    </>}

    {/* ══════ INDUSTRY — Step 2 ══════ */}
    {role === 'industry' && step === 2 && <>
      <div className="section-divider">Registration Information</div>
      <small style={{ color: '#747a76', fontSize: '11px', marginTop: '-10px' }}>Fill applicable fields only. Not all identifiers are required.</small>
      <div className="two">
        <label>CIN<input name="cin" value={industryData.cin} onChange={handleIndChange} /></label>
        <label>LLPIN<input name="llpin" value={industryData.llpin} onChange={handleIndChange} /></label>
      </div>
      <div className="two">
        <label>GSTIN<input name="gstin" value={industryData.gstin} onChange={handleIndChange} /></label>
        <label>Udyam Registration Number<input name="udyamNumber" value={industryData.udyamNumber} onChange={handleIndChange} /></label>
      </div>
      <label>PAN<input name="pan" value={industryData.pan} onChange={handleIndChange} /></label>
      <div className="two">
        <button type="button" className="outline" style={{ background: '#fff', color: '#064477' }} onClick={() => setStep(1)}>← Previous</button>
        <button type="button" onClick={() => setStep(3)}>Next Step →</button>
      </div>
    </>}

    {/* ══════ INDUSTRY — Step 3 ══════ */}
    {role === 'industry' && step === 3 && <>
      <div className="section-divider">Collaboration Capabilities</div>
      <label>How can your organization contribute?</label>
      <div className="chips-wrap">{COLLAB_CHIPS.map(c => <span key={c} className={'chip' + (chips.includes(c) ? ' on' : '')} onClick={() => toggleChip(c)}>{c}</span>)}</div>
      <div className="section-divider">Expertise</div>
      <label>Technology / Expertise Areas <b>*</b><input name="expertiseAreas" value={industryData.expertiseAreas} onChange={handleIndChange} /></label>
      <label>Relevant Projects<textarea name="relevantProjects" value={industryData.relevantProjects} onChange={handleIndChange} style={{ height: '64px' }} /></label>
      <div className="two">
        <label>R&D Capability<input name="rndCapability" value={industryData.rndCapability} onChange={handleIndChange} /></label>
        <label>Geographical Areas of Operation<input name="geoAreas" value={industryData.geoAreas} onChange={handleIndChange} /></label>
      </div>
      <div className="two">
        <button type="button" className="outline" style={{ background: '#fff', color: '#064477' }} onClick={() => setStep(2)}>← Previous</button>
        <button type="button" onClick={() => setStep(4)}>Next Step →</button>
      </div>
    </>}

    {/* ══════ INDUSTRY — Step 4 ══════ */}
    {role === 'industry' && step === 4 && <>
      <div className="section-divider">Authorized Representative</div>
      <div className="two">
        <label>Full Name <b>*</b><input name="authRepName" value={industryData.authRepName} onChange={handleIndChange} /></label>
        <label>Designation <b>*</b><input name="authRepDesignation" value={industryData.authRepDesignation} onChange={handleIndChange} /></label>
      </div>
      <div className="two">
        <label>Official Email <b>*</b><input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
        <label>Official Mobile Number <b>*</b><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required /></label>
      </div>
      <div className="section-divider">Account Credentials</div>
      <div className="two">
        <label>Password <b>*</b><PasswordInput value={password} onChange={e => setPassword(e.target.value)} required /></label>
        <label>Confirm Password <b>*</b><PasswordInput required /></label>
      </div>
      <div className="gov-note warn">⚠️ Organization verification is required before participation. You will be notified via email once approved.</div>
      <div className="two">
        <button type="button" className="outline" style={{ background: '#fff', color: '#064477' }} onClick={() => setStep(3)}>← Previous</button>
        <button>Submit for Verification</button>
      </div>
    </>}

    {!role && <div className="gov-note">ℹ️ Please select your role above to view the registration form.</div>}

    <div className="auth-toggle">Already have an account? <a href="#/login">Login here</a></div>
  </form><aside className="help">
      <div><h3>Registration Guidelines</h3>
        <p>• All fields marked with <b style={{ color: '#cf2721' }}>*</b> are mandatory.</p>
        <p>• Citizen accounts are activated immediately after mobile OTP verification.</p>
        <p>• State Official, University/HEI, and Industry/Organization accounts require verification by the concerned authority.</p>
        <p>• You will receive SMS and email notifications on your registration status.</p>
      </div>
      <div><h3>Helpdesk</h3>
        <p>Toll Free: 1800-XXX-XXXX<br />Email: sicp-help@jharkhand.gov.in<br />Working Hours: Mon–Sat, 9:00 AM – 6:00 PM</p>
      </div>
    </aside></main></Shell>
}

function BrowseChallengesPage() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/public/challenges/completed`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
        setChallenges(data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to fetch challenges');
        setLoading(false);
      });
  }, []);

  return (
    <Shell active="Browse Challenges">
      <PageHead title="Completed & Deployed Challenges" subtitle="Explore solutions successfully implemented across Jharkhand." />
      <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto', minHeight: '500px' }}>
        {loading && <div className="placeholder" style={{ padding: '40px', background: 'transparent' }}>Loading challenges...</div>}
        {error && <div className="placeholder" style={{ padding: '40px', background: 'transparent', color: '#b91c1c' }}>{error}</div>}
        {!loading && !error && challenges.length === 0 && (
          <div className="placeholder" style={{ padding: '40px', background: 'transparent' }}>No completed challenges found yet.</div>
        )}
        {!loading && !error && challenges.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
            {challenges.map(c => (
              <article key={c._id} style={{ border: '1px solid #dfe4e0', borderRadius: '6px', background: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <small style={{ color: '#087c4b', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c.category} • {c.department}</small>
                    <span style={{ fontSize: '10px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>{c.status.toUpperCase()}</span>
                  </div>
                  <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#0f172a', lineHeight: 1.4 }}>{c.title}</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.description}</p>
                </div>
                <div style={{ padding: '16px 20px', background: '#f8fafc', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}><b style={{ color: '#334155', width: '80px', flexShrink: 0 }}>Location:</b> <span style={{ color: '#64748b' }}>{c.district}, {c.villageCityBlock}</span></div>
                  <div style={{ display: 'flex', gap: '8px' }}><b style={{ color: '#334155', width: '80px', flexShrink: 0 }}>Impact:</b> <span style={{ color: '#64748b' }}>~{c.peopleAffected} People</span></div>
                  <div style={{ display: 'flex', gap: '8px' }}><b style={{ color: '#334155', width: '80px', flexShrink: 0 }}>Institution:</b> <span style={{ color: '#64748b' }}>{c.institutionAssigned}</span></div>
                  <div style={{ display: 'flex', gap: '8px' }}><b style={{ color: '#334155', width: '80px', flexShrink: 0 }}>Project Lead:</b> <span style={{ color: '#64748b' }}>{c.projectLead}</span></div>
                  <div style={{ display: 'flex', gap: '8px' }}><b style={{ color: '#334155', width: '80px', flexShrink: 0 }}>Team:</b> <span style={{ color: '#64748b' }}>{c.teamMembers}</span></div>
                  <div style={{ display: 'flex', gap: '8px' }}><b style={{ color: '#334155', width: '80px', flexShrink: 0 }}>Industry:</b> <span style={{ color: '#64748b' }}>{c.industryPartner}</span></div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1' }}><b style={{ color: '#334155', width: '80px', flexShrink: 0 }}>Completed:</b> <span style={{ color: '#087c4b', fontWeight: 600 }}>{new Date(c.resolvedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span></div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}

function App() {
  const [path, setPath] = useState(location.hash.slice(1));
  const [loggedIn, setLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const doLogout = () => { setLoggedIn(false); setUserData(null); localStorage.removeItem('token'); location.hash = '#/'; };

  useEffect(() => {
    const handleHashChange = () => setPath(location.hash.slice(1));
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const verifyUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const user = await res.json();
            let role = user.role;
            if (role === 'admin') role = 'official';
            if (role === 'user') role = 'citizen';
            if (role === 'institution') role = 'institution';
            setLoggedIn(role);
            setUserData(user);
          } else {
            localStorage.removeItem('token');
          }
        } catch (err) {
          console.error("Auth verification failed:", err);
        }
      }
      setAuthLoading(false);
    };
    verifyUser();
  }, []);

  const AuthShell = (props) => <Shell {...props} loggedIn={loggedIn} onLogout={doLogout} />;

  if (authLoading) return <Shell><main style={{ padding: '40px', textAlign: 'center' }}>Loading...</main></Shell>;

  if (path === '/my-dashboard' && loggedIn) return <UserDashboard Shell={AuthShell} PageHead={PageHead} user={userData} />;
  if (path === '/official-dashboard' && loggedIn) return <OfficialDashboard Shell={AuthShell} PageHead={PageHead} user={userData} />;
  if (path === '/industry-dashboard' && loggedIn) return <IndustryDashboard Shell={AuthShell} PageHead={PageHead} user={userData} />;
  if (path === '/university-dashboard' && loggedIn) return <UniversityDashboard Shell={AuthShell} PageHead={PageHead} user={userData} />;
  if (path === '/profile' && loggedIn) return <UserProfile Shell={AuthShell} PageHead={PageHead} user={userData} setUserData={setUserData} />;
  if (path.startsWith('/project/') && loggedIn) return <ProjectDetails Shell={AuthShell} PageHead={PageHead} user={userData} />;
  if (path === '/login' && !loggedIn) return <LoginPage onLogin={(creds, userResponse) => {
    let role = userResponse?.role;
    if (role === 'admin') role = 'official';
    if (role === 'user') role = 'citizen';
    if (role === 'institution') role = 'institution';
    setLoggedIn(role);
    setUserData(userResponse || { name: 'User', role });
    if (role === 'official') location.hash = '#/official-dashboard';
    else if (role === 'industry') location.hash = '#/industry-dashboard';
    else if (role === 'institution') location.hash = '#/university-dashboard';
    else location.hash = '#/my-dashboard';
  }} />;
  if (path === '/login' && loggedIn) {
    if (loggedIn === 'official') location.hash = '#/official-dashboard';
    else if (loggedIn === 'industry') location.hash = '#/industry-dashboard';
    else if (loggedIn === 'institution') location.hash = '#/university-dashboard';
    else location.hash = '#/my-dashboard';
    return null;
  }
  if (path === '/register') return <RegisterPage />;

  let Page = HomePage;
  if (path === '/submit-a-challenge') Page = SubmitPage;
  if (path === '/browse-challenges') Page = BrowseChallengesPage;
  if (path === '/for-institutions') Page = InstitutionPage;
  if (path === '/dashboard') Page = loggedIn ? () => <UserDashboard Shell={AuthShell} PageHead={PageHead} user={userData} /> : DashboardPage;
  if (path === '/for-industry') Page = IndustryPage;
  return <Page />
}
createRoot(document.getElementById('root')).render(<App />);
