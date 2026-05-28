/**
 * CandidateDashboard Component
 * 
 * Provides a central hub for managing candidate applications.
 * Features:
 * - Search and filter by candidate name, position, and status.
 * - Exporting candidate data to CSV.
 * - Integration with ThemeToggle and Auth system.
 * - Responsive mobile-first design with optimized header alignment.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api from '@/api/axios';
import { ArrowLeft, Search, Filter, ChevronRight, LogOut, Mail, Phone, Calendar, Download, LayoutGrid, User } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import './CandidateDashboard.css';

const STATUS_OPTIONS = ['All Status', 'Applied', 'Screening', 'Interview', 'HR Round', 'Offered', 'Hired', 'Rejected'];

function getStatusBadgeClass(status) {
  const map = {
    Applied: 'badge-applied',
    Screening: 'badge-screening',
    Interview: 'badge-interview',
    'HR Round': 'badge-hr-round',
    Offered: 'badge-offered',
    Hired: 'badge-hired',
    Rejected: 'badge-rejected',
  };
  return map[status] || 'badge-applied';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const datePart = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const timePart = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${datePart} at ${timePart}`;
}

function getLatestInterviewerName(candidate) {
  if (!candidate.assessments || candidate.assessments.length === 0) return null;
  
  // Sort assessments by conducted_at descending to find the latest
  const sorted = [...candidate.assessments].sort((a, b) => {
    return new Date(b.conducted_at) - new Date(a.conducted_at);
  });
  
  const latestAssessment = sorted[0];
  
  // Try parsed JSON remarks first, as it represents the actual interviewer conducting the round
  if (latestAssessment.remarks && latestAssessment.remarks.startsWith('{')) {
    try {
      const r = JSON.parse(latestAssessment.remarks);
      if (r.interviewerInfo?.name) {
        return r.interviewerInfo.name;
      }
    } catch (e) {
      // ignore
    }
  }
  
  // Fall back to direct relation (the user account that created/logged the assessment)
  if (latestAssessment.interviewer?.name) {
    return latestAssessment.interviewer.name;
  }
  
  return null;
}

function getInterviewerForRound(candidate, roundType) {
  if (!candidate.assessments || candidate.assessments.length === 0) return null;
  
  const assessment = candidate.assessments.find(a => 
    a.assessment_type === roundType || 
    (roundType === 'Tech Round' && a.assessment_type === 'TECH') ||
    (roundType === 'HR Round' && a.assessment_type === 'HR')
  );
  
  if (!assessment) return null;
  
  if (assessment.remarks && assessment.remarks.startsWith('{')) {
    try {
      const r = JSON.parse(assessment.remarks);
      if (r.interviewerInfo?.name) return r.interviewerInfo.name;
    } catch (e) {}
  }
  
  return assessment.interviewer?.name || null;
}

export default function CandidateDashboard() {
  const navigate = useNavigate();
  const { user, requestLogout } = useAuth();
  const toast = useToast();
  const [candidates, setCandidates] = useState([]);
  const [interviewers, setInterviewers] = useState([]);

  const handleLogout = () => {
    requestLogout();
  };
  const [positions, setPositions] = useState([]);
  const [search, setSearch] = useState(() => sessionStorage.getItem('dashboard_search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(() => sessionStorage.getItem('dashboard_search') || '');
  const [statusFilter, setStatusFilter] = useState(() => sessionStorage.getItem('dashboard_statusFilter') || 'All Status');
  const [positionFilter, setPositionFilter] = useState(() => sessionStorage.getItem('dashboard_positionFilter') || 'All Positions');
  const [loading, setLoading] = useState(true);

  // Sync filters to sessionStorage to persist dashboard state
  useEffect(() => {
    sessionStorage.setItem('dashboard_search', search);
  }, [search]);

  useEffect(() => {
    sessionStorage.setItem('dashboard_statusFilter', statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    sessionStorage.setItem('dashboard_positionFilter', positionFilter);
  }, [positionFilter]);

  // Debounce search to minimize API calls
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchCandidates();
      setLoading(false);
    };
    load();
  }, [debouncedSearch, statusFilter, positionFilter]);

  useEffect(() => {
    fetchPositions();
    fetchInterviewers();
  }, []);

  const fetchCandidates = async () => {
    try {
      const params = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== 'All Status') params.status = statusFilter;
      if (positionFilter !== 'All Positions') params.position = positionFilter;

      const res = await api.get('/candidates', { params });
      // Sort candidates descending by their application date and time (newest first)
      const sorted = [...res.data].sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at));
      setCandidates(sorted);
    } catch (err) {
      console.error('Failed to fetch candidates', err);
      toast.error('Failed to load candidates');
    }
  };

  const fetchInterviewers = async () => {
    try {
      const res = await api.get('/users/interviewers');
      setInterviewers(res.data);
    } catch (err) {
      console.error('Failed to fetch interviewers', err);
    }
  };

  const handleAssignInterviewer = async (candidateId, interviewerId) => {
    try {
      const targetVal = interviewerId ? parseInt(interviewerId) : 0;
      await api.patch(`/candidates/${candidateId}/assign`, null, {
        params: { interviewer_id: targetVal }
      });
      toast.success('Interviewer assigned successfully');
      fetchCandidates();
    } catch (err) {
      console.error('Failed to assign interviewer', err);
      toast.error('Failed to assign interviewer');
    }
  };

  const fetchPositions = async () => {
    try {
      const res = await api.get('/candidates/positions');
      setPositions(res.data);
    } catch (err) {
      console.error('Failed to fetch positions', err);
    }
  };

  const filtered = candidates;

  const exportToCSV = () => {
    if (filtered.length === 0) {
      toast.error('No candidates to export');
      return;
    }
    
    const headers = [
      'Candidate ID', 'Full Name', 'Email', 'Phone', 'Position Applied', 
      'Status', 'Experience (Years)', 'Experience (Months)', 
      'Current CTC', 'Expected CTC', 'Notice Period', 'Date Applied'
    ];
    
    const escapeCsv = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
    
    const rows = filtered.map(c => [
      c.id || '',
      escapeCsv(c.full_name),
      escapeCsv(c.email),
      escapeCsv(c.phone),
      escapeCsv(c.position_applied),
      escapeCsv(c.status),
      c.experience_years || 0,
      c.experience_months || 0,
      escapeCsv(c.current_ctc ? `${c.current_ctc} LPA` : ''),
      escapeCsv(c.expected_ctc ? `${c.expected_ctc} LPA` : ''),
      escapeCsv(c.notice_period),
      escapeCsv(formatDate(c.applied_at))
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `candidates_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Candidates data exported successfully');
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <button className="icon-btn" onClick={() => navigate('/home')}><ArrowLeft size={20} /></button>
          <div>
            <h1 className="dashboard-title">Candidate Dashboard</h1>
            <p className="dashboard-count">{filtered.length} candidates</p>
          </div>
        </div>
        
        <div className="dashboard-header-right">
          <button className="btn btn-primary btn-sm export-btn" onClick={exportToCSV}>
            <Download size={14} /> <span className="btn-text">Export CSV</span>
          </button>
          <ThemeToggle />
          <button className="btn btn-outline btn-sm logout-btn" onClick={handleLogout}>
            <LogOut size={16} /> <span className="btn-text">Logout</span>
          </button>
        </div>
      </header>

      {/* Filters */}
      {/* Search and Filters Section */}
      <div className="dashboard-filters">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            id="search-candidates"
            type="text"
            placeholder="Search by name, email, or position..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <Filter size={16} />
          <select id="filter-status" className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <LayoutGrid size={16} />
          <select id="filter-position" className="filter-select" value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)}>
            <option value="All Positions">All Positions</option>
            {positions.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <p className="dashboard-showing">
        Showing {filtered.length} of {candidates.length} candidates
      </p>

      {/* Candidate List */}
      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : (
        <div className="candidate-list stagger-children">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="candidate-card card card-interactive"
              onClick={() => window.open(`/candidates/${c.id}`, '_blank')}
              id={`candidate-${c.id}`}
            >
              <div className="candidate-card-top">
                <div className="candidate-info">
                  <h3 className="candidate-name">{c.full_name}</h3>
                  <p className="candidate-position">{c.position_applied}</p>
                </div>
                <div className="candidate-status-group" onClick={(e) => e.stopPropagation()}>
                  {/* Show assign dropdown only if both Tech & HR rounds are NOT yet completed */}
                  {(user?.role === 'ADMIN' || user?.role === 'HR' || user?.role === 'INTERVIEWER') && !getInterviewerForRound(c, 'HR Round') && (
                    <select
                      className="assign-btn-select"
                      value={c.interviewer_id || ''}
                      onChange={(e) => handleAssignInterviewer(c.id, e.target.value)}
                    >
                      <option value={c.interviewer_id || ''}>
                        {c.interviewer ? c.interviewer.name : "Assign"}
                      </option>
                      {interviewers
                        .filter((i) => i.id !== c.interviewer_id)
                        .map((i) => (
                          <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                      {c.interviewer && <option value="0">Unassign</option>}
                    </select>
                  )}
                  <span className={`badge ${getStatusBadgeClass(c.status)}`}>{c.status}</span>
                  <ChevronRight size={18} className="candidate-arrow" />
                </div>
              </div>

              <div className="candidate-meta">
                <span className="meta-item"><Mail size={14} /> {c.email || 'N/A'}</span>
                <span className="meta-item"><Phone size={14} /> {c.phone || 'N/A'}</span>
                <span className="meta-item"><Calendar size={14} /> Applied on {formatDate(c.applied_at) || 'N/A'}</span>
              </div>

              {(getInterviewerForRound(c, 'Tech Round') || getInterviewerForRound(c, 'HR Round') || (!(user?.role === 'ADMIN' || user?.role === 'HR' || user?.role === 'INTERVIEWER') && c.interviewer)) && (
                <div className="candidate-meta-rounds" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '10px' }}>
                  {getInterviewerForRound(c, 'Tech Round') && (
                    <span className="meta-item" style={{ margin: 0 }}>
                      <User size={14} /> Tech by: {getInterviewerForRound(c, 'Tech Round')}
                    </span>
                  )}
                  {getInterviewerForRound(c, 'HR Round') && (
                    <span className="meta-item" style={{ margin: 0 }}>
                      <User size={14} /> HR by: {getInterviewerForRound(c, 'HR Round')}
                    </span>
                  )}
                  {/* Fallback display if not admin/HR/interviewer and not has rounds but has assignment */}
                  {!(user?.role === 'ADMIN' || user?.role === 'HR' || user?.role === 'INTERVIEWER') && c.interviewer && !getInterviewerForRound(c, 'Tech Round') && !getInterviewerForRound(c, 'HR Round') && (
                    <span className="meta-item" style={{ color: 'var(--color-primary)', fontWeight: 600, margin: 0 }}>
                      <User size={14} /> Assigned: {c.interviewer.name}
                    </span>
                  )}
                </div>
              )}

              {(c.experience_years > 0 || c.experience_months > 0 || c.expected_ctc) && (
                <div className="candidate-tags">
                  {(c.experience_years > 0 || c.experience_months > 0) && (
                    <span className="chip">{c.experience_years}y {c.experience_months}m exp</span>
                  )}
                  {c.expected_ctc && (
                    <span className="chip">
                      Expected: {c.expected_ctc?.toLowerCase().includes('lpa') ? c.expected_ctc : `${c.expected_ctc} LPA`}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && !loading && (
            <div className="empty-state">
              <p>No candidates found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
