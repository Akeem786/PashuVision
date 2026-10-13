import { useState, useEffect, useRef } from 'react'
import Header from '../components/Header.jsx'

export default function NFCScanning() {
  const [isNFCSupported, setIsNFCSupported] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scannedData, setScannedData] = useState(null)
  const [scanHistory, setScanHistory] = useState([])
  const [error, setError] = useState('')
  const [scanMode, setScanMode] = useState('animal') // 'animal', 'worker', 'location'
  const nfcReaderRef = useRef(null)

  useEffect(() => {
    checkNFCSupport()
    loadScanHistory()
  }, [])

  const checkNFCSupport = () => {
    // Check if NFC is supported
    if ('NDEFReader' in window) {
      setIsNFCSupported(true)
    } else {
      setIsNFCSupported(false)
      setError('NFC is not supported on this device')
    }
  }

  const loadScanHistory = () => {
    // Load scan history from localStorage
    const history = JSON.parse(localStorage.getItem('nfcScanHistory') || '[]')
    setScanHistory(history)
  }

  const saveScanHistory = (scanData) => {
    const newHistory = [
      {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        mode: scanMode,
        data: scanData,
        success: true
      },
      ...scanHistory.slice(0, 49) // Keep last 50 scans
    ]
    
    setScanHistory(newHistory)
    localStorage.setItem('nfcScanHistory', JSON.stringify(newHistory))
  }

  const startNFCScan = async () => {
    if (!isNFCSupported) {
      setError('NFC is not supported on this device')
      return
    }

    setIsScanning(true)
    setError('')
    setScannedData(null)

    try {
      if (!('NDEFReader' in window)) {
        throw new Error('Web NFC is not supported on this browser/device')
      }
      const reader = new window.NDEFReader()
      nfcReaderRef.current = reader

      // Add event listeners
      reader.addEventListener('reading', handleNFCReading)
      reader.addEventListener('readingerror', handleNFCError)

      // Start scanning
      await reader.scan()
      
      // Set timeout for scanning
      setTimeout(() => {
        if (isScanning) {
          stopNFCScan()
          setError('Scan timeout - no NFC tag detected')
        }
      }, 30000) // 30 seconds timeout

    } catch (error) {
      console.error('NFC scan error:', error)
      setError(`NFC scan failed: ${error.message}`)
      setIsScanning(false)
    }
  }

  const stopNFCScan = () => {
    if (nfcReaderRef.current) {
      nfcReaderRef.current.removeEventListener('reading', handleNFCReading)
      nfcReaderRef.current.removeEventListener('readingerror', handleNFCError)
      nfcReaderRef.current = null
    }
    setIsScanning(false)
  }

  const handleNFCReading = (event) => {
    try {
      const message = event.message
      const records = message.records
      
      if (records.length === 0) {
        setError('No data found on NFC tag')
        return
      }

      // Process the first record
      const record = records[0]
      let data = null

      if (record.recordType === 'text') {
        data = {
          type: 'text',
          content: new TextDecoder().decode(record.data),
          mimeType: record.mediaType
        }
      } else if (record.recordType === 'json') {
        data = {
          type: 'json',
          content: JSON.parse(new TextDecoder().decode(record.data)),
          mimeType: record.mediaType
        }
      } else if (record.recordType === 'url') {
        data = {
          type: 'url',
          content: new TextDecoder().decode(record.data),
          mimeType: record.mediaType
        }
      } else {
        data = {
          type: 'unknown',
          content: new TextDecoder().decode(record.data),
          mimeType: record.mediaType
        }
      }

      setScannedData(data)
      saveScanHistory(data)
      stopNFCScan()

    } catch (error) {
      console.error('NFC reading error:', error)
      setError(`Failed to read NFC data: ${error.message}`)
    }
  }

  const handleNFCError = (error) => {
    console.error('NFC error:', error)
    setError(`NFC error: ${error.message}`)
    setIsScanning(false)
  }

  const processScannedData = (data) => {
    if (!data) return null

    try {
      if (data.type === 'json') {
        const jsonData = data.content
        
        // Process based on scan mode
        switch (scanMode) {
          case 'animal':
            return processAnimalData(jsonData)
          case 'worker':
            return processWorkerData(jsonData)
          case 'location':
            return processLocationData(jsonData)
          default:
            return jsonData
        }
      } else if (data.type === 'text') {
        // Try to parse as JSON
        try {
          const jsonData = JSON.parse(data.content)
          return processScannedData({ type: 'json', content: jsonData })
        } catch {
          return { type: 'text', content: data.content }
        }
      }
      
      return data
    } catch (error) {
      console.error('Data processing error:', error)
      return { error: error.message, rawData: data }
    }
  }

  const processAnimalData = (data) => {
    if (data.type === 'animal_record') {
      return {
        type: 'animal',
        id: data.id,
        earTag: data.earTag,
        breed: data.breed,
        owner: data.owner,
        village: data.village,
        district: data.district,
        state: data.state,
        generatedAt: data.generatedAt,
        version: data.version
      }
    }
    return data
  }

  const processWorkerData = (data) => {
    if (data.type === 'field_worker') {
      return {
        type: 'worker',
        id: data.id,
        name: data.name,
        phone: data.phone,
        role: data.role,
        village: data.village,
        district: data.district,
        state: data.state,
        permissions: data.permissions,
        generatedAt: data.generatedAt,
        version: data.version
      }
    }
    return data
  }

  const processLocationData = (data) => {
    if (data.type === 'location') {
      return {
        type: 'location',
        village: data.village,
        district: data.district,
        state: data.state,
        coordinates: data.coordinates,
        pincode: data.pincode,
        generatedAt: data.generatedAt,
        version: data.version
      }
    }
    return data
  }

  const clearScanHistory = () => {
    setScanHistory([])
    localStorage.removeItem('nfcScanHistory')
  }

  const deleteScanRecord = (id) => {
    const newHistory = scanHistory.filter(record => record.id !== id)
    setScanHistory(newHistory)
    localStorage.setItem('nfcScanHistory', JSON.stringify(newHistory))
  }

  const processedData = scannedData ? processScannedData(scannedData) : null

  return (
    <>
      <Header />
      <div className="container">
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <h1>📱 NFC Scanning</h1>
            <div className="row" style={{ gap: 8 }}>
              <button 
                className="btn secondary"
                onClick={() => window.open('/scan', '_blank')}
              >
                📷 QR Scanner
              </button>
            </div>
          </div>

          <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>
            Scan NFC tags to quickly access animal records, worker information, and location data.
          </p>

          {/* NFC Support Status */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3>📱 NFC Status</h3>
            <div className="row" style={{ alignItems: 'center', gap: 12 }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: isNFCSupported ? '#4CAF50' : '#F44336'
              }}></div>
              <span style={{ fontWeight: '600' }}>
                {isNFCSupported ? 'NFC Supported' : 'NFC Not Supported'}
              </span>
            </div>
            {!isNFCSupported && (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginTop: 8 }}>
                NFC scanning requires a compatible device and browser. Try using QR scanning instead.
              </p>
            )}
          </div>

          {/* Scan Mode Selection */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3>🎯 Scan Mode</h3>
            <div className="row" style={{ gap: 8 }}>
              <button 
                className={`btn ${scanMode === 'animal' ? '' : 'secondary'}`}
                onClick={() => setScanMode('animal')}
              >
                🐄 Animal Records
              </button>
              <button 
                className={`btn ${scanMode === 'worker' ? '' : 'secondary'}`}
                onClick={() => setScanMode('worker')}
              >
                👤 Worker Info
              </button>
              <button 
                className={`btn ${scanMode === 'location' ? '' : 'secondary'}`}
                onClick={() => setScanMode('location')}
              >
                📍 Location Data
              </button>
            </div>
          </div>

          {/* NFC Scanner */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3>📱 NFC Scanner</h3>
            
            {isScanning ? (
              <div className="card" style={{ backgroundColor: '#e3f2fd', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: 16 }}>📱</div>
                <h4>Scanning for NFC Tags...</h4>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: 16 }}>
                  Hold your device near an NFC tag
                </p>
                <button 
                  className="btn secondary"
                  onClick={stopNFCScan}
                >
                  🛑 Stop Scanning
                </button>
              </div>
            ) : (
              <div className="row" style={{ justifyContent: 'center', gap: 16 }}>
                <button 
                  className="btn large"
                  onClick={startNFCScan}
                  disabled={!isNFCSupported}
                  style={{ fontSize: '16px', padding: '12px 24px' }}
                >
                  📱 Start NFC Scan
                </button>
              </div>
            )}

            {error && (
              <div className="card" style={{ backgroundColor: '#ffebee', marginTop: 16 }}>
                <div style={{ color: '#c62828', fontSize: '14px' }}>
                  ❌ {error}
                </div>
              </div>
            )}
          </div>

          {/* Scanned Data Display */}
          {processedData && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3>📋 Scanned Data</h3>
              
              <div className="card" style={{ backgroundColor: '#e8f5e8' }}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h4>✅ Scan Successful</h4>
                  <div className="badge" style={{ backgroundColor: '#4CAF50' }}>
                    {processedData.type || 'Unknown'}
                  </div>
                </div>

                {processedData.type === 'animal' && (
                  <div className="stack" style={{ gap: 12 }}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <strong>Animal ID:</strong>
                      <span>{processedData.id}</span>
                    </div>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <strong>Ear Tag:</strong>
                      <span>{processedData.earTag}</span>
                    </div>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <strong>Breed:</strong>
                      <span>{processedData.breed}</span>
                    </div>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <strong>Owner:</strong>
                      <span>{processedData.owner}</span>
                    </div>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <strong>Location:</strong>
                      <span>{processedData.village}, {processedData.district}, {processedData.state}</span>
                    </div>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <strong>Generated:</strong>
                      <span>{new Date(processedData.generatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}

                {processedData.type === 'worker' && (
                  <div className="stack" style={{ gap: 12 }}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <strong>Worker ID:</strong>
                      <span>{processedData.id}</span>
                    </div>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <strong>Name:</strong>
                      <span>{processedData.name}</span>
                    </div>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <strong>Phone:</strong>
                      <span>{processedData.phone}</span>
                    </div>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <strong>Role:</strong>
                      <span>{processedData.role}</span>
                    </div>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <strong>Location:</strong>
                      <span>{processedData.village}, {processedData.district}, {processedData.state}</span>
                    </div>
                  </div>
                )}

                {processedData.type === 'location' && (
                  <div className="stack" style={{ gap: 12 }}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <strong>Village:</strong>
                      <span>{processedData.village}</span>
                    </div>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <strong>District:</strong>
                      <span>{processedData.district}</span>
                    </div>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <strong>State:</strong>
                      <span>{processedData.state}</span>
                    </div>
                    {processedData.coordinates && (
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <strong>Coordinates:</strong>
                        <span>{processedData.coordinates.lat}, {processedData.coordinates.lng}</span>
                      </div>
                    )}
                    {processedData.pincode && (
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <strong>Pincode:</strong>
                        <span>{processedData.pincode}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
                  <button 
                    className="btn"
                    onClick={() => {
                      // Navigate to relevant page based on data type
                      if (processedData.type === 'animal') {
                        window.location.href = `/records/${processedData.id}`
                      } else if (processedData.type === 'worker') {
                        window.location.href = `/profile/${processedData.id}`
                      }
                    }}
                  >
                    🔍 View Details
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Scan History */}
          <div className="card">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>📚 Scan History</h3>
              <button 
                className="btn secondary"
                onClick={clearScanHistory}
                disabled={scanHistory.length === 0}
              >
                🗑️ Clear History
              </button>
            </div>

            {scanHistory.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '32px' }}>
                No scan history yet
              </div>
            ) : (
              <div className="stack" style={{ gap: 8 }}>
                {scanHistory.slice(0, 10).map(record => (
                  <div key={record.id} className="card" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div className="row" style={{ alignItems: 'center', gap: 8 }}>
                          <div className="badge" style={{ fontSize: '10px' }}>
                            {record.mode}
                          </div>
                          <span style={{ fontSize: '14px', fontWeight: '600' }}>
                            {record.data.type || 'Unknown'}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          {new Date(record.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <button 
                        className="btn secondary"
                        onClick={() => deleteScanRecord(record.id)}
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* NFC Usage Instructions */}
          <div className="card" style={{ backgroundColor: '#e3f2fd' }}>
            <h3>📖 How to Use NFC Scanning</h3>
            <div className="stack" style={{ gap: 12 }}>
              <div>
                <strong>1. Enable NFC:</strong> Make sure NFC is enabled on your device
              </div>
              <div>
                <strong>2. Select Mode:</strong> Choose what type of data you want to scan
              </div>
              <div>
                <strong>3. Start Scan:</strong> Tap "Start NFC Scan" and hold device near NFC tag
              </div>
              <div>
                <strong>4. View Data:</strong> Scanned data will be displayed automatically
              </div>
              <div>
                <strong>5. Take Action:</strong> Use "View Details" to navigate to relevant pages
              </div>
            </div>
          </div>

          {/* NFC Tag Types */}
          <div className="card" style={{ backgroundColor: '#e8f5e8' }}>
            <h3>🏷️ Supported NFC Tag Types</h3>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <h5>Animal Records</h5>
                <ul style={{ fontSize: '14px', paddingLeft: '20px' }}>
                  <li>Animal ID and ear tag</li>
                  <li>Breed information</li>
                  <li>Owner details</li>
                  <li>Location data</li>
                </ul>
              </div>
              <div>
                <h5>Worker Information</h5>
                <ul style={{ fontSize: '14px', paddingLeft: '20px' }}>
                  <li>Worker ID and name</li>
                  <li>Contact information</li>
                  <li>Role and permissions</li>
                  <li>Assigned areas</li>
                </ul>
              </div>
              <div>
                <h5>Location Data</h5>
                <ul style={{ fontSize: '14px', paddingLeft: '20px' }}>
                  <li>Village and district</li>
                  <li>GPS coordinates</li>
                  <li>Pincode information</li>
                  <li>Regional details</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}


