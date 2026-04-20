import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api from '@/api/axios';
import { ArrowLeft, Search, Filter, LayoutGrid, ChevronRight, LogOut, Mail, Phone, Calendar, Download, Share } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import './CandidateDashboard.css';

const STATUS_OPTIONS = ['All Status', 'Applied', 'Screening', 'Interview', 'Offered', 'Hired', 'Rejected'];

function getStatusBadgeClass(status) {
  const map = {
    Applied: 'badge-applied',
    Screening: 'badge-screening',
    Interview: 'badge-interview',
    Offered: 'badge-offered',
    Hired: 'badge-hired',
    Rejected: 'badge-rejected',
  };
  return map[status] || 'badge-applied';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CandidateDashboard() {
  const navigate = useNavigate();
  const { logout, requestLogout } = useAuth();
  const toast = useToast();
  const [candidates, setCandidates] = useState([]);

  const handleLogout = () => {
    requestLogout();
  };
  const [positions, setPositions] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [positionFilter, setPositionFilter] = useState('All Positions');
  const [loading, setLoading] = useState(true);

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
  }, []);

  const fetchCandidates = async () => {
    try {
      const params = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== 'All Status') params.status = statusFilter;
      if (positionFilter !== 'All Positions') params.position = positionFilter;

      const res = await api.get('/candidates', { params });
      setCandidates(res.data);
    } catch (err) {
      console.error('Failed to fetch candidates', err);
      toast.error('Failed to load candidates');
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

  const handleShareLink = () => {
    const url = `${window.location.origin}/apply`;
    navigator.clipboard.writeText(url)
      .then(() => toast.success('Application form link copied!'))
      .catch(() => toast.error('Failed to copy link'));
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <button className="icon-btn" onClick={() => navigate('/')}><ArrowLeft size={20} /></button>
          <div>
            <h1 className="dashboard-title">Candidate Dashboard</h1>
            <p className="dashboard-count">{filtered.length} candidates</p>
          </div>
        </div>
        
        <div className="dashboard-header-right">
          <button className="btn btn-outline btn-sm share-btn" onClick={handleShareLink}>
            <Share size={14} /> <span className="btn-text">Share Link</span>
          </button>
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
              onClick={() => navigate(`/candidates/${c.id}`)}
              id={`candidate-${c.id}`}
            >
              <div className="candidate-card-top">
                <div className="candidate-info">
                  <h3 className="candidate-name">{c.full_name}</h3>
                  <p className="candidate-position">{c.position_applied}</p>
                </div>
                <div className="candidate-status-group">
                  <span className={`badge ${getStatusBadgeClass(c.status)}`}>{c.status}</span>
                  <ChevronRight size={18} className="candidate-arrow" />
                </div>
              </div>

              <div className="candidate-meta">
                <span className="meta-item"><Mail size={14} /> {c.email || 'N/A'}</span>
                <span className="meta-item"><Phone size={14} /> {c.phone || 'N/A'}</span>
                <span className="meta-item"><Calendar size={14} /> Applied on {formatDate(c.applied_at) || 'N/A'}</span>
              </div>

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
