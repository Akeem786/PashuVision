import { useState, useEffect } from 'react'
import Header from '../components/Header.jsx'

export default function OTPLogin() {
  const [step, setStep] = useState('phone') // 'phone', 'otp', 'password'
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [userData, setUserData] = useState(null)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const validatePhone = (phone) => {
    const phoneRegex = /^[6-9]\d{9}$/
    return phoneRegex.test(phone)
  }

  const sendOTP = async () => {
    if (!validatePhone(phone)) {
      setError('Please enter a valid 10-digit mobile number')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      })

      let data = {}
      try {
        data = await res.json()
      } catch {
        data = {}
      }

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to send OTP')
      }

      setOtpSent(true)
      setCountdown(60)
      setStep('otp')
      alert('✅ OTP sent successfully to your mobile number')
    } catch (err) {
      setError(err.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp })
      })

      let data = {}
      try {
        data = await res.json()
      } catch {
        data = {}
      }

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Invalid OTP')
      }
      
      if (data.user) {
        // User exists, login directly
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        window.location.href = '/dashboard'
      } else {
        // New user, require password setup
        setUserData(data.tempData)
        setStep('password')
      }
    } catch (err) {
      setError(err.message || 'OTP verification failed')
    } finally {
      setLoading(false)
    }
  }

  const setupPassword = async () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone, 
          password,
          tempData: userData
        })
      })

      let data = {}
      try {
        data = await res.json()
      } catch {
        data = {}
      }

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to setup password')
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      window.location.href = '/dashboard'
    } catch (err) {
      setError(err.message || 'Failed to setup password')
    } finally {
      setLoading(false)
    }
  }

  const resendOTP = async () => {
    if (countdown > 0) return
    
    setLoading(true)
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      })

      if (res.ok) {
        setCountdown(60)
        alert('✅ OTP resent successfully')
      } else {
        throw new Error('Failed to resend OTP')
      }
    } catch (err) {
      setError(err.message || 'Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />
      <div className="container">
        <div className="card" style={{ maxWidth: '400px', margin: '40px auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div className="brand-logo" style={{ fontSize: '2rem', marginBottom: '8px' }}>
              BreedAI
            </div>
            <h2>🔐 Secure Login</h2>
            <p style={{ color: 'var(--color-text-muted)' }}>
              {step === 'phone' && 'Enter your mobile number to receive OTP'}
              {step === 'otp' && 'Enter the 6-digit OTP sent to your mobile'}
              {step === 'password' && 'Set up your password to complete registration'}
            </p>
          </div>

          {error && (
            <div style={{
              padding: '12px',
              backgroundColor: '#ffebee',
              color: '#c62828',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {step === 'phone' && (
            <div className="stack" style={{ gap: '16px' }}>
              <div className="stack">
                <label>📱 Mobile Number</label>
                <input
                  className="input"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Enter 10-digit mobile number"
                  maxLength={10}
                  style={{ fontSize: '16px', padding: '12px' }}
                />
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  We'll send a verification code to this number
                </div>
              </div>

              <button
                className="btn large"
                onClick={sendOTP}
                disabled={loading || !phone}
                style={{ width: '100%' }}
              >
                {loading ? 'Sending...' : '📤 Send OTP'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>or</span>
                <br />
                <a href="/login" style={{ color: 'var(--color-primary-blue)', textDecoration: 'none' }}>
                  Login with Password
                </a>
              </div>
            </div>
          )}

          {step === 'otp' && (
            <div className="stack" style={{ gap: '16px' }}>
              <div className="stack">
                <label>🔢 Verification Code</label>
                <input
                  className="input"
                  type="text"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  style={{ fontSize: '24px', padding: '12px', textAlign: 'center', letterSpacing: '4px' }}
                />
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  OTP sent to +91 {phone.slice(0, 2)}****{phone.slice(-2)}
                </div>
              </div>

              <button
                className="btn large"
                onClick={verifyOTP}
                disabled={loading || otp.length !== 6}
                style={{ width: '100%' }}
              >
                {loading ? 'Verifying...' : '✅ Verify OTP'}
              </button>

              <div style={{ textAlign: 'center' }}>
                {countdown > 0 ? (
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    Resend OTP in {countdown}s
                  </span>
                ) : (
                  <button
                    className="btn outline"
                    onClick={resendOTP}
                    disabled={loading}
                    style={{ fontSize: '14px' }}
                  >
                    🔄 Resend OTP
                  </button>
                )}
              </div>

              <div style={{ textAlign: 'center' }}>
                <button
                  className="btn secondary"
                  onClick={() => setStep('phone')}
                  style={{ fontSize: '14px' }}
                >
                  ← Change Number
                </button>
              </div>
            </div>
          )}

          {step === 'password' && (
            <div className="stack" style={{ gap: '16px' }}>
              <div className="stack">
                <label>🔒 Set Password</label>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter a secure password"
                  style={{ fontSize: '16px', padding: '12px' }}
                />
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  Password must be at least 6 characters long
                </div>
              </div>

              <button
                className="btn large"
                onClick={setupPassword}
                disabled={loading || password.length < 6}
                style={{ width: '100%' }}
              >
                {loading ? 'Setting up...' : '🚀 Complete Registration'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <button
                  className="btn secondary"
                  onClick={() => setStep('otp')}
                  style={{ fontSize: '14px' }}
                >
                  ← Back to OTP
                </button>
              </div>
            </div>
          )}

          <div style={{ 
            marginTop: '24px', 
            padding: '16px', 
            backgroundColor: 'var(--color-bg-secondary)', 
            borderRadius: 'var(--radius-md)',
            fontSize: '12px',
            color: 'var(--color-text-muted)'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '8px' }}>🔒 Security Features:</div>
            <ul style={{ margin: 0, paddingLeft: '16px' }}>
              <li>OTP expires in 5 minutes</li>
              <li>Maximum 3 OTP attempts per hour</li>
              <li>End-to-end encrypted communication</li>
              <li>No data stored without consent</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}

