import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { API_BASE } from '@/api/axios';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  ArrowLeft, Mail, Phone, MapPin, Briefcase, FileText,
  Plus, Pencil, X, Star, User, GraduationCap, Users, Trash2
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import ConfirmModal from '@/components/ConfirmModal';
import './CandidateDetail.css';

/**
 * ── CONSTANTS ─────────────────────────────────────────────────────────────
 */
const STATUS_OPTIONS = ['Applied', 'Screening', 'Interview', 'Offered', 'Hired', 'Rejected'];
const COMMON_SKILLS = ['Python', 'SQL', 'Fastapi', 'React', 'Node.js', 'AWS'];
const RECOMMENDATION_LABELS = { 'Hire': 'Hired', 'Reject': 'Rejected', 'Next Round': 'On Hold' };
const RECOMMENDATION_BADGES = { 'Hire': 'badge-hired', 'Reject': 'badge-rejected', 'Next Round': 'badge-screening' };

/**
 * ── HELPERS ───────────────────────────────────────────────────────────────
 */
const getStatusBadgeClass = (s) => {
  const m = { Applied: 'badge-applied', Screening: 'badge-screening', Interview: 'badge-interview', Offered: 'badge-offered', Hired: 'badge-hired', Rejected: 'badge-rejected' };
  return m[s] || 'badge-applied';
};

const formatDate = (ds) => {
  if (!ds) return 'N/A';
  return new Date(ds).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const StarRating = ({ rating, setRating, size = 22, cursor = 'pointer' }) => (
  <div style={{ display: 'flex', gap: '8px' }}>
    {[1, 2, 3, 4, 5].map(s => (
      <Star key={s} size={size} fill={rating >= s ? '#facc15' : 'none'} color={rating >= s ? '#facc15' : '#e2e8f0'} style={{ cursor }} onClick={() => setRating && setRating(s)} />
    ))}
  </div>
);

/**
 * ── MAIN COMPONENT ────────────────────────────────────────────────────────
 */
export default function CandidateDetail() {
  const { id: rawId } = useParams();
  const id = useMemo(() => rawId ? rawId.replace(/^:/, '') : null, [rawId]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [candidate, setCandidate] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [assessmentType, setAssessmentType] = useState('Tech Round');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const dashboardPath = user?.role === 'INTERVIEWER' ? '/interview' : '/candidates';

  const fetchCandidate = useCallback(async () => {
    try {
      const res = await api.get(`/candidates/${id}`);
      setCandidate(res.data);
    } catch (err) {
      toast.error('Failed to load candidate');
      navigate(dashboardPath);
    }
  }, [id, navigate, dashboardPath, toast]);

  const fetchAssessments = useCallback(async () => {
    try {
      const res = await api.get(`/assessments/candidate/${id}`);
      setAssessments(res.data);
    } catch (err) { console.error(err); }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchCandidate(), fetchAssessments()]);
      setTimeout(() => setLoading(false), 100);
    };
    load();
  }, [id, fetchCandidate, fetchAssessments]);

  const handleSaveAssessment = async (fd) => {
    try {
      const payload = { ...fd, assessment_type: assessmentType };
      if (editingAssessment) await api.put(`/assessments/${editingAssessment.id}`, payload);
      else await api.post('/assessments', { ...payload, candidate_id: parseInt(id) });
      toast.success('Assessment saved');
      setShowAssessmentModal(false);
      setEditingAssessment(null);
      fetchAssessments();
      fetchCandidate();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error saving assessment');
    }
  };

  const handleDeleteCandidate = async () => {
    try {
      const name = candidate.full_name;
      await api.delete(`/candidates/${id}`);
      toast.warning(`${name} has been deleted successfully.`);
      navigate(dashboardPath);
    } catch (err) {
      toast.error('Error deleting candidate');
    }
  };

  const openAssessmentModal = (t, e = null) => {
    setEditingAssessment(e);
    setAssessmentType(t || (e ? e.assessment_type : 'Tech Round'));
    setShowAssessmentModal(true);
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!candidate || !candidate.full_name) return null;

  const photoUrl = candidate.photo_url ? `${API_BASE}${candidate.photo_url}` : null;
  const cvUrl = candidate.cv_url ? `${API_BASE}${candidate.cv_url}` : null;

  return (
    <div className="detail-page">
      <header className="detail-header">
        <button className="icon-btn" onClick={() => navigate(dashboardPath)}><ArrowLeft size={20} /></button>
        <div className="detail-header-info">
          <div className="detail-name-row">
            <h1>{candidate.full_name}</h1>
            <span className={`badge ${getStatusBadgeClass(candidate.status)}`}>{candidate.status}</span>
          </div>
          <p className="detail-position">{candidate.position_applied}</p>
        </div>
      </header>

      <div className="detail-actions">
        <button className="btn btn-primary btn-sm" onClick={() => openAssessmentModal('Tech Round')}><Plus size={14} /> Tech Round</button>
        <button className="btn btn-outline btn-sm" onClick={() => openAssessmentModal('HR Round')}><Plus size={14} /> HR Round</button>
        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/apply/${id}`)}><Pencil size={14} /> Edit Details</button>
        {user?.role === 'ADMIN' && (
          <button 
            className="btn btn-danger btn-sm" 
            onClick={() => setShowDeleteConfirm(true)}
            style={{ 
              backgroundColor: 'var(--color-error)', 
              color: 'white', 
              borderColor: 'var(--color-error)',
              marginLeft: 'auto'
            }}
          >
            <Trash2 size={14} /> Delete Candidate
          </button>
        )}
      </div>

      <ConfirmModal 
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteCandidate}
        title="Delete Candidate"
        message={`Are you sure you want to permanently delete candidate ${candidate.full_name}? This action cannot be undone.`}
        confirmText="Delete"
      />

      <div className="tabs">
        {['profile', 'history', 'assessments'].map(t => (
          <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)} {t === 'assessments' && `(${assessments.length})`}
          </button>
        ))}
      </div>

      <div className="detail-content animate-fade-in">
        {activeTab === 'profile' && (
          <>
            <div className="detail-grid-2">
              <div className="profile-section" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h3 className="section-title" style={{ width: '100%', marginBottom: '12px' }}>Photo</h3>
                {photoUrl ? <img src={photoUrl} className="detail-photo" onClick={() => setShowPhotoModal(true)} /> : <div className="detail-photo-placeholder"><User size={48} /></div>}
              </div>
              <div className="profile-section" style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 className="section-title">Curriculum Vitae</h3>
                <div className="cv-container" style={{ border: '1px solid var(--color-border)', borderRadius: '8px', flex: 1, minHeight: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface)', padding: '24px' }}>
                  {cvUrl ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                      <FileText size={48} style={{ color: 'var(--color-primary)', opacity: 0.5 }} />
                      <button onClick={() => window.open(cvUrl, '_blank')} className="btn btn-primary" style={{ padding: '12px 24px' }}>View CV File</button>
                      <p className="sub-text">Preview not loaded (Click to View)</p>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <FileText size={32} style={{ color: 'var(--color-text-muted)', marginBottom: '12px', opacity: 0.3 }} /><p className="text-muted">No CV uploaded</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="profile-section">
              <h3 className="section-title" style={{ border: 'none' }}>Personal Information</h3>
              <div className="info-grid">
                <div className="info-item"><span className="info-label">DATE OF BIRTH</span><span className="info-value">{formatDate(candidate.date_of_birth)}</span></div>
                <div className="info-item"><span className="info-label">GENDER</span><span className="info-value">{candidate.gender || 'N/A'}</span></div>
                <div className="info-item"><span className="info-label">MARITAL STATUS</span><span className="info-value">{candidate.marital_status || 'N/A'}</span></div>
              </div>
            </div>

            <div className="profile-section">
              <h3 className="section-title" style={{ border: 'none' }}>Contact Information</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="contact-row" style={{ alignItems: 'flex-start' }}>
                  <Mail className="contact-icon" />
                  <div>
                    <span className="info-label" style={{ display: 'block', marginBottom: '2px' }}>EMAIL ADDRESS</span>
                    <a href={`mailto:${candidate.email}`} className="contact-link" style={{ fontSize: '0.95rem' }}>{candidate.email}</a>
                  </div>
                </div>
                
                <div className="contact-row" style={{ alignItems: 'flex-start' }}>
                  <Phone className="contact-icon" />
                  <div>
                    <span className="info-label" style={{ display: 'block', marginBottom: '2px' }}>PHONE NUMBER</span>
                    <a href={`tel:${candidate.phone}`} className="contact-link" style={{ fontSize: '0.95rem' }}>{candidate.phone}</a>
                  </div>
                </div>

                <div className="contact-row" style={{ alignItems: 'flex-start' }}>
                  <MapPin className="contact-icon" />
                  <div>
                    <span className="info-label" style={{ display: 'block', marginBottom: '4px' }}>CURRENT ADDRESS</span>
                    <span style={{ color: 'var(--color-text-primary)', fontSize: '0.95rem', fontWeight: 600, lineHeight: '1.4' }}>{candidate.current_address || 'N/A'}</span>
                    <p className="sub-text" style={{ marginTop: '2px', fontWeight: 500 }}>{candidate.current_city}, {candidate.current_state}</p>
                  </div>
                </div>

                {candidate.permanent_address && (
                  <div className="contact-row" style={{ alignItems: 'flex-start' }}>
                    <MapPin className="contact-icon" style={{ opacity: 0.6 }} />
                    <div>
                      <span className="info-label" style={{ display: 'block', marginBottom: '4px' }}>PERMANENT ADDRESS</span>
                      <span style={{ color: 'var(--color-text-primary)', fontSize: '0.95rem', fontWeight: 600, lineHeight: '1.4' }}>{candidate.permanent_address}</span>
                      <p className="sub-text" style={{ marginTop: '2px', fontWeight: 500 }}>{candidate.permanent_city}, {candidate.permanent_state}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="profile-section">
              <h3 className="section-title" style={{ border: 'none' }}>Position Details</h3>
              <div className="info-grid">
                <div className="info-item"><span className="info-label">EXPERIENCE</span><span className="info-value">{candidate.experience_years}y {candidate.experience_months || 0}m</span></div>
                <div className="info-item"><span className="info-label">Current CTC</span><span className="info-value">{candidate.current_ctc ? `${candidate.current_ctc} LPA` : 'N/A'}</span></div>
                <div className="info-item"><span className="info-label">EXPECTED CTC</span><span className="info-value">{candidate.expected_ctc ? `${candidate.expected_ctc} LPA` : 'N/A'}</span></div>
                <div className="info-item">
                  <span className="info-label">NOTICE PERIOD</span>
                  <span className="info-value">
                    {candidate.notice_period 
                      ? (isNaN(candidate.notice_period) ? candidate.notice_period : `${candidate.notice_period} days`)
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="profile-section">
              <h3 className="section-title" style={{ border: 'none' }}>Skills</h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(Array.isArray(candidate.skills) ? candidate.skills : candidate.skills?.split(/[,]+/).filter(Boolean) || []).map((s, i) => <span key={i} className="chip">{s.trim()}</span>)}
              </div>
            </div>

            {candidate.languages && (
              <div className="profile-section">
                <h3 className="section-title" style={{ border: 'none' }}>Languages</h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(Array.isArray(candidate.languages) ? candidate.languages : candidate.languages?.split(',').filter(Boolean) || []).map((l, i) => <span key={i} className="chip">{l.trim()}</span>)}
                </div>
              </div>
            )}

            {candidate.hobbies && (
              <div className="profile-section">
                <h3 className="section-title" style={{ border: 'none' }}>Interests / Hobbies</h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(Array.isArray(candidate.hobbies) ? candidate.hobbies : candidate.hobbies?.split(',').filter(Boolean) || []).map((h, i) => <span key={i} className="chip">{h.trim()}</span>)}
                </div>
              </div>
            )}

            {candidate.statement_of_purpose && (
              <div className="profile-section">
                <h3 className="section-title" style={{ border: 'none' }}>Why Should We Hire You?</h3>
                <p className="comments-text">{candidate.statement_of_purpose}</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <div className="stagger-children">
            <div className="profile-section">
              <div className="section-icon-header"><GraduationCap size={20} /> Education History</div>
              <div className="timeline-list">
                {candidate.education && candidate.education.length > 0 ? candidate.education.map((edu, i) => (
                  <div key={i} className="timeline-list-item">
                    <strong>{edu.degree || 'N/A'}</strong>
                    <p className="sub-text">
                      {edu.institution}{edu.institution && edu.graduation_year ? ' • ' : ''}{edu.graduation_year}
                    </p>
                    {edu.percentage && <p className="marks-text">Score: {edu.percentage}</p>}
                  </div>
                )) : <p className="text-muted">No education details available.</p>}
              </div>
            </div>
            <div className="profile-section">
              <div className="section-icon-header"><Briefcase size={20} /> Work Experience</div>
              <div className="timeline-list">
                {candidate.work_experience && candidate.work_experience.length > 0 ? candidate.work_experience.map((w, i) => (
                  <div key={i} className="timeline-list-item">
                    <strong>{w.position || 'N/A'}</strong>
                    <p className="sub-text">
                      {w.company_name}{w.company_name && w.from_date ? ' • ' : ''}{formatDate(w.from_date)} - {w.to_date ? formatDate(w.to_date) : 'Present'}
                    </p>
                    {w.responsibilities && <p className="comments-text">{w.responsibilities}</p>}
                  </div>
                )) : <p className="text-muted">No experience details available.</p>}
              </div>
            </div>

            <div className="profile-section">
              <div className="section-icon-header"><Users size={20} /> Professional References</div>
              <div className="timeline-list">
                {candidate.references && candidate.references.length > 0 ? candidate.references.map((ref, i) => (
                  <div key={i} className="timeline-list-item">
                    <strong>{ref.name || 'N/A'}</strong>
                    <p className="sub-text">{ref.designation}{ref.designation && ref.company ? ' at ' : ''}{ref.company}</p>
                    <div style={{ marginTop: '8px', fontSize: '0.8rem', display: 'flex', gap: '16px' }}>
                      {ref.email && <span title="Email" style={{ color: '#0369a1' }}>{ref.email}</span>}
                      {ref.phone && <span title="Phone" style={{ color: 'var(--color-text-secondary)' }}>{ref.phone}</span>}
                    </div>
                  </div>
                )) : <p className="text-muted">No reference details available.</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assessments' && (
          <div className="stagger-children">
            {assessments.length === 0 ? <div className="empty-state"><p>No assessments yet</p></div> : assessments.map(a => {
              let r = {}; try { r = a.remarks ? (a.remarks.startsWith('{') ? JSON.parse(a.remarks) : { comments: a.remarks }) : {}; } catch(e) { r = { comments: a.remarks }; }
              const s = r.detailedStars || {};
              return (
                <div key={a.id} className="profile-section assessment-result-card">
                  <div className="assessment-header-row">
                    <div><h3>{a.assessment_type}</h3><p className="sub-text">By {r.interviewerInfo?.name} on {formatDate(a.conducted_at)}</p></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className={`badge ${RECOMMENDATION_BADGES[a.recommendation]}`}>{RECOMMENDATION_LABELS[a.recommendation] || a.recommendation}</span>
                      <StarRating rating={a.overall_score / 2} size={14} cursor="default" />
                    </div>
                  </div>
                  
                  {/* Technical Skills - Reordered above comments as per request */}
                  {r.customSkills?.length > 0 && (
                    <div className="assessment-remarks-box">
                      <span className="remarks-label">TECHNICAL SKILLS</span>
                      <div className="skills-result-grid">{r.customSkills.map((sk, idx) => <div key={idx} className="skill-result-row"><span>{sk.name}</span><StarRating rating={sk.rating} size={12} cursor="default" /></div>)}</div>
                    </div>
                  )}

                  <div className="assessment-attributes-grid" style={{ marginTop: '16px' }}>
                    {[
                      { l: 'Education', v: s.education }, { l: 'Attitude', v: s.attitude }, { l: 'Analytical', v: s.comprehension },
                      { l: 'Experience', v: s.relevance }, { l: 'Personality', v: s.personality }, { l: 'Comm.', v: s.communication }
                    ].map((attr, idx) => (
                      <div key={idx} className="attr-item"><span className="attr-label">{attr.l}</span><StarRating rating={attr.v} size={12} cursor="default" /></div>
                    ))}
                  </div>

                  {r.comments && <div className="assessment-remarks-box bordered"><span className="remarks-label">COMMENTS</span><p className="comments-text">{r.comments}</p></div>}
                  <div className="card-footer-actions"><button className="btn btn-outline btn-sm" onClick={() => openAssessmentModal(null, a)}><Pencil size={12} /> Edit Assessment</button></div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAssessmentModal && (
        <div className="modal-overlay" onClick={() => setShowAssessmentModal(false)}>
          <div className="modal-content assessment-modal-wide" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{assessmentType}</h2>
              <X size={20} onClick={() => setShowAssessmentModal(false)} style={{ cursor: 'pointer', color: 'var(--color-text-secondary)' }} />
            </div>
            <p className="sub-text" style={{ marginBottom: '32px' }}>Candidate: {candidate.full_name}</p>

            <AssessmentForm
              type={assessmentType}
              initialData={editingAssessment}
              onSubmit={handleSaveAssessment}
            />
          </div>
        </div>
      )}

      {showPhotoModal && (
        <div className="modal-overlay" onClick={() => setShowPhotoModal(false)}>
          <div className="modal-content photo-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Candidate Photo</h3>
              <button 
                className="modal-close-btn" 
                onClick={() => setShowPhotoModal(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <img src={photoUrl} alt="Candidate" className="full-view-photo" />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ── SUB-COMPONENT: AssessmentForm ───────────────────────────────────────── (Restored to Standard UI)
 */
function AssessmentForm({ initialData, onSubmit }) {
  const [interviewer, setInterviewer] = useState({ name: '', dept: '' });
  const [stars, setStars] = useState({ education: 0, relevance: 0, attitude: 0, personality: 0, comprehension: 0, communication: 0, technical: 0 });
  const [customSkills, setCustomSkills] = useState([]);
  const [comments, setComments] = useState('');
  const [overall, setOverall] = useState(0);
  const [decision, setDecision] = useState('');

  useEffect(() => {
    if (initialData) {
      try {
        const r = typeof initialData.remarks === 'string' && initialData.remarks.startsWith('{') ? JSON.parse(initialData.remarks) : { comments: initialData.remarks };
        setInterviewer({ name: r.interviewerInfo?.name || '', dept: r.interviewerInfo?.dept || '' });
        setStars(r.detailedStars || { education: 0, relevance: 0, attitude: 0, personality: 0, comprehension: 0, communication: 0, technical: 0 });
        setCustomSkills(r.customSkills || []);
        setComments(r.comments || '');
        setOverall(initialData.overall_score / 2 || 0);
        const rec = initialData.recommendation;
        setDecision(rec === 'Hire' ? 'Hired' : rec === 'Reject' ? 'Rejected' : rec === 'Next Round' ? 'On Hold' : '');
      } catch (e) { console.error(e); }
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { interviewerInfo: interviewer, detailedStars: stars, customSkills, comments };
    onSubmit({
      technical_score: stars.technical * 2,
      communication_score: stars.communication * 2,
      cultural_fit_score: stars.personality * 2,
      overall_score: overall * 2,
      remarks: JSON.stringify(payload),
      recommendation: decision === 'Hired' ? 'Hire' : decision === 'Rejected' ? 'Reject' : 'Next Round'
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <section style={{ padding: '24px', border: '1px solid var(--color-border)', borderRadius: '12px' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontWeight: 600 }}><User size={18} /> Interviewer Information</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="form-group"><label className="form-label">Name *</label><input required className="form-input" value={interviewer.name} onChange={e => setInterviewer({ ...interviewer, name: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Designation</label><input className="form-input" value={interviewer.dept} onChange={e => setInterviewer({ ...interviewer, dept: e.target.value })} /></div>
        </div>
      </section>

      <section style={{ padding: '24px', border: '1px solid var(--color-border)', borderRadius: '12px' }}>
        <h4 style={{ marginBottom: '20px', fontWeight: 600 }}>Foundational Assessment</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[ { k: 'education', l: 'Academic Standing' }, { k: 'relevance', l: 'Relevant Experience' }, { k: 'attitude', l: 'Attitude' }, { k: 'personality', l: 'Culture Fit' }, { k: 'comprehension', l: 'Analytical' }, { k: 'communication', l: 'Communication' }, { k: 'technical', l: 'Job Knowledge' } ].map(i => (
            <div key={i.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>{i.l}</span>
              <StarRating rating={stars[i.k]} setRating={v => setStars({ ...stars, [i.k]: v })} />
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '24px', border: '1px solid var(--color-border)', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h4 style={{ fontWeight: 600 }}>Technical Skills</h4>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setCustomSkills([...customSkills, { name: '', rating: 0 }])}>+ Add Skill</button>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {COMMON_SKILLS.map(s => <button key={s} type="button" className="suggestion-pill" style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', fontSize: '0.8rem', cursor: 'pointer' }} onClick={() => !customSkills.some(x => x.name === s) && setCustomSkills([...customSkills, { name: s, rating: 0 }])}>+ {s}</button>)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {customSkills.map((sk, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
              <input className="skill-name-input" style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 600 }} value={sk.name} onChange={e => { const n = [...customSkills]; n[i].name = e.target.value; setCustomSkills(n); }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <StarRating rating={sk.rating} setRating={v => { const n = [...customSkills]; n[i].rating = v; setCustomSkills(n); }} size={18} />
                <X size={16} onClick={() => setCustomSkills(customSkills.filter((_, idx) => idx !== i))} style={{ cursor: 'pointer', color: 'var(--color-error)' }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '24px', border: '1px solid var(--color-border)', borderRadius: '12px' }}>
        <h4 style={{ marginBottom: '16px', fontWeight: 600 }}>Feedback</h4>
        <textarea className="form-textarea" style={{ width: '100%' }} value={comments} onChange={e => setComments(e.target.value)} rows={4} placeholder="Overall feedback..." />
      </section>

      <section style={{ padding: '24px', border: '1px solid var(--color-border)', borderRadius: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
          <div><label className="form-label">Overall Rating</label><div style={{ marginTop: '8px' }}><StarRating rating={overall} setRating={setOverall} /></div></div>
          <div><label className="form-label">Verdict *</label><div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>{['Rejected', 'On Hold', 'Hired'].map(s => <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><input type="radio" value={s} checked={decision === s} onChange={e => setDecision(e.target.value)} required /> {s}</label>)}</div></div>
        </div>
      </section>

      <button type="submit" className="btn btn-primary btn-block" style={{ padding: '16px' }}>Submit Assessment</button>
    </form>
  );
}
