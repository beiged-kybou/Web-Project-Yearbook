import { useState } from 'react';
import { authService } from '../services/api';
import './Registration.css';

const Registration = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Details
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [registrationToken, setRegistrationToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

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

    setLoading(true);

    try {
      const response = await authService.completeRegistration(
        registrationToken,
        password,
        displayName,
        studentId
      );
      setSuccess('Registration successful! Welcome aboard! 🎉');
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
            Join us in preserving memories! 📸✨
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
                  placeholder="Enter 6-digit code"
                  required
                  maxLength="6"
                  className="otp-input"
                />
                <small className="helper-text">Code expires in 10 minutes</small>
              </div>

              <div className="button-group">
                <button type="button" onClick={() => setStep(1)} disabled={loading}>
                  ← Back
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
              <p className="subtitle">Just a few more details to get started</p>

              <div className="form-group">
                <label>Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                />
                <small className="helper-text">How you'd like to be called</small>
              </div>

              <div className="form-group">
                <label>Student ID (Optional)</label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="IUT123456"
                  maxLength="9"
                />
                <small className="helper-text">Link to your student profile if available</small>
              </div>

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
                  ← Back
                </button>
                <button type="submit" className="primary" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Complete Registration 🎉'}
                </button>
              </div>
            </div>
          </form>
        )}

        {loading && <div className="spinner"></div>}

        <div className="auth-switch">
          <p>Already have an account? <Link to="/login" className="auth-switch-link">Sign in</Link></p>
        </div>

        <div className="doodle-star">★</div>
        <div className="doodle-heart">♥</div>
      </div>
    </div>
  );
};

export default Registration;
