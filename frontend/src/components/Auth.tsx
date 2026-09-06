import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

const Auth: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { setToken, setUser } = useAuthStore();
  const navigate = useNavigate();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/send-otp', {
        phone_number: phoneNumber
      });

      if (response.data.otp) {
        console.log('Development OTP:', response.data.otp);
      }
      
      setOtpSent(true);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send OTP');
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/verify-otp', {
        phone_number: phoneNumber,
        otp
      });

      setToken(response.data.token);
      setUser(response.data.user);
      navigate('/map');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to verify OTP');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-page)' }}>
      <div className="w-full max-w-md p-8" style={{ background: 'var(--bg-surface)', border: '1px solid var(--n-200)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)' }}>
        <h1 className="text-center mb-2" style={{ fontSize: '24px', fontWeight: 700, color: 'var(--n-900)' }}>
          SC Loan Sahayak
        </h1>
        <p className="text-center mb-8" style={{ color: 'var(--n-700)', fontSize: '16px' }}>
          Find nearby channel partners and government schemes
        </p>

        {!otpSent ? (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="field">
              <label htmlFor="phone" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: 'var(--n-700)', marginBottom: '6px' }}>
                Phone Number <span style={{ color: 'var(--error)' }}>(required)</span>
              </label>
              <input
                type="tel"
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter your phone number"
                style={{
                  width: '100%',
                  height: 'var(--tap)',
                  border: '1px solid var(--n-300)',
                  borderRadius: 'var(--r-md)',
                  background: 'var(--n-0)',
                  color: 'var(--n-900)',
                  padding: '0 var(--s3)',
                  fontSize: '16px'
                }}
                required
                pattern="[0-9]{10}"
                maxLength={10}
              />
              <p className="hint" style={{ fontSize: '14px', color: 'var(--n-500)', marginTop: '6px' }}>
                Enter your 10-digit mobile number
              </p>
            </div>

            {error && (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', background: 'var(--error-tint)', borderLeft: '4px solid var(--error)', borderRadius: 'var(--r-md)', padding: '12px 16px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: '16px', height: '16px', color: 'var(--error-text)', flex: 'none', marginTop: '3px' }}>
                  <circle cx="12" cy="12" r="9"/>
                  <path d="M12 8v5M12 16h.01"/>
                </svg>
                <span style={{ fontSize: '14px', color: 'var(--error-text)' }}>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--s2)',
                height: 'var(--tap)',
                padding: '0 20px',
                minWidth: '120px',
                borderRadius: 'var(--r-md)',
                fontSize: '16px',
                fontWeight: 600,
                lineHeight: 1.2,
                border: '1.5px solid transparent',
                cursor: 'pointer',
                background: 'var(--primary-600)',
                color: 'var(--n-0)',
                width: '100%'
              }}
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="field">
              <label htmlFor="otp" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: 'var(--n-700)', marginBottom: '6px' }}>
                Enter OTP <span style={{ color: 'var(--error)' }}>(required)</span>
              </label>
              <input
                type="text"
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                style={{
                  width: '100%',
                  height: 'var(--tap)',
                  border: '1px solid var(--n-300)',
                  borderRadius: 'var(--r-md)',
                  background: 'var(--n-0)',
                  color: 'var(--n-900)',
                  padding: '0 var(--s3)',
                  fontSize: '16px',
                  textAlign: 'center',
                  letterSpacing: '0.5em'
                }}
                required
                pattern="[0-9]{6}"
                maxLength={6}
              />
              <p className="hint" style={{ fontSize: '14px', color: 'var(--n-500)', marginTop: '6px' }}>
                OTP sent to {phoneNumber}
              </p>
            </div>

            {error && (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', background: 'var(--error-tint)', borderLeft: '4px solid var(--error)', borderRadius: 'var(--r-md)', padding: '12px 16px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: '16px', height: '16px', color: 'var(--error-text)', flex: 'none', marginTop: '3px' }}>
                  <circle cx="12" cy="12" r="9"/>
                  <path d="M12 8v5M12 16h.01"/>
                </svg>
                <span style={{ fontSize: '14px', color: 'var(--error-text)' }}>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--s2)',
                height: 'var(--tap)',
                padding: '0 20px',
                minWidth: '120px',
                borderRadius: 'var(--r-md)',
                fontSize: '16px',
                fontWeight: 600,
                lineHeight: 1.2,
                border: '1.5px solid transparent',
                cursor: 'pointer',
                background: 'var(--primary-600)',
                color: 'var(--n-0)',
                width: '100%'
              }}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <button
              type="button"
              onClick={() => {
                setOtpSent(false);
                setOtp('');
                setError('');
              }}
              className="btn btn-tertiary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--s2)',
                height: 'var(--tap)',
                padding: '0 var(--s3)',
                minWidth: 0,
                borderRadius: 'var(--r-md)',
                fontSize: '16px',
                fontWeight: 600,
                lineHeight: 1.2,
                border: '1.5px solid transparent',
                cursor: 'pointer',
                background: 'transparent',
                color: 'var(--primary-600)',
                width: '100%'
              }}
            >
              Change Phone Number
            </button>
          </form>
        )}

        <div className="mt-6 text-center" style={{ marginTop: '24px', fontSize: '14px', color: 'var(--n-500)' }}>
          <p>Development Mode: OTP will be logged to console</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
