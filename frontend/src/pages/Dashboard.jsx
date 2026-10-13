import { Link } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { useEffect, useState } from 'react'
import ErrorBanner from '../components/ErrorBanner.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const [stats, setStats] = useState({ 
    total: 0, 
    pending: 0, 
    approved: 0, 
    rejected: 0, 
    breeds: {},
    todayRegistered: 0,
    totalUsers: 0,
    recentAnimals: []
  })
  const [location, setLocation] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(new Date())

  // Function to fetch all dashboard data
  const fetchDashboardData = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setError('Login required')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')
      
      // Fetch animals data
      const animalsRes = await fetch('/api/animals', { 
        headers: { Authorization: `Bearer ${token}` } 
      })
      
      const animalsData = await animalsRes.json().catch(() => [])
      
      let animals = []
      if (animalsRes.ok) {
        animals = animalsData
      } else {
        // Fallback to empty array if API fails
        animals = []
      }

      // Calculate statistics
      const total = animals.length
      const pending = animals.filter(a => a.status === 'pending').length
      const approved = animals.filter(a => a.status === 'approved').length
      const rejected = animals.filter(a => a.status === 'rejected').length
      const todayRegistered = animals.filter(a => {
        const created = new Date(a.createdAt || a.capturedAt)
        const today = new Date()
        return created.toDateString() === today.toDateString()
      }).length

      // Breed distribution
      const breeds = {}
      animals.forEach(animal => {
        const breed = animal.predictedBreed || animal.breed || 'Unknown'
        breeds[breed] = (breeds[breed] || 0) + 1
      })

      // Recent animals (last 5)
      const recentAnimals = animals
        .sort((a, b) => new Date(b.createdAt || b.capturedAt) - new Date(a.createdAt || a.capturedAt))
        .slice(0, 5)

      // If admin, fetch user stats
      let totalUsers = 0
      if (user?.role === 'admin') {
        try {
          const usersRes = await fetch('/api/admin/users', {
            headers: { Authorization: `Bearer ${token}` }
        })
          if (usersRes.ok) {
            const usersData = await usersRes.json()
            totalUsers = usersData.users?.length || usersData.length || 0
          }
        } catch (err) {
          console.error('Failed to fetch users:', err)
        }
      }

      setStats({
        total,
        pending,
        approved,
        rejected,
        breeds,
        todayRegistered,
        totalUsers,
        recentAnimals
      })
      setLastUpdated(new Date())
    } catch (err) {
      const errorMsg = err.message || 'Failed to load dashboard data'
      setError(errorMsg)
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData()
    }, 30000)

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          })
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      )
    }

    // Monitor online status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const renderUserDashboard = () => (
    <div className="card dashboard-card-light" style={{
      background: '#FFFFFF',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
      border: '1px solid #E2E8F0',
      color: '#172033'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '20px',
        borderBottom: '1px solid #E2E8F0',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{
            fontSize: '2.2rem',
            fontWeight: '800',
            margin: 0,
            color: '#172033',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            Welcome back, {user?.name || 'User'}! 👋
          </h1>
          <p style={{ color: '#5B6472', margin: '8px 0 0 0', fontSize: '1.05rem', fontWeight: '500' }}>
            Here's your overview today
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ 
            padding: '8px 16px',
            borderRadius: '10px',
            background: isOnline ? '#DCFCE7' : '#FEE2E2',
            color: isOnline ? '#15803D' : '#DC2626',
            border: `1px solid ${isOnline ? '#BBF7D0' : '#FECACA'}`,
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            {isOnline ? '🟢' : '🔴'} {isOnline ? 'Online' : 'Offline'}
          </div>
          <button
            onClick={fetchDashboardData}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(21, 101, 192, 0.25)',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <Link
          to="/records/new"
          style={{
            padding: '20px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
            color: '#FFFFFF',
            textDecoration: 'none',
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(21, 128, 61, 0.25)',
            transition: 'all 0.3s',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(21, 128, 61, 0.35)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(21, 128, 61, 0.25)'
          }}
        >
          <div style={{ fontSize: '32px' }}>📷</div>
          <div style={{ fontWeight: '700', fontSize: '16px', color: '#FFFFFF' }}>New Record</div>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.92)' }}>Capture animal</div>
        </Link>

        <Link
          to="/records"
          style={{
            padding: '20px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            color: '#FFFFFF',
            textDecoration: 'none',
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(37, 99, 235, 0.25)',
            transition: 'all 0.3s',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 99, 235, 0.35)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(37, 99, 235, 0.25)'
          }}
        >
          <div style={{ fontSize: '32px' }}>📋</div>
          <div style={{ fontWeight: '700', fontSize: '16px', color: '#FFFFFF' }}>My Records</div>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.92)' }}>View all</div>
        </Link>

        <Link
          to="/scan"
          style={{
            padding: '20px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
            color: '#FFFFFF',
            textDecoration: 'none',
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(124, 58, 237, 0.25)',
            transition: 'all 0.3s',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(124, 58, 237, 0.35)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(124, 58, 237, 0.25)'
          }}
        >
          <div style={{ fontSize: '32px' }}>📱</div>
          <div style={{ fontWeight: '700', fontSize: '16px', color: '#FFFFFF' }}>Scan QR</div>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.92)' }}>Quick access</div>
        </Link>
      </div>

      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <div style={{
          padding: '22px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%)',
          color: '#FFFFFF',
          boxShadow: '0 4px 16px rgba(29, 78, 216, 0.25)'
        }}>
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.92)', fontWeight: '600', marginBottom: '6px' }}>Total Animals</div>
          <div style={{ fontSize: '36px', fontWeight: '800', color: '#FFFFFF', marginBottom: '4px', lineHeight: 1.1 }}>
            {loading ? '...' : stats.total}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.85)' }}>All records</div>
        </div>

        <div style={{
          padding: '22px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
          color: '#FFFFFF',
          boxShadow: '0 4px 16px rgba(124, 58, 237, 0.25)'
        }}>
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.92)', fontWeight: '600', marginBottom: '6px' }}>Today's Records</div>
          <div style={{ fontSize: '36px', fontWeight: '800', color: '#FFFFFF', marginBottom: '4px', lineHeight: 1.1 }}>
            {loading ? '...' : stats.todayRegistered}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.85)' }}>Registered today</div>
        </div>

        <div style={{
          padding: '22px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
          color: '#FFFFFF',
          boxShadow: '0 4px 16px rgba(21, 128, 61, 0.25)'
        }}>
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.92)', fontWeight: '600', marginBottom: '6px' }}>Approved</div>
          <div style={{ fontSize: '36px', fontWeight: '800', color: '#FFFFFF', marginBottom: '4px', lineHeight: 1.1 }}>
            {loading ? '...' : stats.approved}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.85)' }}>Verified records</div>
        </div>

        <div style={{
          padding: '22px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #B45309 0%, #92400E 100%)',
          color: '#FFFFFF',
          boxShadow: '0 4px 16px rgba(180, 83, 9, 0.25)'
        }}>
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.92)', fontWeight: '600', marginBottom: '6px' }}>Pending</div>
          <div style={{ fontSize: '36px', fontWeight: '800', color: '#FFFFFF', marginBottom: '4px', lineHeight: 1.1 }}>
            {loading ? '...' : stats.pending}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.85)' }}>Awaiting review</div>
        </div>
      </div>

      {/* Recent Animals */}
      {stats.recentAnimals.length > 0 && (
        <div style={{ 
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '1.4rem', 
            fontWeight: '700',
            color: '#172033',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>📋</span> Recent Records
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stats.recentAnimals.map((animal, index) => {
              const status = (animal.status || 'pending').toLowerCase()
              const isApproved = status === 'approved'
              const isRejected = status === 'rejected'
              
              const badgeBg = isApproved ? '#DCFCE7' : isRejected ? '#FEE2E2' : '#FEF3C7'
              const badgeColor = isApproved ? '#15803D' : isRejected ? '#B91C1C' : '#B45309'
              const badgeBorder = isApproved ? '#BBF7D0' : isRejected ? '#FECACA' : '#FDE68A'

              return (
                <div
                  key={animal.id}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '12px',
                    background: index % 2 === 0 ? '#F8FAFC' : '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                    gap: '16px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#F1F5F9'
                    e.currentTarget.style.transform = 'translateX(4px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = index % 2 === 0 ? '#F8FAFC' : '#FFFFFF'
                    e.currentTarget.style.transform = 'translateX(0)'
                  }}
                >
                  <div>
                    <div style={{ 
                      fontWeight: '700', 
                      fontSize: '1.05rem', 
                      color: '#172033', 
                      marginBottom: '4px' 
                    }}>
                      {animal.ownerName || 'Unknown Owner'}
                    </div>
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#5B6472',
                      fontWeight: '500'
                    }}>
                      {animal.predictedBreed || 'Unknown Breed'} • {animal.location || 'No location'}
                    </div>
                  </div>
                  <div style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    background: badgeBg,
                    color: badgeColor,
                    border: `1px solid ${badgeBorder}`,
                    fontSize: '12px',
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap'
                  }}>
                    {status}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  const renderAdminDashboard = () => (
    <div className="card admin-dashboard" style={{
      background: '#FFFFFF',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
      border: '1px solid #E2E8F0',
      color: '#172033'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '20px',
        borderBottom: '1px solid #E2E8F0',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{
            fontSize: '2.2rem',
            fontWeight: '800',
            margin: 0,
            color: '#172033',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>👑</span>
            <span style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #1565C0 0%, #2E7D32 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: '#1565C0'
            }}>Admin Dashboard</span>
          </h1>
          <p style={{ color: '#475569', margin: '8px 0 0 0', fontSize: '1.05rem', fontWeight: '500' }}>
            System overview and management
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{
            padding: '8px 16px',
            borderRadius: '10px',
            background: isOnline ? '#DCFCE7' : '#FEE2E2',
            color: isOnline ? '#166534' : '#991B1B',
            border: `1px solid ${isOnline ? '#BBF7D0' : '#FECACA'}`,
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            {isOnline ? '🟢' : '🔴'} {isOnline ? 'Online' : 'Offline'}
          </div>
          <button 
            onClick={fetchDashboardData}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(21, 101, 192, 0.25)',
              transition: 'transform 0.2s',
              fontFamily: 'inherit'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Admin Quick Actions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <Link
          to="/admin/users"
          style={{
            padding: '22px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
            color: '#FFFFFF',
            textDecoration: 'none',
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(124, 58, 237, 0.25)',
            transition: 'all 0.3s',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(124, 58, 237, 0.35)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(124, 58, 237, 0.25)'
          }}
        >
          <div style={{ fontSize: '32px' }}>👥</div>
          <div style={{ fontWeight: '700', fontSize: '17px', color: '#FFFFFF' }}>Manage Users</div>
          <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.95)' }}>User management</div>
        </Link>

        <Link
          to="/admin/breeds"
          style={{
            padding: '22px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #B45309 0%, #92400E 100%)',
            color: '#FFFFFF',
            textDecoration: 'none',
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(180, 83, 9, 0.25)',
            transition: 'all 0.3s',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(180, 83, 9, 0.35)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(180, 83, 9, 0.25)'
          }}
        >
          <div style={{ fontSize: '32px' }}>🐄</div>
          <div style={{ fontWeight: '700', fontSize: '17px', color: '#FFFFFF' }}>Breed Database</div>
          <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.95)' }}>Manage breeds</div>
        </Link>

        <Link
          to="/records"
          style={{
            padding: '22px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            color: '#FFFFFF',
            textDecoration: 'none',
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(37, 99, 235, 0.25)',
            transition: 'all 0.3s',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 99, 235, 0.35)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(37, 99, 235, 0.25)'
          }}
        >
          <div style={{ fontSize: '32px' }}>📋</div>
          <div style={{ fontWeight: '700', fontSize: '17px', color: '#FFFFFF' }}>All Records</div>
          <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.95)' }}>View all animals</div>
        </Link>
      </div>

      {/* Admin Statistics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {/* Total Users */}
        <div style={{
          padding: '22px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
          color: '#FFFFFF',
          boxShadow: '0 4px 16px rgba(124, 58, 237, 0.25)'
        }}>
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.95)', fontWeight: '600', marginBottom: '6px' }}>Total Users</div>
          <div style={{ fontSize: '36px', fontWeight: '800', color: '#FFFFFF', marginBottom: '4px', lineHeight: 1.2 }}>
            {loading ? '...' : stats.totalUsers}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.92)' }}>Registered users</div>
        </div>
              
        {/* Total Animals */}
        <div style={{
          padding: '22px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%)',
          color: '#FFFFFF',
          boxShadow: '0 4px 16px rgba(29, 78, 216, 0.25)'
        }}>
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.95)', fontWeight: '600', marginBottom: '6px' }}>Total Animals</div>
          <div style={{ fontSize: '36px', fontWeight: '800', color: '#FFFFFF', marginBottom: '4px', lineHeight: 1.2 }}>
            {loading ? '...' : stats.total}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.92)' }}>All records</div>
        </div>
              
        {/* Approved */}
        <div style={{
          padding: '22px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
          color: '#FFFFFF',
          boxShadow: '0 4px 16px rgba(21, 128, 61, 0.25)'
        }}>
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.95)', fontWeight: '600', marginBottom: '6px' }}>Approved</div>
          <div style={{ fontSize: '36px', fontWeight: '800', color: '#FFFFFF', marginBottom: '4px', lineHeight: 1.2 }}>
            {loading ? '...' : stats.approved}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.92)' }}>Verified records</div>
        </div>
              
        {/* Pending */}
        <div style={{
          padding: '22px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #B45309 0%, #92400E 100%)',
          color: '#FFFFFF',
          boxShadow: '0 4px 16px rgba(180, 83, 9, 0.25)'
        }}>
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.95)', fontWeight: '600', marginBottom: '6px' }}>Pending</div>
          <div style={{ fontSize: '36px', fontWeight: '800', color: '#FFFFFF', marginBottom: '4px', lineHeight: 1.2 }}>
            {loading ? '...' : stats.pending}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.92)' }}>Awaiting review</div>
        </div>
      </div>

      {/* Breed Distribution */}
      {Object.keys(stats.breeds).length > 0 && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          marginBottom: '24px'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '1.4rem', 
            fontWeight: '700',
            color: '#172033',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>🐄</span> Breed Distribution
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px'
          }}>
            {Object.entries(stats.breeds)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([breed, count]) => (
                <div
                  key={breed}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#CBD5E1'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E2E8F0'
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.04)'
                  }}
                >
                  <div style={{ 
                    fontWeight: '700', 
                    fontSize: '1rem', 
                    color: '#172033',
                    marginBottom: '4px',
                    wordBreak: 'break-word'
                  }}>
                    {breed}
                  </div>
                  <div style={{ 
                    fontSize: '28px', 
                    fontWeight: '800', 
                    color: '#1565C0',
                    lineHeight: 1.2
                  }}>
                    {count}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Recent Animals */}
      {stats.recentAnimals.length > 0 && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '1.4rem', 
            fontWeight: '700',
            color: '#172033',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>📋</span> Recent Records
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stats.recentAnimals.map((animal, index) => {
              const status = (animal.status || 'pending').toLowerCase()
              const isApproved = status === 'approved'
              const isRejected = status === 'rejected'
              
              const badgeBg = isApproved ? '#DCFCE7' : isRejected ? '#FEE2E2' : '#FEF3C7'
              const badgeColor = isApproved ? '#166534' : isRejected ? '#991B1B' : '#92400E'
              const badgeBorder = isApproved ? '#BBF7D0' : isRejected ? '#FECACA' : '#FDE68A'

              return (
                <div
                  key={animal.id}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '12px',
                    background: index % 2 === 0 ? '#F8FAFC' : '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                    gap: '16px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#F1F5F9'
                    e.currentTarget.style.transform = 'translateX(4px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = index % 2 === 0 ? '#F8FAFC' : '#FFFFFF'
                    e.currentTarget.style.transform = 'translateX(0)'
                  }}
                >
                  <div>
                    <div style={{ 
                      fontWeight: '700', 
                      fontSize: '1.05rem', 
                      color: '#172033', 
                      marginBottom: '4px' 
                    }}>
                      {animal.ownerName || 'Unknown Owner'}
                    </div>
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#475569',
                      fontWeight: '500'
                    }}>
                      {animal.predictedBreed || 'Unknown Breed'} • {animal.location || 'No location'}
                    </div>
                  </div>
                  <div style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    background: badgeBg,
                    color: badgeColor,
                    border: `1px solid ${badgeBorder}`,
                    fontSize: '12px',
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap'
                  }}>
                    {status}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <Layout>
      <div style={{
        background: '#F5F7FA',
        minHeight: 'calc(100vh - 70px)',
        paddingTop: '80px',
        paddingBottom: '40px'
      }}>
        <div className="container">
          <ErrorBanner error={error} onDismiss={() => setError('')} />
          
          {loading && <LoadingSpinner message="Loading dashboard..." />}
          
          {!loading && (
            <>
              {user?.role === 'admin' ? renderAdminDashboard() : renderUserDashboard()}
              
              {/* Location Display */}
              {location && (
                <div style={{
                  marginTop: '24px',
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '20px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '24px' }}>📍</span>
                    <h3 style={{ margin: 0, color: '#172033', fontSize: '1.2rem', fontWeight: '700' }}>Current Location</h3>
                  </div>
                  <div style={{ fontSize: '14px', color: '#475569', fontWeight: '500' }}>
                    Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
                    <span style={{ marginLeft: '12px', color: '#64748B' }}>
                      Accuracy: ±{Math.round(location.accuracy)}m
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
