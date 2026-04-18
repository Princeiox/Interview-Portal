import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api from '@/api/axios';
import { ArrowLeft, LogOut, Search, ChevronRight, Users, ClipboardCheck, Clock, UserPlus, Trash2, X, Eye, EyeOff } from 'lucide-react';
import './InterviewDashboard.css';
import '../candidates/CandidateDashboard.css';
import ThemeToggle from '@/components/ThemeToggle';
import ConfirmModal from '@/components/ConfirmModal';

const STATUS_OPTIONS = ['All Status', 'Interview', 'Screening', 'Applied', 'Hired', 'Rejected'];

function getStatusBadgeClass(status) {
  const map = {
    Applied: 'badge-applied', Screening: 'badge-screening', Interview: 'badge-interview',
    Offered: 'badge-offered', Hired: 'badge-hired', Rejected: 'badge-rejected',
  };
  return map[status] || 'badge-applied';
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatRole(role) {
  if (!role) return '-';
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export default function InterviewDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const { logout, user, requestLogout } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const handleLogout = () => {
    requestLogout();
  };

  const [candidates, setCandidates] = useState([]);
  const [interviewers, setInterviewers] = useState([]);
  const [selectedInterviewerId, setSelectedInterviewerId] = useState(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [loading, setLoading] = useState(true);

  // Debounce search to minimize API calls
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);
  const [loadingInterviewers, setLoadingInterviewers] = useState(false);
  const [creatingInterviewer, setCreatingInterviewer] = useState(false);
  const [deletingInterviewer, setDeletingInterviewer] = useState(false);
  const [showCreateInterviewerModal, setShowCreateInterviewerModal] = useState(false);
  const [showInterviewerDetailsModal, setShowInterviewerDetailsModal] = useState(false);
  const [pendingDeleteInterviewer, setPendingDeleteInterviewer] = useState(null);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [interviewerForm, setInterviewerForm] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [candidateToDelete, setCandidateToDelete] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchCandidates();
      setLoading(false);
    };
    load();
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    if (user && user.role !== 'ADMIN' && user.role !== 'INTERVIEWER') {
      navigate('/candidates', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchInterviewers();
    }
  }, [isAdmin]);

  const fetchCandidates = async () => {
    try {
      const params = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== 'All Status') params.status = statusFilter;
      const res = await api.get('/candidates', { params });
      setCandidates(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInterviewers = async () => {
    setLoadingInterviewers(true);
    try {
      const res = await api.get('/users/interviewers');
      setInterviewers(res.data);
      setSelectedInterviewerId((currentId) => {
        if (!currentId) return null;
        if (res.data.some((item) => item.id === currentId)) return currentId;
        return null;
      });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load interviewers');
    } finally {
      setLoadingInterviewers(false);
    }
  };

  const handleCreateInterviewer = async (e) => {
    e.preventDefault();
    setCreatingInterviewer(true);
    try {
      const res = await api.post('/users/interviewers', interviewerForm);
      setCreatedCredentials({
        id: res.data.id,
        name: interviewerForm.name,
        email: interviewerForm.email,
        password: interviewerForm.password,
      });
      setShowCreateInterviewerModal(false);
      setInterviewerForm({ name: '', email: '', password: '' });
      setShowPassword(false);
      await fetchInterviewers();
      setSelectedInterviewerId(null);
      toast.success('Interviewer account created successfully.');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not create interviewer');
    } finally {
      setCreatingInterviewer(false);
    }
  };

  const handleDeleteInterviewer = async (interviewerOverride = null) => {
    const interviewer = interviewerOverride || interviewers.find((item) => item.id === selectedInterviewerId);
    if (!interviewer) return;

    setDeletingInterviewer(true);
    try {
      await api.delete(`/users/interviewers/${interviewer.id}`);
      toast.success('Interviewer deleted successfully.');
      if (createdCredentials?.id === interviewer.id) {
        setCreatedCredentials(null);
      }
      await fetchInterviewers();
      setShowInterviewerDetailsModal(false);
      setPendingDeleteInterviewer(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not delete interviewer');
    } finally {
      setDeletingInterviewer(false);
    }
  };

  const handleDeleteCandidate = async () => {
    if (!candidateToDelete) return;
    
    try {
      const name = candidateToDelete.full_name;
      await api.delete(`/candidates/${candidateToDelete.id}`);
      toast.warning(`${name} has been deleted successfully.`);
      fetchCandidates();
      setCandidateToDelete(null);
    } catch (err) {
      toast.error('Error deleting candidate');
    }
  };

  // Stats
  const interviewCount = candidates.filter(c => c.status === 'Interview').length;
  const screeningCount = candidates.filter(c => c.status === 'Screening').length;
  const totalCount = candidates.length;
  const selectedInterviewer = interviewers.find((item) => item.id === selectedInterviewerId) || null;
  const latestCredentialsForSelected = createdCredentials?.id === selectedInterviewer?.id ? createdCredentials : null;

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <button className="icon-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
          <div>
            <h1 className="dashboard-title">{isAdmin ? 'Create Interviewer' : 'Interview Dashboard'}</h1>
            <p className="dashboard-count">{isAdmin ? 'Create interviewer and assess candidates' : 'Assess candidates during interviews'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button className="btn btn-outline btn-sm" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* Stats */}
      <div className="interview-stats">
        <div className="stat-card card">
          <div className="stat-icon" style={{ background: '#ede9fe', color: '#7c3aed' }}><Users size={20} /></div>
          <div>
            <p className="stat-value">{totalCount}</p>
            <p className="stat-label">Total Candidates</p>
          </div>
        </div>
        <div className="stat-card card">
          <div className="stat-icon" style={{ background: '#e0e7ff', color: '#4338ca' }}><ClipboardCheck size={20} /></div>
          <div>
            <p className="stat-value">{interviewCount}</p>
            <p className="stat-label">In Interview</p>
          </div>
        </div>
        <div className="stat-card card">
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#b45309' }}><Clock size={20} /></div>
          <div>
            <p className="stat-value">{screeningCount}</p>
            <p className="stat-label">Screening</p>
          </div>
        </div>
      </div>

      {isAdmin && (
        <section className="interviewer-manager card">
          <div className="interviewer-manager-header">
            <div>
              <h2 className="interviewer-manager-title">Interviewer Management</h2>
              <p className="interviewer-manager-subtitle">
                Create interviewers, review their login details, and remove them when needed.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowCreateInterviewerModal(true)}
            >
              <UserPlus size={16} /> Create Interviewer
            </button>
          </div>

          <div className="interviewer-manager-grid">
            <div className="interviewer-list">
              {loadingInterviewers ? (
                <div className="interviewer-empty">Loading interviewers...</div>
              ) : interviewers.length === 0 ? (
                <div className="interviewer-empty">No interviewers created yet.</div>
              ) : (
                interviewers.map((interviewer) => (
                  <div
                    key={interviewer.id}
                    className={`interviewer-list-item ${selectedInterviewerId === interviewer.id ? 'active' : ''}`}
                  >
                    <button
                      type="button"
                      className="interviewer-list-button"
                      onClick={() => {
                        setSelectedInterviewerId(interviewer.id);
                        setShowInterviewerDetailsModal(true);
                      }}
                    >
                      <p className="interviewer-list-name">{interviewer.name}</p>
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm interviewer-inline-delete"
                      onClick={() => setPendingDeleteInterviewer(interviewer)}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* Search */}
      <div className="dashboard-filters" style={{ marginTop: 24 }}>
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            id="search-interview"
            type="text"
            placeholder="Search candidates to interview..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
        <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : (
        <div className="candidate-list stagger-children" style={{ marginTop: 20 }}>
          {candidates.map((c) => (
            <div
              key={c.id}
              className="candidate-card card card-interactive"
              onClick={() => navigate(`/candidates/${c.id}`)}
            >
              <div className="candidate-card-top">
                <div className="candidate-info">
                  <h3 className="candidate-name">{c.full_name}</h3>
                  <p className="candidate-position">{c.position_applied}</p>
                </div>
                <div className="candidate-status-group">
                  <span className={`badge ${getStatusBadgeClass(c.status)}`}>{c.status}</span>
                  {isAdmin && (
                    <button 
                      className="icon-btn-danger" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setCandidateToDelete(c);
                      }}
                      title="Delete Candidate"
                      style={{ 
                        marginLeft: '8px', 
                        padding: '4px',
                        color: 'var(--color-error)' ,
                        borderRadius: '4px',
                        border: 'none',
                        background: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <ChevronRight size={18} className="candidate-arrow" />
                </div>
              </div>
              {c.assessments && c.assessments.length > 0 && (
                <div className="candidate-tags">
                  <span className="chip">{c.assessments.length} assessment(s)</span>
                </div>
              )}
            </div>
          ))}
          {candidates.length === 0 && (
            <div className="empty-state"><p>No candidates found for interview</p></div>
          )}
        </div>
      )}

      <ConfirmModal 
        isOpen={!!candidateToDelete}
        onClose={() => setCandidateToDelete(null)}
        onConfirm={handleDeleteCandidate}
        title="Delete Candidate"
        message={candidateToDelete ? `Are you sure you want to permanently delete candidate ${candidateToDelete.full_name}? This action cannot be undone.` : ''}
        confirmText="Delete"
      />

      {showCreateInterviewerModal && (
        <div className="interviewer-modal-overlay" onClick={() => !creatingInterviewer && setShowCreateInterviewerModal(false)}>
          <div className="interviewer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="interviewer-modal-header">
              <div>
                <h2 className="interviewer-modal-title">Create Interviewer</h2>
                <p className="interviewer-modal-subtitle">Add the interviewer name, login ID, and password.</p>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => !creatingInterviewer && setShowCreateInterviewerModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form className="interviewer-modal-form" onSubmit={handleCreateInterviewer}>
              <div className="form-group">
                <label className="form-label">Interviewer Name</label>
                <input
                  id="interviewer-name"
                  type="text"
                  className="form-input"
                  placeholder="Priya Sharma"
                  value={interviewerForm.name}
                  onChange={(e) => setInterviewerForm({ ...interviewerForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Login ID (Email)</label>
                <input
                  id="interviewer-email"
                  type="email"
                  className="form-input"
                  placeholder="priya@company.com"
                  value={interviewerForm.email}
                  onChange={(e) => setInterviewerForm({ ...interviewerForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="interviewer-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Create a password"
                    value={interviewerForm.password}
                    onChange={(e) => setInterviewerForm({ ...interviewerForm, password: e.target.value })}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="interviewer-modal-actions">
                <button
                  id="interviewer-create-submit"
                  type="submit"
                  className="btn btn-primary"
                  disabled={creatingInterviewer}
                >
                  {creatingInterviewer ? 'Creating...' : 'Save Interviewer'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowCreateInterviewerModal(false)}
                  disabled={creatingInterviewer}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInterviewerDetailsModal && selectedInterviewer && (
        <div className="interviewer-modal-overlay" onClick={() => !deletingInterviewer && setShowInterviewerDetailsModal(false)}>
          <div className="interviewer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="interviewer-modal-header">
              <div>
                <h2 className="interviewer-modal-title">{selectedInterviewer.name}</h2>
                <p className="interviewer-modal-subtitle">{selectedInterviewer.email}</p>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => !deletingInterviewer && setShowInterviewerDetailsModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="interviewer-details-grid">
              <div className="info-item">
                <span className="info-label">EMAIL ID</span>
                <span className="info-value">{selectedInterviewer.email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">ROLE</span>
                <span className="info-value">{formatRole(selectedInterviewer.role)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">CREATED ON</span>
                <span className="info-value">{formatDate(selectedInterviewer.created_at)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">INTERVIEWS TAKEN</span>
                <span className="info-value">{selectedInterviewer.assessments_count}</span>
              </div>
            </div>

            {latestCredentialsForSelected && (
              <div className="interviewer-credentials">
                <p className="interviewer-credentials-title">Latest login credentials</p>
                <p><strong>Login ID:</strong> {latestCredentialsForSelected.email}</p>
                <p><strong>Password:</strong> {latestCredentialsForSelected.password}</p>
              </div>
            )}

            <div className="interviewer-modal-actions">
              <button
                type="button"
                className="btn btn-outline btn-sm interviewer-delete-btn"
                onClick={() => setPendingDeleteInterviewer(selectedInterviewer)}
                disabled={deletingInterviewer}
              >
                <Trash2 size={14} /> Delete
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowInterviewerDetailsModal(false)}
                disabled={deletingInterviewer}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteInterviewer && (
        <div className="interviewer-modal-overlay" onClick={() => !deletingInterviewer && setPendingDeleteInterviewer(null)}>
          <div className="interviewer-modal interviewer-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="interviewer-modal-header">
              <div>
                <h2 className="interviewer-modal-title">Delete Interviewer</h2>
                <p className="interviewer-modal-subtitle">
                  Are you sure you want to delete {pendingDeleteInterviewer.name}?
                </p>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => !deletingInterviewer && setPendingDeleteInterviewer(null)}
              >
                <X size={18} />
              </button>
            </div>

            <p className="interviewer-confirm-copy">
              This will remove the interviewer account. Any interviews already taken will remain in the system.
            </p>

            <div className="interviewer-modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setPendingDeleteInterviewer(null)}
                disabled={deletingInterviewer}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary interviewer-danger-btn"
                onClick={() => handleDeleteInterviewer(pendingDeleteInterviewer)}
                disabled={deletingInterviewer}
              >
                {deletingInterviewer ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
