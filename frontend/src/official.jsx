import { useEffect, useState } from 'react';

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
    submitted: { bg: '#e2e8f0', color: '#475569' },
    under_review: { bg: '#fef0cf', color: '#ae7200' },
    verified: { bg: '#e8f4ed', color: '#08743f' },
    assigned: { bg: '#dbeafe', color: '#1d4ed8' },
    in_progress: { bg: '#fef0cf', color: '#ae7200' },
    resolved: { bg: '#e8f4ed', color: '#08743f' },
    rejected: { bg: '#fde7e5', color: '#c4241e' },
    information_requested: { bg: '#fef0cf', color: '#ae7200' },
  };
  const s = colors[status] || colors.submitted;
  return (
    <em style={{ background: s.bg, color: s.color, padding: '4px 10px', borderRadius: '3px', fontStyle: 'normal', fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' }}>
      {(status || '').replace(/_/g, ' ')}
    </em>
  );
}

// ── Components ──
export function OfficialDashboard({ Shell, PageHead, user }) {
  const [view, setView] = useState('overview'); // overview, review, assign, confirm

  const [kpis, setKpis] = useState([]);
  const [queue, setQueue] = useState([]);
  const [matches, setMatches] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [allChallenges, setAllChallenges] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChallenge, setSelectedChallenge] = useState(null);

  // Detail modal states
  const [detailModal, setDetailModal] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        const [kpiRes, queueRes, analyticsRes, allRes, instRes, indRes, verRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/kpis`, { headers }),
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/queue`, { headers }),
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/analytics`, { headers }),
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/challenges`, { headers }),
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/institutions`, { headers }),
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/industries`, { headers }),
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/verifications`, { headers })
        ]);

        if (kpiRes.ok) setKpis(await kpiRes.json());
        if (queueRes.ok) setQueue(await queueRes.json());
        if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
        if (instRes.ok) setInstitutions(await instRes.json());
        if (indRes.ok) setIndustries(await indRes.json());
        if (verRes.ok) setVerifications(await verRes.json());
        if (allRes.ok) {
          const resJson = await allRes.json();
          setAllChallenges(resJson.data || []);
        }
      } catch (err) {
        console.error("Error fetching admin data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [view]); // Refresh data when view changes to overview

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const NavItem = ({ label, active, onClick }) => (
    <div className={`off-nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <span>{label}</span>
    </div>
  );

  // ── Detail modal openers ──
  const openChallengeDetail = async (challengeId) => {
    setDetailModal({ type: 'challenge', data: null, loading: true });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/challenges/${challengeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setDetailModal({ type: 'challenge', data: json.data, loading: false });
      } else {
        setDetailModal({ type: 'challenge', data: null, loading: false, error: 'Failed to load challenge' });
      }
    } catch (err) {
      setDetailModal({ type: 'challenge', data: null, loading: false, error: 'Network error' });
    }
  };

  const openInstitutionDetail = async (instId) => {
    setDetailModal({ type: 'institution', data: null, loading: true });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/institutions/${instId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setDetailModal({ type: 'institution', data: json, loading: false });
      } else {
        setDetailModal({ type: 'institution', data: null, loading: false, error: 'Failed to load institution' });
      }
    } catch (err) {
      setDetailModal({ type: 'institution', data: null, loading: false, error: 'Network error' });
    }
  };

  const openIndustryDetail = async (indId) => {
    setDetailModal({ type: 'industry', data: null, loading: true });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/industries/${indId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setDetailModal({ type: 'industry', data: json, loading: false });
      } else {
        setDetailModal({ type: 'industry', data: null, loading: false, error: 'Failed to load industry details' });
      }
    } catch (err) {
      setDetailModal({ type: 'industry', data: null, loading: false, error: 'Network error' });
    }
  };

  const openVerificationDetail = (v) => {
    setDetailModal({ type: 'verification', data: v, loading: false, processing: false });
  };

  // ── Render detail modal content ──
  const renderDetailModal = () => {
    if (!detailModal) return null;

    const closeModal = () => setDetailModal(null);

    if (detailModal.loading) {
      return (
        <DetailModal title="Loading..." onClose={closeModal}>
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading details...</div>
        </DetailModal>
      );
    }

    if (detailModal.error || !detailModal.data) {
      return (
        <DetailModal title="Error" onClose={closeModal}>
          <div style={{ padding: '40px', textAlign: 'center', color: '#c4241e' }}>{detailModal.error || 'Data not found.'}</div>
        </DetailModal>
      );
    }

    // ── Challenge Detail ──
    if (detailModal.type === 'challenge') {
      const c = detailModal.data;
      return (
        <DetailModal title={c.title || 'Challenge Details'} onClose={closeModal}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: '#064477', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ID: {c._id?.slice(-8).toUpperCase()}</span>
            <StatusBadge status={c.status} />
            {c.source && <span style={{ background: c.source === 'WHATSAPP' ? '#dcfce7' : c.source === 'VOICE' ? '#fef0cf' : '#dbeafe', color: c.source === 'WHATSAPP' ? '#166534' : c.source === 'VOICE' ? '#ae7200' : '#1e40af', padding: '4px 10px', borderRadius: '3px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px' }}>{c.source === 'WHATSAPP' ? '📱 WhatsApp' : c.source === 'VOICE' ? '📞 Voice' : '🌐 Web'}</span>}
            {c.urgencySeverity && <span style={{ background: (c.urgencySeverity === 'High' || c.urgencySeverity === 'Critical') ? '#fde7e5' : '#fef0cf', color: (c.urgencySeverity === 'High' || c.urgencySeverity === 'Critical') ? '#c4241e' : '#ae7200', padding: '4px 10px', borderRadius: '3px', fontSize: '12px', fontWeight: 600 }}>{c.urgencySeverity} Priority</span>}
          </div>

          {c.description && (
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
              <small style={{ display: 'block', color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Challenge Description</small>
              <p style={{ margin: 0, color: '#475569', lineHeight: '1.6', fontSize: '14px', whiteSpace: 'pre-wrap' }}>{c.description}</p>
            </div>
          )}

          {c.callSummary && c.callSummary !== c.description && (
            <div style={{ background: '#fef2f2', padding: '20px', borderRadius: '6px', border: '1px solid #fecaca', marginBottom: '24px' }}>
              <small style={{ display: 'block', color: '#991b1b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Original Call Summary</small>
              <p style={{ margin: 0, color: '#7f1d1d', lineHeight: '1.6', fontSize: '14px', whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>{c.callSummary}</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <DetailField label="Category / Domain" value={c.category} />
            <DetailField label="Department" value={c.department} />
            <DetailField label="District" value={c.district} />
            <DetailField label="Village / Block" value={c.villageCityBlock} />
            <DetailField label="People Affected" value={c.peopleAffected ? `${c.peopleAffected}+` : null} />
            <DetailField label="Date Submitted" value={c.createdAt ? new Date(c.createdAt).toLocaleDateString() : null} />
            <DetailField label="Last Updated" value={c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : null} />
            <DetailField label="AI Confidence" value={c.aiConfidence ? `${c.aiConfidence}%` : null} />
            <DetailField label="AI Analysis Status" value={c.aiAnalysisStatus} />
            <DetailField label="Submitter" value={c.fullName} />
            <DetailField label="Email" value={c.email} />
            <DetailField label="Mobile" value={c.mobileNumber} />
          </div>

          {c.institution && (
            <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '6px', border: '1px solid #bbf7d0', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#166534' }}>Assigned Institution</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                <DetailField label="Institution" value={c.assignment?.institution_name || (typeof c.institution === 'object' ? c.institution.name : 'Assigned')} color="#14532d" />
                <DetailField label="Department" value={c.assignment?.department} color="#14532d" />
                <DetailField label="Assigned At" value={c.assignment?.assigned_at ? new Date(c.assignment.assigned_at).toLocaleDateString() : null} color="#14532d" />
                {c.assignment?.professor_name && <DetailField label="Professor" value={c.assignment.professor_name} color="#14532d" />}
              </div>
            </div>
          )}

          {c.status === 'rejected' && c.rejectionReason && (
            <div style={{ background: '#fde7e5', padding: '20px', borderRadius: '6px', border: '1px solid #fca5a5', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '15px', color: '#c4241e' }}>Rejection Reason</h3>
              <p style={{ margin: 0, color: '#991b1b', fontSize: '14px', whiteSpace: 'pre-wrap' }}>{c.rejectionReason}</p>
              {c.rejectedAt && <small style={{ display: 'block', marginTop: '8px', color: '#b91c1c' }}>Rejected on: {new Date(c.rejectedAt).toLocaleDateString()}</small>}
            </div>
          )}

          {c.informationRequest && c.informationRequest.message && (
            <div style={{ background: '#fef0cf', padding: '20px', borderRadius: '6px', border: '1px solid #fbbf24', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '15px', color: '#ae7200' }}>Information Request</h3>
              <p style={{ margin: 0, color: '#92400e', fontSize: '14px', whiteSpace: 'pre-wrap' }}>{c.informationRequest.message}</p>
              {c.informationRequest.requestedAt && <small style={{ display: 'block', marginTop: '8px', color: '#92400e' }}>Requested on: {new Date(c.informationRequest.requestedAt).toLocaleDateString()}</small>}
            </div>
          )}

          {c.additionalInformation && c.additionalInformation.message && (
            <div style={{ background: '#f0f9ff', padding: '20px', borderRadius: '6px', border: '1px solid #bae6fd', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '15px', color: '#0369a1' }}>Citizen Response</h3>
              <p style={{ margin: 0, color: '#0c4a6e', fontSize: '14px', whiteSpace: 'pre-wrap' }}>{c.additionalInformation.message}</p>
              {c.additionalInformation.submittedAt && <small style={{ display: 'block', marginTop: '8px', color: '#0369a1' }}>Submitted on: {new Date(c.additionalInformation.submittedAt).toLocaleDateString()}</small>}
            </div>
          )}

          {c.statusHistory && c.statusHistory.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#0f172a' }}>Status History</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {c.statusHistory.map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', padding: '10px 16px', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '13px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ color: '#64748b', minWidth: '100px' }}>{h.changedAt ? new Date(h.changedAt).toLocaleDateString() : '—'}</span>
                    <StatusBadge status={h.from} />
                    <span style={{ color: '#94a3b8' }}>→</span>
                    <StatusBadge status={h.to} />
                    {h.reason && <span style={{ color: '#64748b', marginLeft: '8px', fontStyle: 'italic' }}>({h.reason})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {c.supportingDocuments && c.supportingDocuments.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '15px', color: '#0f172a' }}>Supporting Documents</h3>
              {c.supportingDocuments.map((doc, i) => (
                <a key={i} href={`${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000'}/uploads/${doc}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', color: '#064477', fontSize: '13px', marginBottom: '4px' }}>📎 {doc}</a>
              ))}
            </div>
          )}

          {c.verifiedAt && <div style={{ marginTop: '16px', fontSize: '12px', color: '#08743f' }}>✓ Verified on {new Date(c.verifiedAt).toLocaleDateString()}</div>}
          {c.resolvedAt && <div style={{ marginTop: '4px', fontSize: '12px', color: '#08743f' }}>✓ Resolved on {new Date(c.resolvedAt).toLocaleDateString()}</div>}
        </DetailModal>
      );
    }

    // ── Institution Detail ──
    if (detailModal.type === 'institution') {
      const { institution: inst, assignedChallenges } = detailModal.data;
      return (
        <DetailModal title={inst.name || 'Institution Details'} onClose={closeModal}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <DetailField label="Institution ID" value={inst._id?.slice(-8).toUpperCase()} />
            <DetailField label="Type" value={inst.type} />
            <DetailField label="AISHE Code" value={inst.aisheCode} />
            <DetailField label="District" value={inst.district} />
            <DetailField label="Email Domain" value={inst.emailDomain} />
            <DetailField label="Facilities" value={inst.facilities ? `${inst.facilities} Labs` : null} />
            <DetailField label="Similar Projects Completed" value={inst.similarProjectsCompleted?.toString()} />
            <DetailField label="Registered On" value={inst.createdAt ? new Date(inst.createdAt).toLocaleDateString() : null} />
          </div>

          {inst.departments && inst.departments.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <small style={{ display: 'block', color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Departments</small>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {inst.departments.map((d, i) => (
                  <span key={i} style={{ background: '#dbeafe', color: '#1d4ed8', padding: '4px 12px', borderRadius: '3px', fontSize: '12px', fontWeight: 600 }}>{d}</span>
                ))}
              </div>
            </div>
          )}

          {inst.researchDomains && inst.researchDomains.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <small style={{ display: 'block', color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Research Domains</small>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {inst.researchDomains.map((d, i) => (
                  <span key={i} style={{ background: '#ede9fe', color: '#6d28d9', padding: '4px 12px', borderRadius: '3px', fontSize: '12px', fontWeight: 600 }}>{d}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: '24px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#0f172a' }}>Assigned Challenges ({assignedChallenges?.length || 0})</h3>
            {(!assignedChallenges || assignedChallenges.length === 0) ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#666', background: '#f8fafc', borderRadius: '6px' }}>No challenges assigned to this institution.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {assignedChallenges.map(ch => (
                  <div key={ch._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <b style={{ fontSize: '13px', color: '#111' }}>{ch.title}</b>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{ch.category} • {ch.district}</div>
                    </div>
                    <StatusBadge status={ch.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </DetailModal>
      );
    }

    // ── Industry Detail ──
    if (detailModal.type === 'industry') {
      const ind = detailModal.data;
      return (
        <DetailModal title={ind.name || 'Industry Details'} onClose={closeModal}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <DetailField label="Industry ID" value={ind._id?.slice(-8).toUpperCase()} />
            <DetailField label="Industry Type" value={ind.industryType} />
            <DetailField label="Collaboration Status" value={ind.collaborationStatus} color={ind.collaborationStatus === 'Active' ? '#08743f' : '#ae7200'} />
            <DetailField label="Registered On" value={ind.createdAt ? new Date(ind.createdAt).toLocaleDateString() : null} />
            <DetailField label="Associated Projects" value={`${ind.associatedProjects?.length || 0} Projects`} />
          </div>

          {ind.associatedProjects && ind.associatedProjects.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#0f172a' }}>Associated Projects</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {ind.associatedProjects.map(p => (
                  <div key={p._id || p} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                    {typeof p === 'object' ? (
                      <>
                        <div>
                          <b style={{ fontSize: '13px', color: '#111' }}>{p.title}</b>
                          <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{p.category} • {p.district}</div>
                        </div>
                        <StatusBadge status={p.status} />
                      </>
                    ) : (
                      <span style={{ fontSize: '13px', color: '#666' }}>Project ID: {p}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DetailModal>
      );
    }

    // ── Verification Detail ──
    if (detailModal.type === 'verification') {
      const v = detailModal.data;
      const isInst = v.role === 'institution';
      const isInd = v.role === 'industry';
      const roleLabel = isInst ? 'Institution / HEI' : isInd ? 'Industry' : v.role;

      return (
        <DetailModal title={`${roleLabel} Verification`} onClose={closeModal}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <DetailField label={isInst ? "Institution Name" : "Company/Industry Name"} value={v.name} />
            <DetailField label="Account ID" value={v._id?.slice(-8).toUpperCase()} />
            <DetailField label="Official Email" value={v.email} />
            <DetailField label="Official Contact Number" value={v.phone} />
            <DetailField label={isInst ? "Institution Type" : "Industry Type"} value="N/A" />
            <DetailField label="Registration Date" value={v.createdAt ? new Date(v.createdAt).toLocaleDateString() : 'N/A'} />
            <DetailField label="Account Status" value={v.verificationStatus === 'Approved' ? 'Active' : 'Inactive'} color={v.verificationStatus === 'Approved' ? '#08743f' : '#64748b'} />
            <DetailField label="Verification Status" value={v.verificationStatus} />
          </div>

          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
             <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#0f172a' }}>Verification Review</h3>
             <p style={{ margin: 0, color: '#475569', fontSize: '13px', lineHeight: '1.5' }}>
               Please review the organization's information carefully. Approving this account will grant them access to the platform to collaborate on societal challenges. Rejecting it will keep their account inactive.
             </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginTop: '20px' }}>
             <button className="outline" onClick={closeModal} style={{ color: '#475569', borderColor: '#cbd5e1' }} disabled={detailModal.processing}>Close</button>
             <button style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 600, cursor: detailModal.processing ? 'not-allowed' : 'pointer' }} disabled={detailModal.processing} onClick={async () => {
               const reason = window.prompt("Please provide a reason for rejecting this account:");
               if (!reason) return;
               
               setDetailModal(prev => ({ ...prev, processing: true }));
               try {
                 const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/verifications/${v._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                    body: JSON.stringify({ status: 'Rejected', reason })
                 });
                 if (res.ok) {
                   setVerifications(prev => prev.filter(item => item._id !== v._id));
                   closeModal();
                   alert('Account rejected successfully.');
                 } else {
                   alert('Failed to reject account.');
                   setDetailModal(prev => ({ ...prev, processing: false }));
                 }
               } catch (e) {
                 alert('Network error');
                 setDetailModal(prev => ({ ...prev, processing: false }));
               }
             }}>
               {detailModal.processing ? 'Processing...' : 'Reject'}
             </button>
             <button style={{ background: '#08743f', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 600, cursor: detailModal.processing ? 'not-allowed' : 'pointer' }} disabled={detailModal.processing} onClick={async () => {
               const confirmApprove = window.confirm("Are you sure you want to verify this account? Once verified, the organization will be authorized to log in and access its dashboard.");
               if (!confirmApprove) return;
               
               setDetailModal(prev => ({ ...prev, processing: true }));
               try {
                 const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/verifications/${v._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                    body: JSON.stringify({ status: 'Approved' })
                 });
                 if (res.ok) {
                   setVerifications(prev => prev.filter(item => item._id !== v._id));
                   closeModal();
                   alert('Account approved successfully.');
                 } else {
                   alert('Failed to approve account.');
                   setDetailModal(prev => ({ ...prev, processing: false }));
                 }
               } catch (e) {
                 alert('Network error');
                 setDetailModal(prev => ({ ...prev, processing: false }));
               }
             }}>
               {detailModal.processing ? 'Processing...' : 'Approve / Verify'}
             </button>
          </div>
        </DetailModal>
      );
    }

    return null;
  };

  return (
    <Shell active="Dashboard">
      <div className="ud-header" style={{ borderBottom: 'none' }}>
        <div>
          <h1>{greeting}, {user?.name || 'State Official'}</h1>
          <p>Review, validate and monitor societal challenges across Jharkhand.</p>
        </div>
        <aside>
          <span className="ud-notif-icon">🔔<i>4</i></span>
          <span className="ud-avatar" style={{cursor: 'pointer'}} onClick={() => location.hash = '#/profile'} title="My Profile">{user?.name ? user.name[0].toUpperCase() : 'S'}</span>
          <span className="ud-role-badge">{user?.role === 'admin' ? 'State Official' : 'Official'}</span>
        </aside>
      </div>

      <div className="off-layout">
        {/* Sidebar */}
        <aside className="off-sidebar">
          <div className="off-nav-group">
            <NavItem label="Overview" active={view === 'overview'} onClick={() => setView('overview')} />
          </div>
          <div className="off-nav-group-label">Challenges</div>
          <div className="off-nav-group">
            <NavItem label="Review Queue" active={view === 'review' || view === 'assign' || view === 'confirm' || view === 'queue'} onClick={() => setView('overview')} />
            <NavItem label="Verified" active={view === 'verified'} onClick={() => setView('verified')} />
            <NavItem label="Assigned" active={view === 'assigned'} onClick={() => setView('assigned')} />
            <NavItem label="All Challenges" active={view === 'all'} onClick={() => setView('all')} />
          </div>
          <div className="off-nav-group-label">Monitoring</div>
          <div className="off-nav-group">
            <NavItem label="Institutions" active={view === 'institutions'} onClick={() => setView('institutions')} />
            <NavItem label="Projects" active={view === 'projects'} onClick={() => setView('projects')} />
            <NavItem label="Industry Collaboration" active={view === 'industry'} onClick={() => setView('industry')} />
            <NavItem label="Account Verifications" active={view === 'verifications'} onClick={() => setView('verifications')} />
            <NavItem label="Analytics & Impact" active={view === 'analytics'} onClick={() => setView('analytics')} />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="off-main">

          {/* VIEW: OVERVIEW */}
          {view === 'overview' && (
            <div className="off-anim-in">
              <div className="off-kpi-grid">
                {kpis.map(k => (
                  <div key={k.label} className="off-kpi-card">
                    <b>{k.value}</b><span>{k.label}</span>
                  </div>
                ))}
              </div>

              <section className="ud-section" style={{ marginTop: '32px', borderColor: '#ffb000', borderLeftWidth: '4px' }}>
                <div className="ud-section-head" style={{ paddingBottom: '8px' }}><h3 style={{ color: '#ae7200' }}>Requires Your Attention</h3></div>
                <div className="off-urgent-list" style={{ padding: '0 24px 24px' }}>
                  {queue.filter(q => q.priority === 'High' || q.priority === 'Critical').map(q => (
                    <div key={q.id} className="off-urgent-item">
                      <div>
                        <span style={{ background: '#fde7e5', color: '#c4241e', padding: '2px 8px', borderRadius: '3px', fontSize: '11px', fontWeight: 600, display: 'inline-block', marginBottom: '4px' }}>{q.priority} Priority</span>
                        <h4 style={{ margin: '0 0 4px', fontSize: '14px', color: '#111' }}>{q.title}</h4>
                        <span style={{ fontSize: '12px', color: '#555' }}>{q.district} • {q.status} • {q.time}</span>
                      </div>
                      <button className="outline" onClick={() => { setSelectedChallenge(q); setView('review'); }}>Review →</button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="ud-section" style={{ marginTop: '24px' }}>
                <div className="ud-section-head"><h3>Challenge Review Queue</h3></div>
                <div className="ud-table" style={{ marginTop: '8px', borderTop: 'none' }}>
                  <div className="ud-table-head" style={{ gridTemplateColumns: '2fr 1.2fr 1fr .8fr .8fr 1fr 1fr' }}>
                    <span>Challenge</span><span>Domain</span><span>District</span><span>Priority</span><span>AI Score</span><span>Status</span><span>Action</span>
                  </div>
                  {queue.map(q => (
                    <div key={q.id} className="ud-table-row" style={{ gridTemplateColumns: '2fr 1.2fr 1fr .8fr .8fr 1fr 1fr', cursor: 'pointer' }} onClick={() => openChallengeDetail(q.id)}>
                      <span style={{ paddingRight: '12px' }}>
                        <b style={{ display: 'block', marginBottom: '4px' }}>{q.title}</b>
                      </span>
                      <span>{q.domain}</span>
                      <span>{q.district}</span>
                      <span style={{ color: (q.priority === 'High' || q.priority === 'Critical') ? '#c4241e' : '#ae7200', fontWeight: 600 }}>{q.priority}</span>
                      <span>{q.aiScore} Match</span>
                      <span>{q.status}</span>
                      <span style={{ color: '#064477', fontWeight: 600, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setSelectedChallenge(q); setView('review'); }}>Review →</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* VIEW: VERIFICATIONS */}
          {view === 'verifications' && (() => {
            const heiVerifications = verifications.filter(v => v.role === 'institution');
            const industryVerifications = verifications.filter(v => v.role === 'industry');

            const renderTable = (data, emptyMessage) => {
              if (data.length === 0) {
                return (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0', marginTop: '16px' }}>
                    {emptyMessage}
                  </div>
                );
              }
              return (
                  <div className="ud-table" style={{ marginTop: '16px', borderTop: 'none' }}>
                    <div className="ud-table-head" style={{ gridTemplateColumns: '2fr 1.5fr 2fr 1fr 1fr' }}>
                      <span>Name</span><span>Role</span><span>Email / Phone</span><span>Date</span><span>Action</span>
                    </div>
                    {data.map(v => (
                      <div key={v._id} className="ud-table-row" style={{ gridTemplateColumns: '2fr 1.5fr 2fr 1fr 1fr', cursor: 'pointer' }} onClick={() => openVerificationDetail(v)}>
                        <span style={{ fontWeight: 600 }}>{v.name}</span>
                        <span style={{ textTransform: 'capitalize' }}>{v.role === 'institution' ? 'HEI / University' : v.role}</span>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>{v.email}<br />{v.phone}</span>
                        <span>{new Date(v.createdAt).toLocaleDateString()}</span>
                        <span style={{ color: '#064477', fontWeight: 600, cursor: 'pointer' }}>Review →</span>
                      </div>
                    ))}
                  </div>
              );
            };

            return (
              <div className="ud-animate-fade-in">
                <section className="ud-section">
                  <div className="ud-section-head">
                    <h3>College / HEI Verification</h3>
                    <p>Pending College, University, and HEI registrations waiting for approval.</p>
                  </div>
                  {renderTable(heiVerifications, "No pending College/HEI verifications at this time.")}
                </section>

                <section className="ud-section" style={{ marginTop: '32px' }}>
                  <div className="ud-section-head">
                    <h3>Industry Verification</h3>
                    <p>Pending Industry and Company registrations waiting for approval.</p>
                  </div>
                  {renderTable(industryVerifications, "No pending Industry verifications at this time.")}
                </section>
              </div>
            );
          })()}

          {/* VIEW: REVIEW DETAIL */}
          {view === 'review' && (
            <div className="off-anim-in">
              <PageHead crumb="Dashboard  /  Review Queue" title={`Review Challenge: ${selectedChallenge?.title}`} subtitle={`ID: ${selectedChallenge?.id} • Submitted ${selectedChallenge?.time}`} actions={<button className="outline" onClick={() => setView('overview')}>← Back to Queue</button>} />

              <div className="form-layout" style={{ minHeight: 'auto', padding: '24px 0 0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ background: '#fff', border: '1px solid #d2d7d3', borderRadius: '4px', padding: '24px' }}>
                    <h3 style={{ margin: '0 0 16px', color: '#064477', fontSize: '16px', paddingBottom: '12px', borderBottom: '1px solid #eee' }}>Challenge Information</h3>
                    <div style={{ display: 'grid', gap: '20px' }}>
                      <div><small style={{ display: 'block', color: '#747a76', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Detailed Description</small><p style={{ margin: '4px 0 0', fontSize: '14px', lineHeight: 1.5, color: '#333' }}>{selectedChallenge?.description}</p></div>
                      <div className="two">
                        <div><small style={{ display: 'block', color: '#747a76', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Location</small><b style={{ marginTop: '4px', fontSize: '13px', display: 'block', fontWeight: 500 }}>{selectedChallenge?.district}</b></div>
                        <div><small style={{ display: 'block', color: '#747a76', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>People Affected</small><b style={{ marginTop: '4px', fontSize: '13px', display: 'block', fontWeight: 500 }}>{selectedChallenge?.peopleAffected}+</b></div>
                      </div>
                      <div><small style={{ display: 'block', color: '#747a76', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Evidence Provided</small><span style={{ color: '#064477', fontWeight: 500, fontSize: '13px', display: 'block', marginTop: '4px', cursor: 'pointer' }}>{selectedChallenge?.evidence === 'Strong' ? '📎 attached_documents' : 'No documents'}</span></div>
                    </div>
                  </div>

                  <div className="off-ai-box">
                    <h3 style={{ margin: '0 0 16px', color: '#08743f', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>✨ Automated AI Assessment</h3>
                    <div className="two" style={{ gap: '16px' }}>
                      <div><span style={{ display: 'block', fontSize: '11px', color: '#666' }}>Domain</span><b style={{ fontSize: '13px', color: '#111' }}>{selectedChallenge?.domain}</b></div>
                      <div><span style={{ display: 'block', fontSize: '11px', color: '#666' }}>Priority</span><b style={{ fontSize: '13px', color: '#c4241e' }}>{selectedChallenge?.priority}</b></div>
                      <div><span style={{ display: 'block', fontSize: '11px', color: '#666' }}>Duplicate Probability</span><b style={{ fontSize: '13px', color: '#111' }}>8% (Unique)</b></div>
                      <div><span style={{ display: 'block', fontSize: '11px', color: '#666' }}>Evidence Quality</span><b style={{ fontSize: '13px', color: '#111' }}>{selectedChallenge?.evidence}</b></div>
                      <div><span style={{ display: 'block', fontSize: '11px', color: '#666' }}>Completeness</span><b style={{ fontSize: '13px', color: '#111' }}>92%</b></div>
                      <div><span style={{ display: 'block', fontSize: '11px', color: '#666' }}>Recommended Action</span><b style={{ fontSize: '13px', color: '#08743f' }}>Proceed to Verification</b></div>
                    </div>
                    <p style={{ margin: '16px 0 0', fontSize: '11px', color: '#666', fontStyle: 'italic', borderTop: '1px solid #d5e5db', paddingTop: '12px' }}>Note: AI assessment is advisory. Final validation is performed by the authorized official.</p>
                  </div>
                </div>

                <aside className="help" style={{ gap: '20px' }}>
                  <div style={{ borderColor: '#d2d7d3', background: '#fff', padding: '20px' }}>
                    <h3 style={{ margin: '0 0 16px', color: '#111', fontSize: '15px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>Verification Checklist</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {['Problem description is clear', 'Location is valid', 'Supporting evidence is sufficient', 'Problem falls within platform scope', 'No duplicate challenge identified', 'Community impact is credible'].map(c => (
                        <label key={c} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer' }}>
                          <input type="checkbox" style={{ marginTop: '3px' }} /> <span style={{ fontSize: '13px', lineHeight: 1.4, color: '#333' }}>{c}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button style={{ width: '100%' }} onClick={() => {
                      const id = selectedChallenge.id || selectedChallenge._id;
                      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/challenges/${id}/status`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                        body: JSON.stringify({ status: 'verified' })
                      })
                      .then(res => {
                        if (!res.ok) throw new Error('Verification failed');
                        return fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/match/${id}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
                      })
                      .then(r => r.json())
                      .then(data => { setMatches(data); setView('assign'); })
                      .catch(err => alert(err.message));
                    }}>Approve & Assign →</button>
                    <button className="outline" style={{ width: '100%', borderColor: '#064477', color: '#064477' }} onClick={() => {
                      const msg = window.prompt("What additional information is required from the citizen?");
                      if (!msg || !msg.trim()) return;
                      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/challenges/${selectedChallenge.id || selectedChallenge._id}/status`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                        body: JSON.stringify({ status: 'information_requested', message: msg })
                      }).then(() => setView('overview'));
                    }}>Request More Information</button>
                    <button className="outline" style={{ width: '100%', borderColor: '#c4241e', color: '#c4241e' }} onClick={() => {
                      const reason = window.prompt("Please provide a reason for rejecting this challenge:");
                      if (!reason || !reason.trim()) return;
                      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/challenges/${selectedChallenge.id || selectedChallenge._id}/status`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                        body: JSON.stringify({ status: 'rejected', rejectionReason: reason })
                      }).then(() => setView('overview'));
                    }}>Reject Challenge</button>
                  </div>
                </aside>
              </div>
            </div>
          )}

          {/* VIEW: ASSIGN TO UNIVERSITY */}
          {view === 'assign' && (
            <div className="off-anim-in">
              <PageHead crumb={`Dashboard  /  Review Queue  /  ${selectedChallenge?.id?.slice(0, 8)}`} title="University Matching" subtitle={`Select the best institution to develop a solution for ${selectedChallenge?.title}`} actions={<button className="outline" onClick={() => setView('review')}>← Back to Review</button>} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px', maxWidth: '800px' }}>
                <h3 style={{ margin: 0, color: '#064477', fontSize: '16px' }}>Recommended Institutions</h3>
                <p style={{ margin: '0 0 8px', color: '#555', fontSize: '13px' }}>AI match considers research domain, faculty expertise, lab facilities, and geographic proximity.</p>

                {matches.map((m, i) => (
                  <div key={m.id || m.name} className="off-match-card">
                    <div className="off-match-header">
                      <div>
                        <h4 style={{ margin: '0 0 4px', fontSize: '16px', color: '#111' }}>{m.name}</h4>
                        <span style={{ fontSize: '13px', color: '#555' }}>Distance: {m.distance}</span>
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
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
                      <button onClick={() => {
                        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/challenges/${selectedChallenge.id || selectedChallenge._id}/assign`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                          body: JSON.stringify({ institutionId: m.id })
                        }).then(res => {
                          if (res.ok) setView('confirm');
                          else res.json().then(d => alert(d.message || 'Failed to assign challenge'));
                        });
                      }}>Select Institution →</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: CONFIRMATION */}
          {view === 'confirm' && (
            <div className="off-anim-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '60px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#e8f4ed', color: '#08743f', fontSize: '32px', display: 'grid', placeItems: 'center', marginBottom: '24px' }}>✓</div>
              <h2 style={{ margin: '0 0 12px', color: '#064e3b', fontSize: '24px' }}>Challenge Assigned Successfully</h2>
              <p style={{ margin: '0 0 32px', color: '#555', fontSize: '14px', textAlign: 'center', maxWidth: '400px' }}>{selectedChallenge?.title} ({selectedChallenge?.id?.slice(0, 8)}) has been verified and assigned for solution development.</p>

              <div style={{ background: '#fff', border: '1px solid #d2d7d3', borderRadius: '4px', padding: '24px', width: '100%', maxWidth: '500px', marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #eee', marginBottom: '12px' }}>
                  <span style={{ color: '#777', fontSize: '13px' }}>Priority</span><b style={{ color: '#c4241e', fontSize: '13px' }}>{selectedChallenge?.priority}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #eee', marginBottom: '12px' }}>
                  <span style={{ color: '#777', fontSize: '13px' }}>Domain</span><b style={{ fontSize: '13px' }}>{selectedChallenge?.domain}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#777', fontSize: '13px' }}>Notifications Sent To</span><b style={{ fontSize: '13px' }}>Nodal Officer, Citizen</b>
                </div>
              </div>

              <button onClick={() => setView('overview')}>Return to Queue</button>
            </div>
          )}

          {/* VIEWS: ALL, VERIFIED, ASSIGNED */}
          {['all', 'verified', 'assigned'].includes(view) && (
            <div className="off-anim-in">
              <PageHead title={view.charAt(0).toUpperCase() + view.slice(1).replace('-', ' ')} subtitle={`Manage and monitor ${view === 'all' ? 'all challenges' : view + ' challenges'} across the state.`} />

              <section className="ud-section" style={{ marginTop: '24px' }}>
                <div className="ud-section-head"><h3>{view === 'all' ? 'All Challenges' : view === 'verified' ? 'Verified Challenges' : 'Assigned Challenges'}</h3></div>
                <div className="ud-table" style={{ marginTop: '8px', borderTop: 'none' }}>
                  <div className="ud-table-head" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr .6fr' }}>
                    <span>Challenge</span><span>District</span><span>Domain</span><span>Priority</span><span>Status</span><span></span>
                  </div>
                  {allChallenges.filter(c => {
                    if (view === 'all') return true;
                    if (view === 'verified') return c.status === 'verified';
                    if (view === 'assigned') return c.status === 'assigned';
                    return false;
                  }).length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>No challenges found for this view.</div>
                  ) : allChallenges.filter(c => {
                    if (view === 'all') return true;
                    if (view === 'verified') return c.status === 'verified';
                    if (view === 'assigned') return c.status === 'assigned';
                    return false;
                  }).map(c => (
                    <div key={c._id} className="ud-table-row" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr .6fr', cursor: 'pointer' }} onClick={() => openChallengeDetail(c._id)}>
                      <span><b>{c.title}</b></span>
                      <span>{c.district}</span>
                      <span>{c.category}</span>
                      <span style={{ color: (c.urgencySeverity === 'High' || c.urgencySeverity === 'Critical') ? '#c4241e' : '#ae7200', fontWeight: 600 }}>{c.urgencySeverity}</span>
                      <span style={{ color: '#08743f', fontWeight: 600 }}>{c.status.replace('_', ' ')}</span>
                      <span style={{ color: '#064477', fontWeight: 600, fontSize: '13px' }}>View →</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* INSTITUTIONS AND PROJECTS VIEWS */}
          {['institutions', 'projects', 'industry'].includes(view) && (
            <div className="off-anim-in">
              <PageHead title={view.charAt(0).toUpperCase() + view.slice(1).replace('-', ' ')} subtitle={`Manage and monitor ${view} across the state.`} />

              {view === 'institutions' && (
                <section className="ud-section" style={{ marginTop: '24px' }}>
                  <div className="ud-section-head"><h3>Participating Institutions</h3></div>
                  <div className="ud-table" style={{ marginTop: '8px', borderTop: 'none' }}>
                    <div className="ud-table-head" style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1fr .6fr' }}>
                      <span>Institution</span><span>Type</span><span>District</span><span>Departments</span><span></span>
                    </div>
                    {institutions.length === 0 ? <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>No institutions found.</div> : institutions.map(i => (
                      <div key={i._id} className="ud-table-row" style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1fr .6fr', cursor: 'pointer' }} onClick={() => openInstitutionDetail(i._id)}>
                        <span><b>{i.name}</b></span>
                        <span>{i.type}</span>
                        <span>{i.district}</span>
                        <span>{i.departments.join(', ')}</span>
                        <span style={{ color: '#064477', fontWeight: 600, fontSize: '13px' }}>View →</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {view === 'projects' && (
                <section className="ud-section" style={{ marginTop: '24px' }}>
                  <div className="ud-section-head"><h3>Active Projects</h3></div>
                  <div className="ud-table" style={{ marginTop: '8px', borderTop: 'none' }}>
                    <div className="ud-table-head" style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1fr .6fr' }}>
                      <span>Challenge</span><span>Assigned Institution</span><span>Status</span><span>Created</span><span></span>
                    </div>
                    {allChallenges.filter(c => c.status === 'in_progress' || c.status === 'assigned').length === 0 ? <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>No active projects found.</div> : allChallenges.filter(c => c.status === 'in_progress' || c.status === 'assigned').map(c => (
                      <div key={c._id} className="ud-table-row" style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1fr .6fr', cursor: 'pointer' }} onClick={() => openChallengeDetail(c._id)}>
                        <span><b>{c.title}</b></span>
                        <span>{c.institution ? institutions.find(i => i._id === c.institution)?.name || 'Unknown' : 'Pending Allocation'}</span>
                        <span style={{ color: '#08743f', fontWeight: 600 }}>{c.status.replace('_', ' ')}</span>
                        <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                        <span style={{ color: '#064477', fontWeight: 600, fontSize: '13px' }}>View →</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {view === 'industry' && (
                <section className="ud-section" style={{ marginTop: '24px' }}>
                  <div className="ud-section-head"><h3>Industry Collaborations</h3></div>
                  <div className="ud-table" style={{ marginTop: '8px', borderTop: 'none' }}>
                    <div className="ud-table-head" style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1fr .6fr' }}>
                      <span>Industry</span><span>Type</span><span>Status</span><span>Associated Projects</span><span></span>
                    </div>
                    {industries.length === 0 ? <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>No industries found.</div> : industries.map(i => (
                      <div key={i._id} className="ud-table-row" style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1fr .6fr', cursor: 'pointer' }} onClick={() => openIndustryDetail(i._id)}>
                        <span><b>{i.name}</b></span>
                        <span>{i.industryType}</span>
                        <span style={{ color: i.collaborationStatus === 'Active' ? '#08743f' : '#ae7200', fontWeight: 600 }}>{i.collaborationStatus}</span>
                        <span>{i.associatedProjects?.length || 0} Projects</span>
                        <span style={{ color: '#064477', fontWeight: 600, fontSize: '13px' }}>View →</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* VIEW: ANALYTICS & IMPACT */}
          {view === 'analytics' && (
            <div className="off-anim-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: '20px', color: '#064477' }}>Government Analytics Dashboard</h2>
                  <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>Statewide performance overview — Higher Education Department, Jharkhand</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <select style={{ height: '36px', padding: '0 16px', border: '1px solid #064477', borderRadius: '4px', background: '#fff', color: '#064477', fontWeight: 600 }}><option>District: All Districts</option></select>
                  <button className="outline">Export PDF</button>
                  <button className="outline">Export Excel</button>
                </div>
              </div>

              {(() => {
                const totalChallenges = allChallenges.length;
                const deployed = allChallenges.filter(c => c.status === 'resolved' || c.status === 'completed').length;
                const resolutionRate = totalChallenges ? ((deployed / totalChallenges) * 100).toFixed(1) + '%' : '0%';

                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const monthCounts = new Array(12).fill(0);
                allChallenges.forEach(c => {
                  const d = new Date(c.createdAt);
                  if (d.getFullYear() === 2026) {
                    monthCounts[d.getMonth()]++;
                  }
                });

                const statusCounts = {};
                allChallenges.forEach(c => {
                  const s = c.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                  statusCounts[s] = (statusCounts[s] || 0) + 1;
                });

                const topStatuses = Object.entries(statusCounts)
                  .map(([name, count]) => ({ name, count, pct: totalChallenges ? Math.round((count / totalChallenges) * 100) : 0 }))
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 4);

                return (
                  <>
                    <section className="metrics">
                      {[
                        [totalChallenges.toString(), 'Total Challenges', 'Total records found'],
                        [deployed.toString(), 'Solutions Deployed', 'Resolved or completed'],
                        [institutions.length.toString(), 'Institutions Onboarded', 'Active on platform'],
                        [resolutionRate, 'Avg. Resolution Rate', 'Percentage of resolved cases'],
                        [industries.length.toString(), 'Industries Associated', 'Active partners']
                      ].map(x => <div key={x[1]}><b>{x[0]}</b><span>{x[1]}</span><small>{x[2]}</small></div>)}
                    </section>
                    <div className="chart-row">
                      <section className="line-chart">
                        <h3>Monthly Challenge Submissions (2026)</h3>
                        <div className="line"><i /><i /><i /><i /><i /><i /></div>
                        <div className="months">{months.join(' ')}</div>
                        <div className="month-values" style={{ wordSpacing: '8px' }}>{monthCounts.join(' ')}</div>
                      </section>
                      <section className="donut">
                        <h3>Status Distribution</h3>
                        <div>
                          <i />
                          <aside>
                            {topStatuses.length > 0 ? topStatuses.map(s => (
                              <span key={s.name}>■ &nbsp;{s.name} ({s.pct}%)</span>
                            )) : <span>No data available</span>}
                          </aside>
                        </div>
                      </section>
                    </div>
                  </>
                );
              })()}

              <section className="district" style={{ marginTop: '32px', background: '#fff', padding: '24px', borderRadius: '4px', border: '1px solid #d2d7d3' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#111', fontSize: '18px' }}>District-wise Challenge Volume</h3>
                <div className="records">
                  <div className="record-row head" style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr' }}>
                    <b style={{ color: '#64748b' }}>District</b><b style={{ color: '#64748b' }}>Submitted</b><b style={{ color: '#64748b' }}>In Progress</b><b style={{ color: '#64748b' }}>Completed</b><b style={{ color: '#64748b' }}>Institutions Active</b>
                  </div>
                  {analytics.map((r, i) => (
                    <div className="record-row" key={i} style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr' }}>
                      {r.map((x, j) => <span key={j} style={j === 0 ? { fontWeight: 600, color: '#111' } : {}}>{x}</span>)}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

        </main>
      </div>

      {/* Detail Modal Overlay */}
      {renderDetailModal()}
    </Shell>
  );
}
