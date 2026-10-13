import { useState } from 'react'
import Header from '../components/Header.jsx'

export default function ResetPassword() {
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [ok, setOk] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/password/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) })
      let data = null; try { data = await res.json() } catch {}
      if (!res.ok) throw new Error((data && data.error) || 'Failed')
      setOk(true)
    } catch (e) { setError(e.message || 'Failed') } finally { setLoading(false) }
  }

  return (
    <>
      <Header />
      <div className="container">
        <div className="card" style={{ maxWidth: 520 }}>
          <h1>Reset Password</h1>
          <div className="stack">
            <input 
              id="token"
              name="token"
              className="input" 
              value={token} 
              onChange={e => setToken(e.target.value)} 
              placeholder="Paste reset token" 
            />
            <input 
              id="password"
              name="password"
              className="input" 
              type="password" 
              autoComplete="new-password"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="New password" 
            />
            <button className="btn" disabled={loading} onClick={submit}>{loading ? 'Saving…' : 'Set Password'}</button>
            {ok && <div style={{ color: 'var(--color-muted)' }}>Password updated. You can log in now.</div>}
            {error && <div style={{ color: 'salmon' }}>{error}</div>}
          </div>
        </div>
      </div>
    </>
  )
}


