import React, { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/context/ToastContext';
import api, { API_BASE } from '@/api/axios';
import { Upload, User, Plus, Trash2, ArrowLeft, CheckCircle, X } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import './ApplicationForm.css';

const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam",
  "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Other"
];

const emptyEducation = { type: 'College/University', degree: '', institution: '', board: '', field_of_study: '', graduation_year: '', percentage: '' };
const emptyWork = { company_name: '', position: '', from_date: '', to_date: '', responsibilities: '' };
const emptyRef = { name: '', designation: '', company: '', email: '', phone: '' };

export default function ApplicationForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const photoRef = useRef(null);
  const cvRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [cvName, setCvName] = useState('');
  const [cvPreview, setCvPreview] = useState(null);
  const [ageWarning, setAgeWarning] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [refPhoneErrors, setRefPhoneErrors] = useState({});

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', date_of_birth: '', gender: '', marital_status: '', nationality: '',
    current_address: '', current_city: '', current_state: '', current_zip: '',
    permanent_address: '', permanent_city: '', permanent_state: '', permanent_zip: '',
    position_applied: '', department: '', expected_ctc: '', current_ctc: '',
    experience_years: '', experience_months: '', notice_period: '', earliest_join_date: '',
    skills: '', languages: '',
    statement_of_purpose: '', hobbies: '',
  });

  const [education, setEducation] = useState([{ ...emptyEducation }]);
  const [workExperience, setWorkExperience] = useState([{ ...emptyWork }]);
  const [references, setReferences] = useState([{ ...emptyRef }]);
  const [photo, setPhoto] = useState(null);
  const [cv, setCv] = useState(null);
  const [sameAddress, setSameAddress] = useState(false);
  const [consent, setConsent] = useState(false);
  const [isFresher, setIsFresher] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { id: rawId } = useParams();
  const id = rawId ? rawId.replace(/^:/, '') : null;
  const isEditMode = !!id;

  React.useEffect(() => {
    if (isEditMode) {
      setLoading(true);
      api.get(`/candidates/${id}`)
        .then(res => {
          const data = res.data;
          
          // Batching individual state updates as much as possible
          if (data.education) setEducation(data.education);
          if (data.work_experience) {
            setWorkExperience(data.work_experience);
            setIsFresher(data.work_experience.length === 0);
          }
          if (data.references) setReferences(data.references);
          if (data.photo_url) setPhotoPreview(`${API_BASE}${data.photo_url}`);
          if (data.cv_url) setCvName('Current CV');

          setForm({
            full_name: data.full_name || '',
            email: data.email || '',
            phone: data.phone || '',
            date_of_birth: data.date_of_birth || '',
            gender: data.gender || '',
            marital_status: data.marital_status || '',
            nationality: data.nationality || '',
            current_address: data.current_address || '',
            current_city: data.current_city || '',
            current_state: data.current_state || '',
            current_zip: data.current_zip || '',
            permanent_address: data.permanent_address || '',
            permanent_city: data.permanent_city || '',
            permanent_state: data.permanent_state || '',
            permanent_zip: data.permanent_zip || '',
            position_applied: data.position_applied || '',
            department: data.department || '',
            expected_ctc: data.expected_ctc || '',
            current_ctc: data.current_ctc || '',
            experience_years: data.experience_years || 0,
            experience_months: data.experience_months || 0,
            notice_period: data.notice_period || '',
            earliest_join_date: data.earliest_join_date || '',
            skills: Array.isArray(data.skills) ? data.skills.join(', ') : (data.skills || ''),
            languages: Array.isArray(data.languages) ? data.languages.join(', ') : (data.languages || ''),
            statement_of_purpose: data.statement_of_purpose || '',
            hobbies: data.hobbies || '',
          });
          
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          toast.error("Failed to load candidate data");
          setLoading(false);
        });
    }
  }, [id, isEditMode]);

  const updateForm = (key, val) => {
    if (key === 'date_of_birth') {
      const age = calculateAge(val);
      if (val && age < 18) {
        setAgeWarning('Warning: Candidate must be at least 18 years old.');
      } else {
        setAgeWarning('');
      }
    }

    if (key === 'phone') {
      const numericVal = val.replace(/\D/g, '').slice(0, 10);
      val = numericVal;
      if (numericVal.length > 0 && numericVal.length < 10) {
        setPhoneError('Phone number must be exactly 10 digits');
      } else {
        setPhoneError('');
      }
    }

    setForm((p) => {
      const next = { ...p, [key]: val };
      if (sameAddress && key.startsWith('current_')) {
        const permKey = key.replace('current_', 'permanent_');
        next[permKey] = val;
      }
      return next;
    });
  };

  const handleSameAddress = (e) => {
    const checked = e.target.checked;
    setSameAddress(checked);
    if (checked) {
      setForm(p => ({
        ...p,
        permanent_address: p.current_address,
        permanent_city: p.current_city,
        permanent_state: p.current_state,
        permanent_zip: p.current_zip
      }));
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleCvChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCv(file);
      setCvName(file.name);
      if (file.type === 'application/pdf') {
        setCvPreview(URL.createObjectURL(file));
      } else {
        setCvPreview(null);
      }
    }
  };

  const calculateAge = (dobString) => {
    if (!dobString) return 0;
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const removeCv = (e) => {
    e.stopPropagation();
    setCv(null);
    setCvName('');
    setCvPreview(null);
    if (cvRef.current) cvRef.current.value = '';
  };

  const removePhoto = (e) => {
    e.stopPropagation();
    setPhoto(null);
    setPhotoPreview(null);
    if (photoRef.current) photoRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const fd = new FormData();

      // Basic fields
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) fd.append(k, v);
      });

      // JSON fields (Filter out empty items to keep database clean)
      const cleanEducation = education.filter(e => e.degree || e.institution || e.graduation_year);
      const cleanWork = isFresher ? [] : workExperience.filter(w => w.company_name || w.position);
      const cleanRefs = references.filter(r => r.name || r.email || r.phone);

      fd.append('education', JSON.stringify(cleanEducation));
      fd.append('work_experience', JSON.stringify(cleanWork));
      fd.append('references', JSON.stringify(cleanRefs));

      // Skills and languages as JSON arrays
      if (form.skills) fd.set('skills', JSON.stringify(form.skills.split(',').map(s => s.trim()).filter(Boolean)));
      if (form.languages) fd.set('languages', JSON.stringify(form.languages.split(',').map(s => s.trim()).filter(Boolean)));

      // Files
      if (!isEditMode && !photo) throw new Error('Please upload your photo (required).');
      if (!isEditMode && !cv) throw new Error('Please upload your CV/Resume (required).');

      // Array Validations
      for (const edu of education) {
        if (!edu.degree || !edu.institution || !edu.graduation_year) {
          throw new Error('Please complete all required fields in Education.');
        }
      }
      if (!isFresher) {
        for (const w of workExperience) {
          if (!w.company_name || !w.position || !w.from_date || !w.to_date) {
            throw new Error('Please complete all required fields in Work Experience.');
          }
        }
      }

      if (photo) fd.append('photo', photo);
      if (cv) fd.append('cv', cv);

      if (isEditMode) {
        await api.put(`/candidates/${id}`, fd);
        toast.success("Application updated successfully!");
        navigate(`/candidates/${id}`);
      } else {
        await api.post('/candidates/apply', fd);
        setIsSubmitted(true);
        toast.success("Application submitted successfully!");
      }
      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      toast.error(err.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  const addItem = (setter, template) => setter((p) => [...p, { ...template }]);
  const removeItem = (setter, idx) => setter((p) => p.filter((_, i) => i !== idx));
  const updateItem = (setter, idx, key, val) => {
    if (key === 'phone' && setter === setReferences) {
       const numericVal = val.replace(/\D/g, '').slice(0, 10);
       val = numericVal;
       setRefPhoneErrors(prev => ({
         ...prev,
         [idx]: (numericVal.length > 0 && numericVal.length < 10) ? 'Phone must be 10 digits' : ''
       }));
    }
    
    setter((p) => p.map((item, i) => (i === idx ? { ...item, [key]: val } : item)));
  };
  const handleBlur = (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) {
      e.target.dataset.touched = 'true';
    }
  };

  if (isEditMode && loading && !form.full_name) {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  return (
    <div className="app-form-page">
      <header className="app-form-header">
        <div className="app-form-header-content section-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center' }} onClick={() => navigate(isEditMode ? `/candidates/${id}` : '/')}>
              <ArrowLeft size={24} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.25rem' }}>{isEditMode ? 'Edit Candidate' : 'Pre Interview Application'}</h1>
              <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{isEditMode ? (form.full_name || 'Candidate') : 'Eulogik'}</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {isSubmitted ? (
        <div className="app-form-body">
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 40px', 
            background: 'var(--color-surface)', 
            borderRadius: 'var(--radius-lg)', 
            border: '1px solid var(--color-border)', 
            boxShadow: 'var(--shadow-lg)',
            animation: 'fadeIn 0.5s ease-out'
          }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              background: 'rgba(20, 184, 166, 0.1)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <CheckCircle size={48} style={{ color: 'var(--color-primary)' }} />
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '12px', color: 'var(--color-text-primary)' }}>Application Submitted!</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '32px', fontSize: '1.1rem', lineHeight: '1.6' }}>
              Thank you for applying to <strong>Eulogik</strong>. Your application has been successfully received and our recruitment team will review it shortly.
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/')} style={{ padding: '12px 32px', fontSize: '1rem' }}>
              Return to Home
            </button>
          </div>
        </div>
      ) : (
      <form onSubmit={handleSubmit} onBlur={handleBlur} className="app-form-body">
        
        {!isEditMode && (
          <section className="app-form-section" style={{ padding: '20px 28px' }}>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
              Thank you for your interest in joining Eulogik! Please fill out this application form completely and accurately. All fields marked with <span style={{ color: 'var(--color-error)' }}>*</span> are mandatory.
            </p>
          </section>
        )}

        {!isEditMode && (
          <section className="app-form-section">
            <h2 className="app-form-section-title">Photo & Resume</h2>
            <p className="app-form-section-desc">Upload your recent photo and CV/Resume<br />PDF, DOC, or DOCX</p>

            <div className="upload-row">
              <div className="upload-photo-area" onClick={() => photoRef.current.click()} style={{ position: 'relative' }}>
                {photoPreview ? (
                  <>
                    <img src={photoPreview} alt="Preview" className="upload-photo-preview" />
                    <button type="button" onClick={removePhoto} style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}>
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <div className="upload-placeholder">
                    <User size={32} />
                    <span>Upload Photo <span style={{ color: 'var(--color-error)' }}>*</span></span>
                  </div>
                )}
                <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoChange} hidden />
              </div>

              <div className="upload-cv-area" onClick={() => cvRef.current.click()} style={{ position: 'relative', minHeight: '140px', padding: cvPreview ? '0' : '20px' }}>
                {cvName && (
                  <button type="button" onClick={removeCv} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 20 }}>
                    <X size={14} />
                  </button>
                )}
                {cvPreview ? (
                  <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                    <iframe src={`${cvPreview}#toolbar=0&navpanes=0&scrollbar=0`} width="100%" height="180px" title="CV Preview" style={{ border: 'none', pointerEvents: 'none', overflow: 'hidden' }} scrolling="no" />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 8px', fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cvName}</span>
                      <span style={{ opacity: 0.8 }}>Change</span>
                    </div>
                  </div>
                ) : cvName ? (
                   <div className="upload-placeholder" style={{ padding: '20px' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📄</div>
                      <span style={{ fontWeight: 600, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cvName}</span>
                      <small style={{ color: 'var(--color-text-muted)' }}>Click to change</small>
                   </div>
                ) : (
                  <>
                    <Upload size={24} />
                    <span>Upload CV/Resume <span style={{ color: 'var(--color-error)' }}>*</span></span>
                    <small>PDF, DOC, DOCX</small>
                  </>
                )}
                <input ref={cvRef} type="file" accept=".pdf,.doc,.docx" onChange={handleCvChange} hidden />
              </div>
            </div>
          </section>
        )}

        {/* Personal Information */}
        <section className="app-form-section">
          <h2 className="app-form-section-title">{isEditMode ? 'Contact Information' : 'Personal Information'}</h2>
          <p className="app-form-section-desc" style={{ marginBottom: '16px' }}>{isEditMode ? 'Edit candidate contact details' : 'Contact and basic info'}</p>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name <span style={{ color: 'var(--color-error)' }}>*</span></label>
              <input className="form-input" placeholder="e.g. John Doe" value={form.full_name} onChange={(e) => updateForm('full_name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email <span style={{ color: 'var(--color-error)' }}>*</span></label>
              <input className="form-input" type="email" placeholder="john.doe@example.com" value={form.email} onChange={(e) => updateForm('email', e.target.value)} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone <span style={{ color: 'var(--color-error)' }}>*</span></label>
              <input className="form-input" type="tel" placeholder="e.g. 9876543210" value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} required />
              {phoneError && <p style={{ color: 'var(--color-error)', fontSize: '0.8rem', marginTop: '4px' }}>{phoneError}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>(DD-MM-YYYY)</span></label>
              <input className="form-input" type="date" value={form.date_of_birth} onChange={(e) => updateForm('date_of_birth', e.target.value)} />
              {ageWarning && <p style={{ color: 'var(--color-error)', fontSize: '0.8rem', marginTop: '4px' }}>{ageWarning}</p>}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Gender <span style={{ color: 'var(--color-error)' }}>*</span></label>
              <select className="form-select" value={form.gender} onChange={(e) => updateForm('gender', e.target.value)} required>
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Marital Status <span style={{ color: 'var(--color-error)' }}>*</span></label>
              <select className="form-select" value={form.marital_status} onChange={(e) => updateForm('marital_status', e.target.value)} required>
                <option value="">Select status</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <div className="form-group">
              <label className="form-label">Current Address</label>
              <input className="form-input" placeholder="House/Flat No., Street, Area/Locality" value={form.current_address} onChange={(e) => updateForm('current_address', e.target.value)} required />
            </div>
            <div className="form-row" style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" placeholder="City" value={form.current_city} onChange={(e) => updateForm('current_city', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <select className="form-select" value={form.current_state} onChange={(e) => updateForm('current_state', e.target.value)} required>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div style={{ margin: '20px 0 12px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textTransform: 'none', letterSpacing: 'normal', color: 'var(--color-text-primary)', fontWeight: 500 }}>
              <input type="checkbox" checked={sameAddress} onChange={handleSameAddress} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
              Permanent address is same as current address
            </label>
          </div>

          <div>
            <div className="form-group">
              <label className="form-label">Permanent Address</label>
              <input className="form-input" placeholder="House/Flat No., Street, Area/Locality" value={form.permanent_address} onChange={(e) => updateForm('permanent_address', e.target.value)} required={!sameAddress} disabled={sameAddress} />
            </div>
            <div className="form-row" style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" placeholder="City" value={form.permanent_city} onChange={(e) => updateForm('permanent_city', e.target.value)} required={!sameAddress} disabled={sameAddress} />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <select className="form-select" value={form.permanent_state} onChange={(e) => updateForm('permanent_state', e.target.value)} required={!sameAddress} disabled={sameAddress}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Job Details Section */}
        <section className="app-form-section">
          <h2 className="app-form-section-title">Job Application Details</h2>
          <p className="app-form-section-desc" style={{ marginBottom: '16px' }}>Position and availability information</p>
          <div className="form-group" style={{ maxWidth: '300px' }}>
            <label className="form-label">Position Applied</label>
            <select className="form-select" value={form.position_applied} onChange={(e) => updateForm('position_applied', e.target.value)} required>
              <option value="">Select position</option>
              {['Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'UI/UX Designer', 'QA Engineer', 'DevOps Engineer', 'Product Manager'].map(p=> <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ margin: '20px 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
              id="fresher-toggle"
              type="checkbox" 
              checked={isFresher} 
              onChange={(e) => {
                const checked = e.target.checked;
                setIsFresher(checked);
                if (checked) {
                  updateForm('notice_period', 'Immediate');
                  updateForm('experience_years', 0);
                  updateForm('experience_months', 0);
                  updateForm('current_ctc', '0');
                } else {
                  updateForm('notice_period', '');
                }
              }} 
              style={{ width: '16px', height: '16px', cursor: 'pointer' }} 
            />
            <label 
              htmlFor="fresher-toggle"
              className="form-label" 
              style={{ cursor: 'pointer', textTransform: 'none', letterSpacing: 'normal', color: 'var(--color-text-primary)', fontWeight: 500, margin: 0 }}
            >
              Fresher
            </label>
          </div>
          
          {!isFresher && (
            <>
              <div className="form-row" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Experience (Years)</label>
                  <input className="form-input" type="number" placeholder="e.g. 2" min="0" value={form.experience_years} onChange={(e) => updateForm('experience_years', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Experience (Months)</label>
                  <input className="form-input" type="number" placeholder="e.g. 6" min="0" max="11" value={form.experience_months} onChange={(e) => updateForm('experience_months', e.target.value)} />
                </div>
              </div>
              <div className="form-row" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Current CTC (in LPA)</label>
                  <input className="form-input" placeholder="e.g. 5.5" value={form.current_ctc} onChange={(e) => updateForm('current_ctc', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Expected CTC (in LPA)</label>
                  <input className="form-input" placeholder="e.g. 8.0" value={form.expected_ctc} onChange={(e) => updateForm('expected_ctc', e.target.value)} />
                </div>
              </div>
            </>
          )}

          {isFresher && (
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label">Expected CTC (in LPA)</label>
              <input className="form-input" placeholder="e.g. 8.0" value={form.expected_ctc} onChange={(e) => updateForm('expected_ctc', e.target.value)} />
            </div>
          )}

          {!isFresher && (
            <div className="form-group" style={{ marginTop: '16px' }}>
               <label className="form-label">Notice Period (Days)</label>
               <input className="form-input" placeholder="e.g. 30" value={form.notice_period} onChange={(e) => updateForm('notice_period', e.target.value)} />
            </div>
          )}
        </section>

        {/* Education Hidden in Edit Mode */}
        <section className="app-form-section">
          <div className="section-header-row">
            <h2 className="app-form-section-title">Education</h2>
            <button type="button" className="btn btn-sm" onClick={() => addItem(setEducation, emptyEducation)} style={{ color: 'var(--color-text-primary)' }}>
              <Plus size={16} /> Add
            </button>
          </div>
          <p className="app-form-section-desc">Add your educational background</p>

          {education.map((edu, index) => (
            <div key={index} className="repeater-card" style={{ paddingTop: '54px' }}>
              <div style={{ position: 'absolute', top: '24px', left: '24px', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Education #{index + 1}</div>
              {education.length > 1 && (
                <button type="button" className="repeater-remove" onClick={() => removeItem(setEducation, index)}>
                  <Trash2 size={16} style={{ color: 'var(--color-error)' }} />
                </button>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Type <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <select className="form-select" value={edu.type || 'College/University'} onChange={(e) => updateItem(setEducation, index, 'type', e.target.value)} required>
                    <option value="School (10th/12th)">School (10th/12th)</option>
                    <option value="College/University">College/University</option>
                    <option value="Diploma/Certification">Diploma/Certification</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Institution Name <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <input className="form-input" placeholder="Institution name" value={edu.institution} onChange={(e) => updateItem(setEducation, index, 'institution', e.target.value)} required />
                </div>
              </div>
              <div className="form-row" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Degree/Board <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <input className="form-input" placeholder="e.g. B.Tech, CBSE, State Board" value={edu.degree} onChange={(e) => updateItem(setEducation, index, 'degree', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Stream/Subject <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <input className="form-input" placeholder="e.g. Computer Science, Science" value={edu.board} onChange={(e) => updateItem(setEducation, index, 'board', e.target.value)} required />
                </div>
              </div>
              <div className="form-row" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Marks/Grade/CGPA <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <input className="form-input" placeholder="e.g. 85% or 8.5 CGPA" value={edu.percentage} onChange={(e) => updateItem(setEducation, index, 'percentage', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Year of Passing <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <input className="form-input" placeholder="e.g. 2020" value={edu.graduation_year} onChange={(e) => updateItem(setEducation, index, 'graduation_year', e.target.value)} required />
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Work Experience Hidden in Edit Mode */}
        {!isFresher && (
           <section className="app-form-section">
            <div className="section-header-row">
              <h2 className="app-form-section-title">Work Experience</h2>
              <button type="button" className="btn btn-sm" onClick={() => addItem(setWorkExperience, emptyWork)} style={{ color: 'var(--color-text-primary)' }}>
                <Plus size={16} /> Add
              </button>
            </div>
            <p className="app-form-section-desc">Add your past and current work details</p>

            {workExperience.map((work, index) => (
              <div key={index} className="repeater-card">
                {workExperience.length > 1 && (
                  <button type="button" className="repeater-remove" onClick={() => removeItem(setWorkExperience, index)}>
                    <Trash2 size={16} />
                  </button>
                )}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Company Name <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <input className="form-input" placeholder="Company Name" value={work.company_name} onChange={(e) => updateItem(setWorkExperience, index, 'company_name', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Position/Designation <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <input className="form-input" placeholder="e.g. SDE" value={work.position} onChange={(e) => updateItem(setWorkExperience, index, 'position', e.target.value)} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">From <span style={{ color: 'var(--color-error)' }}>*</span> <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 400 }}>(DD-MM-YYYY)</span></label>
                    <input className="form-input" type="date" value={work.from_date} onChange={(e) => updateItem(setWorkExperience, index, 'from_date', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">To <span style={{ color: 'var(--color-error)' }}>*</span> <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 400 }}>(DD-MM-YYYY)</span></label>
                    <input className="form-input" type="date" value={work.to_date} onChange={(e) => updateItem(setWorkExperience, index, 'to_date', e.target.value)} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Reason For Leaving</label>
                  <input className="form-input" placeholder="e.g. Career growth" value={work.responsibilities} onChange={(e) => updateItem(setWorkExperience, index, 'responsibilities', e.target.value)} />
                </div>
              </div>
            ))}
           </section>
        )}

        {/* Skills & Interests */}
        <section className="app-form-section">
          <h2 className="app-form-section-title">Skills & Interests</h2>
          <p className="app-form-section-desc" style={{ marginBottom: '16px' }}>Your professional and personal interests</p>
          <div className="form-group">
            <label className="form-label">Languages Known</label>
            <input className="form-input" value={form.languages} onChange={(e) => updateForm('languages', e.target.value)} placeholder="e.g. English, Hindi, Spanish, French, German" />
          </div>
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">Programming Languages / Technical Skills</label>
            <textarea className="form-input" style={{ height: '60px', paddingTop: '12px' }} value={form.skills} onChange={(e) => updateForm('skills', e.target.value)} placeholder="e.g. Javascript, Python, C++, Node.js, Express, MongoDB" />
          </div>
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">Hobbies / Interests</label>
            <textarea className="form-input" style={{ height: '60px', paddingTop: '12px' }} value={form.hobbies} onChange={(e) => updateForm('hobbies', e.target.value)} placeholder="e.g. Reading, Photography, Chess, Blogging" />
          </div>
        </section>

        {/* Why Hire Us */}
        <section className="app-form-section">
          <h2 className="app-form-section-title">Why Hire Us</h2>
          <p className="app-form-section-desc" style={{ marginBottom: '16px' }}>Explain why you are a good fit for this role</p>
          <div className="form-group">
            <label className="form-label">Why should we hire you?</label>
            <textarea className="form-input" style={{ height: '80px', paddingTop: '12px' }} value={form.statement_of_purpose} onChange={(e) => updateForm('statement_of_purpose', e.target.value)} placeholder="Explain why you are a good fit for this role" />
          </div>
        </section>

        <section className="app-form-section">
          <div className="section-header-row">
            <h2 className="app-form-section-title">References</h2>
            <button type="button" className="btn btn-sm" onClick={() => addItem(setReferences, emptyRef)} style={{ color: 'var(--color-text-primary)' }}>
              <Plus size={16} /> Add
            </button>
          </div>
          <p className="app-form-section-desc">Professional references (optional)</p>

          {references.map((ref, index) => (
            <div key={index} className="repeater-card">
              {references.length > 1 && (
                <button type="button" className="repeater-remove" onClick={() => removeItem(setReferences, index)}>
                  <Trash2 size={16} />
                </button>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="form-input" placeholder="e.g. John Doe" value={ref.name} onChange={(e) => updateItem(setReferences, index, 'name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Designation</label>
                  <input className="form-input" placeholder="e.g. Manager" value={ref.designation} onChange={(e) => updateItem(setReferences, index, 'designation', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Company</label>
                <input className="form-input" placeholder="e.g. ABC Corp" value={ref.company} onChange={(e) => updateItem(setReferences, index, 'company', e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" placeholder="e.g. 9876543210" value={ref.phone} onChange={(e) => updateItem(setReferences, index, 'phone', e.target.value)} />
                  {refPhoneErrors[index] && <p style={{ color: 'var(--color-error)', fontSize: '0.8rem', marginTop: '4px' }}>{refPhoneErrors[index]}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" placeholder="Email Address" value={ref.email} onChange={(e) => updateItem(setReferences, index, 'email', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Declaration Hidden in Edit Mode */}
        {!isEditMode && (
          <section className="app-form-section">
            <h2 className="app-form-section-title">Terms and Conditions</h2>
            <p className="consent-text" style={{ marginBottom: '16px' }}>
              By submitting this application, I declare that the information provided is true to the best of my knowledge. I understand that any false statements may lead to disqualification from the recruitment process or termination of employment if discovered later.
              <br /><br />
              Your personal data will be processed in accordance with our privacy policy and will only be used for recruitment purposes. We may contact your references as part of the recruitment process.
            </p>
            <label className="form-label" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', textTransform: 'none', letterSpacing: 'normal', color: 'var(--color-text-primary)' }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' }} required />
              <span style={{ fontSize: '0.875rem', lineHeight: '1.4' }}>
                I hereby declare that the details furnished above are true and correct to the best of my knowledge and belief and I undertake to inform you of any changes therein, immediately. <span style={{ color: 'var(--color-error)' }}>*</span>
              </span>
            </label>
          </section>
        )}

        <button
          id="submit-application"
          type="submit"
          className="btn btn-primary btn-block btn-lg submit-btn"
          disabled={loading || (!isEditMode && !consent)}
          style={{ cursor: (loading || (!isEditMode && !consent)) ? 'not-allowed' : 'pointer', background: '#111827' }}
        >
          {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : (isEditMode ? 'Save Changes' : 'Submit Application')}
        </button>
      </form>
      )}
    </div>
  );
}
