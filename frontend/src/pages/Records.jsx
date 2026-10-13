import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { QRCodeCanvas } from 'qrcode.react'
import ErrorBanner from '../components/ErrorBanner.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'

export default function Records() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [breed, setBreed] = useState('')
  const [loc, setLoc] = useState('')
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [verificationModal, setVerificationModal] = useState(null)
  const [verifyingId, setVerifyingId] = useState(null)
  const [selectedAnimal, setSelectedAnimal] = useState(null)
  const [editForm, setEditForm] = useState({ healthStatus: '', vaccinationStatus: '', weight: '', ownerName: '', location: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editMessage, setEditMessage] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const openAnimalModal = (animal) => {
    setSelectedAnimal(animal)
    setEditForm({
      healthStatus: animal.healthStatus || animal.health_status || 'healthy',
      vaccinationStatus: animal.vaccinationStatus || animal.vaccination_status || 'unknown',
      weight: animal.weight !== null && animal.weight !== undefined ? animal.weight : '',
      ownerName: animal.ownerName || animal.owner_name || '',
      location: animal.location || ''
    })
    setEditMessage('')
  }

  const saveAnimalUpdates = async () => {
    if (!selectedAnimal) return
    setSavingEdit(true)
    setEditMessage('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/animals/${encodeURIComponent(selectedAnimal.id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      })
      const data = await res.json()
      if (res.ok) {
        setEditMessage('✅ Record updated successfully!')
        setItems(prev => prev.map(a => a.id === selectedAnimal.id ? { ...a, ...data } : a))
        setSelectedAnimal(prev => ({ ...prev, ...data }))
        setTimeout(() => setEditMessage(''), 3000)
      } else {
        setEditMessage(`❌ ${data.error || 'Failed to update record'}`)
      }
    } catch (err) {
      setEditMessage(`❌ Error: ${err.message}`)
    } finally {
      setSavingEdit(false)
    }
  }

  const deleteAnimalRecord = async (animalId) => {
    if (!window.confirm('Are you sure you want to delete this animal record? This action will be cryptographically audited.')) {
      return
    }
    setDeletingId(animalId)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/animals/${encodeURIComponent(animalId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        setItems(prev => prev.filter(a => a.id !== animalId))
        if (selectedAnimal && selectedAnimal.id === animalId) {
          setSelectedAnimal(null)
        }
        alert('Animal record deleted successfully.')
      } else {
        alert(data.error || 'Failed to delete animal record')
      }
    } catch (err) {
      alert('Delete error: ' + err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const downloadQRCode = (animalId) => {
    const canvas = document.getElementById(`modal-qr-${animalId}`)
    if (!canvas) return
    const pngUrl = canvas.toDataURL('image/png')
    const downloadLink = document.createElement('a')
    downloadLink.href = pngUrl
    downloadLink.download = `pashuvision-animal-${animalId}-qr.png`
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
  }

  const verifyRecord = async (animalId) => {
    setVerifyingId(animalId)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/blockchain/animal/${encodeURIComponent(animalId)}/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setVerificationModal(data)
    } catch (err) {
      alert('Verification request failed: ' + err.message)
    } finally {
      setVerifyingId(null)
    }
  }

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Helper function to format age (normalized)
  const formatAge = (ageMonths) => {
    if (ageMonths === null || ageMonths === undefined || ageMonths === '') return '—'
    const num = Number(ageMonths)
    if (isNaN(num) || num <= 0) return '—'
    const years = Math.floor(num / 12)
    const months = num % 12
    if (years === 0) return `${months} ${months === 1 ? 'month' : 'months'}`
    if (months === 0) return `${years} ${years === 1 ? 'year' : 'years'}`
    return `${years} ${years === 1 ? 'year' : 'years'} ${months} ${months === 1 ? 'month' : 'months'}`
  }

  useEffect(() => {
    loadRecords()
  }, [])

  const loadRecords = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setError('Login required')
      setLoading(false)
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      const res = await fetch('/api/animals', {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      const data = await res.json().catch(() => ({}))
      
      if (!res.ok) {
        throw new Error(data.error || `Failed to load records (${res.status})`)
      }
      
      const recordsArray = Array.isArray(data) ? data : []
      console.log(`📊 Loaded ${recordsArray.length} records from API`)
      setItems(recordsArray)

      // Handle ?id=... query parameter from QR scanner or links
      const urlParams = new URLSearchParams(window.location.search)
      const targetId = urlParams.get('id')
      if (targetId) {
        const found = recordsArray.find(a => String(a.id) === String(targetId))
        if (found) {
          openAnimalModal(found)
        } else {
          // Direct fetch if not in the recent list
          fetch(`/api/animals/${encodeURIComponent(targetId)}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
            .then(r => r.json().then(d => ({ status: r.status, data: d })))
            .then(({ status, data: animalData }) => {
              if (status === 200 && animalData.id) {
                openAnimalModal(animalData)
              } else if (status === 404) {
                setError(`Animal record not found (404): Animal with ID '${targetId}' was not found or has been deleted.`)
              } else if (status === 403) {
                setError(`Access restricted (403): You do not have permission to view animal '${targetId}'.`)
              } else {
                setError(animalData.error || `Could not find animal '${targetId}'.`)
              }
            })
            .catch(err => {
              setError(`Network error looking up animal '${targetId}': ${err.message}`)
            })
        }
      }
    } catch (err) {
      const errorMsg = err.message || 'Failed to load records'
      setError(errorMsg)
      console.error('Load records error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getUserName = (record) => {
    // Use createdByName from the API response
    if (record && record.createdByName) {
      return record.createdByName
    }
    return null
  }

  const filtered = useMemo(() => {
    return items.filter(it => {
      const matchesQ = !q || JSON.stringify(it).toLowerCase().includes(q.toLowerCase())
      const matchesBreed = !breed || (it.predictedBreed || '').toLowerCase().includes(breed.toLowerCase())
      const matchesLoc = !loc || (it.location || '').toLowerCase().includes(loc.toLowerCase())
      return matchesQ && matchesBreed && matchesLoc
    })
  }, [items, q, breed, loc])

  const exportCsv = () => {
    const rows = [
      ['id','breed','owner','location','ageMonths','status','gpsLat','gpsLng','capturedAt']
    ]
    filtered.forEach(it => rows.push([
      it.id,
      it.predictedBreed || '',
      it.ownerName || '',
      it.location || '',
      it.ageMonths ?? '',
      it.status || '',
      it.gps?.lat ?? '',
      it.gps?.lng ?? '',
      it.capturedAt || ''
    ]))
    const csv = rows.map(r => r.map(v => String(v).replaceAll('"','""')).map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'animals.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Unique breeds and locations for compact filter dropdowns
  const uniqueBreeds = useMemo(() => {
    const set = new Set()
    items.forEach(it => {
      const b = it.predictedBreed || it.breed
      if (b && typeof b === 'string' && b.trim()) set.add(b.trim())
    })
    return Array.from(set).sort()
  }, [items])

  const uniqueLocations = useMemo(() => {
    const set = new Set()
    items.forEach(it => {
      if (it.location && typeof it.location === 'string' && it.location.trim()) set.add(it.location.trim())
    })
    return Array.from(set).sort()
  }, [items])

  const hasFilters = Boolean(q || breed || loc)

  const resetFilters = () => {
    setQ('')
    setBreed('')
    setLoc('')
  }

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  }, [])

  const canModerate = currentUser && currentUser.role === 'admin'
  const checkCanEdit = (record) => {
    if (!currentUser) return false
    if (currentUser.role === 'admin') return true
    return currentUser.role === 'user' && (record.createdBy === currentUser.id || !record.createdBy)
  }

  const handleModerate = async (animalId, action) => {
    const token = localStorage.getItem('token')
    try {
      const r = await fetch(`/api/animals/${encodeURIComponent(animalId)}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        throw new Error(data.error || `Action failed (${r.status})`)
      }
      const updated = data.animal || data
      setItems(prev => prev.map(x => x.id === updated.id ? updated : x))
      alert(`✅ Record ${action === 'approve' ? 'approved' : 'rejected'} successfully`)
    } catch (e) {
      alert(`❌ ${e.message || 'Action failed'}`)
      console.error('Action error:', e)
    }
  }

  return (
    <Layout>
      <div className="container">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ margin: 0, color: '#172033' }}>📋 Animal Records</h1>
          <button 
            className="btn secondary" 
            onClick={loadRecords}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFFFF', color: '#172033', border: '1px solid #CBD5E1' }}
          >
            🔄 {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        
        <ErrorBanner error={error} onDismiss={() => setError('')} />
        
        {loading && <LoadingSpinner message="Loading records..." />}
        <div className="card" style={{ marginBottom: 12, background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
          <div className="grid" style={{ 
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
            gap: '10px'
          }}>
            <input className="input" placeholder="Search" value={q} onChange={e => setQ(e.target.value)} style={{ fontSize: isMobile ? '16px' : '14px', padding: isMobile ? '12px' : '8px', background: '#FFFFFF', color: '#172033', border: '1px solid #CBD5E1' }} />
            <input className="input" placeholder="Filter by breed" value={breed} onChange={e => setBreed(e.target.value)} style={{ fontSize: isMobile ? '16px' : '14px', padding: isMobile ? '12px' : '8px', background: '#FFFFFF', color: '#172033', border: '1px solid #CBD5E1' }} />
            <input className="input" placeholder="Filter by location" value={loc} onChange={e => setLoc(e.target.value)} style={{ fontSize: isMobile ? '16px' : '14px', padding: isMobile ? '12px' : '8px', background: '#FFFFFF', color: '#172033', border: '1px solid #CBD5E1' }} />
          </div>
          <div className="row" style={{ marginTop: 10, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
            <button className="btn" onClick={exportCsv} style={{ 
              fontSize: isMobile ? '14px' : '13px',
              padding: isMobile ? '12px 16px' : '8px 12px',
              minHeight: isMobile ? '44px' : '36px'
            }}>Export CSV</button>
          </div>
        </div>
        
        {/* Desktop Table View */}
        {!isMobile && (
          <div className="card" style={{ 
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            msOverflowStyle: '-ms-autohiding-scrollbar',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0'
          }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse', 
              minWidth: '800px',
              fontSize: window.innerWidth <= 1024 ? '12px' : '14px'
            }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ width: '60px', padding: '8px', textAlign: 'left', fontWeight: 'bold', color: '#172033' }}>Sr No</th>
                <th style={{ width: '120px', padding: '8px', textAlign: 'left', fontWeight: 'bold', color: '#172033' }}>Date</th>
                <th style={{ width: '150px', padding: '8px', textAlign: 'left', fontWeight: 'bold', color: '#172033' }}>Owner</th>
                <th style={{ width: '150px', padding: '8px', textAlign: 'left', fontWeight: 'bold', color: '#172033' }}>Scanned By</th>
                <th style={{ width: '200px', padding: '8px', textAlign: 'left', fontWeight: 'bold', color: '#172033' }}>Location</th>
                <th style={{ width: '150px', padding: '8px', textAlign: 'left', fontWeight: 'bold', color: '#172033' }}>Breed</th>
                <th style={{ width: '100px', padding: '8px', textAlign: 'left', fontWeight: 'bold', color: '#172033' }}>Age</th>
                <th style={{ width: '100px', padding: '8px', textAlign: 'left', fontWeight: 'bold', color: '#172033' }}>Status</th>
                <th style={{ width: '250px', padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#172033' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
            
            {filtered.map((it, index) => {
                  const user = JSON.parse(localStorage.getItem('user') || 'null')
                  const canModerate = user && user.role === 'admin'
                  const canEdit = user && (user.role === 'admin' || (user.role === 'user' && (it.createdBy === user.id || !it.createdBy)))
                  const token = localStorage.getItem('token')
              
                  const act = async (path) => {
                    try {
                      const r = await fetch(`/api/animals/${it.id}/${path}`, { 
                        method: 'POST', 
                        headers: { Authorization: `Bearer ${token}` } 
                      })
                      
                      const data = await r.json().catch(() => ({}))
                      
                      if (!r.ok) {
                        throw new Error(data.error || `Action failed (${r.status})`)
                      }
                      
                      const updated = data.animal || data
                      setItems(prev => prev.map(x => x.id === updated.id ? updated : x))
                      alert(`✅ Record ${path === 'approve' ? 'approved' : 'rejected'} successfully`)
                    } catch (e) {
                      alert(`❌ ${e.message || 'Action failed'}`)
                      console.error('Action error:', e)
                    }
                  }
              
                  return (
                <tr key={it.id} style={{ 
                  backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                  borderBottom: '1px solid #F1F5F9'
                }}>
                  <td style={{ width: '60px', padding: '8px', fontSize: '12px', fontWeight: 'bold', color: '#666666' }}>
                    {index + 1}
                  </td>
                  <td style={{ width: '120px', padding: '8px', fontSize: '12px', color: '#334155' }}>
                    {it.capturedAt ? new Date(it.capturedAt).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ width: '150px', padding: '8px', fontSize: '12px', fontWeight: 'bold', color: '#172033' }}>
                    {it.ownerName || '—'}
                  </td>
                  <td style={{ width: '150px', padding: '8px', fontSize: '12px' }}>
                    {it.createdBy ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: '500', color: '#172033' }}>
                          {getUserName(it) || 'Unknown User'}
                        </span>
                        <span style={{ fontSize: '11px', color: '#666666' }}>
                          ID: {it.createdBy.slice(0, 8)}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: '#999999' }}>N/A</span>
                    )}
                  </td>
                  <td style={{ width: '200px', padding: '8px', fontSize: '12px', color: '#5B6472' }}>
                    {it.location || '—'}
                  </td>
                  <td style={{ width: '150px', padding: '8px', fontSize: '12px', color: '#172033' }}>
                    {it.predictedBreed || '—'}
                  </td>
                  <td style={{ width: '100px', padding: '8px', fontSize: '12px', color: '#334155' }}>
                    {formatAge(it.ageMonths)}
                  </td>
                  <td style={{ width: '100px', padding: '8px' }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: it.status === 'approved' ? '#4CAF50' : 
                                      it.status === 'rejected' ? '#F44336' : '#FF9800',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}>
                      {it.status?.toUpperCase() || 'PENDING'}
                    </span>
                  </td>
                  <td style={{ width: '250px', padding: '8px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: window.innerWidth <= 1024 ? 'wrap' : 'nowrap' }}>
                      <button 
                        className="btn secondary" 
                        style={{ 
                          fontSize: window.innerWidth <= 1024 ? '11px' : '13px', 
                          padding: window.innerWidth <= 1024 ? '6px 8px' : '8px 12px', 
                          minWidth: window.innerWidth <= 1024 ? '32px' : '36px',
                          height: window.innerWidth <= 1024 ? '32px' : '36px',
                          borderRadius: '6px',
                          border: '2px solid #007bff',
                          background: '#ffffff',
                          color: '#007bff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontWeight: 'bold',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => openAnimalModal(it)}
                        title="View & Edit Details"
                      >
                        👁️
                      </button>
                      <button 
                        className="btn" 
                        style={{ 
                          fontSize: '13px', 
                          padding: '8px 12px', 
                          minWidth: '36px',
                          height: '36px',
                          borderRadius: '6px',
                          background: '#28a745',
                          color: 'white',
                          border: '2px solid #28a745',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontWeight: 'bold',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => openAnimalModal(it)}
                        title="View QR Code"
                      >
                        📱
                      </button>
                      <button 
                        className="btn" 
                        style={{ 
                          fontSize: '13px', 
                          padding: '8px 12px', 
                          minWidth: '36px',
                          height: '36px',
                          borderRadius: '6px',
                          background: '#4f46e5',
                          color: 'white',
                          border: '2px solid #4f46e5',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontWeight: 'bold',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => verifyRecord(it.id)}
                        title="Verify Cryptographic Integrity"
                      >
                        {verifyingId === it.id ? '⏳' : '🛡️'}
                      </button>
                      {canModerate && it.status !== 'approved' && (
                        <>
                          <button 
                            className="btn" 
                            style={{ 
                              fontSize: '13px', 
                              padding: '8px 12px', 
                              minWidth: '36px',
                              height: '36px',
                              borderRadius: '6px',
                              background: '#28a745',
                              color: 'white',
                              border: '2px solid #28a745',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              fontWeight: 'bold',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              transition: 'all 0.2s ease'
                            }}
                            onClick={() => act('approve')}
                            title="Approve Record"
                          >
                            ✅
                          </button>
                          <button 
                            className="btn" 
                            style={{ 
                              fontSize: '13px', 
                              padding: '8px 12px', 
                              minWidth: '36px',
                              height: '36px',
                              borderRadius: '6px',
                              background: '#dc3545',
                              color: 'white',
                              border: '2px solid #dc3545',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              fontWeight: 'bold',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              transition: 'all 0.2s ease'
                            }}
                            onClick={() => act('reject')}
                            title="Reject Record"
                          >
                            ❌
                          </button>
                        </>
                      )}
                      {canEdit && (
                        <button 
                          className="btn" 
                          style={{ 
                            fontSize: '13px', 
                            padding: '8px 12px', 
                            minWidth: '36px',
                            height: '36px',
                            borderRadius: '6px',
                            background: '#6c757d',
                            color: 'white',
                            border: '2px solid #6c757d',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold'
                          }}
                          onClick={() => deleteAnimalRecord(it.id)}
                          disabled={deletingId === it.id}
                          title="Delete Record"
                        >
                          {deletingId === it.id ? '⏳' : '🗑️'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            </tbody>
          </table>
          </div>
        )}
        
        {/* Mobile Card View */}
        {isMobile && (
          <div className="stack" style={{ gap: '12px' }}>
            {filtered.map((it, index) => {
              const user = JSON.parse(localStorage.getItem('user') || 'null')
              const canModerate = user && user.role === 'admin'
              const canEdit = user && (user.role === 'admin' || (user.role === 'user' && (it.createdBy === user.id || !it.createdBy)))
              const token = localStorage.getItem('token')
              
              const act = async (path) => {
                try {
                  const r = await fetch(`/api/animals/${it.id}/${path}`, { 
                    method: 'POST', 
                    headers: { Authorization: `Bearer ${token}` } 
                  })
                  const data = await r.json().catch(() => ({}))
                  if (!r.ok) throw new Error(data.error || `Action failed (${r.status})`)
                  const updated = data.animal || data
                  setItems(prev => prev.map(x => x.id === updated.id ? updated : x))
                  alert(`✅ Record ${path === 'approve' ? 'approved' : 'rejected'} successfully`)
                } catch (e) {
                  alert(`❌ ${e.message || 'Action failed'}`)
                }
              }
              
              return (
                <div key={it.id} className="card" style={{ 
                  padding: '16px',
                  marginBottom: '12px',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666666', marginBottom: '4px' }}>#{index + 1}</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px', color: '#172033' }}>{it.ownerName || '—'}</div>
                      <div style={{ fontSize: '12px', color: '#666666' }}>
                        {it.capturedAt ? new Date(it.capturedAt).toLocaleDateString() : '—'}
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: it.status === 'approved' ? '#4CAF50' : 
                                      it.status === 'rejected' ? '#F44336' : '#FF9800',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}>
                      {it.status?.toUpperCase() || 'PENDING'}
                    </span>
                  </div>
                  
                  <div style={{ display: 'grid', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: '#666666' }}>Breed:</span>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#172033' }}>{it.predictedBreed || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: '#666666' }}>Location:</span>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#5B6472' }}>{it.location || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: '#666666' }}>Age:</span>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>{formatAge(it.ageMonths)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: '#666666' }}>Scanned By:</span>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#172033' }}>
                        {it.createdBy ? (getUserName(it) || `ID: ${it.createdBy.slice(0, 8)}`) : 'N/A'}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
                    <button 
                      className="btn secondary" 
                      onClick={() => openAnimalModal(it)}
                      style={{ 
                        flex: 1,
                        minWidth: '80px',
                        fontSize: '12px',
                        padding: '10px',
                        minHeight: '40px',
                        border: '2px solid #007bff',
                        background: '#ffffff',
                        color: '#007bff'
                      }}
                    >
                      👁️ View / QR
                    </button>
                    <button 
                      className="btn" 
                      onClick={() => verifyRecord(it.id)}
                      style={{ 
                        flex: 1,
                        minWidth: '80px',
                        fontSize: '12px',
                        padding: '10px',
                        minHeight: '40px',
                        background: '#4f46e5',
                        color: 'white'
                      }}
                      title="Verify Record"
                    >
                      {verifyingId === it.id ? '⏳ Checking...' : '🛡️ Verify'}
                    </button>
                    {canModerate && it.status !== 'approved' && (
                      <>
                        <button 
                          className="btn" 
                          onClick={() => act('approve')}
                          style={{ 
                            flex: 1,
                            minWidth: '80px',
                            fontSize: '12px',
                            padding: '10px',
                            minHeight: '40px',
                            background: '#28a745',
                            color: 'white'
                          }}
                        >
                          ✅ Approve
                        </button>
                        <button 
                          className="btn" 
                          onClick={() => act('reject')}
                          style={{ 
                            flex: 1,
                            minWidth: '80px',
                            fontSize: '12px',
                            padding: '10px',
                            minHeight: '40px',
                            background: '#dc3545',
                            color: 'white'
                          }}
                        >
                          ❌ Reject
                        </button>
                      </>
                    )}
                    {canEdit && (
                      <>
                        <button 
                          className="btn" 
                          onClick={() => openAnimalModal(it)}
                          style={{ 
                            flex: 1,
                            minWidth: '80px',
                            fontSize: '12px',
                            padding: '10px',
                            minHeight: '40px',
                            background: '#fd7e14',
                            color: 'white'
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          className="btn" 
                          onClick={() => deleteAnimalRecord(it.id)}
                          disabled={deletingId === it.id}
                          style={{ 
                            flex: 1,
                            minWidth: '80px',
                            fontSize: '12px',
                            padding: '10px',
                            minHeight: '40px',
                            background: '#6c757d',
                            color: 'white'
                          }}
                        >
                          {deletingId === it.id ? '⏳' : '🗑️ Delete'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {/* Verification Details Modal */}
        {verificationModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              overflow: 'hidden'
            }}>
              <div style={{
                background: verificationModal.status === 'VERIFIED'
                  ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                  : verificationModal.status === 'TAMPERED'
                    ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                    : 'linear-gradient(135deg, #4b5563 0%, #6b7280 100%)',
                color: 'white',
                padding: '20px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>🛡️</span>
                  <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem' }}>
                    Tamper-Evident Record Verification
                  </h3>
                </div>
                <button
                  onClick={() => setVerificationModal(null)}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: 'white',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    fontSize: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{ padding: '24px' }}>
                <div style={{
                  padding: '16px',
                  borderRadius: '12px',
                  marginBottom: '20px',
                  backgroundColor: verificationModal.status === 'VERIFIED' ? '#ecfdf5' : verificationModal.status === 'TAMPERED' ? '#fef2f2' : '#f3f4f6',
                  border: `1px solid ${verificationModal.status === 'VERIFIED' ? '#a7f3d0' : verificationModal.status === 'TAMPERED' ? '#fecaca' : '#e5e7eb'}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '20px' }}>
                      {verificationModal.status === 'VERIFIED' ? '✅' : verificationModal.status === 'TAMPERED' ? '🚨' : '⚠️'}
                    </span>
                    <strong style={{
                      fontSize: '1.1rem',
                      color: verificationModal.status === 'VERIFIED' ? '#065f46' : verificationModal.status === 'TAMPERED' ? '#991b1b' : '#374151'
                    }}>
                      STATUS: {verificationModal.status}
                    </strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#4b5563' }}>
                    {verificationModal.message || (verificationModal.status === 'TAMPERED' ? 'Record attributes do not match stored cryptographic audit hash!' : '')}
                  </p>
                </div>

                {verificationModal.status === 'TAMPERED' && verificationModal.tamperDetails?.modifiedFields?.length > 0 && (
                  <div style={{
                    marginBottom: '16px',
                    padding: '12px',
                    backgroundColor: '#fff1f2',
                    border: '1px solid #ffe4e6',
                    borderRadius: '8px'
                  }}>
                    <strong style={{ color: '#9f1239', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                      Detected Field Modifications:
                    </strong>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#881337' }}>
                      {verificationModal.tamperDetails.modifiedFields.map((f, i) => (
                        <li key={i}>
                          <strong>{f.field}:</strong> Stored: <code>{String(f.storedValue)}</code> → Current: <code>{String(f.currentValue)}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: '#6b7280', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Animal ID</span>
                    <span style={{ fontFamily: '"Times New Roman", Times, serif', fontWeight: 'bold' }}>{verificationModal.animalId}</span>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Current Record SHA-256 Hash</span>
                    <span style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '11px', wordBreak: 'break-all', background: '#f8fafc', padding: '4px 6px', borderRadius: '4px', display: 'block' }}>
                      {verificationModal.currentHash || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Anchored Audit Chain Hash</span>
                    <span style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '11px', wordBreak: 'break-all', background: '#f8fafc', padding: '4px 6px', borderRadius: '4px', display: 'block' }}>
                      {verificationModal.storedHash || 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '6px' }}>
                    <div>
                      <span style={{ color: '#6b7280', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Last Operation</span>
                      <strong>{verificationModal.lastOperation || 'N/A'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#6b7280', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Chain Continuity</span>
                      <strong style={{ color: verificationModal.chainValid ? '#059669' : '#dc2626' }}>
                        {verificationModal.chainValid ? 'Chain Intact' : 'Chain Broken'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '24px', textAlign: 'right' }}>
                  <button
                    onClick={() => setVerificationModal(null)}
                    style={{
                      padding: '8px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#4f46e5',
                      color: 'white',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Animal Details, Health Update, and Deterministic QR Modal */}
        {selectedAnimal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9998,
            padding: '20px'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              maxWidth: '820px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
              overflow: 'hidden'
            }}>
              {/* Modal Header */}
              <div style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                color: 'white',
                padding: '18px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>📋</span>
                  <div>
                    <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>
                      Animal Details &amp; Identification
                    </h3>
                    <span style={{ fontSize: '12px', opacity: 0.85, fontFamily: '"Times New Roman", Times, serif' }}>
                      ID: {selectedAnimal.id} | Tag: {selectedAnimal.ear_tag || selectedAnimal.earTag || 'N/A'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAnimal(null)}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: 'white',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    fontSize: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Close"
                >
                  ×
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                {editMessage && (
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '14px',
                    backgroundColor: editMessage.startsWith('✅') ? '#ecfdf5' : '#fef2f2',
                    border: `1px solid ${editMessage.startsWith('✅') ? '#a7f3d0' : '#fecaca'}`,
                    color: editMessage.startsWith('✅') ? '#065f46' : '#991b1b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span>{editMessage}</span>
                    <button
                      onClick={() => setEditMessage('')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
                    >
                      ×
                    </button>
                  </div>
                )}

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1.3fr 1fr',
                  gap: '24px'
                }}>
                  {/* Left Column: Information & Edit Form */}
                  <div>
                    <div style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '20px'
                    }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Animal Attributes
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Species</span>
                          <strong>{selectedAnimal.species || 'Cattle'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Breed</span>
                          <strong>{selectedAnimal.breed || 'Unknown'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Gender</span>
                          <strong>{selectedAnimal.gender || 'N/A'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Age</span>
                          <strong>{selectedAnimal.age || selectedAnimal.ageMonths ? `${selectedAnimal.age || selectedAnimal.ageMonths} mo` : 'N/A'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Owner</span>
                          <span>{selectedAnimal.owner_name || selectedAnimal.ownerName || 'N/A'}</span>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Registered</span>
                          <span>{selectedAnimal.created_at ? new Date(selectedAnimal.created_at).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Edit Health & Vaccination */}
                    <div style={{
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '12px',
                      padding: '16px'
                    }}>
                      <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>💉</span> Update Health &amp; Vaccination
                      </h4>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#374151', marginBottom: '4px' }}>
                            Health Status:
                          </label>
                          <select
                            value={editForm.healthStatus}
                            onChange={(e) => setEditForm(prev => ({ ...prev, healthStatus: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontSize: '13px',
                              backgroundColor: 'white'
                            }}
                          >
                            <option value="healthy">Healthy</option>
                            <option value="sick">Sick / Unwell</option>
                            <option value="quarantine">Quarantine</option>
                            <option value="recovered">Recovered</option>
                            <option value="under_observation">Under Observation</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#374151', marginBottom: '4px' }}>
                            Vaccination Status:
                          </label>
                          <select
                            value={editForm.vaccinationStatus}
                            onChange={(e) => setEditForm(prev => ({ ...prev, vaccinationStatus: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontSize: '13px',
                              backgroundColor: 'white'
                            }}
                          >
                            <option value="vaccinated">Vaccinated (Up to date)</option>
                            <option value="pending">Pending</option>
                            <option value="overdue">Overdue</option>
                            <option value="partially_vaccinated">Partially Vaccinated</option>
                            <option value="unknown">Unknown</option>
                          </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#374151', marginBottom: '4px' }}>
                              Weight (kg):
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              placeholder="e.g. 350"
                              value={editForm.weight}
                              onChange={(e) => setEditForm(prev => ({ ...prev, weight: e.target.value }))}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '13px'
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#374151', marginBottom: '4px' }}>
                              Location / Pen:
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Barn A"
                              value={editForm.location}
                              onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '13px'
                              }}
                            />
                          </div>
                        </div>

                        <button
                          onClick={saveAnimalUpdates}
                          disabled={savingEdit}
                          style={{
                            marginTop: '8px',
                            padding: '10px 16px',
                            borderRadius: '8px',
                            backgroundColor: savingEdit ? '#94a3b8' : '#16a34a',
                            color: 'white',
                            border: 'none',
                            fontWeight: 'bold',
                            fontSize: '13px',
                            cursor: savingEdit ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          {savingEdit ? 'Saving...' : '💾 Save Health/Vaccination Record'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Deterministic QR & Verification */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '20px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center'
                    }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#334155' }}>
                        Deterministic QR Code
                      </h4>

                      <div style={{
                        padding: '12px',
                        background: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        display: 'inline-block'
                      }}>
                        <QRCodeCanvas
                          id={`modal-qr-${selectedAnimal.id}`}
                          value={JSON.stringify({
                            protocol: 'pashuvision',
                            version: '1.0',
                            type: 'animal',
                            id: selectedAnimal.id,
                            earTag: selectedAnimal.ear_tag || selectedAnimal.earTag || ''
                          })}
                          size={180}
                          level="H"
                          includeMargin={true}
                        />
                      </div>

                      <div style={{ marginTop: '10px', fontSize: '11px', color: '#64748b' }}>
                        🔒 <strong>Privacy Protected:</strong> Contains only verified animal identifier. No personal owner data.
                      </div>

                      <button
                        onClick={() => downloadQRCode(selectedAnimal.id)}
                        style={{
                          marginTop: '12px',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          backgroundColor: '#0284c7',
                          color: 'white',
                          border: 'none',
                          fontWeight: 'bold',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        📥 Download QR (PNG)
                      </button>
                    </div>

                    {/* Verification & Record Actions */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <button
                        onClick={() => verifyRecord(selectedAnimal.id)}
                        disabled={verifyingId === selectedAnimal.id}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '8px',
                          backgroundColor: '#4338ca',
                          color: 'white',
                          border: 'none',
                          fontWeight: 'bold',
                          fontSize: '13px',
                          cursor: verifyingId === selectedAnimal.id ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>🛡️</span>
                        {verifyingId === selectedAnimal.id ? 'Verifying Integrity...' : 'Verify Blockchain Hash'}
                      </button>

                      <button
                        onClick={() => deleteAnimalRecord(selectedAnimal.id)}
                        disabled={deletingId === selectedAnimal.id}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          backgroundColor: '#fee2e2',
                          color: '#b91c1c',
                          border: '1px solid #fecaca',
                          fontWeight: 'bold',
                          fontSize: '12px',
                          cursor: deletingId === selectedAnimal.id ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>🗑️</span>
                        {deletingId === selectedAnimal.id ? 'Deleting...' : 'Delete Animal Record'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '14px 24px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                display: 'flex',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => setSelectedAnimal(null)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: 'white',
                    color: '#334155',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}


