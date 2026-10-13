import { useState, useEffect } from 'react'
import Header from '../components/Header.jsx'
import { getPhotoSource } from '../utils/photoUtils.js'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddUser, setShowAddUser] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [viewingUser, setViewingUser] = useState(null)
  const [fixingPhotos, setFixingPhotos] = useState(false)
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    search: ''
  })
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'user',
    password: '',
    permissions: []
  })
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showAddUser) {
        setShowAddUser(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showAddUser])

  useEffect(() => {
    loadUsers(true)
  }, [])

  useEffect(() => {
    applyFilters()
  }, [users, filters])

  const loadUsers = async (showLoading = false) => {
    const token = localStorage.getItem('token')
    if (!token) return setError('Login required')
    
    if (showLoading) setLoading(true)
    setError('')
    
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (!res.ok) throw new Error('Failed to load users')
      
      const data = await res.json()
      const usersList = Array.isArray(data.users) ? data.users : (Array.isArray(data) ? data : [])
      setUsers(usersList)
    } catch (err) {
      setError(err.message || 'Failed to load users')
      console.error('Load users error:', err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...users]

    if (filters.role) {
      filtered = filtered.filter(user => user.role === filters.role)
    }
    
    if (filters.status) {
      filtered = filtered.filter(user => {
        const userIsActive = user.isActive !== false && user.is_active !== false
        return userIsActive === (filters.status === 'active')
      })
    }
    
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(user => 
        user.name?.toLowerCase().includes(searchTerm) ||
        user.email?.toLowerCase().includes(searchTerm) ||
        user.village?.toLowerCase().includes(searchTerm)
      )
    }

    setFilteredUsers(filtered)
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    const token = localStorage.getItem('token')
    if (!token) return setError('Login required')
    
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUser)
      })
      
      if (!res.ok) throw new Error('Failed to add user')
      
      await loadUsers()
      setShowAddUser(false)
      setNewUser({
        name: '',
        email: '',
        phone: '',
        role: 'user',
        password: '',
        permissions: []
      })
      
      alert('✅ User added successfully')
    } catch (err) {
      setError(err.message || 'Failed to add user')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUser = async (userId, updates) => {
    const token = localStorage.getItem('token')
    if (!token) {
      setError('Login required')
      alert('❌ Login required')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })
      
      const data = await res.json().catch(() => ({}))
      
      if (!res.ok) {
        const errorMsg = data.error || `Failed to update user (${res.status})`
        throw new Error(errorMsg)
      }
      
      await loadUsers()
      setEditingUser(null)
      alert('✅ User updated successfully')
    } catch (err) {
      const errorMsg = err.message || 'Failed to update user'
      setError(errorMsg)
      alert(`❌ ${errorMsg}`)
      console.error('Update user error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    
    const token = localStorage.getItem('token')
    if (!token) {
      setError('Login required')
      alert('❌ Login required')
      return
    }
    
    setError('')
    const previousLoading = loading
    setLoading(true)
    
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      
      const data = await res.json().catch(() => ({}))
      
      if (!res.ok) {
        const errorMsg = data.error || `Failed to delete user (${res.status})`
        throw new Error(errorMsg)
      }
      
      // Immediately remove from local state for instant UI update
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userId))
      
      // Then reload from server to ensure consistency
      await loadUsers()
      
      alert('✅ User deleted successfully')
    } catch (err) {
      const errorMsg = err.message || 'Failed to delete user'
      setError(errorMsg)
      alert(`❌ ${errorMsg}`)
      console.error('Delete user error:', err)
      // Reload users on error to ensure UI is in sync
      await loadUsers()
    } finally {
      setLoading(previousLoading)
    }
  }

  const handleToggleUserStatus = async (userId, isActive) => {
    const token = localStorage.getItem('token')
    if (!token) return setError('Login required')
    
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !isActive })
      })
      
      if (!res.ok) throw new Error('Failed to update user status')
      
      await loadUsers()
      alert(`✅ User ${!isActive ? 'activated' : 'deactivated'} successfully`)
    } catch (err) {
      setError(err.message || 'Failed to update user status')
    }
  }

  const handleFixPhotos = async () => {
    const token = localStorage.getItem('token')
    if (!token) return setError('Login required')
    
    if (!confirm('🔧 This will remove invalid file-based photo URLs for all users.\n\nUsers will need to upload new photos, which will be saved as base64 and work on Vercel.\n\nContinue?')) {
      return
    }
    
    setFixingPhotos(true)
    setError('')
    
    try {
      const res = await fetch('/api/admin/fix-photos', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to fix photos')
      }
      
      const data = await res.json()
      await loadUsers()
      alert(`✅ ${data.message}\n\nFixed: ${data.fixedCount} users\nSkipped: ${data.skippedCount} users`)
    } catch (err) {
      setError(err.message || 'Failed to fix photos')
      alert(`❌ ${err.message || 'Failed to fix photos'}`)
    } finally {
      setFixingPhotos(false)
    }
  }

  const getRolePermissions = (role) => {
    const permissions = {
      user: ['create_animal', 'view_own_animals', 'update_own_animals'],
      admin: ['all']
    }
    return permissions[role] || []
  }

  const getRoleColor = (role) => {
    const colors = {
      admin: '#7E22CE',
      user: '#1565C0'
    }
    return colors[role] || '#475569'
  }

  const getStatusBadge = (isActive) => (
    <span style={{
      padding: '4px 8px',
      borderRadius: '4px',
      backgroundColor: isActive ? '#15803D' : '#DC2626',
      color: '#FFFFFF',
      fontSize: '12px',
      fontWeight: 'bold'
    }}>
      {isActive ? 'ACTIVE' : 'INACTIVE'}
    </span>
  )

  return (
    <>
      <Header />
      <div className="container">
        {/* Error Display */}
        {error && (
          <div className="card" style={{ 
            marginBottom: 16, 
            backgroundColor: '#ffebee', 
            border: '2px solid #f44336',
            color: '#c62828'
          }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>❌ Error:</strong> {error}
              </div>
              <button 
                className="btn secondary" 
                onClick={() => setError('')}
                style={{ fontSize: '12px', padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <div>⏳ Loading users...</div>
          </div>
        )}

        <div className="card pv-user-mgmt">
          <style>{`
            .pv-user-mgmt h1 {
              color: #E8F1F8 !important;
            }
            .pv-user-mgmt h3 {
              color: #E8F1F8 !important;
            }
            .pv-user-mgmt label {
              color: #E2E8F0 !important;
              font-weight: 600;
            }
            .pv-user-mgmt .select,
            .pv-user-mgmt .input {
              color: #E8F1F8 !important;
              background-color: #0e2238 !important;
              border: 1px solid rgba(255, 255, 255, 0.22) !important;
            }
            .pv-user-mgmt .select:focus,
            .pv-user-mgmt .input:focus {
              border-color: #11a36a !important;
              box-shadow: 0 0 0 2px rgba(17, 163, 106, 0.3) !important;
            }
            .pv-user-mgmt select option {
              background-color: #0e2238 !important;
              color: #E8F1F8 !important;
            }
            .pv-user-mgmt .input::placeholder {
              color: #94A3B8 !important;
              opacity: 1 !important;
            }
            .pv-user-mgmt .table-header-row {
              background: rgba(255, 255, 255, 0.06) !important;
              border-bottom: 1px solid rgba(255, 255, 255, 0.12) !important;
              padding: 10px 8px !important;
              border-radius: 6px !important;
            }
            .pv-user-mgmt .table-row {
              border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
              padding: 10px 8px !important;
            }
            .pv-user-mgmt .table-row:hover {
              background: rgba(255, 255, 255, 0.03) !important;
            }
            .pv-user-mgmt .stat-card {
              background: linear-gradient(180deg, #132d4b 0%, #0e2338 100%) !important;
              border: 1px solid rgba(255, 255, 255, 0.12) !important;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25) !important;
            }
            .pv-user-mgmt .stat-card h4 {
              color: #CBD5E1 !important;
            }
            .pv-user-mgmt .btn-fix-photos {
              background-color: #1565C0 !important;
              color: #FFFFFF !important;
              border: none !important;
            }
            .pv-user-mgmt .btn-fix-photos:hover {
              background-color: #0D47A1 !important;
            }
            .pv-user-mgmt .btn-add-user {
              background-color: #15803D !important;
              color: #FFFFFF !important;
              border: none !important;
            }
            .pv-user-mgmt .btn-add-user:hover {
              background-color: #166534 !important;
            }
            .pv-user-mgmt .btn-action-view {
              background-color: #1565C0 !important;
              color: #FFFFFF !important;
              border: none !important;
            }
            .pv-user-mgmt .btn-action-view:hover {
              background-color: #0D47A1 !important;
            }
            .pv-user-mgmt .btn-action-edit {
              background-color: #15803D !important;
              color: #FFFFFF !important;
              border: none !important;
            }
            .pv-user-mgmt .btn-action-edit:hover {
              background-color: #166534 !important;
            }
            .pv-user-mgmt .btn-action-delete {
              background-color: #DC2626 !important;
              color: #FFFFFF !important;
              border: none !important;
            }
            .pv-user-mgmt .btn-action-delete:hover {
              background-color: #B91C1C !important;
            }
          `}</style>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ color: '#E8F1F8' }}>👥 User Management</h1>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button 
                className="btn secondary btn-fix-photos" 
                onClick={handleFixPhotos}
                disabled={fixingPhotos}
                style={{ opacity: fixingPhotos ? 0.6 : 1, backgroundColor: '#1565C0', color: '#FFFFFF', border: 'none' }}
                title="Fix all users with invalid photo URLs (file paths that don't work on Vercel)"
              >
                {fixingPhotos ? '⏳ Fixing...' : '🔧 Fix Photos'}
              </button>
              <button 
                className="btn btn-add-user" 
                onClick={() => setShowAddUser(true)}
                style={{ backgroundColor: '#15803D', color: '#FFFFFF', border: 'none' }}
              >
                ➕ Add User
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ color: '#E8F1F8' }}>🔍 Filters</h3>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div className="stack">
                <label style={{ color: '#E2E8F0', fontWeight: '600' }}>Role</label>
                <select 
                  className="select" 
                  value={filters.role} 
                  onChange={e => setFilters(prev => ({ ...prev, role: e.target.value }))}
                  style={{ color: '#E8F1F8', backgroundColor: '#0e2238', border: '1px solid rgba(255, 255, 255, 0.22)' }}
                >
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                </select>
              </div>
              <div className="stack">
                <label style={{ color: '#E2E8F0', fontWeight: '600' }}>Status</label>
                <select 
                  className="select" 
                  value={filters.status} 
                  onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  style={{ color: '#E8F1F8', backgroundColor: '#0e2238', border: '1px solid rgba(255, 255, 255, 0.22)' }}
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="stack">
                <label style={{ color: '#E2E8F0', fontWeight: '600' }}>Search</label>
                <input 
                  className="input" 
                  value={filters.search} 
                  onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Search by name, email, or village"
                  style={{ color: '#E8F1F8', backgroundColor: '#0e2238', border: '1px solid rgba(255, 255, 255, 0.22)' }}
                />
              </div>
            </div>
          </div>

          {/* Users List */}
          <div className="card" style={{ marginTop: 16 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ color: '#E8F1F8' }}>👤 Users ({filteredUsers.length})</h3>
            </div>

            {filteredUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
                <h3 style={{ color: '#E8F1F8' }}>No users found</h3>
                <p style={{ color: '#94A3B8' }}>Try adjusting your filters or add a new user.</p>
              </div>
            ) : (
              <div className="table">
                <div className="row table-header-row" style={{ fontWeight: 'bold', background: 'rgba(255, 255, 255, 0.06)', borderBottom: '1px solid rgba(255, 255, 255, 0.12)', padding: '10px 8px', borderRadius: '6px' }}>
                  <div style={{ width: '200px', color: '#E2E8F0' }}>Name</div>
                  <div style={{ width: '200px', color: '#E2E8F0' }}>Email</div>
                  <div style={{ width: '120px', color: '#E2E8F0' }}>Role</div>
                  <div style={{ width: '150px', color: '#E2E8F0' }}>Location</div>
                  <div style={{ width: '100px', color: '#E2E8F0' }}>Status</div>
                  <div style={{ width: '120px', color: '#E2E8F0' }}>Last Active</div>
                  <div style={{ width: '200px', color: '#E2E8F0' }}>Actions</div>
                </div>
                
                {filteredUsers.map(user => (
                  <div key={user.id} className="row table-row" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', padding: '10px 8px' }}>
                    <div style={{ width: '200px', fontSize: '12px' }}>
                      <div style={{ fontWeight: 'bold', color: '#FFFFFF' }}>{user.name}</div>
                      <div style={{ color: '#94A3B8' }}>{user.phone || 'No phone'}</div>
                    </div>
                    <div style={{ width: '200px', fontSize: '12px', color: '#CBD5E1' }}>
                      {user.email}
                    </div>
                    <div style={{ width: '120px' }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: getRoleColor(user.role),
                        color: '#FFFFFF',
                        fontSize: '10px',
                        fontWeight: 'bold'
                      }}>
                        {user.role.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ width: '150px', fontSize: '12px', color: '#CBD5E1' }}>
                      {user.village ? `${user.village}, ${user.district}` : 'Not specified'}
                    </div>
                    <div style={{ width: '100px' }}>
                      {getStatusBadge(user.isActive !== false && user.is_active !== false)}
                    </div>
                    <div style={{ width: '120px', fontSize: '12px', color: '#CBD5E1' }}>
                      {user.lastActive ? 
                        new Date(user.lastActive).toLocaleDateString() : 
                        'Never'
                      }
                    </div>
                    <div style={{ width: '200px' }}>
                      <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
                        <button 
                          className="btn secondary btn-action-view" 
                          style={{ fontSize: '10px', padding: '4px 8px', backgroundColor: '#1565C0', color: '#FFFFFF', border: 'none' }}
                          onClick={() => setViewingUser(user)}
                          title="View User Info"
                        >
                          👁️ View
                        </button>
                        <button 
                          className="btn secondary btn-action-edit" 
                          style={{ fontSize: '10px', padding: '4px 8px', backgroundColor: '#15803D', color: '#FFFFFF', border: 'none' }}
                          onClick={() => setEditingUser(user)}
                          title="Edit User"
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          className="btn" 
                          style={{ 
                            fontSize: '10px', 
                            padding: '4px 8px',
                            backgroundColor: (user.isActive !== false && user.is_active !== false) ? '#DC2626' : '#15803D',
                            color: '#FFFFFF',
                            border: 'none'
                          }}
                          onClick={() => handleToggleUserStatus(user.id, user.isActive !== false && user.is_active !== false)}
                          title={(user.isActive !== false && user.is_active !== false) ? 'Deactivate' : 'Activate'}
                        >
                          {(user.isActive !== false && user.is_active !== false) ? '🔒' : '🔓'}
                        </button>
                        <button 
                          className="btn btn-action-delete" 
                          style={{ fontSize: '10px', padding: '4px 8px', backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none' }}
                          onClick={() => handleDeleteUser(user.id)}
                          title="Delete User"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Statistics */}
          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ color: '#E8F1F8' }}>📊 User Statistics</h3>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
              <div 
                className="card stat-card" 
                style={{ 
                  textAlign: 'center',
                  background: 'linear-gradient(180deg, #132d4b 0%, #0e2338 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)'
                }}
              >
                <h4 style={{ color: '#CBD5E1' }}>Total Users</h4>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#38BDF8' }}>
                  {users.length}
                </div>
              </div>
              <div 
                className="card stat-card" 
                style={{ 
                  textAlign: 'center',
                  background: 'linear-gradient(180deg, #132d4b 0%, #0e2338 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)'
                }}
              >
                <h4 style={{ color: '#CBD5E1' }}>Active Users</h4>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4ADE80' }}>
                  {users.filter(u => u.isActive !== false && u.is_active !== false).length}
                </div>
              </div>
              <div 
                className="card stat-card" 
                style={{ 
                  textAlign: 'center',
                  background: 'linear-gradient(180deg, #132d4b 0%, #0e2338 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)'
                }}
              >
                <h4 style={{ color: '#CBD5E1' }}>Users</h4>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#38BDF8' }}>
                  {users.filter(u => u.role === 'user').length}
                </div>
              </div>
              <div 
                className="card stat-card" 
                style={{ 
                  textAlign: 'center',
                  background: 'linear-gradient(180deg, #132d4b 0%, #0e2338 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)'
                }}
              >
                <h4 style={{ color: '#CBD5E1' }}>Admins</h4>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#C084FC' }}>
                  {users.filter(u => u.role === 'admin').length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Add User Modal */}
        {showAddUser && (
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-user-modal-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowAddUser(false)
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: isMobile ? '16px' : '24px',
              boxSizing: 'border-box'
            }}
          >
            <style>{`
              .pv-add-user-modal input::placeholder {
                color: #64748B !important;
                opacity: 1;
              }
              .pv-modal-input:focus, .pv-modal-select:focus {
                border-color: #11a36a !important;
                outline: none !important;
                box-shadow: 0 0 0 3px rgba(17, 163, 106, 0.2) !important;
              }
              .pv-btn-close:hover {
                background-color: #0D47A1 !important;
              }
              .pv-btn-close:focus-visible {
                outline: 2px solid #1565C0 !important;
                outline-offset: 2px !important;
              }
              .pv-btn-add:hover:not(:disabled) {
                background-color: #256b2a !important;
              }
              .pv-btn-add:focus-visible {
                outline: 2px solid #2E7D32 !important;
                outline-offset: 2px !important;
              }
              .pv-btn-cancel:hover {
                background-color: #0D47A1 !important;
              }
              .pv-btn-cancel:focus-visible {
                outline: 2px solid #1565C0 !important;
                outline-offset: 2px !important;
              }
            `}</style>
            <div 
              className="pv-add-user-modal"
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                padding: isMobile ? '20px 16px' : '28px 32px',
                maxWidth: '740px',
                width: isMobile ? 'calc(100% - 32px)' : '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxSizing: 'border-box'
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '20px',
                gap: '12px'
              }}>
                <h2 id="add-user-modal-title" style={{ color: '#172033', margin: 0 }}>
                  + Add New User
                </h2>
                <button 
                  type="button"
                  className="pv-btn-close" 
                  onClick={() => setShowAddUser(false)}
                  aria-label="Close"
                  style={{
                    backgroundColor: 'var(--color-primary-blue, #1565C0)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '7px 14px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  <span aria-hidden="true">×</span> Close
                </button>
              </div>

              {error && (
                <div 
                  role="alert"
                  style={{
                    backgroundColor: '#FEF2F2',
                    color: '#991B1B',
                    border: '1px solid #FCA5A5',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span aria-hidden="true" style={{ fontSize: '16px' }}>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: '16px 20px'
                }}>
                  <div>
                    <label htmlFor="add-user-name" style={{ color: '#172033', display: 'block', marginBottom: '6px' }}>
                      Name *
                    </label>
                    <input 
                      id="add-user-name"
                      className="pv-modal-input" 
                      value={newUser.name} 
                      onChange={e => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter full name"
                      required 
                      style={{
                        width: '100%',
                        height: '42px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#172033',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor="add-user-email" style={{ color: '#172033', display: 'block', marginBottom: '6px' }}>
                      Email *
                    </label>
                    <input 
                      id="add-user-email"
                      className="pv-modal-input" 
                      type="email" 
                      value={newUser.email} 
                      onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="name@example.com"
                      required 
                      style={{
                        width: '100%',
                        height: '42px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#172033',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: '16px 20px'
                }}>
                  <div>
                    <label htmlFor="add-user-password" style={{ color: '#172033', display: 'block', marginBottom: '6px' }}>
                      Password *
                    </label>
                    <input 
                      id="add-user-password"
                      className="pv-modal-input" 
                      type="password" 
                      value={newUser.password} 
                      onChange={e => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter secure password"
                      required 
                      style={{
                        width: '100%',
                        height: '42px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#172033',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor="add-user-role" style={{ color: '#172033', display: 'block', marginBottom: '6px' }}>
                      Role *
                    </label>
                    <select 
                      id="add-user-role"
                      className="pv-modal-select" 
                      value={newUser.role} 
                      onChange={e => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                      required
                      style={{
                        width: '100%',
                        height: '42px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#172033',
                        boxSizing: 'border-box',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="user" style={{ color: '#172033', backgroundColor: '#FFFFFF' }}>User</option>
                      <option value="admin" style={{ color: '#172033', backgroundColor: '#FFFFFF' }}>Admin</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="add-user-phone" style={{ color: '#172033', display: 'block', marginBottom: '6px' }}>
                    Phone
                  </label>
                  <input 
                    id="add-user-phone"
                    className="pv-modal-input" 
                    type="tel" 
                    value={newUser.phone} 
                    onChange={e => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                    style={{
                      width: '100%',
                      height: '42px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#172033',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ 
                  display: 'flex', 
                  flexDirection: isMobile ? 'column' : 'row', 
                  gap: '12px', 
                  marginTop: '8px' 
                }}>
                  <button 
                    className="pv-btn-add" 
                    type="submit"
                    disabled={loading}
                    style={{
                      backgroundColor: 'var(--color-primary-green, #2E7D32)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 24px',
                      height: '42px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.7 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    {loading ? 'Adding...' : 'Add User'}
                  </button>
                  <button 
                    className="pv-btn-cancel" 
                    type="button"
                    onClick={() => setShowAddUser(false)}
                    style={{
                      backgroundColor: 'var(--color-primary-blue, #1565C0)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 24px',
                      height: '42px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View User Info Modal */}
        {viewingUser && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.8)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>👤 User Information</h2>
                <button 
                  className="btn secondary" 
                  onClick={() => setViewingUser(null)}
                >
                  ✕ Close
                </button>
              </div>

              <div className="stack" style={{ gap: '20px' }}>
                {/* Profile Photo */}
                <div style={{ textAlign: 'center' }}>
                  {(() => {
                    const photoSrc = getPhotoSource(viewingUser);
                    if (!photoSrc) return null;
                    
                    return (
                      <img 
                        src={photoSrc} 
                        alt="Profile" 
                      style={{
                        width: '150px',
                        height: '150px',
                        borderRadius: '12px',
                        objectFit: 'cover',
                        border: '3px solid #ddd',
                        margin: '0 auto',
                        display: 'block'
                      }}
                      onError={(e) => {
                        console.error('Error loading user photo:', viewingUser.photoUrl)
                        e.target.style.display = 'none'
                        const placeholder = e.target.nextElementSibling
                        if (placeholder) placeholder.style.display = 'flex'
                      }}
                    />
                    );
                  })()}
                  <div style={{
                    width: '150px',
                    height: '150px',
                    borderRadius: '12px',
                    background: '#e0e0e0',
                    display: getPhotoSource(viewingUser) ? 'none' : 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '64px',
                    color: '#999',
                    margin: '0 auto'
                  }}>
                    👤
                  </div>
                  <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>Profile Photo</p>
                </div>

                {/* User Details */}
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="stack">
                    <label style={{ fontWeight: 'bold', color: '#666' }}>Name</label>
                    <div style={{ padding: '10px', background: '#f5f5f5', borderRadius: '6px', fontSize: '14px' }}>
                      {viewingUser.name || 'Not provided'}
                    </div>
                  </div>
                  <div className="stack">
                    <label style={{ fontWeight: 'bold', color: '#666' }}>Email</label>
                    <div style={{ padding: '10px', background: '#f5f5f5', borderRadius: '6px', fontSize: '14px' }}>
                      {viewingUser.email || 'Not provided'}
                    </div>
                  </div>
                  <div className="stack">
                    <label style={{ fontWeight: 'bold', color: '#666' }}>Phone</label>
                    <div style={{ padding: '10px', background: '#f5f5f5', borderRadius: '6px', fontSize: '14px' }}>
                      {viewingUser.phone || 'Not provided'}
                    </div>
                  </div>
                  <div className="stack">
                    <label style={{ fontWeight: 'bold', color: '#666' }}>Role</label>
                    <div style={{ padding: '10px', background: '#f5f5f5', borderRadius: '6px', fontSize: '14px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: getRoleColor(viewingUser.role),
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {viewingUser.role?.toUpperCase() || 'USER'}
                      </span>
                    </div>
                  </div>
                  <div className="stack">
                    <label style={{ fontWeight: 'bold', color: '#666' }}>Status</label>
                    <div style={{ padding: '10px', background: '#f5f5f5', borderRadius: '6px', fontSize: '14px' }}>
                      {getStatusBadge(viewingUser.isActive !== false && viewingUser.is_active !== false)}
                    </div>
                  </div>
                  <div className="stack">
                    <label style={{ fontWeight: 'bold', color: '#666' }}>Language</label>
                    <div style={{ padding: '10px', background: '#f5f5f5', borderRadius: '6px', fontSize: '14px' }}>
                      {viewingUser.language || 'en'}
                    </div>
                  </div>
                </div>

                <div className="stack">
                  <label style={{ fontWeight: 'bold', color: '#666' }}>Region/Location</label>
                  <div style={{ padding: '10px', background: '#f5f5f5', borderRadius: '6px', fontSize: '14px' }}>
                    {viewingUser.region || viewingUser.village ? 
                      `${viewingUser.village || ''}${viewingUser.village && viewingUser.district ? ', ' : ''}${viewingUser.district || ''}${viewingUser.region && !viewingUser.village ? ` - ${viewingUser.region}` : ''}`.trim() || viewingUser.region || 'Not specified' : 
                      'Not specified'}
                  </div>
                </div>

                <div className="stack">
                  <label style={{ fontWeight: 'bold', color: '#666' }}>User ID</label>
                  <div style={{ padding: '10px', background: '#f5f5f5', borderRadius: '6px', fontSize: '12px', fontFamily: '"Times New Roman", Times, serif', wordBreak: 'break-all' }}>
                    {viewingUser.id}
                  </div>
                </div>

                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="stack">
                    <label style={{ fontWeight: 'bold', color: '#666' }}>Created At</label>
                    <div style={{ padding: '10px', background: '#f5f5f5', borderRadius: '6px', fontSize: '14px' }}>
                      {viewingUser.createdAt ? 
                        new Date(viewingUser.createdAt).toLocaleString() : 
                        'Not available'}
                    </div>
                  </div>
                  <div className="stack">
                    <label style={{ fontWeight: 'bold', color: '#666' }}>Last Active</label>
                    <div style={{ padding: '10px', background: '#f5f5f5', borderRadius: '6px', fontSize: '14px' }}>
                      {viewingUser.lastActive ? 
                        new Date(viewingUser.lastActive).toLocaleString() : 
                        'Never'}
                    </div>
                  </div>
                </div>

                {viewingUser.permissions && viewingUser.permissions.length > 0 && (
                  <div className="stack">
                    <label style={{ fontWeight: 'bold', color: '#666' }}>Permissions</label>
                    <div style={{ padding: '10px', background: '#f5f5f5', borderRadius: '6px', fontSize: '14px' }}>
                      {viewingUser.permissions.map((p, i) => (
                        <span key={i} style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          margin: '4px',
                          background: '#e3f2fd',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          {p.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="row" style={{ gap: '12px', marginTop: '10px' }}>
                  <button 
                    className="btn" 
                    onClick={() => {
                      setViewingUser(null)
                      setEditingUser(viewingUser)
                    }}
                  >
                    ✏️ Edit User
                  </button>
                  <button 
                    className="btn secondary" 
                    onClick={() => setViewingUser(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {editingUser && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.8)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>✏️ Edit User</h2>
                <button 
                  className="btn secondary" 
                  onClick={() => setEditingUser(null)}
                >
                  ✕ Close
                </button>
              </div>

              <div className="stack" style={{ gap: '16px' }}>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="stack">
                    <label>Name</label>
                    <input 
                      className="input" 
                      value={editingUser.name} 
                      onChange={e => setEditingUser(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="stack">
                    <label>Email</label>
                    <input 
                      className="input" 
                      type="email" 
                      value={editingUser.email} 
                      onChange={e => setEditingUser(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="stack">
                    <label>Phone</label>
                    <input 
                      className="input" 
                      type="tel" 
                      value={editingUser.phone || ''} 
                      onChange={e => setEditingUser(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div className="stack">
                    <label>Role</label>
                    <select 
                      className="select" 
                      value={editingUser.role} 
                      onChange={e => setEditingUser(prev => ({ ...prev, role: e.target.value }))}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>


                <div className="stack">
                  <label>Permissions</label>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                    {getRolePermissions(editingUser.role).map(permission => (
                      <label key={permission} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="checkbox" 
                          checked={editingUser.permissions?.includes(permission) || false}
                          onChange={e => {
                            const permissions = editingUser.permissions || []
                            if (e.target.checked) {
                              setEditingUser(prev => ({ 
                                ...prev, 
                                permissions: [...permissions, permission] 
                              }))
                            } else {
                              setEditingUser(prev => ({ 
                                ...prev, 
                                permissions: permissions.filter(p => p !== permission) 
                              }))
                            }
                          }}
                        />
                        <span style={{ fontSize: '12px' }}>{permission.replace(/_/g, ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="row" style={{ gap: '12px' }}>
                  <button 
                    className="btn" 
                    onClick={() => handleUpdateUser(editingUser.id, editingUser)}
                  >
                    Update User
                  </button>
                  <button 
                    className="btn secondary" 
                    onClick={() => setEditingUser(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

