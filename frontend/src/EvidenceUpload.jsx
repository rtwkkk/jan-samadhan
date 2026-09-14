import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * EvidenceUpload — Public page for citizens to upload evidence and share GPS location
 * after a voice call with the Jan Samadhan AI agent (Jagriti).
 * Accessed via email link: /#/upload-evidence/:leadId
 */
export function EvidenceUpload({ leadId }) {
  const [loading, setLoading] = useState(true);
  const [callInfo, setCallInfo] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);

  // Location state
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  // Form state
  const [district, setDistrict] = useState('');
  const [villageCityBlock, setVillageCityBlock] = useState('');
  const [files, setFiles] = useState([]);

  // Fetch voice call info on mount
  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await fetch(`${API_URL}/evidence/${leadId}`);
        const data = await res.json();
        if (data.success) {
          setCallInfo(data.data);
          if (data.data.evidenceSubmitted) {
            setSubmitted(true);
          }
        } else {
          setError(data.message || 'Could not load information.');
        }
      } catch (err) {
        setError('Network error. Please check your connection and try again.');
      }
      setLoading(false);
    };
    fetchInfo();
  }, [leadId]);

  // Request GPS location using HTML5 Geolocation API
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser. Please use a modern browser.');
      return;
    }

    setFetchingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setFetchingLocation(false);
      },
      (err) => {
        let msg = 'Unable to retrieve your location.';
        if (err.code === 1) msg = 'Location permission denied. Please allow location access in your browser settings and try again.';
        if (err.code === 2) msg = 'Location information is unavailable. Please ensure GPS is enabled.';
        if (err.code === 3) msg = 'Location request timed out. Please try again.';
        setLocationError(msg);
        setFetchingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 5) {
      alert('You can upload a maximum of 5 files.');
      return;
    }
    setFiles(selectedFiles);
  };

  // Submit the evidence
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!location) {
      alert('Please share your location first by clicking the "Share My Location" button.');
      return;
    }

    setSubmitting(true);

    const formData = new FormData();
    formData.append('latitude', location.latitude.toString());
    formData.append('longitude', location.longitude.toString());
    formData.append('district', district);
    formData.append('villageCityBlock', villageCityBlock);

    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const res = await fetch(`${API_URL}/evidence/${leadId}`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        setResult(data);
      } else {
        alert(data.message || 'Submission failed. Please try again.');
      }
    } catch (err) {
      alert('Network error. Please check your connection and try again.');
    }
    setSubmitting(false);
  };

  // ── Styles ──
  const pageStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    padding: '24px'
  };

  const cardStyle = {
    maxWidth: '640px',
    margin: '0 auto',
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
    overflow: 'hidden'
  };

  const headerStyle = {
    background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
    padding: '28px 32px',
    textAlign: 'center'
  };

  const bodyStyle = {
    padding: '32px'
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#0f172a',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  const btnPrimary = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: 'linear-gradient(135deg, #08743f 0%, #0a9f56 100%)',
    color: '#fff',
    border: 'none',
    padding: '12px 28px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%',
    letterSpacing: '0.3px'
  };

  // ── Loading ──
  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ ...cardStyle, padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: '#64748b', fontSize: '15px' }}>Loading your information...</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={headerStyle}>
            <h1 style={{ color: '#fff', margin: 0, fontSize: '20px' }}>Jan Samadhan</h1>
          </div>
          <div style={{ ...bodyStyle, textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ color: '#0f172a', fontSize: '18px', margin: '0 0 12px' }}>Link Invalid or Expired</h2>
            <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.7 }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Already Submitted ──
  if (submitted) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={headerStyle}>
            <h1 style={{ color: '#fff', margin: 0, fontSize: '20px' }}>Jan Samadhan</h1>
            <p style={{ color: '#94a3b8', margin: '6px 0 0', fontSize: '12px' }}>Citizen Grievance Resolution Platform</p>
          </div>
          <div style={{ ...bodyStyle, textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '28px' }}>✓</div>
            <h2 style={{ color: '#0f172a', fontSize: '20px', margin: '0 0 12px' }}>Evidence Submitted Successfully</h2>
            <p style={{ color: '#334155', fontSize: '14px', lineHeight: 1.7, marginBottom: '24px' }}>
              Thank you, <strong>{callInfo?.userName || 'Citizen'}</strong>. Your evidence and location have been recorded. Your challenge has been formally registered and will be reviewed by a Government Official shortly.
            </p>
            {result?.challenge?.trackingId && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px 24px', display: 'inline-block' }}>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>Your Tracking ID</span>
                <span style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace', letterSpacing: '2px' }}>{result.challenge.trackingId}</span>
              </div>
            )}
            <p style={{ color: '#64748b', fontSize: '13px', marginTop: '24px' }}>
              Please save your Tracking ID for future reference. You may close this page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Form ──
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <h1 style={{ color: '#fff', margin: 0, fontSize: '20px', fontWeight: 700 }}>Jan Samadhan</h1>
          <p style={{ color: '#94a3b8', margin: '6px 0 0', fontSize: '12px' }}>Government of India — Citizen Grievance Resolution Platform</p>
        </div>

        <div style={bodyStyle}>
          <h2 style={{ color: '#0f172a', fontSize: '18px', margin: '0 0 8px' }}>Submit Evidence & Location</h2>
          <p style={{ color: '#64748b', fontSize: '13px', lineHeight: 1.7, marginBottom: '24px' }}>
            Hello <strong>{callInfo?.userName || 'Citizen'}</strong>, thank you for speaking with Jagriti. Please provide your location and any supporting evidence to complete your challenge registration.
          </p>

          {/* Call Summary */}
          {callInfo?.callSummary && callInfo.callSummary !== 'Not available' && (
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '16px 20px', marginBottom: '24px' }}>
              <span style={{ display: 'block', fontSize: '11px', color: '#0369a1', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>Your Reported Concern</span>
              <p style={{ color: '#0c4a6e', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{callInfo.callSummary}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* ── Section 1: Location ── */}
            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ fontSize: '15px', color: '#0f172a', margin: '0 0 16px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>📍 Location Information</h3>

              {!location ? (
                <div style={{ textAlign: 'center', padding: '20px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                  <p style={{ color: '#475569', fontSize: '13px', marginBottom: '16px' }}>
                    Click below to share your current GPS location. Your browser will ask for permission.
                  </p>
                  <button
                    type="button"
                    onClick={requestLocation}
                    disabled={fetchingLocation}
                    style={{ ...btnPrimary, width: 'auto', background: fetchingLocation ? '#94a3b8' : btnPrimary.background }}
                  >
                    {fetchingLocation ? '📡 Fetching Location...' : '📍 Share My Location'}
                  </button>
                  {locationError && (
                    <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '12px' }}>{locationError}</p>
                  )}
                </div>
              ) : (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#166534' }}>✓ Location Captured</span>
                    <button type="button" onClick={requestLocation} style={{ background: 'none', border: 'none', color: '#15803d', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Refresh</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: '#334155' }}>
                    <span>Latitude: <strong>{location.latitude.toFixed(6)}</strong></span>
                    <span>Longitude: <strong>{location.longitude.toFixed(6)}</strong></span>
                    {location.accuracy && <span>Accuracy: <strong>±{Math.round(location.accuracy)}m</strong></span>}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                <div>
                  <label style={labelStyle}>District</label>
                  <input
                    type="text"
                    value={district}
                    onChange={e => setDistrict(e.target.value)}
                    placeholder="e.g. Ranchi"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Village / City / Block</label>
                  <input
                    type="text"
                    value={villageCityBlock}
                    onChange={e => setVillageCityBlock(e.target.value)}
                    placeholder="e.g. Kanke"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* ── Section 2: Evidence Upload ── */}
            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ fontSize: '15px', color: '#0f172a', margin: '0 0 16px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>📸 Supporting Evidence</h3>
              <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '12px' }}>
                Upload photographs, videos, or documents related to the problem. Accepted formats: JPG, PNG, MP4, PDF, DOC. Max 10 MB per file, up to 5 files.
              </p>
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.mp4,.pdf,.doc,.docx"
                onChange={handleFileChange}
                style={{ ...inputStyle, padding: '8px', cursor: 'pointer' }}
              />
              {files.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>{files.length} file(s) selected:</span>
                  <ul style={{ margin: '6px 0 0', paddingLeft: '20px' }}>
                    {files.map((f, i) => (
                      <li key={i} style={{ fontSize: '12px', color: '#334155' }}>{f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* ── Submit ── */}
            <button
              type="submit"
              disabled={submitting || !location}
              style={{
                ...btnPrimary,
                background: (submitting || !location) ? '#94a3b8' : btnPrimary.background,
                cursor: (submitting || !location) ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Evidence & Register Challenge'}
            </button>

            {!location && (
              <p style={{ color: '#b45309', fontSize: '12px', textAlign: 'center', marginTop: '8px' }}>
                Please share your location first to enable submission.
              </p>
            )}
          </form>
        </div>

        {/* Footer */}
        <div style={{ background: '#f8fafc', padding: '16px 32px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: '11px', margin: 0 }}>© {new Date().getFullYear()} Jan Samadhan — Government of India | All Rights Reserved</p>
        </div>
      </div>
    </div>
  );
}

export default EvidenceUpload;
