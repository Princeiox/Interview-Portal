import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import {
  ArrowLeft,
  Upload,
  UserPlus,
  Copy,
  ExternalLink,
  FileText,
  CheckCircle,
  Clock,
  Download,
  ClipboardList,
  Trash2,
  Plus,
  Share2,
  Mail,
  RotateCcw
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import './TestModule.css';

export default function TestModule() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [tests, setTests] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentForViewer, setSelectedAssignmentForViewer] = useState(null);

  // Edit Test states
  const [editingTest, setEditingTest] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDuration, setEditDuration] = useState(30);
  const [editQuestions, setEditQuestions] = useState([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Test creation form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(30);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Manual creation state
  const [creationMode, setCreationMode] = useState('csv'); // 'csv' or 'manual'
  const [manualQuestions, setManualQuestions] = useState([
    { question_text: '', question_type: 'MCQ', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A' }
  ]);

  const handleAddQuestion = () => {
    setManualQuestions([
      ...manualQuestions,
      { question_text: '', question_type: 'MCQ', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A' }
    ]);
  };

  const handleRemoveQuestion = (index) => {
    const updated = manualQuestions.filter((_, i) => i !== index);
    setManualQuestions(updated);
  };

  const handleQuestionChange = (index, field, value) => {
    const updated = [...manualQuestions];
    updated[index][field] = value;
    setManualQuestions(updated);
  };

  // Assignment form state
  const [selectedTestId, setSelectedTestId] = useState('');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');
  const [showCandidateDropdown, setShowCandidateDropdown] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const dropdownRef = useRef(null);

  const toggleCandidateSelection = (id) => {
    const stringId = id.toString();
    setSelectedCandidateIds(prev => 
      prev.includes(stringId) 
        ? prev.filter(item => item !== stringId) 
        : [...prev, stringId]
    );
  };

  const removeCandidate = (id) => {
    setSelectedCandidateIds(prev => prev.filter(item => item !== id.toString()));
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowCandidateDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Loading states
  const [isLoadingTests, setIsLoadingTests] = useState(true);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(true);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);

  const fetchTests = async () => {
    try {
      setIsLoadingTests(true);
      const res = await api.get('/tests');
      setTests(res.data);
    } catch (err) {
      toast.showError('Failed to fetch tests: ' + (err.message || err));
    } finally {
      setIsLoadingTests(false);
    }
  };

  const fetchCandidates = async () => {
    try {
      setIsLoadingCandidates(true);
      const res = await api.get('/candidates');
      setCandidates(res.data);
    } catch (err) {
      toast.showError('Failed to fetch candidates: ' + (err.message || err));
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      setIsLoadingAssignments(true);
      const res = await api.get('/tests/assignments');
      setAssignments(res.data);
    } catch (err) {
      toast.showError('Failed to fetch assignments: ' + (err.message || err));
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  const handleReattempt = async (candidateTestId) => {
    if (!window.confirm('Are you sure you want to allow the candidate to re-attempt this test? This will reset their previous score and answers.')) {
      return;
    }
    try {
      await api.post(`/tests/assignments/${candidateTestId}/reattempt`);
      toast.showSuccess('Test reset successfully! Candidate can now re-attempt.');
      fetchAssignments();
    } catch (err) {
      toast.showError('Failed to reset test: ' + (err.message || err));
    }
  };

  const handleDeleteTest = async (testId) => {
    if (!window.confirm('Are you sure you want to delete this test? This will also delete all associated questions and candidates\' test assignments! This action cannot be undone.')) {
      return;
    }
    try {
      await api.delete(`/tests/${testId}`);
      toast.showSuccess('Test deleted successfully!');
      fetchTests();
      fetchAssignments();
    } catch (err) {
      toast.showError('Failed to delete test: ' + (err.response?.data?.detail || err.message || err));
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to delete this test assignment? This action cannot be undone.')) {
      return;
    }
    try {
      await api.delete(`/tests/assignments/${assignmentId}`);
      toast.showSuccess('Test assignment deleted successfully!');
      fetchAssignments();
    } catch (err) {
      toast.showError('Failed to delete assignment: ' + (err.response?.data?.detail || err.message || err));
    }
  };

  const handleStartEditTest = (test) => {
    setEditingTest(test);
    setEditTitle(test.title || '');
    setEditDescription(test.description || '');
    setEditDuration(test.duration || 30);
    setEditQuestions(test.questions ? [...test.questions] : []);
  };

  const handleSaveEditTest = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      toast.showWarning('Please enter a test title.');
      return;
    }
    if (editQuestions.length === 0) {
      toast.showWarning('Please add at least one question.');
      return;
    }

    for (let i = 0; i < editQuestions.length; i++) {
      const q = editQuestions[i];
      if (!q.question_text.trim()) {
        toast.showWarning(`Please fill out the question text for Question ${i + 1}.`);
        return;
      }
      if (q.question_type !== 'CODING') {
        if (!q.option_a || !q.option_a.trim() || !q.option_b || !q.option_b.trim() || !q.option_c || !q.option_c.trim() || !q.option_d || !q.option_d.trim() || !q.correct_option) {
          toast.showWarning(`Please fill out all options and correct answer for MCQ Question ${i + 1}.`);
          return;
        }
      }
    }

    setIsSavingEdit(true);
    try {
      await api.put(`/tests/${editingTest.id}`, {
        title: editTitle,
        description: editDescription,
        duration: parseInt(editDuration) || 30,
        questions: editQuestions.map(q => ({
          question_text: q.question_text,
          question_type: q.question_type || "MCQ",
          option_a: q.question_type === 'CODING' ? '' : q.option_a,
          option_b: q.question_type === 'CODING' ? '' : q.option_b,
          option_c: q.question_type === 'CODING' ? '' : q.option_c,
          option_d: q.question_type === 'CODING' ? '' : q.option_d,
          correct_option: q.question_type === 'CODING' ? '' : q.correct_option,
        }))
      });
      toast.showSuccess('Test updated successfully!');
      setEditingTest(null);
      fetchTests();
      fetchAssignments();
    } catch (err) {
      toast.showError('Update failed: ' + (err.response?.data?.detail || err.message || err));
    } finally {
      setIsSavingEdit(false);
    }
  };

  useEffect(() => {
    fetchTests();
    fetchCandidates();
    fetchAssignments();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const parseCSV = (text) => {
    // Strip UTF-8 BOM if present
    if (text.startsWith('\uFEFF')) {
      text = text.substring(1);
    }
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length <= 1) {
      throw new Error('CSV is empty or contains no data rows.');
    }

    // Parse the headers
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
    console.log('Detected headers:', headers);

    // Find column indices (handling common header names)
    const qIdx = headers.findIndex(h => h.includes('question') || h === 'q');
    const aIdx = headers.findIndex(h => h.includes('option_a') || h.includes('option a') || h === 'optiona' || h === 'a');
    const bIdx = headers.findIndex(h => h.includes('option_b') || h.includes('option b') || h === 'optionb' || h === 'b');
    const cIdx = headers.findIndex(h => h.includes('option_c') || h.includes('option c') || h === 'optionc' || h === 'c');
    const dIdx = headers.findIndex(h => h.includes('option_d') || h.includes('option d') || h === 'optiond' || h === 'd');
    const ansIdx = headers.findIndex(h => h.includes('correct') || h.includes('answer') || h === 'ans');

    if (qIdx === -1 || aIdx === -1 || bIdx === -1 || cIdx === -1 || dIdx === -1 || ansIdx === -1) {
      throw new Error('CSV must contain headers for Question, Option A, Option B, Option C, Option D, and Correct Option (or Answer).');
    }

    const parsedQuestions = [];

    // Helper to parse a CSV line supporting quoted fields
    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            // Escaped quote
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    for (let i = 1; i < lines.length; i++) {
      const cells = parseCSVLine(lines[i]);
      if (cells.length < Math.max(qIdx, aIdx, bIdx, cIdx, dIdx, ansIdx) + 1) {
        continue; // skip malformed lines
      }

      const question_text = cells[qIdx] || '';
      const option_a = cells[aIdx] || '';
      const option_b = cells[bIdx] || '';
      const option_c = cells[cIdx] || '';
      const option_d = cells[dIdx] || '';
      let correct_option = (cells[ansIdx] || '').toUpperCase().trim();

      // Normalize correct option to A, B, C, or D
      if (!['A', 'B', 'C', 'D'].includes(correct_option)) {
        const valLower = correct_option.toLowerCase();
        if (valLower === option_a.toLowerCase()) correct_option = 'A';
        else if (valLower === option_b.toLowerCase()) correct_option = 'B';
        else if (valLower === option_c.toLowerCase()) correct_option = 'C';
        else if (valLower === option_d.toLowerCase()) correct_option = 'D';
        else correct_option = 'A';
      }

      if (question_text && option_a && option_b && option_c && option_d) {
        parsedQuestions.push({
          question_text,
          option_a,
          option_b,
          option_c,
          option_d,
          correct_option
        });
      }
    }
    return parsedQuestions;
  };

  const handleImportCSV = (e) => {
    e.preventDefault();
    if (!file) {
      toast.showWarning('Please select a CSV file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          toast.showError('No valid questions found in the CSV.');
          return;
        }

        // If manualQuestions has only 1 empty question, replace it. Otherwise append.
        const isDefaultSingleEmpty = manualQuestions.length === 1 &&
          !manualQuestions[0].question_text.trim() &&
          !manualQuestions[0].option_a.trim() &&
          !manualQuestions[0].option_b.trim() &&
          !manualQuestions[0].option_c.trim() &&
          !manualQuestions[0].option_d.trim();

        if (isDefaultSingleEmpty) {
          setManualQuestions(parsed);
        } else {
          setManualQuestions([...manualQuestions, ...parsed]);
        }

        toast.showSuccess(`Successfully imported ${parsed.length} questions from CSV!`);
        setCreationMode('manual');
        setFile(null);
        // Reset file input element
        const fileInput = document.getElementById('csv-file-input');
        if (fileInput) fileInput.value = '';
      } catch (err) {
        toast.showError('Failed to parse CSV: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleCreateTestManual = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.showWarning('Please enter a test title.');
      return;
    }
    if (manualQuestions.length === 0) {
      toast.showWarning('Please add at least one question.');
      return;
    }

    // Validate that all questions have non-empty text and options if MCQ
    for (let i = 0; i < manualQuestions.length; i++) {
      const q = manualQuestions[i];
      if (!q.question_text.trim()) {
        toast.showWarning(`Please fill out the question text for Question ${i + 1}.`);
        return;
      }
      if (q.question_type !== 'CODING') {
        if (!q.option_a || !q.option_a.trim() || !q.option_b || !q.option_b.trim() || !q.option_c || !q.option_c.trim() || !q.option_d || !q.option_d.trim() || !q.correct_option) {
          toast.showWarning(`Please fill out all options and correct answer for MCQ Question ${i + 1}.`);
          return;
        }
      }
    }

    setIsUploading(true);
    try {
      await api.post('/tests', {
        title,
        description,
        duration: parseInt(duration) || 30,
        questions: manualQuestions.map(q => ({
          question_text: q.question_text,
          question_type: q.question_type || "MCQ",
          option_a: q.question_type === 'CODING' ? '' : q.option_a,
          option_b: q.question_type === 'CODING' ? '' : q.option_b,
          option_c: q.question_type === 'CODING' ? '' : q.option_c,
          option_d: q.question_type === 'CODING' ? '' : q.option_d,
          correct_option: q.question_type === 'CODING' ? '' : q.correct_option,
        }))
      });
      toast.showSuccess('Test created successfully!');
      setTitle('');
      setDescription('');
      setDuration(30);
      setManualQuestions([
        { question_text: '', question_type: 'MCQ', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A' }
      ]);
      fetchTests();
    } catch (err) {
      toast.showError('Creation failed: ' + (err.response?.data?.detail || err.message || err));
    } finally {
      setIsUploading(false);
    }
  };

  const handleAssignTest = async (e) => {
    e.preventDefault();
    if (!selectedTestId || selectedCandidateIds.length === 0) {
      toast.showWarning('Please select a test and at least one candidate.');
      return;
    }

    setIsAssigning(true);
    try {
      await Promise.all(
        selectedCandidateIds.map(candidateId => 
          api.post('/tests/assign', {
            test_id: parseInt(selectedTestId),
            candidate_id: parseInt(candidateId),
          })
        )
      );
      toast.showSuccess('Test assigned to candidates successfully!');
      setSelectedTestId('');
      setSelectedCandidateIds([]);
      setCandidateSearchQuery('');
      fetchAssignments();
    } catch (err) {
      toast.showError('Assignment failed: ' + (err.message || err));
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCopyLink = (assignmentId) => {
    const link = `${window.location.origin}/take-test/${assignmentId}`;
    navigator.clipboard.writeText(link).then(
      () => toast.showSuccess('Link copied to clipboard!'),
      () => toast.showError('Failed to copy link.')
    );
  };

  const handleShareWhatsApp = (assignment) => {
    const link = `${window.location.origin}/take-test/${assignment.id}`;
    const candidateName = assignment.candidate?.full_name || 'Candidate';
    const testTitle = assignment.test?.title || 'Assessment';
    const phone = assignment.candidate?.phone || '';
    
    const message = `Hi ${candidateName},\n\nYou have been assigned the online MCQ test "${testTitle}" as part of the recruitment process at Eulogik.\n\nPlease complete the test by clicking the link below:\n${link}\n\nBest of luck!\nEulogik Recruitment Team`;
    
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleShareEmail = (assignment) => {
    const link = `${window.location.origin}/take-test/${assignment.id}`;
    const candidateName = assignment.candidate?.full_name || 'Candidate';
    const testTitle = assignment.test?.title || 'Assessment';
    const email = assignment.candidate?.email || '';
    
    const subject = encodeURIComponent(`Online MCQ Test Assigned: ${testTitle}`);
    const body = encodeURIComponent(`Dear ${candidateName},\n\nYou have been assigned the online MCQ test "${testTitle}" as part of the recruitment process at Eulogik.\n\nPlease complete the test by clicking the link below:\n\n${link}\n\nBest of luck!\n\nBest regards,\nEulogik Recruitment Team`);
    
    const url = `mailto:${email}?subject=${subject}&body=${body}`;
    window.open(url, '_blank');
  };

  const handleDownloadSampleCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + "Question,Option A,Option B,Option C,Option D,Correct Option\n"
      + "What is the correct syntax to output \"Hello World\" in Python?,print(\"Hello World\"),echo(\"Hello World\"),p(\"Hello World\"),printf(\"Hello World\"),A\n"
      + "Which programming language is known for its snake logo?,Java,Python,C++,Ruby,B\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sample_mcq_test.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredCandidates = candidates.filter(c => 
    c.full_name?.toLowerCase().includes(candidateSearchQuery.toLowerCase()) ||
    c.position_applied?.toLowerCase().includes(candidateSearchQuery.toLowerCase())
  );

  return (
    <div className="test-module-page">
      <header className="test-module-header">
        <div className="test-module-header-content">
          <div className="test-module-header-left">
            <button className="btn btn-outline back-btn" onClick={() => navigate('/home')}>
              <ArrowLeft size={18} />
            </button>
            <h1 className="test-module-title">Test Management Module</h1>
          </div>
          <div className="test-module-header-actions">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="test-module-gradient-bar" />

      <main className="test-module-main container stagger-children">
        {/* Row 1: Actions (Upload and Assign) */}
        <div className="test-module-actions-grid">
          {/* Create / Upload Test Card */}
          <div className="card test-module-card">
            <div className="test-module-tabs">
              <button
                type="button"
                className={`test-tab-btn ${creationMode === 'csv' ? 'active' : ''}`}
                onClick={() => setCreationMode('csv')}
              >
                CSV Upload
              </button>
              <button
                type="button"
                className={`test-tab-btn ${creationMode === 'manual' ? 'active' : ''}`}
                onClick={() => setCreationMode('manual')}
              >
                Manual Creation
              </button>
            </div>

            {creationMode === 'csv' ? (
              <>
                <div className="card-header-with-action">
                  <h2 className="section-title">Upload New Test (CSV)</h2>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={handleDownloadSampleCSV}
                  >
                    <Download size={14} /> Sample CSV
                  </button>
                </div>

                <form onSubmit={handleImportCSV} className="test-form">
                  <div className="form-group">
                    <label className="form-label" htmlFor="test-title">Test Title*</label>
                    <input
                      id="test-title"
                      type="text"
                      className="form-input"
                      placeholder="e.g., Python Basics Assessment"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="test-desc">Description (Optional)</label>
                    <textarea
                      id="test-desc"
                      className="form-input form-textarea"
                      placeholder="Describe the topics covered or duration..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="test-duration">Duration (Minutes)*</label>
                    <input
                      id="test-duration"
                      type="number"
                      min="1"
                      className="form-input"
                      placeholder="e.g., 30"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="csv-file-input">Questions CSV File*</label>
                    <div className="file-upload-wrapper">
                      <Upload size={20} className="upload-icon" />
                      <input
                        id="csv-file-input"
                        type="file"
                        accept=".csv"
                        className="file-input-hidden"
                        onChange={handleFileChange}
                        required
                      />
                      <div className="upload-placeholder-text">
                        {file ? file.name : "Choose a CSV file containing questions"}
                      </div>
                    </div>
                    <small className="help-text">CSV should contain: Question, Option A, Option B, Option C, Option D, Correct Option (A, B, C, or D)</small>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-block"
                  >
                    Import & Edit Questions
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="card-header-with-action">
                  <h2 className="section-title">Create Test Manually</h2>
                </div>

                <form onSubmit={handleCreateTestManual} className="test-form">
                  <div className="form-group">
                    <label className="form-label" htmlFor="test-title-manual">Test Title*</label>
                    <input
                      id="test-title-manual"
                      type="text"
                      className="form-input"
                      placeholder="e.g., Python Basics Assessment"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="test-desc-manual">Description (Optional)</label>
                    <textarea
                      id="test-desc-manual"
                      className="form-input form-textarea"
                      placeholder="Describe the topics covered or duration..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="test-duration-manual">Duration (Minutes)*</label>
                    <input
                      id="test-duration-manual"
                      type="number"
                      min="1"
                      className="form-input"
                      placeholder="e.g., 30"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      required
                    />
                  </div>

                  <div className="manual-questions-section">
                    <h3 className="section-subtitle">Questions ({manualQuestions.length})</h3>
                    {manualQuestions.map((q, idx) => (
                      <div key={idx} className="manual-question-card">
                        <div className="question-card-header">
                          <span className="question-number">Question {idx + 1}</span>
                          {manualQuestions.length > 1 && (
                            <button
                              type="button"
                              className="btn-remove-question"
                              onClick={() => handleRemoveQuestion(idx)}
                              title="Remove Question"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: q.question_type === 'CODING' ? '2.2fr 0.8fr' : '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Question Text*</label>
                            <textarea
                              className="form-input question-text-input"
                              placeholder="Type the question here..."
                              value={q.question_text}
                              onChange={(e) => handleQuestionChange(idx, 'question_text', e.target.value)}
                              required
                              style={{ height: q.question_type === 'CODING' ? '120px' : '42px', minHeight: q.question_type === 'CODING' ? '120px' : '42px', paddingTop: '10px' }}
                            />
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Question Type</label>
                            <select
                              className="form-select"
                              value={q.question_type || 'MCQ'}
                              onChange={(e) => {
                                const type = e.target.value;
                                handleQuestionChange(idx, 'question_type', type);
                                if (type === 'CODING') {
                                  handleQuestionChange(idx, 'option_a', '');
                                  handleQuestionChange(idx, 'option_b', '');
                                  handleQuestionChange(idx, 'option_c', '');
                                  handleQuestionChange(idx, 'option_d', '');
                                  handleQuestionChange(idx, 'correct_option', '');
                                } else {
                                  handleQuestionChange(idx, 'correct_option', 'A');
                                }
                              }}
                              style={{ height: '42px' }}
                            >
                              <option value="MCQ">Multiple Choice (MCQ)</option>
                              <option value="CODING">Coding Question</option>
                            </select>
                          </div>
                        </div>

                        {(!q.question_type || q.question_type === 'MCQ') && (
                          <>
                            <div className="options-grid">
                              <div className="form-group">
                                <label className="form-label">Option A*</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder="Option A"
                                  value={q.option_a || ''}
                                  onChange={(e) => handleQuestionChange(idx, 'option_a', e.target.value)}
                                  required
                                />
                              </div>

                              <div className="form-group">
                                <label className="form-label">Option B*</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder="Option B"
                                  value={q.option_b || ''}
                                  onChange={(e) => handleQuestionChange(idx, 'option_b', e.target.value)}
                                  required
                                />
                              </div>

                              <div className="form-group">
                                <label className="form-label">Option C*</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder="Option C"
                                  value={q.option_c || ''}
                                  onChange={(e) => handleQuestionChange(idx, 'option_c', e.target.value)}
                                  required
                                />
                              </div>

                              <div className="form-group">
                                <label className="form-label">Option D*</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder="Option D"
                                  value={q.option_d || ''}
                                  onChange={(e) => handleQuestionChange(idx, 'option_d', e.target.value)}
                                  required
                                />
                              </div>
                            </div>

                            <div className="form-group correct-option-group" style={{ marginTop: '12px' }}>
                              <label className="form-label">Correct Option*</label>
                              <select
                                className="form-select"
                                value={q.correct_option || 'A'}
                                onChange={(e) => handleQuestionChange(idx, 'correct_option', e.target.value)}
                                required
                              >
                                <option value="A">Option A</option>
                                <option value="B">Option B</option>
                                <option value="C">Option C</option>
                                <option value="D">Option D</option>
                              </select>
                            </div>
                          </>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      className="btn btn-outline btn-block add-question-btn"
                      onClick={handleAddQuestion}
                    >
                      <Plus size={16} /> Add Question
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-block"
                    disabled={isUploading}
                  >
                    {isUploading ? "Creating Test..." : "Create Test"}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Assign Test Card */}
          <div className="card test-module-card">
            <h2 className="section-title">Assign Test to Candidate</h2>
            <form onSubmit={handleAssignTest} className="test-form">
              <div className="form-group">
                <label className="form-label" htmlFor="select-test">Select Test*</label>
                <select
                  id="select-test"
                  className="form-select"
                  value={selectedTestId}
                  onChange={(e) => setSelectedTestId(e.target.value)}
                  required
                >
                  <option value="">-- Choose a test --</option>
                  {tests.map((t) => (
                    <option key={t.id} value={t.id}>{t.title} ({t.questions?.length || 0} questions)</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ margin: 0 }}>Select Candidate(s)*</label>
                  {selectedCandidateIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedCandidateIds([])}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        padding: 0,
                        textDecoration: 'underline'
                      }}
                    >
                      Clear All
                    </button>
                  )}
                </div>
                
                {selectedCandidateIds.length > 0 && (
                  <div className="selected-chips-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                    {selectedCandidateIds.map(id => {
                      const candidate = candidates.find(c => c.id.toString() === id);
                      if (!candidate) return null;
                      return (
                        <span 
                          key={id} 
                          className="chip" 
                          style={{ 
                            background: 'var(--color-primary-50)', 
                            color: 'var(--color-primary)', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            padding: '4px 10px', 
                            borderRadius: '4px',
                            fontWeight: 600,
                            fontSize: '0.85rem'
                          }}
                        >
                          {candidate.full_name}
                          <button 
                            type="button" 
                            onClick={() => removeCandidate(id)}
                            style={{ 
                              background: 'transparent', 
                              border: 'none', 
                              color: 'var(--color-primary)', 
                              cursor: 'pointer',
                              padding: '0 0 0 4px',
                              lineHeight: 1,
                              fontSize: '1rem',
                              fontWeight: 'bold',
                              display: 'inline-flex',
                              alignItems: 'center'
                            }}
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="searchable-dropdown-container" style={{ width: '100%' }} ref={dropdownRef}>
                  <input
                    type="text"
                    className="form-select searchable-dropdown-input"
                    placeholder="🔍 Search candidate(s)..."
                    value={candidateSearchQuery}
                    onChange={(e) => {
                      setCandidateSearchQuery(e.target.value);
                      setShowCandidateDropdown(true);
                    }}
                    onFocus={() => setShowCandidateDropdown(true)}
                    required={selectedCandidateIds.length === 0}
                    style={{ width: '100%' }}
                  />
                  {showCandidateDropdown && (
                    <div className="searchable-dropdown-list">
                      {filteredCandidates.length > 0 ? (
                        filteredCandidates.map((c) => {
                          const isSelected = selectedCandidateIds.includes(c.id.toString());
                          return (
                            <div
                              key={c.id}
                              className="searchable-dropdown-option"
                              onClick={() => {
                                toggleCandidateSelection(c.id);
                              }}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: isSelected ? 'var(--color-primary-50)' : 'transparent',
                                color: isSelected ? 'var(--color-primary)' : 'inherit',
                                fontWeight: isSelected ? 'bold' : 'normal'
                              }}
                            >
                              <div>
                                <strong>{c.full_name}</strong> ({c.position_applied})
                              </div>
                              <input 
                                type="checkbox" 
                                checked={isSelected}
                                onChange={() => {}} // Controlled via onClick
                                style={{ cursor: 'pointer' }}
                              />
                            </div>
                          );
                        })
                      ) : (
                        <div className="searchable-dropdown-option no-results">
                          No candidates found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={isAssigning || isLoadingTests || isLoadingCandidates}
              >
                <UserPlus size={16} /> {isAssigning ? "Assigning..." : "Assign Test"}
              </button>
            </form>

            <div className="test-count-summary">
              <div className="summary-item">
                <span className="summary-number">{tests.length}</span>
                <span className="summary-label">Total Tests Available</span>
              </div>
              <div className="summary-item">
                <span className="summary-number">{assignments.length}</span>
                <span className="summary-label">Total Test Assignments</span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Created Tests Library */}
        <div className="card created-tests-card" style={{ marginBottom: '24px' }}>
          <h2 className="section-title">Created Tests Library</h2>
          {isLoadingTests ? (
            <div className="loading-container">
              <div className="spinner" />
            </div>
          ) : tests.length === 0 ? (
            <div className="empty-state">
              <ClipboardList size={48} className="empty-icon" />
              <p>No tests created yet. Use the form above to upload or create one.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="assignments-table">
                <thead>
                  <tr>
                    <th>Test Title</th>
                    <th>Description</th>
                    <th>Duration</th>
                    <th>Questions</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((test) => (
                    <tr key={test.id}>
                      <td><strong style={{ color: 'var(--color-text-primary)' }}>{test.title}</strong></td>
                      <td>
                        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                          {test.description || 'No description provided.'}
                        </span>
                      </td>
                      <td><span>{test.duration} mins</span></td>
                      <td><span>{test.questions?.length || 0} questions</span></td>
                      <td>
                        <div className="actions-cell" style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn btn-sm btn-outline test-action-btn"
                            style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
                            onClick={() => handleStartEditTest(test)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline test-action-btn"
                            style={{ color: '#ef4444', borderColor: '#ef4444' }}
                            onClick={() => handleDeleteTest(test.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Row 3: Assignments List */}
        <div className="card test-assignments-card">
          <h2 className="section-title">Active Test Assignments</h2>

          {isLoadingAssignments ? (
            <div className="loading-container">
              <div className="spinner" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} className="empty-icon" />
              <p>No tests have been assigned yet.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="assignments-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Position</th>
                    <th>Assigned Test</th>
                    <th>Status</th>
                    <th>Completed At</th>
                    <th>Score / Result</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((item) => {
                    const isCompleted = !!item.completed_at;
                    const questions = item.test?.questions || [];
                    const mcqs = questions.filter(q => q.question_type !== 'CODING' && (q.option_a || q.option_b || q.option_c || q.option_d));
                    const mcqsCount = mcqs.length;
                    const codingCount = questions.length - mcqsCount;
                    const percent = isCompleted && mcqsCount > 0
                      ? Math.round((item.score / mcqsCount) * 100)
                      : 0;

                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="candidate-info-cell">
                            <span className="candidate-name-bold">{item.candidate?.full_name || 'Unknown'}</span>
                            <span className="candidate-email-muted">{item.candidate?.email || ''}</span>
                          </div>
                        </td>
                        <td>{item.candidate?.position_applied || 'N/A'}</td>
                        <td>{item.test?.title || 'Unknown Test'}</td>
                        <td>
                          {isCompleted ? (
                            <span className="badge badge-hired">
                              <CheckCircle size={12} style={{ marginRight: '4px' }} /> Completed
                            </span>
                          ) : (
                            <span className="badge badge-not-appeared">
                              <Clock size={12} style={{ marginRight: '4px' }} /> Pending
                            </span>
                          )}
                        </td>
                        <td>
                          {isCompleted
                            ? new Date(item.completed_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                            : '-'
                          }
                        </td>
                        <td>
                          {isCompleted ? (
                            <div className="score-badge-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                              {mcqsCount > 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span className="score-ratio" style={{ fontWeight: 'bold' }}>{item.score} / {mcqsCount} MCQs</span>
                                  <span className={`score-percent ${percent >= 70 ? 'pass' : 'fail'}`} style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px' }}>
                                    {percent}%
                                  </span>
                                </div>
                              ) : null}
                              {codingCount > 0 && (
                                <span style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  background: 'rgba(2, 132, 199, 0.15)',
                                  color: '#0284c7',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  display: 'inline-block'
                                }}>
                                  Coding: Review Pending
                                </span>
                              )}
                              {mcqsCount === 0 && codingCount === 0 && (
                                <span className="score-ratio">{item.score} / {item.total_questions}</span>
                              )}
                            </div>
                          ) : '-'}
                        </td>
                        <td>
                          <div className="actions-cell" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {isCompleted && (
                              <button
                                className="btn btn-sm btn-outline test-action-btn"
                                title="View Responses"
                                onClick={() => setSelectedAssignmentForViewer(item)}
                                style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
                              >
                                <FileText size={14} /> View Responses
                              </button>
                            )}
                            <button
                              className="btn btn-sm btn-outline test-action-btn"
                              title="Copy Public Test URL"
                              onClick={() => handleCopyLink(item.id)}
                            >
                              <Copy size={14} /> Copy URL
                            </button>
                            <button
                              className="btn btn-sm btn-outline test-action-btn"
                              title="Share via Email"
                              onClick={() => handleShareEmail(item)}
                              style={{ color: '#0284c7', borderColor: '#0284c7' }}
                            >
                              <Mail size={14} /> Email
                            </button>
                            {user?.role === 'ADMIN' && (
                              <button
                                className="btn btn-sm btn-outline test-action-btn"
                                title="Make Candidate Reattempt Test"
                                onClick={() => handleReattempt(item.id)}
                                style={{ color: '#ea580c', borderColor: '#ea580c' }}
                              >
                                <RotateCcw size={14} /> Re-attempt
                              </button>
                            )}
                            <button
                              className="btn btn-sm btn-outline test-action-btn"
                              title="Delete Test Assignment"
                              onClick={() => handleDeleteAssignment(item.id)}
                              style={{ color: '#ef4444', borderColor: '#ef4444' }}
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {selectedAssignmentForViewer && (
          <TestResponsesModal
            assignment={selectedAssignmentForViewer}
            onClose={() => setSelectedAssignmentForViewer(null)}
          />
        )}
        {editingTest && (
          <EditTestModal
            test={editingTest}
            title={editTitle}
            setTitle={setEditTitle}
            description={editDescription}
            setDescription={setEditDescription}
            duration={editDuration}
            setDuration={setEditDuration}
            questions={editQuestions}
            setQuestions={setEditQuestions}
            onSave={handleSaveEditTest}
            onClose={() => setEditingTest(null)}
            isSaving={isSavingEdit}
          />
        )}
      </main>
    </div>
  );
}

function EditTestModal({ test, title, setTitle, description, setDescription, duration, setDuration, questions, setQuestions, onSave, onClose, isSaving }) {
  if (!test) return null;

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      { question_text: '', question_type: 'MCQ', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A' }
    ]);
  };

  const handleRemoveQuestion = (index) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
  };

  const handleQuestionChange = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '850px', width: '95%', maxHeight: '90vh', overflowY: 'auto', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>Edit Test: {test.title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '1.5rem', fontWeight: 'bold' }}>×</button>
        </div>

        <form onSubmit={onSave} className="test-form">
          <div className="form-group">
            <label className="form-label" htmlFor="edit-test-title">Test Title*</label>
            <input
              id="edit-test-title"
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-test-desc">Description (Optional)</label>
            <textarea
              id="edit-test-desc"
              className="form-input form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-test-duration">Duration (Minutes)*</label>
            <input
              id="edit-test-duration"
              type="number"
              min="1"
              className="form-input"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
            />
          </div>

          <div className="manual-questions-section" style={{ marginTop: '24px' }}>
            <h3 className="section-subtitle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Questions ({questions.length})</span>
            </h3>
            {questions.map((q, idx) => (
              <div key={idx} className="manual-question-card" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                <div className="question-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className="question-number" style={{ fontWeight: 700, color: 'var(--color-text-secondary)' }}>Question {idx + 1}</span>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      className="btn-remove-question"
                      onClick={() => handleRemoveQuestion(idx)}
                      title="Remove Question"
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: q.question_type === 'CODING' ? '2.2fr 0.8fr' : '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Question Text*</label>
                    <textarea
                      className="form-input question-text-input"
                      value={q.question_text}
                      onChange={(e) => handleQuestionChange(idx, 'question_text', e.target.value)}
                      required
                      style={{ height: q.question_type === 'CODING' ? '120px' : '42px', minHeight: q.question_type === 'CODING' ? '120px' : '42px', paddingTop: '10px' }}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Question Type</label>
                    <select
                      className="form-select"
                      value={q.question_type || 'MCQ'}
                      onChange={(e) => {
                        const type = e.target.value;
                        handleQuestionChange(idx, 'question_type', type);
                        if (type === 'CODING') {
                          handleQuestionChange(idx, 'option_a', '');
                          handleQuestionChange(idx, 'option_b', '');
                          handleQuestionChange(idx, 'option_c', '');
                          handleQuestionChange(idx, 'option_d', '');
                          handleQuestionChange(idx, 'correct_option', '');
                        } else {
                          handleQuestionChange(idx, 'correct_option', 'A');
                        }
                      }}
                      style={{ height: '42px' }}
                    >
                      <option value="MCQ">Multiple Choice (MCQ)</option>
                      <option value="CODING">Coding Question</option>
                    </select>
                  </div>
                </div>

                {(!q.question_type || q.question_type === 'MCQ') && (
                  <>
                    <div className="options-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Option A*</label>
                        <input
                          type="text"
                          className="form-input"
                          value={q.option_a || ''}
                          onChange={(e) => handleQuestionChange(idx, 'option_a', e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Option B*</label>
                        <input
                          type="text"
                          className="form-input"
                          value={q.option_b || ''}
                          onChange={(e) => handleQuestionChange(idx, 'option_b', e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Option C*</label>
                        <input
                          type="text"
                          className="form-input"
                          value={q.option_c || ''}
                          onChange={(e) => handleQuestionChange(idx, 'option_c', e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Option D*</label>
                        <input
                          type="text"
                          className="form-input"
                          value={q.option_d || ''}
                          onChange={(e) => handleQuestionChange(idx, 'option_d', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group correct-option-group" style={{ marginTop: '12px', margin: 0 }}>
                      <label className="form-label">Correct Option*</label>
                      <select
                        className="form-select"
                        value={q.correct_option || 'A'}
                        onChange={(e) => handleQuestionChange(idx, 'correct_option', e.target.value)}
                        required
                      >
                        <option value="A">Option A</option>
                        <option value="B">Option B</option>
                        <option value="C">Option C</option>
                        <option value="D">Option D</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            ))}

            <button
              type="button"
              className="btn btn-outline btn-block add-question-btn"
              onClick={handleAddQuestion}
              style={{ marginBottom: '20px' }}
            >
              <Plus size={16} /> Add Question
            </button>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '24px' }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSaving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
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
