import { useEffect, useState } from 'react'
import Header from '../components/Header.jsx'

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [error, setError] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [providerStatus, setProviderStatus] = useState(null)
  const [preferences, setPreferences] = useState({
    email: true,
    sms: true,
    push: true,
    vaccinationReminders: true,
    healthAlerts: true,
    approvalNotifications: true
  })
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [prefSaveMsg, setPrefSaveMsg] = useState('')

  // Test dispatch state
  const [testingDispatch, setTestingDispatch] = useState(false)
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return setError('Login required')
    
    // 1. Fetch notifications
    fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setNotifications(data)
      })
      .catch(e => setError(e.message || 'Failed to load notifications'))

    // 2. Fetch provider status
    fetch('/api/notifications/status', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setProviderStatus)
      .catch(() => {})

    // 3. Fetch user preferences
    fetch('/api/notifications/preferences', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data && typeof data === 'object' && !data.error) {
          setPreferences(prev => ({ ...prev, ...data }))
        }
      })
      .catch(() => {})
  }, [])

  const markAsRead = async (id) => {
    const token = localStorage.getItem('token')
    try {
      await fetch(`/api/notifications/${id}/read`, { 
        method: 'POST', 
        headers: { Authorization: `Bearer ${token}` } 
      })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    } catch (e) {
      console.error('Failed to mark as read:', e)
    }
  }

  const savePreferences = async () => {
    const token = localStorage.getItem('token')
    setSavingPrefs(true)
    setPrefSaveMsg('')
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(preferences)
      })
      const data = await res.json()
      if (res.ok) {
        setPrefSaveMsg('✅ Preferences saved successfully!')
        setTimeout(() => setPrefSaveMsg(''), 3500)
      } else {
        setPrefSaveMsg(`❌ ${data.error || 'Failed to save preferences'}`)
      }
    } catch (err) {
      setPrefSaveMsg(`❌ Network error: ${err.message}`)
    } finally {
      setSavingPrefs(false)
    }
  }

  const sendTestNotification = async () => {
    const token = localStorage.getItem('token')
    setTestingDispatch(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'general',
          title: 'Test Notification from PashuVision',
          message: 'This is a test notification confirming delivery across configured channels.',
          priority: 'medium',
          channels: ['email', 'sms', 'push']
        })
      })
      const data = await res.json()
      setTestResult(data)
      // Refresh list
      fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setNotifications(data) })
        .catch(() => {})
    } catch (err) {
      setTestResult({ error: err.message })
    } finally {
      setTestingDispatch(false)
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ff6b6b'
      case 'medium': return '#ffa500'
      case 'low': return '#11a36a'
      default: return 'var(--color-muted)'
    }
  }

  const getStatusBadge = (statusObj, type) => {
    if (!statusObj) return null
    const status = statusObj.status
    let color = '#888'
    let text = 'Not Configured'
    let icon = '⚪'

    if (status === 'CONFIGURED' || statusObj.configured) {
      color = '#11a36a'
      text = type === 'email' ? 'SMTP Live' : (type === 'sms' ? 'Twilio Live' : 'Push Live')
      icon = '🟢'
    } else if (status === 'MOCK_DEVELOPMENT') {
      color = '#e67e22'
      text = 'Dev Mock'
      icon = '🟡'
    } else if (status === 'IN_APP_ONLY') {
      color = '#2980b9'
      text = 'In-App Active'
      icon = '🔵'
    }

    return (
      <span style={{
        fontSize: 12,
        padding: '3px 8px',
        borderRadius: 12,
        backgroundColor: `${color}18`,
        color,
        border: `1px solid ${color}40`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4
      }}>
        <span>{icon}</span> {text}
      </span>
    )
  }

  return (
    <>
      <Header />
      <div className="container" style={{ maxWidth: 960, margin: '20px auto', padding: '0 16px' }}>
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div>
              <h1 style={{ margin: 0 }}>Notifications & Reminders</h1>
              <p style={{ color: 'var(--color-muted)', margin: '4px 0 0 0', fontSize: 14 }}>
                Real-time livestock alerts, health reminders, and delivery channel preferences
              </p>
            </div>

            <div className="row" style={{ gap: 8 }}>
              <button 
                className="btn secondary" 
                onClick={() => setShowSettings(!showSettings)}
                style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                ⚙️ {showSettings ? 'Hide Preferences' : 'Channels & Preferences'}
              </button>
              <button
                className="btn"
                onClick={sendTestNotification}
                disabled={testingDispatch}
                style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {testingDispatch ? 'Testing...' : '🔔 Send Test Alert'}
              </button>
            </div>
          </div>

          {/* Provider Status Bar */}
          {providerStatus && (
            <div style={{
              background: 'var(--color-surface-2, rgba(255,255,255,0.05))',
              border: '1px solid var(--color-border, rgba(255,255,255,0.1))',
              borderRadius: 8,
              padding: '10px 16px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12
            }}>
              <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>
                <strong>Provider Channels:</strong>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13 }}>Email: {getStatusBadge(providerStatus.email, 'email')}</span>
                <span style={{ fontSize: 13 }}>SMS: {getStatusBadge(providerStatus.sms, 'sms')}</span>
                <span style={{ fontSize: 13 }}>Push: {getStatusBadge(providerStatus.push, 'push')}</span>
                <span style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase' }}>
                  ({providerStatus.environment})
                </span>
              </div>
            </div>
          )}

          {/* Test Dispatch Result Feedback */}
          {testResult && (
            <div style={{
              background: testResult.error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              border: `1px solid ${testResult.error ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              fontSize: 13
            }}>
              <strong>Dispatch Result:</strong> {testResult.error ? `Error: ${testResult.error}` : 'Processed'}
              {testResult.results && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {testResult.results.map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.1)', padding: '4px 8px', borderRadius: 4 }}>
                      <span style={{ textTransform: 'capitalize' }}>
                        <strong>{r.channel}:</strong> {r.status} {r.recipient ? `(${r.recipient})` : ''}
                      </span>
                      {r.note && <span style={{ opacity: 0.8, fontSize: 12 }}>{r.note}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Preferences Settings Panel */}
          {showSettings && (
            <div style={{
              background: 'var(--color-surface-2, rgba(255,255,255,0.03))',
              border: '1px solid var(--color-border, rgba(255,255,255,0.1))',
              borderRadius: 8,
              padding: 16,
              marginBottom: 20
            }}>
              <h3 style={{ marginTop: 0, marginBottom: 12 }}>Notification Channels & Alert Categories</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: 14, color: 'var(--color-muted)' }}>Delivery Channels</h4>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontSize: 14 }}>
                    <input 
                      type="checkbox" 
                      checked={preferences.email} 
                      onChange={e => setPreferences({ ...preferences, email: e.target.checked })} 
                    />
                    <span>📧 Email Notifications</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontSize: 14 }}>
                    <input 
                      type="checkbox" 
                      checked={preferences.sms} 
                      onChange={e => setPreferences({ ...preferences, sms: e.target.checked })} 
                    />
                    <span>📱 SMS Messages</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontSize: 14 }}>
                    <input 
                      type="checkbox" 
                      checked={preferences.push} 
                      onChange={e => setPreferences({ ...preferences, push: e.target.checked })} 
                    />
                    <span>🔔 In-App & Push Notifications</span>
                  </label>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: 14, color: 'var(--color-muted)' }}>Event Categories</h4>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontSize: 14 }}>
                    <input 
                      type="checkbox" 
                      checked={preferences.vaccinationReminders} 
                      onChange={e => setPreferences({ ...preferences, vaccinationReminders: e.target.checked })} 
                    />
                    <span>💉 Vaccination Reminders</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontSize: 14 }}>
                    <input 
                      type="checkbox" 
                      checked={preferences.healthAlerts} 
                      onChange={e => setPreferences({ ...preferences, healthAlerts: e.target.checked })} 
                    />
                    <span>🩺 Health & Disease Alerts</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontSize: 14 }}>
                    <input 
                      type="checkbox" 
                      checked={preferences.approvalNotifications} 
                      onChange={e => setPreferences({ ...preferences, approvalNotifications: e.target.checked })} 
                    />
                    <span>✅ Verification & Approval Notices</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button 
                  className="btn" 
                  onClick={savePreferences} 
                  disabled={savingPrefs}
                  style={{ fontSize: 13 }}
                >
                  {savingPrefs ? 'Saving...' : 'Save Preferences'}
                </button>
                {prefSaveMsg && <span style={{ fontSize: 13 }}>{prefSaveMsg}</span>}
              </div>
            </div>
          )}

          {error && <div style={{ color: 'salmon', marginBottom: 12 }}>{error}</div>}
          
          {notifications.length === 0 ? (
            <div style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <div>No notifications yet. Reminders are generated automatically based on animal records.</div>
            </div>
          ) : (
            <div className="stack" style={{ gap: 12 }}>
              {notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className="card" 
                  style={{ 
                    opacity: notification.read ? 0.7 : 1,
                    borderLeft: `4px solid ${getPriorityColor(notification.priority)}`,
                    transition: 'all 0.2s ease',
                    padding: 16
                  }}
                >
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div className="stack" style={{ flex: 1, gap: 4 }}>
                      <div className="row" style={{ gap: 8, alignItems: 'center', marginBottom: 2 }}>
                        <span style={{ 
                          background: getPriorityColor(notification.priority), 
                          color: 'white', 
                          padding: '2px 8px', 
                          borderRadius: 4, 
                          fontSize: 12,
                          fontWeight: 600,
                          textTransform: 'uppercase'
                        }}>
                          {notification.priority || 'medium'}
                        </span>
                        <span style={{ color: 'var(--color-muted)', fontSize: 13, textTransform: 'capitalize' }}>
                          {notification.type ? notification.type.replace('_', ' ') : 'Alert'}
                        </span>
                        {notification.timestamp && (
                          <span style={{ color: 'var(--color-muted)', fontSize: 12, marginLeft: 'auto' }}>
                            {new Date(notification.timestamp).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>
                        {notification.title ? `${notification.title}: ` : ''}{notification.message || notification.body}
                      </div>
                      {(notification.ownerName || notification.animalId) && (
                        <div style={{ color: 'var(--color-muted)', fontSize: 13 }}>
                          {notification.ownerName ? `Owner: ${notification.ownerName}` : ''}
                          {notification.animalId ? ` • Animal ID: ${notification.animalId}` : ''}
                        </div>
                      )}
                      {notification.dueDate && (
                        <div style={{ color: 'var(--color-muted)', fontSize: 13 }}>
                          Due Date: {new Date(notification.dueDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    {!notification.read && (
                      <button 
                        className="btn secondary" 
                        onClick={() => markAsRead(notification.id)}
                        style={{ fontSize: 12, whiteSpace: 'nowrap' }}
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
