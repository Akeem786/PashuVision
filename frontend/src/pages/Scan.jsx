import Header from '../components/Header.jsx'
import Layout from '../components/Layout.jsx'
import { useEffect, useRef, useState } from 'react'
import AutoQRGenerationService from '../services/AutoQRGenerationService.js'

const qrService = new AutoQRGenerationService()

export default function Scan() {
  const videoRef = useRef(null)
  const fileInputRef = useRef(null)
  const [manualId, setManualId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [scanning, setScanning] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [scannedId, setScannedId] = useState('')
  const [cameraAvailable, setCameraAvailable] = useState(true)
  const qrScannerRef = useRef(null)

  useEffect(() => {
    // Load QR Scanner library
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/qr-scanner@1.4.2/qr-scanner.umd.min.js'
    script.async = true
    script.onload = () => {
      if (window.QrScanner) {
        startScanning()
      } else {
        setError('QR Scanner library failed to load. Please use manual ID entry.')
      }
    }
    script.onerror = () => {
      setError('QR Scanner library failed to load. Please use manual ID entry.')
    }
    document.head.appendChild(script)

    return () => {
      stopScanning()
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [])

  const startScanning = async () => {
    setError('')
    setSuccess('')
    setScannedId('')
    try {
      const QrScanner = window.QrScanner
      if (!QrScanner) {
        setError('QR Scanner library is not yet ready. Please use manual ID entry.')
        return
      }

      const video = videoRef.current
      if (!video) return

      // Check if camera is available
      const hasCamera = await QrScanner.hasCamera()
      if (!hasCamera) {
        setCameraAvailable(false)
        setError('No camera found on this device. Please use manual ID entry or upload an image.')
        return
      }

      setScanning(true)

      qrScannerRef.current = new QrScanner(
        video,
        (result) => {
          const scannedValue = result.data || result
          handleCodeDetected(scannedValue)
        },
        {
          returnDetailedScanResult: true,
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true
        }
      )

      await qrScannerRef.current.start()
    } catch (err) {
      console.error('Scan error:', err)
      setError(err.message || 'Camera access denied. Please grant camera permissions or use manual entry.')
      setScanning(false)
    }
  }

  const stopScanning = () => {
    if (qrScannerRef.current) {
      try {
        qrScannerRef.current.stop()
        qrScannerRef.current.destroy()
      } catch (_) {}
      qrScannerRef.current = null
    }
    setScanning(false)
  }

  // Unified animal ID resolver with verification & error handling
  const resolveAnimalRecord = async (animalId) => {
    setResolving(true)
    setError('')
    setSuccess('')
    const token = localStorage.getItem('token')

    if (!token) {
      setResolving(false)
      setError('Authentication required. Please log in first.')
      return
    }

    try {
      const res = await fetch(`/api/animals/${encodeURIComponent(animalId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = await res.json().catch(() => ({}))

      if (res.status === 404) {
        setError(`Animal not found (404): Animal with ID '${animalId}' does not exist or has been deleted.`)
        setResolving(false)
        return
      }

      if (res.status === 403) {
        setError(`Access restricted (403): You do not have permission to view records for animal '${animalId}'.`)
        setResolving(false)
        return
      }

      if (!res.ok) {
        setError(data.error || `Failed to verify animal ID (${res.status}).`)
        setResolving(false)
        return
      }

      // Successful verification
      setScannedId(animalId)
      setSuccess(`✅ Animal '${data.predictedBreed || 'Record'}' (ID: ${animalId}) verified! Redirecting to details...`)

      setTimeout(() => {
        window.location.href = `/records?id=${encodeURIComponent(animalId)}`
      }, 700)
    } catch (err) {
      console.error('Record resolution error:', err)
      setError(`Network error: Unable to connect to PashuVision server. Please check your internet connection.`)
    } finally {
      setResolving(false)
    }
  }

  const handleCodeDetected = (rawScannedText) => {
    stopScanning()

    const parseResult = qrService.parseScannedCode(rawScannedText)
    if (!parseResult.success) {
      setError(`Invalid QR Code: ${parseResult.error}`)
      return
    }

    resolveAnimalRecord(parseResult.id)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setSuccess('')
    setResolving(true)

    try {
      const QrScanner = window.QrScanner
      if (!QrScanner) {
        throw new Error('QR Scanner library not loaded')
      }

      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true })
      const rawText = result.data || result
      handleCodeDetected(rawText)
    } catch (err) {
      console.error('File scan error:', err)
      setError('Could not detect a valid QR code in the uploaded image. Please try a clearer photo or enter ID manually.')
      setResolving(false)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleManualSubmit = (e) => {
    e.preventDefault()
    const trimmed = manualId.trim()
    if (!trimmed) {
      setError('Please enter an Animal ID')
      return
    }

    const parseResult = qrService.parseScannedCode(trimmed)
    if (!parseResult.success) {
      setError(`Invalid Animal ID: ${parseResult.error}`)
      return
    }

    stopScanning()
    resolveAnimalRecord(parseResult.id)
  }

  return (
    <Layout>
      <div className="container" style={{ paddingTop: '80px', maxWidth: '640px', margin: '0 auto', paddingBottom: '40px' }}>
        <div className="card" style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          border: '1px solid rgba(0,0,0,0.05)',
          padding: '24px'
        }}>
          {/* Header */}
          <div style={{
            textAlign: 'center',
            marginBottom: '24px',
            paddingBottom: '16px',
            borderBottom: '2px solid #e9ecef'
          }}>
            <div style={{ fontSize: '44px', marginBottom: '8px' }}>
              📷
            </div>
            <h1 style={{
              fontSize: '1.8rem',
              fontWeight: 'bold',
              margin: 0,
              background: 'linear-gradient(135deg, #2b6cb0 0%, #11a36a 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Scan Animal QR Code
            </h1>
            <p style={{ color: '#6c757d', margin: '8px 0 0 0', fontSize: '14px' }}>
              Scan an animal tag QR code, upload a photo, or enter ID manually
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div style={{
              background: '#ffebee',
              color: '#c62828',
              padding: '12px 16px',
              borderRadius: '12px',
              marginBottom: '20px',
              border: '1px solid #ffcdd2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              fontSize: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
              {!scanning && (
                <button 
                  className="btn secondary" 
                  onClick={startScanning}
                  style={{ fontSize: '12px', padding: '4px 10px', height: 'auto' }}
                >
                  Try Again
                </button>
              )}
            </div>
          )}

          {/* Success Banner */}
          {success && (
            <div style={{
              background: '#e8f5e9',
              color: '#2e7d32',
              padding: '12px 16px',
              borderRadius: '12px',
              marginBottom: '20px',
              border: '1px solid #c8e6c9',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}>
              <span>{success}</span>
            </div>
          )}

          {/* Resolving / Loading State */}
          {resolving && (
            <div style={{
              background: '#e3f2fd',
              color: '#1565c0',
              padding: '14px 16px',
              borderRadius: '12px',
              marginBottom: '20px',
              border: '1px solid #bbdefb',
              textAlign: 'center',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #1565c0',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              <span>Verifying animal identifier with PashuVision server...</span>
            </div>
          )}

          {/* Video Scanner View */}
          <div style={{
            position: 'relative',
            width: '100%',
            marginBottom: '20px',
            borderRadius: '12px',
            overflow: 'hidden',
            background: '#000',
            minHeight: '280px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <video
              ref={videoRef}
              style={{
                width: '100%',
                height: 'auto',
                display: scanning ? 'block' : 'none'
              }}
              muted
              playsInline
            />
            {!scanning && (
              <div style={{
                color: '#fff',
                textAlign: 'center',
                padding: '30px'
              }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎯</div>
                <div style={{ fontSize: '15px', opacity: 0.9, marginBottom: '8px' }}>
                  Camera is currently paused
                </div>
                <div style={{ fontSize: '13px', opacity: 0.7 }}>
                  Click Start Scanning or choose an image below
                </div>
              </div>
            )}
            
            {/* Target Reticle */}
            {scanning && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '200px',
                height: '200px',
                border: '3px solid #11a36a',
                borderRadius: '16px',
                pointerEvents: 'none',
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)'
              }} />
            )}
          </div>

          {/* Control Buttons */}
          <div style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '24px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            {!scanning ? (
              <button
                onClick={startScanning}
                className="btn"
                disabled={resolving}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  background: '#11a36a',
                  color: 'white',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                🎥 Start Camera Scanner
              </button>
            ) : (
              <button
                onClick={stopScanning}
                className="btn secondary"
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                ⏹️ Stop Camera
              </button>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn secondary"
              disabled={resolving}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              🖼️ Upload QR Image
            </button>
            <input 
              ref={fileInputRef} 
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={handleFileUpload} 
            />
          </div>

          {/* Manual Entry Form */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e9ecef'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#495057' }}>
              Manual Animal ID Entry
            </h3>
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder="Enter Animal ID (e.g. 3rAPptb6ZgkLqQFo1kCg0)"
                disabled={resolving}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #ced4da',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                className="btn"
                disabled={resolving || !manualId.trim()}
                style={{
                  padding: '10px 18px',
                  fontSize: '14px',
                  fontWeight: '600',
                  background: '#2b6cb0',
                  color: 'white',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                {resolving ? 'Checking...' : 'Open Record'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  )
}
