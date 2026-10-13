import { useState } from 'react'
import Header from '../components/Header.jsx'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [devToken, setDevToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const send = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/password/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      let data = null; try { data = await res.json() } catch {}
      if (!res.ok) throw new Error((data && data.error) || 'Failed')
      setSent(true)
      if (data && data.devToken) setDevToken(data.devToken)
    } catch (e) { setError(e.message || 'Failed') } finally { setLoading(false) }
  }

  return (
    <>
      <Header />
      <div className="container">
        <div className="card" style={{ maxWidth: 520 }}>
          <h1>Forgot Password</h1>
          <div className="stack">
            <input 
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className="input" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="you@example.com" 
            />
            <button className="btn" disabled={loading} onClick={send}>{loading ? 'Sending…' : 'Send Reset Link'}</button>
            {sent && <div style={{ color: 'var(--color-muted)' }}>If the email exists, a link was sent. Dev token: {devToken}</div>}
            {error && <div style={{ color: 'salmon' }}>{error}</div>}
          </div>
        </div>
      </div>
    </>
  )
}


