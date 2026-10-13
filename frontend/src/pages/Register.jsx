import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Footer from '../components/Footer.jsx'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()


  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          email, 
          phone,
          password, 
          role: 'user' // Always register as user
        }),
      })
      let data = null
      try { data = await res.json() } catch { /* ignore parse errors */ }
      if (!res.ok) throw new Error((data && data.error) || `Register failed (${res.status})`)
      if (!data) throw new Error('Empty response from server')
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      
      alert(`Registration successful!\n\nWelcome to PashuVision, ${data.user.name}!`)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Register failed')
    } finally {
      setLoading(false)
    }
  }


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
          maxWidth: '500px',
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
              fontSize: '2.5rem',
              fontWeight: 'bold',
              marginBottom: 'var(--spacing-sm)',
              fontFamily: 'Times New Roman, serif',
              color: 'var(--color-text-primary)'
            }}>
              Join PashuVision
            </h1>
            <p style={{
              color: 'var(--color-text-secondary)',
              fontSize: '1rem',
              margin: 0
            }}>
              Create your account to start managing livestock
            </p>
          </div>

          {/* Registration Form */}
          <form onSubmit={onSubmit} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-md)'
            }}>
              <div>
                <label 
                  htmlFor="name"
                  style={{
                    display: 'block',
                    marginBottom: 'var(--spacing-xs)',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: 'var(--color-text-primary)',
                    fontFamily: 'Times New Roman, serif'
                  }}
                >
                  Full Name *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  className="input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your full name"
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
                  Email Address *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
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
                  htmlFor="phone"
                  style={{
                    display: 'block',
                    marginBottom: 'var(--spacing-xs)',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: 'var(--color-text-primary)',
                    fontFamily: 'Times New Roman, serif'
                  }}
                >
                  Phone Number *
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
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
                  Password *
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  className="input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Create a strong password"
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
                  htmlFor="confirmPassword"
                  style={{
                    display: 'block',
                    marginBottom: 'var(--spacing-xs)',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: 'var(--color-text-primary)',
                    fontFamily: 'Times New Roman, serif'
                  }}
                >
                  Confirm Password *
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  className="input"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
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
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
        </form>

          {/* Login Link */}
          <div style={{
            textAlign: 'center',
            marginTop: 'var(--spacing-lg)',
            borderTop: '1px solid var(--color-border)',
            paddingTop: 'var(--spacing-md)'
          }}>
            <p style={{
              color: 'var(--color-text-muted)',
              fontSize: '0.9rem',
              marginBottom: 'var(--spacing-sm)'
            }}>
              Already have an account?
            </p>
            <Link
              to="/login"
              style={{
                color: 'var(--color-primary-green)',
                textDecoration: 'none',
                fontSize: '1rem',
                fontWeight: '600',
                fontFamily: 'Times New Roman, serif'
              }}
            >
              Sign In
            </Link>
          </div>
      </div>
      </div>
      <Footer />
    </div>
  )
}
