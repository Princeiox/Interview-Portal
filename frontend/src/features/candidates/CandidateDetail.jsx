/**
 * CandidateDetail Component
 * 
 * Displays the comprehensive profile of a single candidate, including personal information,
 * uploaded resumes, and assessment history. Allows HR/Admins to update the candidate status,
 * schedule interview rounds, send emails, and conduct split-view comparisons.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api, { API_BASE } from '@/api/axios';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  ArrowLeft, Mail, Phone, MapPin, Briefcase, FileText,
  Plus, Pencil, X, Star, User, GraduationCap, Users, Trash2, Columns, Copy, Share2, RotateCcw,
  Video, RefreshCw, ExternalLink, Calendar
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import ConfirmModal from '@/components/ConfirmModal';
import './CandidateDetail.css';

const STATUS_OPTIONS = ['Applied', 'Email sent for HR round', 'HR Round', 'Candidate not appeared', 'On Hold', 'Offered', 'Hired', 'Rejected'];
const COMMON_SKILLS = ['Python', 'SQL', 'Fastapi', 'React', 'Node.js', 'AWS'];
const HR_COMMON_SKILLS = ['Communication Skills', 'Confidence', 'Positive Attitude', 'Teamwork', 'Problem-Solving Ability', 'Adaptability', 'Professionalism', 'Cultural Fit', 'Career Motivation', 'Leadership Potential'];
const RECOMMENDATION_LABELS = {
  'Hire': 'Hired',
  'Reject': 'Rejected',
  'Next Round': 'On Hold',
  'On Hold': 'On Hold',
  'HR Round': 'HR Round'
};
const RECOMMENDATION_BADGES = {
  'Hire': 'badge-hired',
  'Reject': 'badge-rejected',
  'Next Round': 'badge-on-hold',
  'On Hold': 'badge-on-hold',
  'HR Round': 'badge-hr-round'
};

/**
 * ── HELPERS ───────────────────────────────────────────────────────────────
 */
const getStatusBadgeClass = (s) => {
  const m = {
    Applied: 'badge-applied',
    'Email sent for HR round': 'badge-email-sent-hr',
    'HR Round': 'badge-hr-round',
    'Candidate not appeared': 'badge-not-appeared',
    'On Hold': 'badge-on-hold',
    Offered: 'badge-offered',
    Hired: 'badge-hired',
    Rejected: 'badge-rejected'
  };
  return m[s] || 'badge-applied';
};


const formatDate = (ds) => {
  if (!ds) return 'N/A';
  return new Date(ds).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatCTC = (ctc) => {
  if (!ctc) return 'N/A';
  const s = String(ctc);
  return s.toLowerCase().includes('lpa') ? s : `${s} LPA`;
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
  const location = useLocation();
  const { user } = useAuth();
  const toast = useToast();

  const [candidate, setCandidate] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [candidateTests, setCandidateTests] = useState([]);
  const [availableTests, setAvailableTests] = useState([]);
  const [selectedAssignmentForViewer, setSelectedAssignmentForViewer] = useState(null);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [isAssigningTest, setIsAssigningTest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [assessmentType, setAssessmentType] = useState('Tech Round');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCompareMode, setIsCompareMode] = useState(false);

  const dashboardPath = location.state?.from || '/candidates';
  const isPrivileged = user?.role === 'ADMIN' || user?.role === 'HR';

  const fetchCandidate = useCallback(async () => {
    try {
      const res = await api.get(`/candidates/${id}`);
      setCandidate(res.data);
    } catch (err) {
      toast.error(err.isNetworkError ? err.message : 'Failed to load candidate');
      navigate(dashboardPath);
    }
  }, [id, navigate, dashboardPath, toast]);

  const fetchAssessments = useCallback(async () => {
    try {
      const res = await api.get(`/assessments/candidate/${id}`);
      setAssessments(res.data);
    } catch (err) { console.error(err); }
  }, [id]);

  const fetchCandidateTests = useCallback(async () => {
    try {
      const res = await api.get(`/tests/assignments?candidate_id=${id}`);
      setCandidateTests(res.data);
    } catch (err) { console.error('Failed to fetch candidate tests:', err); }
  }, [id]);

  const fetchAvailableTests = useCallback(async () => {
    try {
      const res = await api.get('/tests');
      setAvailableTests(res.data);
    } catch (err) { console.error('Failed to fetch tests:', err); }
  }, []);

  const handleAssignTest = async (e) => {
    e.preventDefault();
    if (!selectedTestId) {
      toast.warning('Please select a test to assign.');
      return;
    }
    setIsAssigningTest(true);
    try {
      await api.post('/tests/assign', {
        test_id: parseInt(selectedTestId),
        candidate_id: parseInt(id),
      });
      toast.success('Test assigned successfully!');
      setSelectedTestId('');
      fetchCandidateTests();
    } catch (err) {
      toast.error('Failed to assign test: ' + (err.message || err));
    } finally {
      setIsAssigningTest(false);
    }
  };

  const handleCopyLink = (assignmentId) => {
    const link = `${window.location.origin}/take-test/${assignmentId}`;
    navigator.clipboard.writeText(link).then(
      () => toast.success('Link copied to clipboard!'),
      () => toast.error('Failed to copy link.')
    );
  };

  const handleShareWhatsApp = (assignment) => {
    const link = `${window.location.origin}/take-test/${assignment.id}`;
    const candidateName = candidate?.full_name || 'Candidate';
    const testTitle = assignment.test?.title || 'Assessment';
    const phone = candidate?.phone || '';
    
    const message = `Hi ${candidateName},\n\nYou have been assigned the online MCQ test "${testTitle}" as part of the recruitment process at Eulogik.\n\nPlease complete the test by clicking the link below:\n${link}\n\nBest of luck!\nEulogik Recruitment Team`;
    
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleShareEmail = (assignment) => {
    const link = `${window.location.origin}/take-test/${assignment.id}`;
    const candidateName = candidate?.full_name || 'Candidate';
    const testTitle = assignment.test?.title || 'Assessment';
    const email = candidate?.email || '';
    
    const subject = encodeURIComponent(`Online MCQ Test Assigned: ${testTitle}`);
    const body = encodeURIComponent(`Dear ${candidateName},\n\nYou have been assigned the online MCQ test "${testTitle}" as part of the recruitment process at Eulogik.\n\nPlease complete the test by clicking the link below:\n\n${link}\n\nBest of luck!\n\nBest regards,\nEulogik Recruitment Team`);
    
    const url = `mailto:${email}?subject=${subject}&body=${body}`;
    window.open(url, '_blank');
  };

  const handleReattempt = async (candidateTestId) => {
    if (!window.confirm('Are you sure you want to allow the candidate to re-attempt this test? This will reset their previous score and answers.')) {
      return;
    }
    try {
      await api.post(`/tests/assignments/${candidateTestId}/reattempt`);
      toast.success('Test reset successfully! Candidate can now re-attempt.');
      fetchCandidateTests();
    } catch (err) {
      toast.error('Failed to reset test: ' + (err.message || err));
    }
  };

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchCandidate(), fetchAssessments(), fetchCandidateTests(), fetchAvailableTests()]);
      setTimeout(() => setLoading(false), 100);
    };
    load();
  }, [id, fetchCandidate, fetchAssessments, fetchCandidateTests, fetchAvailableTests]);

  useEffect(() => {
    if (showAssessmentModal || showPhotoModal || showEmailModal || showDeleteConfirm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAssessmentModal, showPhotoModal, showEmailModal, showDeleteConfirm]);

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
      toast.error(err.isNetworkError ? err.message : (err.response?.data?.detail || 'Error saving assessment'));
    }
  };

  const handleDeleteAssessment = async (assessmentId) => {
    if (!window.confirm("Are you sure you want to delete this assessment?")) return;
    try {
      await api.delete(`/assessments/${assessmentId}`);
      toast.success('Assessment deleted successfully');
      fetchAssessments();
    } catch (err) {
      toast.error(err.isNetworkError ? err.message : (err.response?.data?.detail || 'Error deleting assessment'));
    }
  };

  const handleDeleteCandidate = async () => {
    try {
      const name = candidate.full_name;
      await api.delete(`/candidates/${id}`);
      toast.warning(`${name} has been deleted successfully.`);
      navigate(dashboardPath, { replace: true });
    } catch (err) {
      toast.error(err.isNetworkError ? err.message : 'Error deleting candidate');
    }
  };

  const openAssessmentModal = (t, e = null) => {
    setEditingAssessment(e);
    setAssessmentType(t || (e ? e.assessment_type : 'Tech Round'));
    setShowAssessmentModal(true);
  };

  const renderTestsTab = () => {
    return (
      <div className="stagger-children">
        {/* Assign Test Card/Section */}
        <div className="profile-section" style={{ padding: '20px' }}>
          <h3 className="section-title" style={{ border: 'none', marginBottom: '16px' }}>Assign MCQ Test</h3>
          <form onSubmit={handleAssignTest} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '200px' }}>
              <select
                className="form-input"
                value={selectedTestId}
                onChange={(e) => setSelectedTestId(e.target.value)}
                style={{ width: '100%', height: '42px' }}
              >
                <option value="">-- Select a test --</option>
                {availableTests.map((t) => (
                  <option key={t.id} value={t.id}>{t.title} ({t.questions?.length || 0} questions)</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ height: '42px', padding: '0 24px' }} disabled={isAssigningTest}>
              {isAssigningTest ? 'Assigning...' : 'Assign Test'}
            </button>
          </form>
        </div>

        {/* Assignments List */}
        <div className="profile-section" style={{ marginTop: '20px' }}>
          <h3 className="section-title" style={{ border: 'none', marginBottom: '16px' }}>Test History & Assignments</h3>
          {candidateTests.length === 0 ? (
            <p className="text-muted">No tests assigned to this candidate yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {candidateTests.map((item) => {
                const isCompleted = !!item.completed_at;
                const questions = item.test?.questions || [];
                const mcqs = questions.filter(q => q.question_type !== 'CODING' && (q.option_a || q.option_b || q.option_c || q.option_d));
                const mcqsCount = mcqs.length;
                const codingCount = questions.length - mcqsCount;
                const percent = isCompleted && mcqsCount > 0
                  ? Math.round((item.score / mcqsCount) * 100)
                  : 0;

                return (
                  <div key={item.id} className="assessment-result-card" style={{ padding: '16px', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <h4 style={{ margin: 0, fontWeight: 700 }}>{item.test?.title || 'MCQ Test'}</h4>
                        <p className="sub-text" style={{ margin: '4px 0 0 0' }}>
                          Assigned on {new Date(item.assigned_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div>
                        {isCompleted ? (
                          <span className="badge badge-hired">Completed</span>
                        ) : (
                          <span className="badge badge-not-appeared">Pending</span>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        {isCompleted ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {mcqsCount > 0 ? (
                              <span style={{ fontWeight: 600 }}>
                                MCQ Score: <span style={{ color: 'var(--color-primary)' }}>{item.score} / {mcqsCount}</span> ({percent}%)
                              </span>
                            ) : null}
                            {codingCount > 0 && (
                              <span style={{
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                background: 'rgba(2, 132, 199, 0.15)',
                                color: '#0284c7',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                display: 'inline-block',
                                width: 'fit-content'
                              }}>
                                Coding Submissions: Review Pending
                              </span>
                            )}
                            {mcqsCount === 0 && codingCount === 0 && (
                              <span style={{ fontWeight: 600 }}>
                                Score: <span style={{ color: 'var(--color-primary)' }}>{item.score} / {item.total_questions}</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '0.9rem' }}>Awaiting candidate response</span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {isCompleted && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline test-action-btn"
                            title="View Responses"
                            onClick={() => setSelectedAssignmentForViewer(item)}
                            style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
                          >
                            <FileText size={12} /> View Responses
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-sm btn-outline test-action-btn"
                          title="Copy Link"
                          onClick={() => handleCopyLink(item.id)}
                        >
                          <Copy size={12} /> Copy Link
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline test-action-btn"
                          title="Share on WhatsApp"
                          onClick={() => handleShareWhatsApp(item)}
                          style={{ color: '#25d366', borderColor: '#25d366' }}
                        >
                          <Share2 size={12} /> WhatsApp
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline test-action-btn"
                          title="Share via Email"
                          onClick={() => handleShareEmail(item)}
                          style={{ color: '#0284c7', borderColor: '#0284c7' }}
                        >
                          <Mail size={12} /> Email
                        </button>
                        {user?.role === 'ADMIN' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline test-action-btn"
                            title="Make Candidate Reattempt Test"
                            onClick={() => handleReattempt(item.id)}
                            style={{ color: '#ea580c', borderColor: '#ea580c' }}
                          >
                            <RotateCcw size={12} /> Re-attempt
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!candidate || !candidate.full_name) return null;

  const photoUrl = candidate.photo_url ? `${API_BASE}${candidate.photo_url}` : null;
  const cvUrl = candidate.cv_url ? `${API_BASE}${candidate.cv_url}` : null;
  const isPdf = cvUrl && cvUrl.toLowerCase().split('?')[0].endsWith('.pdf');

  return (
    <div className={`detail-page ${isCompareMode ? 'compare-mode' : ''}`}>
      <header className="detail-header">
        <button className="icon-btn" onClick={() => navigate(dashboardPath)}><ArrowLeft size={20} /></button>
        <div className="detail-header-info">
          <div className="detail-name-row">
            <h1>{candidate.full_name}</h1>
            {isPrivileged ? (
              <select
                className={`status-select-dropdown badge ${getStatusBadgeClass(candidate.status)}`}
                value={candidate.status}
                onChange={async (e) => {
                  const newStatus = e.target.value;
                  try {
                    await api.patch(`/candidates/${id}/status`, { status: newStatus });
                    setCandidate(prev => ({ ...prev, status: newStatus }));
                    toast.success(`Status updated to ${newStatus}`);
                  } catch (err) {
                    toast.error(err.isNetworkError ? err.message : 'Failed to update status');
                  }
                }}
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <span className={`badge ${getStatusBadgeClass(candidate.status)}`}>{candidate.status}</span>
            )}
          </div>
          <p className="detail-position">{candidate.position_applied}</p>
        </div>
        <ThemeToggle />
      </header>

      <div className="detail-actions">
        {cvUrl && (
          <button
            className={`btn ${isCompareMode ? 'btn-primary font-bold' : 'btn-outline'} btn-sm`}
            onClick={() => setIsCompareMode(!isCompareMode)}
          >
            <Columns size={14} style={{ marginRight: '6px' }} /> {isCompareMode ? 'Exit Split View' : 'Split Compare View'}
          </button>
        )}
        <button className="btn btn-outline btn-sm" onClick={() => openAssessmentModal('Tech Round')}><Plus size={14} /> Tech Round</button>
        <button className="btn btn-outline btn-sm" onClick={() => openAssessmentModal('HR Round')}><Plus size={14} /> HR Round</button>
        <button className="btn btn-outline btn-sm" onClick={() => setShowEmailModal(true)}><Mail size={14} /> Send Mail</button>
        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/apply/${id}`)}><Pencil size={14} /> Edit Details</button>
        {user?.role === 'ADMIN' && (
          <button
            className="btn btn-danger btn-sm"
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              backgroundColor: 'var(--color-error)',
              color: 'white',
              borderColor: 'var(--color-error)'
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
        {['profile', 'history', 'assessments', 'tests'].map(t => {
          let label = t.charAt(0).toUpperCase() + t.slice(1);
          if (t === 'assessments') label += ` (${assessments.length})`;
          if (t === 'tests') label = `Online Tests (${candidateTests.length})`;
          return (
            <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
              {label}
            </button>
          );
        })}
      </div>

      {isCompareMode ? (
        <div className="compare-grid animate-fade-in">
          {/* LEFT PANEL: Dynamic tabbed content */}
          <div className="compare-left-pane">
            {activeTab === 'profile' && (
              <>
                {/* Bio info */}
                <div className="profile-section" style={{ display: 'flex', gap: '20px', alignItems: 'center', padding: '16px' }}>
                  {photoUrl ? (
                    <img src={photoUrl} className="detail-photo" style={{ width: '80px', height: '106px', margin: 0 }} onClick={() => setShowPhotoModal(true)} />
                  ) : (
                    <div className="detail-photo-placeholder" style={{ width: '80px', height: '106px' }}><User size={24} /></div>
                  )}
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{candidate.full_name}</h3>
                    <p className="detail-position" style={{ margin: '4px 0 0 0' }}>{candidate.position_applied}</p>
                    <span className={`badge ${getStatusBadgeClass(candidate.status)}`} style={{ display: 'inline-block', marginTop: '6px' }}>{candidate.status}</span>
                  </div>
                </div>

                {/* Scheduled Interview Section */}
                {candidate.interview_date && (
                  <div className="profile-section" style={{ backgroundColor: 'var(--color-bg-secondary)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--color-primary)', marginBottom: '20px' }}>
                    <h3 className="section-title" style={{ border: 'none', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: 0 }}>
                      <Video size={18} style={{ color: 'var(--color-primary)' }} /> Scheduled Interview
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <span className="info-label" style={{ display: 'block', marginBottom: '2px' }}>DATE & TIME</span>
                        <span className="info-value" style={{ fontWeight: 600 }}>
                          {new Date(candidate.interview_date).toLocaleString('en-IN', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      {candidate.meeting_link && (
                        <div>
                          <span className="info-label" style={{ display: 'block', marginBottom: '2px' }}>GOOGLE MEET LINK</span>
                          <a
                            href={candidate.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              marginTop: '4px',
                              textDecoration: 'none',
                              fontSize: '0.9rem'
                            }}
                          >
                            Join Meeting <ExternalLink size={14} />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Personal Details */}
                <div className="profile-section">
                  <h3 className="section-title" style={{ border: 'none' }}>Personal Information</h3>
                  <div className="info-grid">
                    <div className="info-item"><span className="info-label">DATE OF BIRTH</span><span className="info-value">{formatDate(candidate.date_of_birth)}</span></div>
                    <div className="info-item"><span className="info-label">GENDER</span><span className="info-value">{candidate.gender || 'N/A'}</span></div>
                    <div className="info-item"><span className="info-label">MARITAL STATUS</span><span className="info-value">{candidate.marital_status || 'N/A'}</span></div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="profile-section">
                  <h3 className="section-title" style={{ border: 'none' }}>Contact Information</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="contact-row">
                      <Mail className="contact-icon" />
                      <div>
                        <span className="info-label" style={{ display: 'block', marginBottom: '2px' }}>EMAIL ADDRESS</span>
                        <a href={`mailto:${candidate.email}`} className="contact-link">{candidate.email}</a>
                      </div>
                    </div>
                    <div className="contact-row">
                      <Phone className="contact-icon" />
                      <div>
                        <span className="info-label" style={{ display: 'block', marginBottom: '2px' }}>PHONE NUMBER</span>
                        <a href={`tel:${candidate.phone}`} className="contact-link">{candidate.phone}</a>
                      </div>
                    </div>
                    <div className="contact-row">
                      <MapPin className="contact-icon" />
                      <div>
                        <span className="info-label" style={{ display: 'block', marginBottom: '4px' }}>CURRENT ADDRESS</span>
                        <span style={{ color: 'var(--color-text-primary)', fontSize: '0.95rem', fontWeight: 600 }}>{candidate.current_address || 'N/A'}</span>
                        <p className="sub-text" style={{ marginTop: '2px' }}>{candidate.current_city}, {candidate.current_state}</p>
                      </div>
                    </div>
                    {candidate.permanent_address && (
                      <div className="contact-row">
                        <MapPin className="contact-icon" style={{ opacity: 0.6 }} />
                        <div>
                          <span className="info-label" style={{ display: 'block', marginBottom: '4px' }}>PERMANENT ADDRESS</span>
                          <span style={{ color: 'var(--color-text-primary)', fontSize: '0.95rem', fontWeight: 600 }}>{candidate.permanent_address}</span>
                          <p className="sub-text" style={{ marginTop: '2px' }}>{candidate.permanent_city}, {candidate.permanent_state}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Position Details */}
                <div className="profile-section">
                  <h3 className="section-title" style={{ border: 'none' }}>Position Details</h3>
                  <div className="info-grid">
                    <div className="info-item"><span className="info-label">EXPERIENCE</span><span className="info-value">{candidate.experience_years}y {candidate.experience_months || 0}m</span></div>
                    <div className="info-item"><span className="info-label">Current CTC</span><span className="info-value">{formatCTC(candidate.current_ctc)}</span></div>
                    <div className="info-item"><span className="info-label">EXPECTED CTC</span><span className="info-value">{formatCTC(candidate.expected_ctc)}</span></div>
                    <div className="info-item"><span className="info-label">NOTICE PERIOD</span><span className="info-value">{candidate.notice_period ? (isNaN(candidate.notice_period) ? candidate.notice_period : `${candidate.notice_period} days`) : 'N/A'}</span></div>
                  </div>
                </div>

                {/* Skills */}
                <div className="profile-section">
                  <h3 className="section-title" style={{ border: 'none' }}>Skills</h3>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {(Array.isArray(candidate.skills) ? candidate.skills : candidate.skills?.split(/[,]+/).filter(Boolean) || []).map((s, i) => <span key={i} className="chip">{s.trim()}</span>)}
                  </div>
                </div>

                {/* Languages */}
                {candidate.languages && (
                  <div className="profile-section">
                    <h3 className="section-title" style={{ border: 'none' }}>Languages</h3>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {(Array.isArray(candidate.languages) ? candidate.languages : candidate.languages?.split(',').filter(Boolean) || []).map((l, i) => <span key={i} className="chip">{l.trim()}</span>)}
                    </div>
                  </div>
                )}

                {/* Hobbies */}
                {candidate.hobbies && (
                  <div className="profile-section">
                    <h3 className="section-title" style={{ border: 'none' }}>Interests / Hobbies</h3>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {(Array.isArray(candidate.hobbies) ? candidate.hobbies : candidate.hobbies?.split(',').filter(Boolean) || []).map((h, i) => <span key={i} className="chip">{h.trim()}</span>)}
                    </div>
                  </div>
                )}

                {/* SOP */}
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
                {/* Education History */}
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

                {/* Work Experience */}
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

                {/* References */}
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
                  let r = {}; try { r = a.remarks ? (a.remarks.startsWith('{') ? JSON.parse(a.remarks) : { comments: a.remarks }) : {}; } catch (e) { r = { comments: a.remarks }; }
                  const s = r.detailedStars || {};
                  return (
                    <div key={a.id} className="profile-section assessment-result-card">
                      <div className="assessment-header-row">
                        <div><h3>{a.assessment_type}</h3><p className="sub-text">By {r.interviewerInfo?.name}</p></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span className={`badge ${RECOMMENDATION_BADGES[a.recommendation]}`}>{RECOMMENDATION_LABELS[a.recommendation] || a.recommendation}</span>
                          <StarRating rating={a.overall_score / 2} size={14} cursor="default" />
                        </div>
                      </div>

                      <div style={{ marginTop: '8px', marginBottom: '12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-secondary)' }}>
                        <Calendar size={14} />
                        <span>Interview Date: <strong>{formatDate(a.conducted_at)}</strong></span>
                      </div>

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

            {activeTab === 'tests' && renderTestsTab()}
          </div>

          {/* RIGHT PANEL: Resume / CV */}
          <div className="compare-right-pane">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>Curriculum Vitae</span>
              {cvUrl && (
                <button
                  onClick={() => window.open(cvUrl, '_blank')}
                  className="btn btn-outline btn-sm"
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  Open in New Tab
                </button>
              )}
            </div>
            {cvUrl ? (
              isPdf ? (
                <iframe
                  src={`${cvUrl}#toolbar=1&navpanes=0`}
                  title="CV Preview Compare"
                  className="compare-cv-iframe"
                />
              ) : (
                <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px' }}>
                  <FileText size={48} style={{ color: 'var(--color-primary)', opacity: 0.5 }} />
                  <button onClick={() => window.open(cvUrl, '_blank')} className="btn btn-primary">View CV File</button>
                  <p className="sub-text">Preview not available for this format (Click to View)</p>
                </div>
              )
            ) : (
              <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                <p className="text-muted">No CV uploaded</p>
              </div>
            )}
          </div>
        </div>
      ) : (
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
                  <div
                    className="cv-container"
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      flex: 1,
                      minHeight: '340px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--color-surface)',
                      padding: cvUrl && isPdf ? '16px' : '24px',
                      overflow: 'hidden'
                    }}
                  >
                    {cvUrl ? (
                      isPdf ? (
                        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center' }}>
                          <iframe
                            src={`${cvUrl}#toolbar=0&navpanes=0`}
                            title="CV Preview"
                            width="100%"
                            height="260px"
                            style={{ border: 'none', borderRadius: '8px' }}
                          />
                          <button
                            onClick={() => window.open(cvUrl, '_blank')}
                            className="btn btn-primary btn-sm"
                            style={{ marginTop: '14px', width: 'auto', padding: '6px 16px' }}
                          >
                            Open CV in New Tab
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                          <FileText size={48} style={{ color: 'var(--color-primary)', opacity: 0.5 }} />
                          <button onClick={() => window.open(cvUrl, '_blank')} className="btn btn-primary" style={{ padding: '12px 24px' }}>View CV File</button>
                          <p className="sub-text">Preview not available for this format (Click to View)</p>
                        </div>
                      )
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
                  <div className="info-item"><span className="info-label">Current CTC</span><span className="info-value">{formatCTC(candidate.current_ctc)}</span></div>
                  <div className="info-item"><span className="info-label">EXPECTED CTC</span><span className="info-value">{formatCTC(candidate.expected_ctc)}</span></div>
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
                let r = {}; try { r = a.remarks ? (a.remarks.startsWith('{') ? JSON.parse(a.remarks) : { comments: a.remarks }) : {}; } catch (e) { r = { comments: a.remarks }; }
                const s = r.detailedStars || {};
                return (
                  <div key={a.id} className="profile-section assessment-result-card">
                    <div className="assessment-header-row">
                      <div><h3>{a.assessment_type}</h3><p className="sub-text">By {r.interviewerInfo?.name}</p></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className={`badge ${RECOMMENDATION_BADGES[a.recommendation]}`}>{RECOMMENDATION_LABELS[a.recommendation] || a.recommendation}</span>
                        <StarRating rating={a.overall_score / 2} size={14} cursor="default" />
                      </div>
                    </div>

                    <div style={{ marginTop: '8px', marginBottom: '12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-secondary)' }}>
                      <Calendar size={14} />
                      <span>Interview Date: <strong>{formatDate(a.conducted_at)}</strong></span>
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
                    <div className="card-footer-actions">
                      <button className="btn btn-outline btn-sm" onClick={() => openAssessmentModal(null, a)}><Pencil size={12} /> Edit Assessment</button>
                      <button className="btn btn-outline btn-sm" style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }} onClick={() => handleDeleteAssessment(a.id)}><Trash2 size={12} /> Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'tests' && renderTestsTab()}
        </div>
      )}

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
              currentUser={user}
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

      {showEmailModal && (
        <EmailModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          candidate={candidate}
          onSent={fetchCandidate}
        />
      )}

      {selectedAssignmentForViewer && (
        <TestResponsesModal
          assignment={selectedAssignmentForViewer}
          onClose={() => setSelectedAssignmentForViewer(null)}
        />
      )}
    </div>
  );
}

/**
 * ── SUB-COMPONENT: AssessmentForm ───────────────────────────────────────── (Restored to Standard UI)
 */
function AssessmentForm({ type, initialData, onSubmit, currentUser }) {
  const getTodayString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [interviewer, setInterviewer] = useState({ name: '', dept: '' });
  const [stars, setStars] = useState({ education: 0, relevance: 0, attitude: 0, personality: 0, comprehension: 0, communication: 0, technical: 0 });
  const [customSkills, setCustomSkills] = useState([]);
  const [comments, setComments] = useState('');
  const [overall, setOverall] = useState(0);
  const [decision, setDecision] = useState('');
  const [conductedAt, setConductedAt] = useState(getTodayString());

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
        setDecision(
          rec === 'Hire' || rec === 'Hired' ? 'Hired' :
            rec === 'Reject' || rec === 'Rejected' ? 'Rejected' :
              rec === 'HR Round' ? 'HR Round' :
                rec === 'On Hold' || rec === 'Next Round' ? 'On Hold' : ''
        );
        if (initialData.conducted_at) {
          setConductedAt(new Date(initialData.conducted_at).toISOString().split('T')[0]);
        }
      } catch (e) { console.error(e); }
    } else {
      setConductedAt(getTodayString());
      if (currentUser) {
        setInterviewer({
          name: currentUser.name || '',
          dept: currentUser.position || ''
        });
      }
    }
  }, [initialData, currentUser]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { interviewerInfo: interviewer, detailedStars: stars, customSkills, comments };
    onSubmit({
      technical_score: stars.technical * 2,
      communication_score: stars.communication * 2,
      cultural_fit_score: stars.personality * 2,
      overall_score: overall * 2,
      remarks: JSON.stringify(payload),
      recommendation: decision === 'Hired' ? 'Hire' : decision === 'Rejected' ? 'Reject' : decision === 'HR Round' ? 'HR Round' : 'On Hold',
      conducted_at: conductedAt
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <section style={{ padding: '24px', border: '1px solid var(--color-border)', borderRadius: '12px' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontWeight: 600 }}><User size={18} /> Interviewer Information</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="form-group"><label className="form-label">Name *</label><input required className="form-input" value={interviewer.name} onChange={e => setInterviewer({ ...interviewer, name: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Designation</label><input className="form-input" value={interviewer.dept} onChange={e => setInterviewer({ ...interviewer, dept: e.target.value })} /></div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Assessment Date *</label><input type="date" required className="form-input" value={conductedAt} onChange={e => setConductedAt(e.target.value)} /></div>
        </div>
      </section>

      <section style={{ padding: '24px', border: '1px solid var(--color-border)', borderRadius: '12px' }}>
        <h4 style={{ marginBottom: '20px', fontWeight: 600 }}>Foundational Assessment</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[{ k: 'education', l: 'Academic Standing' }, { k: 'relevance', l: 'Relevant Experience' }, { k: 'attitude', l: 'Attitude' }, { k: 'personality', l: 'Culture Fit' }, { k: 'comprehension', l: 'Analytical' }, { k: 'communication', l: 'Communication' }, { k: 'technical', l: 'Job Knowledge' }].map(i => (
            <div key={i.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>{i.l}</span>
              <StarRating rating={stars[i.k]} setRating={v => setStars({ ...stars, [i.k]: v })} />
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '24px', border: '1px solid var(--color-border)', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h4 style={{ fontWeight: 600 }}>{type === 'HR Round' ? 'Skills' : 'Technical Skills'}</h4>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setCustomSkills([...customSkills, { name: '', rating: 0 }])}>+ Add Skill</button>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {(type === 'HR Round' ? HR_COMMON_SKILLS : COMMON_SKILLS).map(s => <button key={s} type="button" className="suggestion-pill" style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', fontSize: '0.8rem', cursor: 'pointer' }} onClick={() => !customSkills.some(x => x.name === s) && setCustomSkills([...customSkills, { name: s, rating: 0 }])}>+ {s}</button>)}
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
          <div>
            <label className="form-label">Verdict *</label>
            <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
              {(type === 'Tech Round'
                ? ['Rejected', 'On Hold', 'HR Round']
                : ['Rejected', 'On Hold', 'Hired']
              ).map(s => (
                <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="radio" value={s} checked={decision === s} onChange={e => setDecision(e.target.value)} required /> {s}
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      <button type="submit" className="btn btn-primary btn-block" style={{ padding: '16px' }}>Submit Assessment</button>
    </form>
  );
}

/**
 * ── SUB-COMPONENT: EmailModal ─────────────────────────────────────────────
 */

function EmailModal({ isOpen, onClose, candidate, onSent }) {
  const toast = useToast();
  const [date, setDate] = useState('');
  const [subject, setSubject] = useState('Interview Invitation');
  const [body, setBody] = useState('');
  const [templateType, setTemplateType] = useState('Default');
  const [meetingType, setMeetingType] = useState('In-Person');
  const [meetingLink, setMeetingLink] = useState('');

  // Helper to generate a random Google Meet link
  const generateMeetingLink = () => {
    const part1 = Math.random().toString(36).substring(2, 5);
    const part2 = Math.random().toString(36).substring(2, 6);
    const part3 = Math.random().toString(36).substring(2, 5);
    return `https://meet.google.com/${part1}-${part2}-${part3}`;
  };

  const getTemplate = (type, dateStr, candObj, meetType, meetLnk) => {
    const candName = candObj?.full_name || 'Candidate';
    const candPosition = candObj?.position_applied || '[Position Name]';
    const formattedDate = dateStr ? new Date(dateStr).toLocaleString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : '[Select a Date]';

    const locationText = meetType === 'Google Meet'
      ? `Location: Online (Google Meet)\nMeeting Link: ${meetLnk || '[Generating Google Meet link...]'}`
      : `Location: Eulogik, 27 Noble Plaza, Zone-II, Maharana Pratap Nagar, Bhopal, Madhya Pradesh – 462011\n*Google Maps: https://maps.google.com/maps?cid=8753897592713204658`;

    const baseInstructions = meetType === 'Google Meet'
      ? `1. Please join the online meeting on time.\n2. If required, you may call on our landline number during working hours only.\n3. Ensure you have a stable internet connection and a working webcam/microphone.\n4. We value your and our time – ensure you join on time without fail.`
      : `1. Please report on time with your CV and a passport-size photo.\n2. If required, you may call on our landline number during working hours only.\n3. The location is easily available on Google Maps – kindly avoid calling us for navigation.\n4. We value your and our time – ensure you reach on time without fail.`;

    const baseTemplate = `Dear ${candName},\n\nCongratulations! 🎉 Your interview has been scheduled with Eulogik.\n\nDetails are as follows:\n\nDate & Time: ${formattedDate}\n${locationText}\n\nImportant Instructions:\n\n${baseInstructions}\n\nWe wish you all the very best!\n\nBest regards,\nEulogik`;

    if (type === 'Tech Round') {
      return {
        subject: 'Technical Interview Scheduled – Eulogik',
        body: baseTemplate.replace('Your interview has been scheduled', 'Your technical interview has been scheduled')
      };
    } else if (type === 'HR Round') {
      return {
        subject: 'HR Interview Scheduled – Eulogik',
        body: baseTemplate.replace('Your interview has been scheduled', 'Your HR interview has been scheduled')
      };
    } else if (type === 'Rejection') {
      return {
        subject: `Update on your application for ${candPosition} at Eulogik`,
        body: `Dear ${candName},\n\nThank you for taking the time to interview with us for the ${candPosition} role and for your interest in joining our organization.\n\nWe appreciate the opportunity to learn more about your skills, experience, and career aspirations. After careful consideration of all candidates, we have decided to move forward with another applicant whose qualifications more closely match our current requirements for this position.\n\nThis decision was not easy, as we were impressed by many aspects of your profile. We encourage you to apply for future opportunities that align with your skills and experience.\n\nWe sincerely thank you for your interest in our company and the time you invested throughout the selection process. We wish you every success in your career and future endeavors.\n\nKind regards,\nEulogik`
      };
    }

    // Default
    return {
      subject: 'Interview Scheduled – Eulogik',
      body: baseTemplate
    };
  };

  // Generate link if Google Meet selected
  useEffect(() => {
    if (meetingType === 'Google Meet') {
      if (!meetingLink) {
        setMeetingLink(generateMeetingLink());
      }
    } else {
      setMeetingLink('');
    }
  }, [meetingType]);

  useEffect(() => {
    if (candidate) {
      const { subject, body } = getTemplate(templateType, date, candidate, meetingType, meetingLink);
      setSubject(subject);
      setBody(body);
    }
  }, [candidate, templateType, date, meetingType, meetingLink]);

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setDate(newDate);
  };

  const handleTemplateChange = (e) => {
    const type = e.target.value;
    setTemplateType(type);
  };

  const handleMeetingTypeChange = (e) => {
    setMeetingType(e.target.value);
  };

  const handleRegenerateLink = () => {
    setMeetingLink(generateMeetingLink());
  };

  const handleSend = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/candidates/${candidate.id}/send-email`, {
        subject,
        body,
        template_type: templateType,
        interview_date: date ? new Date(date).toISOString() : null,
        meeting_link: meetingType === 'Google Meet' ? meetingLink : null
      });
      toast.success('Email sent successfully');
      if (onSent) onSent();
      onClose();
    } catch (err) {
      toast.error(err.isNetworkError ? err.message : (err.response?.data?.detail || 'Failed to send email'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0 }}>Send Email to {candidate.full_name}</h3>
          <X size={20} onClick={onClose} style={{ cursor: 'pointer', color: 'var(--color-text-secondary)' }} />
        </div>
        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Email Template</label>
            <select className="form-input" value={templateType} onChange={handleTemplateChange}>
              <option value="Default">Default Invitation</option>
              <option value="Tech Round">Technical Interview</option>
              <option value="HR Round">HR Interview</option>
              <option value="Rejection">Rejection</option>
            </select>
          </div>
          {templateType !== 'Rejection' && (
            <>
              <div className="form-group">
                <label className="form-label">Interview Date & Time (Optional)</label>
                <input type="datetime-local" className="form-input" value={date} onChange={handleDateChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Meeting Type</label>
                <select className="form-input" value={meetingType} onChange={handleMeetingTypeChange}>
                  <option value="In-Person">In-Person (Office)</option>
                  <option value="Google Meet">Online (Google Meet)</option>
                </select>
              </div>
              {meetingType === 'Google Meet' && (
                <div className="form-group">
                  <label className="form-label">Google Meet Link</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      required
                      type="url"
                      className="form-input"
                      value={meetingLink}
                      onChange={e => setMeetingLink(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleRegenerateLink}
                      style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="Regenerate link"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          <div className="form-group">
            <label className="form-label">Subject</label>
            <input required className="form-input" value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Message Body</label>
            <textarea required className="form-textarea" rows={10} value={body} onChange={e => setBody(e.target.value)} style={{ width: '100%' }} />
          </div>
          <button type="submit" className="btn btn-primary btn-block" style={{ padding: '12px', marginTop: '8px' }}>Send Email</button>
        </form>
      </div>
    </div>
  );
}

function TestResponsesModal({ assignment, onClose }) {
  if (!assignment) return null;
  const questions = assignment.test?.questions || [];
  const answers = assignment.answers || {};

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '95%', maxHeight: '90vh', overflowY: 'auto', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>{assignment.test?.title || 'Test Details'}</h2>
            <p className="sub-text" style={{ margin: '4px 0 0 0' }}>Candidate: <strong>{assignment.candidate?.full_name}</strong> • Completed on {new Date(assignment.completed_at).toLocaleString()}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '1.5rem', fontWeight: 'bold' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {questions.map((q, idx) => {
            const ans = answers[q.id.toString()] || answers[q.id];
            const isCoding = q.question_type === 'CODING' || (!q.option_a && !q.option_b && !q.option_c && !q.option_d);
            
            return (
              <div key={q.id} style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px', background: 'var(--color-bg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Question {idx + 1} ({isCoding ? 'Coding' : 'MCQ'})</span>
                  {!isCoding && (
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: ans === q.correct_option ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: ans === q.correct_option ? '#22c55e' : '#ef4444'
                    }}>
                      {ans === q.correct_option ? 'Correct' : 'Incorrect'}
                    </span>
                  )}
                </div>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{q.question_text}</h4>

                {isCoding ? (
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                      Selected Language: <strong style={{ color: 'var(--color-primary)' }}>{(ans?.language || 'N/A').toUpperCase()}</strong>
                    </div>
                    {ans?.code ? (
                      <div style={{
                        background: '#1a1a1a',
                        color: '#9cdcfe',
                        padding: '16px',
                        borderRadius: '6px',
                        fontFamily: 'Consolas, Monaco, monospace',
                        fontSize: '0.85rem',
                        lineHeight: '1.4',
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap',
                        border: '1px solid #333'
                      }}>
                        {ans.code}
                      </div>
                    ) : (
                      <span className="text-muted" style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>No code submitted.</span>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {[
                      { key: 'A', text: q.option_a },
                      { key: 'B', text: q.option_b },
                      { key: 'C', text: q.option_c },
                      { key: 'D', text: q.option_d }
                    ].map(opt => {
                      const isChosen = ans === opt.key;
                      const isCorrect = q.correct_option === opt.key;
                      let borderColor = 'var(--color-border)';
                      let background = 'transparent';
                      
                      if (isChosen) {
                        borderColor = isCorrect ? '#22c55e' : '#ef4444';
                        background = isCorrect ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)';
                      } else if (isCorrect) {
                        borderColor = '#22c55e';
                        background = 'rgba(34, 197, 94, 0.04)';
                      }

                      return (
                        <div key={opt.key} style={{
                          border: `1px solid ${borderColor}`,
                          borderRadius: '6px',
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          background,
                          fontSize: '0.9rem'
                        }}>
                          <span style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: isChosen ? (isCorrect ? '#22c55e' : '#ef4444') : 'var(--color-border)',
                            color: isChosen ? '#000' : 'var(--color-text-primary)'
                          }}>{opt.key}</span>
                          <span style={{ color: 'var(--color-text-primary)' }}>{opt.text}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
