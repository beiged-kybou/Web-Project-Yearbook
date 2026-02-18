import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/api';
import { parseStudentName } from '../utils/parseStudentName';
import './Registration.css';

const Registration = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Details
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [registrationToken, setRegistrationToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountName, setAccountName] = useState('');
  const [parsedInfo, setParsedInfo] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAccountNameChange = (value) => {
    setAccountName(value);
    const parsed = parseStudentName(value);
    setParsedInfo(parsed);
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await authService.requestOtp(email);
      setSuccess(response.message);
      setTimeout(() => {
        setStep(2);
        setSuccess('');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await authService.verifyOtp(email, otp);
      setRegistrationToken(response.registrationToken);
      setSuccess(response.message);
      setTimeout(() => {
        setStep(3);
        setSuccess('');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (!parsedInfo) {
      setError('Please enter your full account name (e.g. "John Doe 220104045")');
      return;
    }

    if (!parsedInfo.department) {
      setError('Could not determine department. The 5th digit of your ID must be 4 (CSE) or 5 (CEE).');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.completeRegistration(
        registrationToken,
        password,
        accountName
      );
      setSuccess('Registration successful! Welcome aboard!');
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registration-container">
      <div className="scrapbook-page">
        <div className="corner-pin top-left"></div>
        <div className="corner-pin top-right"></div>
        <div className="corner-pin bottom-left"></div>
        <div className="corner-pin bottom-right"></div>
        <div className="washi-tape top"></div>

        <div className="registration-header">
          <h1 className="yearbook-title">IUT Yearbook</h1>
          <div className="handwritten-note">
            Join us in preserving memories!
          </div>
        </div>

        <div className="progress-steps">
          <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-label">Email</div>
          </div>
          <div className="progress-line"></div>
          <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">Verify</div>
          </div>
          <div className="progress-line"></div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-label">Details</div>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="registration-form">
            <div className="form-card">
              <h2>Start Your Journey</h2>
              <p className="subtitle">Enter your IUT email to begin registration</p>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.name@iut-dhaka.edu"
                  required
                  pattern=".*@iut-dhaka\.edu$"
                  title="Please use your IUT email address"
                />
                <small className="helper-text">Use your official IUT email address</small>
              </div>

              <button type="submit" className="primary" disabled={loading}>
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="registration-form">
            <div className="form-card">
              <h2>Check Your Email</h2>
              <p className="subtitle">We sent a verification code to <strong>{email}</strong></p>

              <div className="form-group">
                <label>Verification Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Code"
                  required
                  maxLength="6"
                  className="otp-input"
                />
                <small className="helper-text">Code expires in 10 minutes</small>
              </div>

              <div className="button-group">
                <button type="button" onClick={() => setStep(1)} disabled={loading}>
                  Back
                </button>
                <button type="submit" className="primary" disabled={loading || otp.length !== 6}>
                  {loading ? 'Verifying...' : 'Verify Code'}
                </button>
              </div>

              <div className="resend-section">
                <button
                  type="button"
                  className="link-button"
                  onClick={handleRequestOtp}
                  disabled={loading}
                >
                  Didn't receive the code? Resend
                </button>
              </div>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleCompleteRegistration} className="registration-form">
            <div className="form-card">
              <h2>Complete Your Profile</h2>
              <p className="subtitle">Enter your name exactly as it appears on your Google account</p>

              <div className="form-group">
                <label>Account Name</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => handleAccountNameChange(e.target.value)}
                  placeholder="e.g. Mubtasim Sajid Ahmed 220041243"
                  required
                  autoFocus
                />
                <small className="helper-text">Full name followed by your 9-digit student ID</small>
              </div>

              {accountName.trim() && (
                <div className="parsed-info-panel">
                  {parsedInfo ? (
                    <>
                      <div className="parsed-badge name">
                        <span className="badge-label">Name</span>
                        <span className="badge-value">{parsedInfo.fullName}</span>
                      </div>
                      <div className="parsed-row">
                        <div className="parsed-badge id">
                          <span className="badge-label">Student ID</span>
                          <span className="badge-value">{parsedInfo.studentId}</span>
                        </div>
                        <div className="parsed-badge batch">
                          <span className="badge-label">Batch</span>
                          <span className="badge-value">'{parsedInfo.batch}</span>
                        </div>
                        <div className={`parsed-badge dept ${parsedInfo.department ? '' : 'error'}`}>
                          <span className="badge-label">Dept</span>
                          <span className="badge-value">{parsedInfo.department || '???'}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="parsed-badge error">
                      <span className="badge-value">Enter your full name followed by a 9-digit student ID</span>
                    </div>
                  )}
                </div>
              )}

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  minLength="8"
                />
                <small className="helper-text">At least 8 characters</small>
              </div>

              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  required
                />
              </div>

              <div className="button-group">
                <button type="button" onClick={() => setStep(2)} disabled={loading}>
                  Back
                </button>
                <button type="submit" className="primary" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Complete Registration'}
                </button>
              </div>
            </div>
          </form>
        )}

        {loading && <div className="spinner"></div>}

        <div className="auth-switch">
          <p>Already have an account? <Link to="/login" className="auth-switch-link">Sign in</Link></p>
        </div>

        <div className="doodle-star">*</div>
      </div>
    </div>
  );
};

export default Registration;
