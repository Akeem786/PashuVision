import { useState, useEffect } from 'react'
import Layout from '../components/Layout.jsx'

export default function AdminBreedImages() {
  const [breeds, setBreeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedBreed, setSelectedBreed] = useState(null)
  const [speciesFilter, setSpeciesFilter] = useState('all') // 'all', 'cattle', 'buffalo', etc.
  const [sidebarView, setSidebarView] = useState(null) // 'breed-details', 'image-details', null
  const [previewImage, setPreviewImage] = useState(null) // For image preview modal
  const [detailedBreed, setDetailedBreed] = useState(null) // For detailed breed modal
  const [user, setUser] = useState(null) // Current user info
  const [expandedBreeds, setExpandedBreeds] = useState(new Set()) // Track which breeds have details expanded
  const [expandedImageBreeds, setExpandedImageBreeds] = useState(new Set()) // Track which breeds have images expanded
  const [selectedImage, setSelectedImage] = useState(null) // Track selected image with full details
  const [animals, setAnimals] = useState([]) // Animal records for image metadata
  const [users, setUsers] = useState([]) // Users for name lookup

  useEffect(() => {
    loadBreeds()
    loadAnimals()
    loadUsers()
    // Get current user info
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUser(payload)
      } catch {
        // Invalid token
      }
    }
  }, [])

  const loadUsers = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.ok) {
        const data = await res.json()
        const usersList = Array.isArray(data) ? data : (data.users || [])
        setUsers(usersList)
      }
    } catch (err) {
      console.error('Error loading users:', err)
    }
  }

  const loadAnimals = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    
    try {
      const res = await fetch('/api/animals', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.ok) {
        const data = await res.json()
        const animalsList = Array.isArray(data) ? data : (data.animals || [])
        setAnimals(animalsList)
      }
    } catch (err) {
      console.error('Error loading animals:', err)
    }
  }

  const loadBreeds = async () => {
    const token = localStorage.getItem('token')
    if (!token) return setError('Login required')
    
    setLoading(true)
    setError('')
    
    try {
      const res = await fetch('/api/admin/breeds', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to load breeds (${res.status})`)
      }
      
      const data = await res.json()
      const breedsList = Array.isArray(data) ? data : (data.breeds || [])
      setBreeds(breedsList)
    } catch (err) {
      setError(err.message || 'Failed to load breeds')
      setBreeds([])
      console.error('Error loading breeds:', err)
    } finally {
      setLoading(false)
    }
  }

  const downloadImage = async (imageUrl, breedName, index = '') => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${breedName}_image${index ? `_${index}` : ''}.jpg`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(`Failed to download image: ${err.message}`)
    }
  }

  // Get unique species/types from breeds
  const uniqueSpecies = ['all', ...new Set(breeds.map(b => b.species || 'unknown').filter(s => s))]
  
  const filteredBreeds = breeds.filter(breed => {
    // Filter by species/breed type
    if (speciesFilter !== 'all') {
      const breedSpecies = breed.species || 'unknown'
      // Normalize species names for filtering
      const normalizedFilter = speciesFilter.toLowerCase()
      const normalizedSpecies = breedSpecies.toLowerCase()
      
      if (normalizedFilter === 'cattle') {
        return normalizedSpecies.includes('cattle') || normalizedSpecies === 'cattle'
      } else if (normalizedFilter === 'buffalo') {
        return normalizedSpecies.includes('buffalo') || normalizedSpecies === 'buffalo'
      }
      return normalizedSpecies === normalizedFilter
    }
    return true
  })

  const cattleBreeds = breeds.filter(b => {
    const species = (b.species || '').toLowerCase()
    return species.includes('cattle') || species === 'cattle'
  })
  
  const buffaloBreeds = breeds.filter(b => {
    const species = (b.species || '').toLowerCase()
    return species.includes('buffalo') || species === 'buffalo'
  })
  
  const breedsWithImages = breeds.filter(b => b.image_url || (b.referenceImages && b.referenceImages.length > 0))

  return (
    <Layout>
      <div className="container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
        <div className="grid" style={{ gridTemplateColumns: sidebarView ? '1fr 350px' : '1fr', gap: '20px', alignItems: 'start' }}>
          <div className="card pv-breed-images">
            <style>{`
              .pv-breed-images h1 {
                color: #E8F1F8 !important;
              }
              .pv-breed-images h3 {
                color: #E8F1F8 !important;
              }
              .pv-breed-images .stat-card {
                background: linear-gradient(180deg, #132d4b 0%, #0e2338 100%) !important;
                border: 1px solid rgba(255, 255, 255, 0.12) !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25) !important;
              }
              .pv-breed-images .stat-card h4 {
                color: #CBD5E1 !important;
              }
              .pv-breed-images .breed-item-card {
                background: linear-gradient(180deg, #132d4b 0%, #0e2338 100%) !important;
                border: 1px solid rgba(255, 255, 255, 0.12) !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25) !important;
              }
              .pv-breed-images .breed-item-card:hover {
                border-color: rgba(255, 255, 255, 0.22) !important;
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35) !important;
              }
              .pv-breed-images .breed-item-card h3 {
                color: #FFFFFF !important;
              }
              .pv-breed-images .btn-refresh {
                background-color: #1565C0 !important;
                color: #FFFFFF !important;
                border: none !important;
              }
              .pv-breed-images .btn-refresh:hover {
                background-color: #0D47A1 !important;
              }
            `}</style>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h1 style={{ color: '#E8F1F8' }}>🖼️ Breed Images Management</h1>
            <button 
              className="btn secondary btn-refresh" 
              onClick={loadBreeds}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1565C0', color: '#FFFFFF', border: 'none' }}
            >
              🔄 Refresh
            </button>
          </div>

          {error && (
            <div style={{
              padding: '12px',
              marginBottom: 16, 
              backgroundColor: error.startsWith('✅') ? '#e8f5e9' : '#ffebee', 
              border: error.startsWith('✅') ? '2px solid #4CAF50' : '2px solid #f44336',
              color: error.startsWith('✅') ? '#2e7d32' : '#c62828',
              borderRadius: '8px'
            }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{error.startsWith('✅') ? '✅ Success:' : '❌ Error:'}</strong> {error.replace(/^✅\s*/, '')}
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
              <div>⏳ Loading breeds...</div>
            </div>
          )}

          {/* Statistics */}
          <div className="card stat-card" style={{ marginBottom: '20px', background: 'linear-gradient(180deg, #132d4b 0%, #0e2338 100%)', border: '1px solid rgba(255, 255, 255, 0.12)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)' }}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ color: '#CBD5E1' }}>Total Breeds</h4>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#38BDF8' }}>
                  {breeds.length}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ color: '#CBD5E1' }}>Cattle</h4>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4ADE80' }}>
                  {cattleBreeds.length}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ color: '#CBD5E1' }}>Buffalo</h4>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#FB923C' }}>
                  {buffaloBreeds.length}
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="card" style={{ marginBottom: '20px', background: 'linear-gradient(180deg, #132d4b 0%, #0e2338 100%)', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <div>
              <label style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block', color: '#E2E8F0' }}>Filter by Breed Type:</label>
              <div className="row" style={{ gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  className={speciesFilter === 'all' ? 'btn' : 'btn secondary'}
                  onClick={() => setSpeciesFilter('all')}
                  style={speciesFilter === 'all' ? {
                    backgroundColor: '#15803D',
                    color: '#FFFFFF',
                    border: 'none',
                    boxShadow: '0 2px 6px rgba(21, 128, 61, 0.4)'
                  } : {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: '#86EFAC',
                    border: '1px solid rgba(134, 239, 172, 0.4)'
                  }}
                >
                  All Types ({breeds.length})
                </button>
                <button
                  className={speciesFilter === 'cattle' ? 'btn' : 'btn secondary'}
                  onClick={() => setSpeciesFilter('cattle')}
                  style={speciesFilter === 'cattle' ? {
                    backgroundColor: '#1565C0',
                    color: '#FFFFFF',
                    border: 'none',
                    boxShadow: '0 2px 6px rgba(21, 101, 192, 0.4)'
                  } : {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: '#93C5FD',
                    border: '1px solid rgba(147, 197, 253, 0.4)'
                  }}
                >
                  Cattle ({cattleBreeds.length})
                </button>
                <button
                  className={speciesFilter === 'buffalo' ? 'btn' : 'btn secondary'}
                  onClick={() => setSpeciesFilter('buffalo')}
                  style={speciesFilter === 'buffalo' ? {
                    backgroundColor: '#1565C0',
                    color: '#FFFFFF',
                    border: 'none',
                    boxShadow: '0 2px 6px rgba(21, 101, 192, 0.4)'
                  } : {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: '#93C5FD',
                    border: '1px solid rgba(147, 197, 253, 0.4)'
                  }}
                >
                  Buffalo ({buffaloBreeds.length})
                </button>
              </div>
            </div>
          </div>

          {/* Breeds List */}
          <div className="card" style={{ padding: '28px', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: '0 0 28px 0', fontSize: '26px', fontWeight: '600', color: '#E8F1F8', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '30px' }}>📷</span>
              Breed Images ({filteredBreeds.length})
            </h3>

            {filteredBreeds.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                No breeds found
              </div>
            ) : (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
                {filteredBreeds.map(breed => {
                  const hasImage = breed.image_url || (breed.referenceImages && breed.referenceImages.length > 0)
                  const images = breed.image_url 
                    ? [breed.image_url] 
                    : (breed.referenceImages || [])
                  
                  return (
                    <div 
                      key={breed.id} 
                      className="card breed-item-card"
                      style={{ 
                        background: 'linear-gradient(180deg, #132d4b 0%, #0e2338 100%)',
                        border: selectedBreed?.id === breed.id ? '2px solid #38BDF8' : '1px solid rgba(255, 255, 255, 0.12)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                      }}
                      onClick={() => setDetailedBreed(breed)}
                    >
                      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0, color: '#FFFFFF' }}>{breed.name}</h3>
                        <div className="row" style={{ gap: '8px', alignItems: 'center' }}>
                          {hasImage && (
                            <span style={{ 
                              fontSize: '13px', 
                              padding: '6px 14px', 
                              backgroundColor: '#15803D', 
                              color: '#FFFFFF', 
                              borderRadius: '20px',
                              fontWeight: '600',
                              boxShadow: '0 2px 6px rgba(21, 128, 61, 0.4)',
                              display: 'inline-block',
                              pointerEvents: 'none',
                              userSelect: 'none'
                            }}>
                              📷 {images.length} image{images.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Breed Details Section - Hidden by default, show on click */}
                      <div style={{ marginBottom: '20px' }}>
                        <button
                          className="btn"
                          style={{ 
                            width: '100%', 
                            fontSize: '14px', 
                            padding: '12px 16px', 
                            marginBottom: '12px',
                            borderRadius: '8px',
                            fontWeight: '500',
                            border: 'none',
                            backgroundColor: '#1565C0',
                            color: '#FFFFFF',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 2px 6px rgba(21, 101, 192, 0.3)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#0D47A1'
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(21, 101, 192, 0.4)'
                            e.currentTarget.style.transform = 'translateY(-2px)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#1565C0'
                            e.currentTarget.style.boxShadow = '0 2px 6px rgba(21, 101, 192, 0.3)'
                            e.currentTarget.style.transform = 'translateY(0)'
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedBreeds(prev => {
                              const newSet = new Set(prev)
                              if (newSet.has(breed.id)) {
                                newSet.delete(breed.id)
                              } else {
                                newSet.add(breed.id)
                              }
                              return newSet
                            })
                          }}
                        >
                          <span style={{ fontSize: '16px' }}>
                            {expandedBreeds.has(breed.id) ? '▼' : '▶'}
                          </span>
                          {expandedBreeds.has(breed.id) ? 'Hide' : 'Show'} Breed Details
                        </button>
                      </div>

                      {/* Breed Details Section - Hidden by default */}
                      {expandedBreeds.has(breed.id) && (
                        <div style={{ marginBottom: '20px' }}>
                          <div style={{ 
                            padding: '24px', 
                            backgroundColor: '#f8f9fa', 
                            borderRadius: '10px',
                            marginBottom: '20px',
                            border: '1px solid #e9ecef',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)'
                          }}>
                            <h4 style={{ 
                              margin: '0 0 20px 0', 
                              fontSize: '18px', 
                              color: '#1976d2', 
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <span style={{ fontSize: '20px' }}>📋</span>
                              Breed Details
                            </h4>
                          
                          {/* Basic Information */}
                          <div style={{ marginBottom: '20px' }}>
                            <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#666', fontWeight: 'bold' }}>Basic Information</h5>
                            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                              <div style={{ 
                                padding: '12px',
                                backgroundColor: 'white',
                                borderRadius: '6px',
                                border: '1px solid #e9ecef'
                              }}>
                                <strong style={{ color: '#495057', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Breed Name</strong>
                                <div style={{ color: '#212529', marginTop: '6px', fontWeight: '500', fontSize: '14px' }}>{breed.name || 'N/A'}</div>
                              </div>
                              <div style={{ 
                                padding: '12px',
                                backgroundColor: 'white',
                                borderRadius: '6px',
                                border: '1px solid #e9ecef'
                              }}>
                                <strong style={{ color: '#495057', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Species</strong>
                                <div style={{ color: '#212529', marginTop: '6px', fontSize: '14px' }}>{breed.species || 'Unknown'}</div>
                              </div>
                              <div style={{ 
                                padding: '12px',
                                backgroundColor: 'white',
                                borderRadius: '6px',
                                border: '1px solid #e9ecef'
                              }}>
                                <strong style={{ color: '#495057', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Origin</strong>
                                <div style={{ color: '#212529', marginTop: '6px', fontSize: '14px' }}>{breed.origin || 'N/A'}</div>
                              </div>
                              <div style={{ 
                                padding: '12px',
                                backgroundColor: 'white',
                                borderRadius: '6px',
                                border: '1px solid #e9ecef'
                              }}>
                                <strong style={{ color: '#495057', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg Weight</strong>
                                <div style={{ color: '#212529', marginTop: '6px', fontSize: '14px' }}>{breed.avgWeight || 'N/A'} {breed.avgWeight ? 'kg' : ''}</div>
                              </div>
                              <div style={{ 
                                padding: '12px',
                                backgroundColor: 'white',
                                borderRadius: '6px',
                                border: '1px solid #e9ecef'
                              }}>
                                <strong style={{ color: '#495057', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rare Breed</strong>
                                <div style={{ color: '#212529', marginTop: '6px' }}>
                                  <span style={{ 
                                    padding: '4px 12px', 
                                    borderRadius: '12px', 
                                    backgroundColor: breed.isRareBreed ? '#FF9800' : '#4CAF50',
                                    color: 'white',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    display: 'inline-block'
                                  }}>
                                    {breed.isRareBreed ? '✓ Yes' : '✗ No'}
                                  </span>
                                </div>
                              </div>
                              <div style={{ 
                                padding: '12px',
                                backgroundColor: 'white',
                                borderRadius: '6px',
                                border: '1px solid #e9ecef'
                              }}>
                                <strong style={{ color: '#495057', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Breed ID</strong>
                                <div style={{ color: '#212529', marginTop: '6px', fontSize: '11px', fontFamily: '"Times New Roman", Times, serif', wordBreak: 'break-all' }}>{breed.id || 'N/A'}</div>
                              </div>
                            </div>
                          </div>

                          {/* Full Description */}
                          {breed.description && (
                            <div style={{ marginBottom: '20px' }}>
                              <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#666', fontWeight: 'bold' }}>Full Description</h5>
                              <div style={{ 
                                color: '#333', 
                                padding: '12px', 
                                backgroundColor: 'white', 
                                borderRadius: '6px',
                                fontSize: '13px', 
                                lineHeight: '1.6',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                              }}>
                                {breed.description}
                              </div>
                            </div>
                          )}

                          {/* Complete Traits/Characteristics */}
                          {breed.traits && breed.traits.length > 0 && (
                            <div style={{ marginBottom: '20px' }}>
                              <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#666', fontWeight: 'bold' }}>Complete Traits & Characteristics</h5>
                              <div style={{ 
                                color: '#333', 
                                padding: '12px', 
                                backgroundColor: 'white', 
                                borderRadius: '6px',
                                fontSize: '13px',
                                lineHeight: '1.6'
                              }}>
                                {Array.isArray(breed.traits) ? (
                                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                    {breed.traits.map((trait, idx) => (
                                      <li key={idx} style={{ marginBottom: '4px' }}>{trait}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div>{breed.traits}</div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Model Prediction Information */}
                          {breed.description && (breed.description.includes('model prediction') || breed.description.includes('AI-detected') || breed.description.includes('confidence')) && (
                            <div style={{ 
                              marginBottom: '20px', 
                              padding: '16px', 
                              backgroundColor: '#e3f2fd', 
                              borderRadius: '8px',
                              border: '2px solid #2196F3'
                            }}>
                              <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1976d2', fontWeight: 'bold' }}>🤖 AI Model Prediction Details</h5>
                              <div style={{ fontSize: '13px', color: '#333', lineHeight: '1.6' }}>
                                <div style={{ marginBottom: '8px' }}>
                                  <strong>Prediction Source:</strong> AI Model Detection
                                </div>
                                {breed.description.includes('confidence') && (
                                  <div style={{ marginBottom: '8px' }}>
                                    <strong>Breed Confidence:</strong> {breed.description.match(/(\d+\.?\d*)% confidence/)?.[0] || 'N/A'}
                                  </div>
                                )}
                                {breed.description.includes('Species Confidence') && (
                                  <div style={{ marginBottom: '8px' }}>
                                    <strong>Species Confidence:</strong> {breed.description.match(/Species Confidence: ([\d.]+%)/)?.[1] || 'N/A'}
                                  </div>
                                )}
                                {breed.description.includes('Crossbreed') && (
                                  <div style={{ marginBottom: '8px' }}>
                                    <strong>Crossbreed Detection:</strong> <span style={{ color: '#FF9800', fontWeight: 'bold' }}>Detected</span>
                                  </div>
                                )}
                                <div style={{ marginTop: '12px', padding: '10px', backgroundColor: 'white', borderRadius: '6px', fontSize: '12px' }}>
                                  <strong>Full Prediction Data:</strong>
                                  <div style={{ marginTop: '6px', fontFamily: '"Times New Roman", Times, serif', whiteSpace: 'pre-wrap' }}>
                                    {breed.description}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Admin Notes */}
                          {breed.notes && (
                            <div style={{ marginBottom: '20px' }}>
                              <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#666', fontWeight: 'bold' }}>📝 Admin Notes</h5>
                              <div style={{ 
                                color: '#333', 
                                padding: '12px', 
                                backgroundColor: '#fff3cd', 
                                borderRadius: '6px',
                                fontSize: '13px', 
                                lineHeight: '1.6',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                              }}>
                                {breed.notes}
                              </div>
                            </div>
                          )}

                          {/* Database Metadata */}
                          <div style={{ 
                            marginTop: '20px', 
                            padding: '12px', 
                            backgroundColor: '#f5f5f5', 
                            borderRadius: '6px',
                            fontSize: '11px',
                            color: '#666'
                          }}>
                            <strong>Database Information:</strong>
                            <div style={{ marginTop: '6px' }}>
                              {breed.createdAt && (
                                <div>Created: {new Date(breed.createdAt).toLocaleString()}</div>
                              )}
                              {breed.updatedAt && (
                                <div>Last Updated: {new Date(breed.updatedAt).toLocaleString()}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      )}

                      {/* Images Section - Separate button outside breed details */}
                      {hasImage && (
                        <div style={{ marginBottom: '20px' }}>
                          <button
                            className="btn"
                            style={{ 
                              width: '100%', 
                              fontSize: '14px', 
                              padding: '12px 16px', 
                              marginBottom: '12px',
                              borderRadius: '8px',
                              fontWeight: '500',
                              border: 'none',
                              backgroundColor: '#1565C0',
                              color: '#FFFFFF',
                              transition: 'all 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              boxShadow: '0 2px 6px rgba(21, 101, 192, 0.3)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#0D47A1'
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(21, 101, 192, 0.4)'
                              e.currentTarget.style.transform = 'translateY(-2px)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#1565C0'
                              e.currentTarget.style.boxShadow = '0 2px 6px rgba(21, 101, 192, 0.3)'
                              e.currentTarget.style.transform = 'translateY(0)'
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              setExpandedImageBreeds(prev => {
                                const newSet = new Set(prev)
                                if (newSet.has(breed.id)) {
                                  newSet.delete(breed.id)
                                } else {
                                  newSet.add(breed.id)
                                }
                                return newSet
                              })
                            }}
                          >
                            <span style={{ fontSize: '16px' }}>
                              {expandedImageBreeds.has(breed.id) ? '▼' : '▶'}
                            </span>
                            {expandedImageBreeds.has(breed.id) ? 'Hide' : 'Show'} Images ({images.length})
                          </button>
                        </div>
                      )}

                      {/* Image List Section - Show when images button is clicked */}
                      {hasImage && expandedImageBreeds.has(breed.id) && (
                        <div style={{ 
                          marginTop: '20px',
                          padding: '20px', 
                          backgroundColor: '#ffffff', 
                          borderRadius: '10px',
                          border: '1px solid #e9ecef',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                        }}>
                          <h4 style={{ 
                            margin: '0 0 16px 0', 
                            fontSize: '17px', 
                            color: '#333', 
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <span style={{ fontSize: '18px' }}>📷</span>
                            Images ({images.length})
                          </h4>
                          <div className="stack" style={{ gap: '10px' }}>
                            {images.map((imageUrl, idx) => {
                              // Find animal record that uses this image
                              const animalRecord = animals.find(animal => 
                                (animal.imageUrls && animal.imageUrls.includes(imageUrl)) ||
                                (animal.images && animal.images.includes(imageUrl))
                              )
                              
                              return (
                                <button
                                  key={idx}
                                  className="btn"
                                  style={{ 
                                    padding: '14px 18px', 
                                    backgroundColor: '#2196F3', 
                                    borderRadius: '10px',
                                    border: 'none',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '12px',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 6px rgba(33, 150, 243, 0.3)',
                                    width: '100%',
                                    cursor: 'pointer',
                                    color: 'white'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#1976d2'
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.4)'
                                    e.currentTarget.style.transform = 'translateY(-2px)'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#2196F3'
                                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(33, 150, 243, 0.3)'
                                    e.currentTarget.style.transform = 'translateY(0)'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedImage({
                                      url: imageUrl,
                                      breedName: breed.name,
                                      breedId: breed.id,
                                      index: idx + 1,
                                      breed: breed,
                                      totalImages: images.length,
                                      animalRecord: animalRecord
                                    })
                                  }}
                                >
                                  <span style={{ 
                                    fontSize: '15px', 
                                    fontWeight: '600', 
                                    color: 'white'
                                  }}>
                                    Image {idx + 1}
                                  </span>
                                  <span style={{ 
                                    fontSize: '14px', 
                                    color: 'white',
                                    fontWeight: '500'
                                  }}>
                                    View
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  )
                })}
              </div>
            )}
          </div>
          </div>

        {/* Right Sidebar */}
        {sidebarView && (
          <div className="card" style={{ position: 'sticky', top: '20px', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>
                {sidebarView === 'breed-details' ? '📋 Breed Details' : '🖼️ Image Details'}
              </h3>
              <button
                className="btn secondary"
                onClick={() => setSidebarView(null)}
                style={{ fontSize: '20px', padding: '8px 12px' }}
              >
                ✕
              </button>
            </div>

            {sidebarView === 'breed-details' && (
              <div className="stack" style={{ gap: '16px' }}>
                <div>
                  <h4>All Breed Details</h4>
                  <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    {breeds.map(breed => (
                      <div key={breed.id} style={{ 
                        padding: '12px', 
                        marginBottom: '12px', 
                        backgroundColor: '#f9f9f9', 
                        borderRadius: '8px',
                        border: selectedBreed?.id === breed.id ? '2px solid #2196F3' : '1px solid #e0e0e0'
                      }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{breed.name}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          <div><strong>Species:</strong> {breed.species || 'Unknown'}</div>
                          <div><strong>Origin:</strong> {breed.origin || 'N/A'}</div>
                          <div><strong>Description:</strong> {breed.description ? (breed.description.length > 100 ? `${breed.description.substring(0, 100)}...` : breed.description) : 'N/A'}</div>
                          <div><strong>Avg Weight:</strong> {breed.avgWeight || 'N/A'}</div>
                          <div><strong>Rare Breed:</strong> {breed.isRareBreed ? 'Yes' : 'No'}</div>
                          <div><strong>Image URL:</strong> {breed.image_url ? (
                            <span style={{ wordBreak: 'break-all', fontSize: '11px' }}>{breed.image_url}</span>
                          ) : 'No image'}</div>
                        </div>
                        <div className="row" style={{ gap: '8px', marginTop: '8px' }}>
                          <button
                            className="btn secondary"
                            style={{ flex: 1, fontSize: '12px', padding: '6px' }}
                            onClick={() => {
                              setSelectedBreed(breed)
                              setSidebarView('image-details')
                            }}
                          >
                            View Images
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {sidebarView === 'image-details' && selectedBreed && (
              <div className="stack" style={{ gap: '16px' }}>
                <div>
                  <h4>Image Details: {selectedBreed.name}</h4>
                  {(() => {
                    const hasImage = selectedBreed.image_url || (selectedBreed.referenceImages && selectedBreed.referenceImages.length > 0)
                    const images = selectedBreed.image_url 
                      ? [selectedBreed.image_url] 
                      : (selectedBreed.referenceImages || [])
                    
                    if (!hasImage) {
                      return (
                        <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f5f5f5', borderRadius: '8px', color: '#999' }}>
                          No images available for this breed
                        </div>
                      )
                    }

                    return (
                      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        {images.map((imageUrl, idx) => (
                          <div key={idx} style={{ 
                            padding: '12px', 
                            marginBottom: '12px', 
                            backgroundColor: '#f9f9f9', 
                            borderRadius: '8px',
                            border: '1px solid #e0e0e0'
                          }}>
                            <div style={{ marginBottom: '8px' }}>
                              <strong>Image {idx + 1}</strong>
                            </div>
                            <img 
                              src={imageUrl} 
                              alt={`${selectedBreed.name} ${idx + 1}`}
                              style={{ 
                                width: '100%', 
                                height: '150px', 
                                objectFit: 'cover', 
                                borderRadius: '8px',
                                marginBottom: '8px',
                                cursor: 'pointer'
                              }}
                              onClick={() => setPreviewImage({ url: imageUrl, breedName: selectedBreed.name, index: idx + 1 })}
                            />
                            <div style={{ fontSize: '11px', color: '#666', wordBreak: 'break-all', marginBottom: '8px' }}>
                              <strong>URL:</strong> {imageUrl}
                            </div>
                            <div className="row" style={{ gap: '8px' }}>
                              <button
                                className="btn secondary"
                                style={{ flex: 1, fontSize: '12px', padding: '6px' }}
                                onClick={() => setPreviewImage({ url: imageUrl, breedName: selectedBreed.name, index: idx + 1 })}
                              >
                                👁️ View
                              </button>
                              <button
                                className="btn"
                                style={{ flex: 1, fontSize: '12px', padding: '6px' }}
                                onClick={() => downloadImage(imageUrl, selectedBreed.name, idx + 1)}
                              >
                                ⬇️ Download
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.9)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setPreviewImage(null)}
        >
          <div 
            style={{
              position: 'relative',
              maxWidth: '90%',
              maxHeight: '90%',
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>{previewImage.breedName} - Image {previewImage.index}</h3>
              <button
                className="btn secondary"
                onClick={() => setPreviewImage(null)}
                style={{ fontSize: '20px', padding: '8px 12px' }}
              >
                ✕
              </button>
            </div>
            <img 
              src={previewImage.url} 
              alt={`${previewImage.breedName} preview`}
              style={{ 
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: '8px',
                marginBottom: '16px'
              }}
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'block'
              }}
            />
            <div style={{ display: 'none', padding: '40px', textAlign: 'center', color: '#999' }}>
              Image not available
            </div>
            <div className="row" style={{ gap: '12px', width: '100%' }}>
              <a 
                href={previewImage.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn"
                style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}
              >
                🔗 Open in New Tab
              </a>
              <button
                className="btn"
                style={{ flex: 1 }}
                onClick={() => {
                  downloadImage(previewImage.url, previewImage.breedName, previewImage.index)
                }}
              >
                ⬇️ Download
              </button>
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#666', wordBreak: 'break-all', textAlign: 'center', width: '100%' }}>
              <strong>URL:</strong> {previewImage.url}
            </div>
          </div>
        </div>
      )}

      {/* Detailed Breed Modal */}
      {detailedBreed && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.7)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setDetailedBreed(null)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#2196F3' }}>📋 {detailedBreed.name} - Full Details</h2>
              <button
                className="btn secondary"
                onClick={() => setDetailedBreed(null)}
                style={{ fontSize: '20px', padding: '8px 12px' }}
              >
                ✕
              </button>
            </div>

            {/* Breed Details */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ marginBottom: '16px', color: '#333' }}>Breed Information</h3>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <strong style={{ color: '#666' }}>Species:</strong>
                  <div style={{ color: '#333', marginTop: '4px' }}>{detailedBreed.species || 'Unknown'}</div>
                </div>
                <div>
                  <strong style={{ color: '#666' }}>Origin:</strong>
                  <div style={{ color: '#333', marginTop: '4px' }}>{detailedBreed.origin || 'N/A'}</div>
                </div>
                <div>
                  <strong style={{ color: '#666' }}>Avg Weight:</strong>
                  <div style={{ color: '#333', marginTop: '4px' }}>{detailedBreed.avgWeight || 'N/A'}</div>
                </div>
                <div>
                  <strong style={{ color: '#666' }}>Rare Breed:</strong>
                  <div style={{ color: '#333', marginTop: '4px' }}>{detailedBreed.isRareBreed ? 'Yes' : 'No'}</div>
                </div>
              </div>
              
              {detailedBreed.description && (
                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#666' }}>Description:</strong>
                  <div style={{ color: '#333', marginTop: '4px', padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                    {detailedBreed.description}
                  </div>
                </div>
              )}
              
              {detailedBreed.traits && detailedBreed.traits.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#666' }}>Traits:</strong>
                  <div style={{ color: '#333', marginTop: '4px', padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                    {Array.isArray(detailedBreed.traits) ? detailedBreed.traits.join(', ') : detailedBreed.traits}
                  </div>
                </div>
              )}

              {detailedBreed.notes && (
                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#666' }}>Admin Notes:</strong>
                  <div style={{ color: '#333', marginTop: '4px', padding: '12px', backgroundColor: '#fff3cd', borderRadius: '8px', fontSize: '13px' }}>
                    {detailedBreed.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Model Prediction Info */}
            {detailedBreed.description && detailedBreed.description.includes('model prediction') && (
              <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
                <h3 style={{ marginBottom: '12px', color: '#1976d2' }}>🤖 Model Prediction Information</h3>
                <div style={{ fontSize: '13px', color: '#333' }}>
                  {detailedBreed.description}
                </div>
              </div>
            )}

            {/* Images Section */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ marginBottom: '16px', color: '#333' }}>Images</h3>
              {(() => {
                const hasImage = detailedBreed.image_url || (detailedBreed.referenceImages && detailedBreed.referenceImages.length > 0)
                const images = detailedBreed.image_url 
                  ? [detailedBreed.image_url] 
                  : (detailedBreed.referenceImages || [])
                
                if (!hasImage) {
                  return (
                    <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f5f5f5', borderRadius: '8px', color: '#999' }}>
                      No images available
                    </div>
                  )
                }

                return (
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    {images.map((imageUrl, idx) => (
                      <div key={idx} style={{ 
                        padding: '12px', 
                        backgroundColor: '#f9f9f9', 
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0'
                      }}>
                        <img 
                          src={imageUrl} 
                          alt={`${detailedBreed.name} ${idx + 1}`}
                          style={{ 
                            width: '100%', 
                            height: '150px', 
                            objectFit: 'cover', 
                            borderRadius: '8px',
                            marginBottom: '8px',
                            cursor: 'pointer'
                          }}
                          onClick={() => setPreviewImage({ url: imageUrl, breedName: detailedBreed.name, index: idx + 1 })}
                        />
                        <div style={{ fontSize: '11px', color: '#666', wordBreak: 'break-all', marginBottom: '8px' }}>
                          <strong>URL:</strong> {imageUrl}
                        </div>
                        <div className="row" style={{ gap: '8px' }}>
                          <button
                            className="btn secondary"
                            style={{ flex: 1, fontSize: '12px', padding: '6px' }}
                            onClick={() => setPreviewImage({ url: imageUrl, breedName: detailedBreed.name, index: idx + 1 })}
                          >
                            👁️ View
                          </button>
                          <button
                            className="btn"
                            style={{ flex: 1, fontSize: '12px', padding: '6px' }}
                            onClick={() => downloadImage(imageUrl, detailedBreed.name, idx + 1)}
                          >
                            ⬇️ Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>

            {/* Admin Edit Button */}
            {user?.role === 'admin' && (
              <div className="row" style={{ gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  className="btn secondary"
                  onClick={() => {
                    setDetailedBreed(null)
                    window.location.href = `/admin/breeds`
                  }}
                >
                  ✏️ Edit in Admin Portal
                </button>
                <button
                  className="btn"
                  onClick={() => setDetailedBreed(null)}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Image Details Modal */}
      {selectedImage && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.7)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setSelectedImage(null)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#2196F3' }}>🖼️ Image Details - {selectedImage.breedName}</h2>
              <button
                className="btn secondary"
                onClick={() => setSelectedImage(null)}
                style={{ fontSize: '20px', padding: '8px 12px' }}
              >
                ✕
              </button>
            </div>

            {/* Image Display */}
            <div style={{ marginBottom: '24px', textAlign: 'center' }}>
              <img 
                src={selectedImage.url} 
                alt={`${selectedImage.breedName} - Image ${selectedImage.index}`}
                style={{ 
                  maxWidth: '100%',
                  maxHeight: '400px',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  border: '2px solid #e0e0e0',
                  marginBottom: '16px'
                }}
                onError={(e) => {
                  e.target.style.display = 'none'
                  if (e.target.nextSibling) {
                    e.target.nextSibling.style.display = 'block'
                  }
                }}
              />
              <div style={{ display: 'none', padding: '40px', textAlign: 'center', color: '#999' }}>
                Image not available
              </div>
            </div>

            {/* Image Information */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ marginBottom: '16px', color: '#333' }}>Image Information</h3>
              <div style={{ 
                padding: '16px', 
                backgroundColor: '#f9f9f9', 
                borderRadius: '8px',
                fontSize: '13px'
              }}>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <strong style={{ color: '#666' }}>Image Number:</strong>
                    <div style={{ color: '#333', marginTop: '4px' }}>Image {selectedImage.index} of {selectedImage.totalImages}</div>
                  </div>
                  <div>
                    <strong style={{ color: '#666' }}>Breed Name:</strong>
                    <div style={{ color: '#333', marginTop: '4px', fontWeight: '500' }}>{selectedImage.breedName}</div>
                  </div>
                  <div>
                    <strong style={{ color: '#666' }}>Breed ID:</strong>
                    <div style={{ color: '#333', marginTop: '4px', fontSize: '11px', fontFamily: '"Times New Roman", Times, serif' }}>{selectedImage.breedId}</div>
                  </div>
                  {selectedImage.animalRecord && (
                    <>
                      {selectedImage.animalRecord.ownerName && (
                        <div>
                          <strong style={{ color: '#666' }}>Owner Name:</strong>
                          <div style={{ color: '#333', marginTop: '4px', fontWeight: '500' }}>{selectedImage.animalRecord.ownerName}</div>
                        </div>
                      )}
                      {selectedImage.animalRecord.createdBy && (() => {
                        const user = users.find(u => u.id === selectedImage.animalRecord.createdBy)
                        return (
                          <div>
                            <strong style={{ color: '#666' }}>User Name:</strong>
                            <div style={{ color: '#333', marginTop: '4px', fontWeight: '500' }}>
                              {user ? user.name : selectedImage.animalRecord.createdBy.substring(0, 8) + '...'}
                            </div>
                          </div>
                        )
                      })()}
                      {selectedImage.animalRecord.capturedAt && (
                        <div>
                          <strong style={{ color: '#666' }}>Scanned Date:</strong>
                          <div style={{ color: '#333', marginTop: '4px' }}>{new Date(selectedImage.animalRecord.capturedAt).toLocaleString()}</div>
                        </div>
                      )}
                      {selectedImage.animalRecord.createdAt && (
                        <div>
                          <strong style={{ color: '#666' }}>Record Created:</strong>
                          <div style={{ color: '#333', marginTop: '4px' }}>{new Date(selectedImage.animalRecord.createdAt).toLocaleString()}</div>
                        </div>
                      )}
                      {selectedImage.animalRecord.location && (
                        <div>
                          <strong style={{ color: '#666' }}>Location:</strong>
                          <div style={{ color: '#333', marginTop: '4px' }}>{selectedImage.animalRecord.location}</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div style={{ marginTop: '12px' }}>
                  <strong style={{ color: '#666' }}>Image URL:</strong>
                  <div style={{ 
                    color: '#333', 
                    marginTop: '4px', 
                    fontSize: '11px', 
                    fontFamily: '"Times New Roman", Times, serif',
                    wordBreak: 'break-all',
                    padding: '8px',
                    backgroundColor: 'white',
                    borderRadius: '4px'
                  }}>
                    {selectedImage.url}
                  </div>
                </div>
              </div>
            </div>

            {/* Animal Record Details (if available) */}
            {selectedImage.animalRecord && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '16px', color: '#333' }}>Animal Record Details</h3>
                <div style={{ 
                  padding: '16px', 
                  backgroundColor: '#e8f5e9', 
                  borderRadius: '8px',
                  fontSize: '13px'
                }}>
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {selectedImage.animalRecord.earTag && (
                      <div>
                        <strong style={{ color: '#666' }}>Ear Tag:</strong>
                        <div style={{ color: '#333', marginTop: '4px' }}>{selectedImage.animalRecord.earTag}</div>
                      </div>
                    )}
                    {selectedImage.animalRecord.ageMonths && (
                      <div>
                        <strong style={{ color: '#666' }}>Age (Months):</strong>
                        <div style={{ color: '#333', marginTop: '4px' }}>{selectedImage.animalRecord.ageMonths}</div>
                      </div>
                    )}
                    {selectedImage.animalRecord.gender && (
                      <div>
                        <strong style={{ color: '#666' }}>Gender:</strong>
                        <div style={{ color: '#333', marginTop: '4px' }}>{selectedImage.animalRecord.gender}</div>
                      </div>
                    )}
                    {selectedImage.animalRecord.status && (
                      <div>
                        <strong style={{ color: '#666' }}>Status:</strong>
                        <div style={{ color: '#333', marginTop: '4px' }}>
                          <span style={{ 
                            padding: '2px 8px', 
                            borderRadius: '4px', 
                            backgroundColor: selectedImage.animalRecord.status === 'approved' ? '#4CAF50' : 
                                           selectedImage.animalRecord.status === 'pending' ? '#FF9800' : '#F44336',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: 'bold'
                          }}>
                            {selectedImage.animalRecord.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedImage.animalRecord.notes && (
                    <div style={{ marginTop: '12px' }}>
                      <strong style={{ color: '#666' }}>Notes:</strong>
                      <div style={{ 
                        color: '#333', 
                        marginTop: '4px', 
                        padding: '8px',
                        backgroundColor: 'white',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        {selectedImage.animalRecord.notes}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Breed Details Associated with Image */}
            {selectedImage.breed && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '16px', color: '#333' }}>Associated Breed Details</h3>
                <div style={{ 
                  padding: '16px', 
                  backgroundColor: '#e3f2fd', 
                  borderRadius: '8px',
                  fontSize: '13px'
                }}>
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <strong style={{ color: '#666' }}>Species:</strong>
                      <div style={{ color: '#333', marginTop: '4px' }}>{selectedImage.breed.species || 'Unknown'}</div>
                    </div>
                    <div>
                      <strong style={{ color: '#666' }}>Origin:</strong>
                      <div style={{ color: '#333', marginTop: '4px' }}>{selectedImage.breed.origin || 'N/A'}</div>
                    </div>
                    <div>
                      <strong style={{ color: '#666' }}>Avg Weight:</strong>
                      <div style={{ color: '#333', marginTop: '4px' }}>{selectedImage.breed.avgWeight || 'N/A'}</div>
                    </div>
                    <div>
                      <strong style={{ color: '#666' }}>Rare Breed:</strong>
                      <div style={{ color: '#333', marginTop: '4px' }}>{selectedImage.breed.isRareBreed ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                  {selectedImage.breed.description && (
                    <div style={{ marginTop: '12px' }}>
                      <strong style={{ color: '#666' }}>Description:</strong>
                      <div style={{ 
                        color: '#333', 
                        marginTop: '4px', 
                        padding: '8px',
                        backgroundColor: 'white',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        {selectedImage.breed.description}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="row" style={{ gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn secondary"
                onClick={() => {
                  setPreviewImage({ 
                    url: selectedImage.url, 
                    breedName: selectedImage.breedName, 
                    index: selectedImage.index 
                  })
                  setSelectedImage(null)
                }}
              >
                👁️ View Full Size
              </button>
              <button
                className="btn"
                onClick={() => {
                  downloadImage(selectedImage.url, selectedImage.breedName, selectedImage.index)
                }}
              >
                ⬇️ Download Image
              </button>
              <button
                className="btn secondary"
                onClick={() => setSelectedImage(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

