import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Footer from '../components/Footer.jsx'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpMode, setOtpMode] = useState(false)
  const [biometricMode, setBiometricMode] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [biometricSupported, setBiometricSupported] = useState(false)
  const navigate = useNavigate()

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      let data = null
      try { data = await res.json() } catch { /* ignore parse errors */ }
      if (!res.ok) throw new Error((data && data.error) || `Login failed (${res.status})`)
      if (!data) throw new Error('Empty response from server')
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const requestOtp = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      })
      let data = null; try { data = await res.json() } catch {}
      if (!res.ok) throw new Error((data && data.error) || `OTP request failed (${res.status})`)
      setOtpSent(true)
    } catch (err) {
      setError(err.message || 'OTP request failed')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp: otpCode })
      })
      let data = null; try { data = await res.json() } catch {}
      if (!res.ok) throw new Error((data && data.error) || `OTP verification failed (${res.status})`)
      if (data.token) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        navigate('/dashboard')
      } else {
        navigate('/setup-password', { state: { phone, tempToken: data.tempToken } })
      }
    } catch (err) {
      setError(err.message || 'OTP verification failed')
    } finally {
      setLoading(false)
    }
  }

  const authenticateBiometric = async () => {
    if (!biometricSupported) return
    setLoading(true)
    setError('')
    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: { name: 'PashuVision' },
          user: { id: new Uint8Array(16), name: email, displayName: email },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          authenticatorSelection: { authenticatorAttachment: 'platform' },
          timeout: 60000,
          attestation: 'direct'
        }
      })
      const res = await fetch('/api/auth/biometric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credential, email })
      })
      let data = null; try { data = await res.json() } catch {}
      if (!res.ok) throw new Error((data && data.error) || 'Biometric authentication failed')
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Biometric authentication failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setBiometricSupported('credentials' in navigator && 'create' in navigator.credentials)
  }, [])

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column' 
    }}>
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #E8F5E8 0%, #F3E5F5 50%, #E3F2FD 100%)',
        padding: 'var(--spacing-lg)'
      }}>
        <div style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--spacing-xl)',
          width: '100%',
          maxWidth: '450px',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--shadow-lg)'
        }}>
          {/* Back to Home Navigation */}
          <div className="back-to-home-nav">
            <Link 
              to="/" 
              className="back-to-home-link"
              aria-label="Back to Home"
            >
              <span className="back-arrow" aria-hidden="true">←</span>
              <span>Back to Home</span>
            </Link>
          </div>

          {/* Header */}
          <div style={{
            textAlign: 'center',
            marginBottom: 'var(--spacing-xl)'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, var(--color-primary-green), var(--color-primary-blue))',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--spacing-md) auto',
              fontSize: '2rem',
              color: 'white',
              fontWeight: 'bold',
              fontFamily: 'Times New Roman, serif'
            }}>
              P
            </div>
            <h1 style={{
              fontSize: '1.8rem',
              fontWeight: 'bold',
              color: 'var(--color-primary-green)',
              margin: '0 0 var(--spacing-xs) 0',
              fontFamily: 'Times New Roman, serif'
            }}>
              PashuVision
            </h1>
            <p style={{
              color: 'var(--color-text-secondary)',
              fontSize: '1rem',
              margin: 0,
              fontFamily: 'Times New Roman, serif'
            }}>
              Digital Livestock Management System
            </p>
          </div>

          {/* Regular Login Form */}
          {!otpMode && !biometricMode && (
            <form onSubmit={onSubmit} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-md)'
            }}>
              <div>
                <label 
                  htmlFor="email"
                  style={{
                    display: 'block',
                    marginBottom: 'var(--spacing-xs)',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: 'var(--color-text-primary)',
                    fontFamily: 'Times New Roman, serif'
                  }}
                >
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  className="input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-md)',
                    fontSize: '1rem',
                    fontFamily: 'Times New Roman, serif'
                  }}
                />
              </div>

              <div>
                <label 
                  htmlFor="password"
                  style={{
                    display: 'block',
                    marginBottom: 'var(--spacing-xs)',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: 'var(--color-text-primary)',
                    fontFamily: 'Times New Roman, serif'
                  }}
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  className="input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-md)',
                    fontSize: '1rem',
                    fontFamily: 'Times New Roman, serif'
                  }}
                />
              </div>

              {error && (
                <div style={{
                  background: '#ffebee',
                  color: '#c62828',
                  padding: 'var(--spacing-sm)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9rem',
                  border: '1px solid #ffcdd2'
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-md)',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  fontFamily: 'Times New Roman, serif',
                  marginTop: 'var(--spacing-sm)'
                }}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
          </form>
          )}

          {/* OTP Form */}
          {otpMode && !otpSent && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-md)'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: 'var(--spacing-xs)',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'Times New Roman, serif'
                }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  className="input"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  required
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-md)',
                    fontSize: '1rem',
                    fontFamily: 'Times New Roman, serif'
                  }}
                />
              </div>

              {error && (
                <div style={{
                  background: '#ffebee',
                  color: '#c62828',
                  padding: 'var(--spacing-sm)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9rem',
                  border: '1px solid #ffcdd2'
                }}>
                  {error}
                </div>
              )}

              <button
                onClick={requestOtp}
                className="btn"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-md)',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  fontFamily: 'Times New Roman, serif'
                }}
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </div>
          )}

          {/* OTP Verification */}
          {otpMode && otpSent && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-md)'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: 'var(--spacing-xs)',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'Times New Roman, serif'
                }}>
                  Enter OTP Code
                </label>
                <input
                  type="text"
                  className="input"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  required
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-md)',
                    fontSize: '1rem',
                    fontFamily: 'Times New Roman, serif',
                    textAlign: 'center',
                    letterSpacing: '0.2em'
                  }}
                />
              </div>

              {error && (
                <div style={{
                  background: '#ffebee',
                  color: '#c62828',
                  padding: 'var(--spacing-sm)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9rem',
                  border: '1px solid #ffcdd2'
                }}>
                  {error}
                </div>
              )}

              <button
                onClick={verifyOtp}
                className="btn"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-md)',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  fontFamily: 'Times New Roman, serif'
                }}
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </div>
          )}

          {/* Biometric Login */}
          {biometricMode && (
            <div style={{
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-md)'
            }}>
              <div style={{
                fontSize: '4rem',
                marginBottom: 'var(--spacing-md)'
              }}>
                👆
              </div>
              <p style={{
                color: 'var(--color-text-secondary)',
                fontSize: '1rem'
              }}>
                Use your fingerprint or face to sign in
              </p>
              {error && (
                <div style={{
                  background: '#ffebee',
                  color: '#c62828',
                  padding: 'var(--spacing-sm)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9rem',
                  border: '1px solid #ffcdd2'
                }}>
                  {error}
                </div>
              )}
              <button
                onClick={authenticateBiometric}
                className="btn"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-md)',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  fontFamily: 'Times New Roman, serif'
                }}
              >
                {loading ? 'Authenticating...' : 'Use Biometric'}
              </button>
            </div>
          )}

          {/* Alternative Login Methods */}
          {!otpMode && !biometricMode && (
            <div style={{
              marginTop: 'var(--spacing-lg)',
              textAlign: 'center'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 'var(--spacing-md)',
                marginBottom: 'var(--spacing-md)'
              }}>
                <button
                  onClick={() => setOtpMode(true)}
                  className="btn secondary"
                  style={{
                    fontSize: '0.9rem',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    fontFamily: 'Times New Roman, serif'
                  }}
                >
                  📱 OTP Login
                </button>
                {biometricSupported && (
                  <button
                    onClick={() => setBiometricMode(true)}
                    className="btn secondary"
                    style={{
                      fontSize: '0.9rem',
                      padding: 'var(--spacing-sm) var(--spacing-md)',
                      fontFamily: 'Times New Roman, serif'
                    }}
                  >
                    👆 Biometric
                  </button>
                )}
            </div>

              <div style={{
                borderTop: '1px solid var(--color-border)',
                paddingTop: 'var(--spacing-md)',
                marginTop: 'var(--spacing-md)'
              }}>
                <p style={{
                  color: 'var(--color-text-muted)',
                  fontSize: '0.9rem',
                  marginBottom: 'var(--spacing-sm)'
                }}>
                  Don't have an account?
                </p>
                <Link
                  to="/register"
                  style={{
                    color: 'var(--color-primary-green)',
                    textDecoration: 'none',
                    fontSize: '1rem',
                    fontWeight: '600',
                    fontFamily: 'Times New Roman, serif'
                  }}
                >
                  Create Account
                </Link>
            </div>
              </div>
            )}

          {/* Back to Login */}
          {(otpMode || biometricMode) && (
            <div style={{
              textAlign: 'center',
              marginTop: 'var(--spacing-lg)'
            }}>
              <button
                onClick={() => {
                  setOtpMode(false)
                  setBiometricMode(false)
                  setOtpSent(false)
                  setError('')
                }}
                className="btn ghost"
                style={{
                  fontSize: '0.9rem',
                  fontFamily: 'Times New Roman, serif'
                }}
              >
                ← Back to Email Login
              </button>
          </div>
        )}
      </div>
      </div>
      <Footer />
    </div>
  )
}
