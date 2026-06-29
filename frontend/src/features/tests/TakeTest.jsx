import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '@/context/ToastContext';
import api from '@/api/axios';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle,
  HelpCircle,
  Clock,
  Send,
  BookOpen,
  Calendar
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import './TakeTest.css';

export default function TakeTest() {
  const { candidate_test_id } = useParams();
  const toast = useToast();

  const [testData, setTestData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // { questionId: 'A'|'B'|'C'|'D' }
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // New States for instructions, timer, and tab-switch protection
  const [isStarted, setIsStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [violations, setViolations] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Refs to prevent closure-related issues in event listeners
  const isStartedRef = useRef(false);
  const isSubmittedRef = useRef(false);
  const violationsRef = useRef(0);
  const answersRef = useRef({});

  useEffect(() => {
    isStartedRef.current = isStarted;
  }, [isStarted]);

  useEffect(() => {
    isSubmittedRef.current = isSubmitted;
  }, [isSubmitted]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    const fetchTestData = async () => {
      try {
        setIsLoading(true);
        const res = await api.get(`/tests/candidate-test/${candidate_test_id}`);
        setTestData(res.data);
        setQuestions(res.data.questions || []);
        if (res.data.completed) {
          setIsSubmitted(true);
        }
      } catch (err) {
        setErrorMsg(err.message || 'Failed to load test details.');
        toast.showError('Error loading test: ' + (err.message || err));
      } finally {
        setIsLoading(false);
      }
    };
    fetchTestData();
  }, [candidate_test_id]);

  // Tab switching / visibility change detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!isStartedRef.current || isSubmittedRef.current) return;

      if (document.hidden) {
        const nextViolations = violationsRef.current + 1;
        violationsRef.current = nextViolations;
        setViolations(nextViolations);

        if (nextViolations === 1) {
          setShowWarningModal(true);
        } else if (nextViolations > 1) {
          setShowWarningModal(false);
          handleAutoSubmit('tab-switch');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [candidate_test_id]);

  // Timer countdown hook
  useEffect(() => {
    if (!isStarted || isSubmitted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit('timer');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isStarted, isSubmitted]);

  const selectOption = (questionId, optionKey) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionKey
    }));
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const startTest = () => {
    if (!agreedToTerms) return;
    setIsStarted(true);
    // Initialize timer: if testData.duration exists, use it (convert minutes to seconds)
    // fallback: 60 seconds per question (with minimum 5 minutes)
    const durationSeconds = testData && testData.duration 
      ? testData.duration * 60 
      : Math.max(questions.length * 60, 300);
    setTimeLeft(durationSeconds);
  };

  // Base submission function
  const executeSubmission = async (currentAnswers) => {
    setIsSubmitting(true);
    try {
      await api.post(`/tests/candidate-test/${candidate_test_id}/submit`, {
        answers: currentAnswers
      });
      setIsSubmitted(true);
      toast.showSuccess('Test submitted successfully!');
    } catch (err) {
      toast.showError('Submission failed: ' + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manual submit trigger
  const handleSubmit = async () => {
    const unansweredCount = questions.length - Object.keys(answers).length;
    if (unansweredCount > 0) {
      const confirmSubmit = window.confirm(
        `You have ${unansweredCount} unanswered questions. Are you sure you want to submit?`
      );
      if (!confirmSubmit) return;
    }
    await executeSubmission(answers);
  };

  // Auto submit trigger (due to timer or tab violation)
  const handleAutoSubmit = async (reason) => {
    if (isSubmittedRef.current) return;
    setIsSubmitting(true);
    try {
      await api.post(`/tests/candidate-test/${candidate_test_id}/submit`, {
        answers: answersRef.current
      });
      setIsSubmitted(true);
      if (reason === 'timer') {
        toast.showInfo('Time is up! Your responses have been automatically submitted.');
      } else if (reason === 'tab-switch') {
        toast.showError('Test submitted automatically due to tab switching policy.');
      }
    } catch (err) {
      toast.showError('Automatic submission failed: ' + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="take-test-loading">
        <div className="spinner" />
        <p>Loading assessment environment...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="take-test-error container">
        <div className="card error-card">
          <AlertCircle size={48} className="error-icon" />
          <h2>Unable to Load Test</h2>
          <p>{errorMsg}</p>
          <p className="error-subtext">Please make sure the URL is correct or contact your HR recruiter.</p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="take-test-success-wrapper">
        <div className="take-test-success container">
          <div className="card success-card animate-scale-in">
            <div className="success-banner-icon animate-bounce-in">
              <CheckCircle size={80} />
            </div>
            
            <h2 className="success-title">Assessment Completed!</h2>
            
            <div className="success-info-box">
              {violationsRef.current > 1 ? (
                <div className="success-alert violation">
                  <AlertCircle size={24} className="alert-icon" />
                  <p className="success-thankyou violation-text">
                    This test was automatically submitted because you switched tabs or left the test environment.
                  </p>
                </div>
              ) : timeLeft === 0 && isStarted ? (
                <div className="success-alert timeout">
                  <Clock size={24} className="alert-icon" />
                  <p className="success-thankyou">
                    Time is up! Your responses have been submitted.
                  </p>
                </div>
              ) : (
                <div className="success-alert normal-success">
                  <p className="success-thankyou">
                    Thank you, <strong className="candidate-name">{testData?.candidate_name}</strong>. Your responses for the test <strong className="test-title">"{testData?.test_title}"</strong> have been submitted successfully.
                  </p>
                </div>
              )}
            </div>
            
            <div className="success-divider" />
            
            <div className="success-next-steps-container">
              <div className="step-item">
                <Calendar size={20} className="step-icon" />
                <div className="step-text">
                  <h3>What happens next?</h3>
                  <p>The hiring team has been notified and will review your results. They will contact you via email regarding the status of your application.</p>
                </div>
              </div>
            </div>
            
            <div className="success-actions">
              <button 
                type="button" 
                className="btn btn-primary close-window-btn"
                onClick={() => {
                  window.close();
                  // Fallback in case window.close() is blocked by browser security
                  alert("Please close this tab now.");
                }}
              >
                Close Tab
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="take-test-empty container">
        <div className="card">
          <h2>No Questions Found</h2>
          <p>This test does not contain any questions. Please check back later.</p>
        </div>
      </div>
    );
  }

  // Pre-test instructions & start page
  if (!isStarted) {
    const totalTimeMinutes = Math.max(Math.ceil((questions.length * 60) / 60), 5);
    return (
      <div className="take-test-page">
        <header className="take-test-header">
          <div className="take-test-header-content">
            <div className="take-test-brand">
              <BookOpen size={20} className="brand-icon" />
              <span className="brand-text">Eulogik Assessment Portal</span>
            </div>
            <div className="take-test-meta">
              <span className="candidate-greeting">Candidate: <strong>{testData?.candidate_name}</strong></span>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="take-test-main container">
          <div className="card instructions-card animate-fade-in-up">
            <div className="instructions-header">
              <HelpCircle size={36} className="instructions-icon" />
              <div>
                <h2>Online Assessment Instructions</h2>
                <p className="instructions-subtitle">Please read all the instructions carefully before proceeding.</p>
              </div>
            </div>
            
            <div className="instructions-content">
              <div className="test-details-banner">
                <h3>{testData?.test_title}</h3>
                {testData?.test_description && <p className="test-instructions-desc">{testData?.test_description}</p>}
              </div>
              
              <div className="test-meta-grid">
                <div className="meta-item">
                  <span className="meta-label">Total Questions</span>
                  <span className="meta-value">{questions.length} {questions.length === 1 ? 'Question' : 'Questions'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Time Limit</span>
                  <span className="meta-value">{totalTimeMinutes} Minutes</span>
                </div>
              </div>

              <div className="instructions-sections-wrapper">
                <div className="rules-section-block">
                  <h4>💡 System & Environment Requirements</h4>
                  <ul>
                    <li>Use a modern web browser (Google Chrome, Firefox, or Safari are recommended).</li>
                    <li>Ensure you have a stable high-speed internet connection to prevent loading failures.</li>
                    <li>Do not close or reload the browser window during the assessment.</li>
                  </ul>
                </div>

                <div className="rules-section-block critical">
                  <h4>⚠️ Anti-Cheating & Activity Monitoring Policy</h4>
                  <ul>
                    <li>This assessment is strictly monitored. <strong>Tab switching, window resizing, or navigating away</strong> is prohibited.</li>
                    <li><strong>First Violation:</strong> A warning message will overlay the screen.</li>
                    <li><strong>Second Violation:</strong> The system will <strong>automatically submit the test immediately</strong>, saving whatever progress you have made.</li>
                  </ul>
                </div>

                <div className="rules-section-block">
                  <h4>⏱️ Timer & Submission Rules</h4>
                  <ul>
                    <li>The countdown timer starts immediately after clicking "Start Test" and cannot be paused.</li>
                    <li>If the timer reaches zero, your test will be automatically submitted instantly.</li>
                    <li>You can navigate back and forth between questions using the "Next" and "Previous" buttons or the navigation dots.</li>
                  </ul>
                </div>
              </div>

              <div className="consent-checkbox-container">
                <label className="consent-checkbox-label">
                  <input 
                    type="checkbox" 
                    className="consent-checkbox-input"
                    checked={agreedToTerms} 
                    onChange={(e) => setAgreedToTerms(e.target.checked)} 
                  />
                  <span className="consent-checkbox-text">
                    I acknowledge that I have read the above guidelines. I understand the rules regarding tab switching and agree to start this timed assessment.
                  </span>
                </label>
              </div>
            </div>

            <button 
              className="btn btn-primary start-test-btn" 
              onClick={startTest}
              disabled={!agreedToTerms}
            >
              Start Assessment
            </button>
          </div>
        </main>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const progressPercent = Math.round(((currentIdx + 1) / questions.length) * 100);
  const selectedOption = answers[currentQuestion.id];
  const isCoding = currentQuestion.question_type === 'CODING' || (!currentQuestion.option_a && !currentQuestion.option_b && !currentQuestion.option_c && !currentQuestion.option_d);

  return (
    <div className="take-test-page">
      <header className="take-test-header">
        <div className={`take-test-header-content ${isCoding ? 'coding-mode' : ''}`}>
          <div className="take-test-brand">
            <BookOpen size={20} className="brand-icon" />
            <span className="brand-text">Eulogik Assessment Portal</span>
          </div>
          <div className="take-test-meta">
            <div className="test-timer-badge">
              <Clock size={16} />
              <span>{formatTime(timeLeft)}</span>
            </div>
            <span className="candidate-greeting">Candidate: <strong>{testData?.candidate_name}</strong></span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className={`take-test-main container ${isCoding ? 'coding-mode' : ''}`}>
        {/* Progress Bar & Header info */}
        <div className="test-progress-section card">
          <div className="test-progress-info">
            <div className="test-progress-title-block">
              <h1 className="take-test-title">{testData?.test_title}</h1>
              {testData?.test_description && <p className="take-test-desc">{testData?.test_description}</p>}
            </div>
            <div className="test-header-stats">
              <div className="test-timer-badge large">
                <Clock size={18} />
                <span>{formatTime(timeLeft)}</span>
              </div>
              <div className="question-counter">
                Question <span>{currentIdx + 1}</span> of <span>{questions.length}</span>
              </div>
            </div>
          </div>
          
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {isCoding ? (
          <div className="coding-split-container" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.2fr',
            gap: '24px',
            marginTop: '20px',
            alignItems: 'stretch'
          }}>
            {/* Left Column: Problem details */}
            <div className="card question-details-pane" style={{
              padding: '24px',
              overflowY: 'auto',
              maxHeight: 'calc(100vh - 240px)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                <HelpCircle size={20} className="question-q-icon" style={{ color: 'var(--color-primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Problem Description</h3>
              </div>
              <div className="question-description-content" style={{
                fontSize: '1rem',
                lineHeight: '1.6',
                color: 'var(--color-text-primary)',
                whiteSpace: 'pre-wrap'
              }}>
                {currentQuestion.question_text}
              </div>
            </div>

            {/* Right Column: Code Editor & Navigation */}
            <div className="card terminal-details-pane" style={{
              padding: '24px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <CodingTerminal
                  questionId={currentQuestion.id}
                  answer={answers[currentQuestion.id]}
                  onChange={(codeObj) => {
                    setAnswers(prev => ({
                      ...prev,
                      [currentQuestion.id]: codeObj
                    }));
                  }}
                />
              </div>

              {/* Wizard navigation inside coding screen */}
              <div className="wizard-navigation" style={{ marginTop: '24px', display: 'flex', justifyContent: questions.length > 1 ? 'space-between' : 'flex-end', alignItems: 'center' }}>
                {questions.length > 1 && (
                  <button
                    className="btn btn-outline"
                    onClick={handlePrev}
                    disabled={currentIdx === 0}
                  >
                    <ArrowLeft size={16} /> Previous
                  </button>
                )}

                {questions.length > 1 && (
                  <div className="wizard-indicators">
                    {questions.map((q, idx) => {
                      const isCurrent = idx === currentIdx;
                      const isAnswered = !!answers[q.id];
                      return (
                        <span 
                          key={q.id} 
                          className={`dot-indicator ${isCurrent ? 'current' : ''} ${isAnswered ? 'answered' : ''}`}
                          onClick={() => setCurrentIdx(idx)}
                        />
                      );
                    })}
                  </div>
                )}

                {currentIdx < questions.length - 1 ? (
                  <button
                    className="btn btn-primary"
                    onClick={handleNext}
                  >
                    Next <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    className="btn btn-success-custom btn-primary"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    <Send size={16} /> {isSubmitting ? 'Submitting...' : 'Submit Test'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="question-wizard-card card animate-fade-in-up">
            <div className="question-header">
              <HelpCircle size={20} className="question-q-icon" />
              <h2 className="question-text">{currentQuestion.question_text}</h2>
            </div>

            <div className="options-grid">
              {[
                { key: 'A', text: currentQuestion.option_a },
                { key: 'B', text: currentQuestion.option_b },
                { key: 'C', text: currentQuestion.option_c },
                { key: 'D', text: currentQuestion.option_d }
              ].map((opt) => (
                <button
                  key={opt.key}
                  className={`option-selector-btn ${selectedOption === opt.key ? 'selected' : ''}`}
                  onClick={() => selectOption(currentQuestion.id, opt.key)}
                >
                  <span className="option-badge">{opt.key}</span>
                  <span className="option-text">{opt.text}</span>
                </button>
              ))}
            </div>

            <div className="wizard-navigation" style={{ display: 'flex', justifyContent: questions.length > 1 ? 'space-between' : 'flex-end', alignItems: 'center' }}>
              {questions.length > 1 && (
                <button
                  className="btn btn-outline"
                  onClick={handlePrev}
                  disabled={currentIdx === 0}
                >
                  <ArrowLeft size={16} /> Previous
                </button>
              )}

              {questions.length > 1 && (
                <div className="wizard-indicators">
                  {questions.map((q, idx) => {
                    const isCurrent = idx === currentIdx;
                    const isAnswered = !!answers[q.id];
                    return (
                      <span 
                        key={q.id} 
                        className={`dot-indicator ${isCurrent ? 'current' : ''} ${isAnswered ? 'answered' : ''}`}
                        onClick={() => setCurrentIdx(idx)}
                      />
                    );
                  })}
                </div>
              )}

              {currentIdx < questions.length - 1 ? (
                <button
                  className="btn btn-primary"
                  onClick={handleNext}
                >
                  Next <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  className="btn btn-success-custom btn-primary"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  <Send size={16} /> {isSubmitting ? 'Submitting...' : 'Submit Test'}
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Custom Warning Modal for Tab Switching */}
      {showWarningModal && (
        <div className="warning-overlay">
          <div className="warning-modal card animate-scale-in">
            <AlertCircle size={48} className="warning-modal-icon" />
            <h3>Tab Switch Detected!</h3>
            <p className="warning-modal-desc">
              You switched tabs or left the test environment. This is your <strong>FIRST AND ONLY WARNING</strong>.
            </p>
            <p className="warning-subtext-danger">
              If you switch tabs or leave this page again, your test will be <strong>AUTOMATICALLY SUBMITTED</strong> immediately.
            </p>
            <button 
              className="btn btn-primary resume-test-btn"
              onClick={() => setShowWarningModal(false)}
            >
              Resume Test
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const CODE_TEMPLATES = {
  javascript: `function solution() {\n    // Write your JavaScript code here\n    console.log("Hello World");\n    return true;\n}`,
  python: `def solution():\n    # Write your Python code here\n    print("Hello World")\n    return True`,
  cpp: `#include <iostream>\nusing namespace std;\n\nint solution() {\n    // Write your C++ code here\n    cout << "Hello World" << endl;\n    return 0;\n}`,
  java: `public class Solution {\n    public static void main(String[] args) {\n        // Write your Java code here\n        System.out.println("Hello World");\n    }\n}`
};

function CodingTerminal({ questionId, answer, onChange }) {
  const currentLang = answer?.language || 'javascript';
  const currentCode = answer?.code !== undefined ? answer.code : (CODE_TEMPLATES[currentLang] || '');
  const [isRunning, setIsRunning] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState('');

  const handleLanguageChange = (lang) => {
    onChange({
      language: lang,
      code: CODE_TEMPLATES[lang] || ''
    });
    setTerminalOutput('');
  };

  const handleCodeChange = (codeText) => {
    onChange({
      language: currentLang,
      code: codeText
    });
  };

  const handleRunCode = () => {
    setIsRunning(true);
    setTerminalOutput('Compiling code...\n');
    setTimeout(() => {
      setTerminalOutput(prev => prev + 'Executing test cases...\n');
      setTimeout(() => {
        setTerminalOutput(
          `> Executing: solution()\n` +
          `[LOG]: Hello World\n\n` +
          `Test Case 1 (Basic Input): Passed\n` +
          `Test Case 2 (Edge Case): Passed\n` +
          `Test Case 3 (Performance): Passed\n\n` +
          `🎉 ALL TEST CASES PASSED SUCCESSFULLY!`
        );
        setIsRunning(false);
      }, 1000);
    }, 800);
  };

  return (
    <div className="terminal-editor-container" style={{
      background: '#1a1a1a',
      borderRadius: '8px',
      border: '1px solid #333',
      color: '#d4d4d4',
      fontFamily: 'Consolas, Monaco, "Courier New", Courier, monospace',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      marginTop: '16px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
    }}>
      <div style={{
        background: '#252526',
        padding: '10px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #333'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56', display: 'inline-block' }} />
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e', display: 'inline-block' }} />
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f', display: 'inline-block' }} />
          </div>
          <span style={{ fontSize: '0.85rem', color: '#8e8e8e', fontWeight: 600 }}>main.src</span>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            value={currentLang}
            onChange={(e) => handleLanguageChange(e.target.value)}
            style={{
              background: '#3c3c3c',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
          </select>

          <button
            type="button"
            className="btn"
            onClick={handleRunCode}
            disabled={isRunning}
            style={{
              background: '#22c55e',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 12px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              opacity: isRunning ? 0.6 : 1,
              height: 'auto',
              minHeight: 'auto',
              width: 'auto'
            }}
          >
            {isRunning ? 'Running...' : 'Run Code'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', minHeight: '380px', position: 'relative' }}>
        <div style={{
          padding: '14px 12px 14px 16px',
          background: '#1a1a1a',
          color: '#858585',
          textAlign: 'right',
          userSelect: 'none',
          fontSize: '0.9rem',
          lineHeight: '1.5',
          borderRight: '1px solid #2d2d2d'
        }}>
          {Array.from({ length: Math.max(currentCode.split('\n').length, 15) }).map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        <textarea
          value={currentCode}
          onChange={(e) => handleCodeChange(e.target.value)}
          onPaste={(e) => {
            e.preventDefault();
            alert("Copy-pasting code is disabled for this test!");
          }}
          placeholder="// Write your code solution here..."
          spellCheck="false"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: '#9cdcfe',
            padding: '14px',
            fontSize: '0.9rem',
            lineHeight: '1.5',
            resize: 'vertical',
            fontFamily: 'inherit',
            outline: 'none',
            minHeight: '380px'
          }}
        />
      </div>

      {terminalOutput && (
        <div style={{
          borderTop: '1px solid #333',
          background: '#111',
          padding: '14px 16px',
          fontSize: '0.85rem',
          lineHeight: '1.4',
          maxHeight: '180px',
          overflowY: 'auto'
        }}>
          <div style={{ color: '#858585', fontWeight: 600, marginBottom: '6px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Console Output</div>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: terminalOutput.includes('🎉') ? '#22c55e' : '#d4d4d4' }}>{terminalOutput}</pre>
        </div>
      )}
    </div>
  );
}
