import { useState, useEffect, useRef } from 'react'
import Header from '../components/Header.jsx'

export default function ARTrainingMode() {
  const [isARActive, setIsARActive] = useState(false)
  const [selectedBreed, setSelectedBreed] = useState(null)
  const [cameraStream, setCameraStream] = useState(null)
  const [overlayData, setOverlayData] = useState(null)
  const [trainingProgress, setTrainingProgress] = useState(0)
  const [currentLesson, setCurrentLesson] = useState(0)
  const [isDetecting, setIsDetecting] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  const breeds = [
    {
      id: 'holstein',
      name: 'Holstein',
      characteristics: [
        'Black and white patches',
        'Large size (600-700 kg)',
        'Distinctive white belt around middle',
        'Upright ears',
        'Long, narrow head'
      ],
      arOverlay: {
        keyPoints: [
          { x: 0.3, y: 0.2, label: 'Head Shape' },
          { x: 0.5, y: 0.4, label: 'White Belt' },
          { x: 0.7, y: 0.6, label: 'Body Size' },
          { x: 0.2, y: 0.8, label: 'Legs' }
        ],
        color: '#2196F3'
      }
    },
    {
      id: 'gir',
      name: 'Gir',
      characteristics: [
        'Reddish-brown color',
        'Medium size (400-500 kg)',
        'Droopy ears',
        'Humped back',
        'Long, curved horns'
      ],
      arOverlay: {
        keyPoints: [
          { x: 0.3, y: 0.3, label: 'Droopy Ears' },
          { x: 0.5, y: 0.5, label: 'Hump' },
          { x: 0.7, y: 0.4, label: 'Horns' },
          { x: 0.4, y: 0.7, label: 'Body Color' }
        ],
        color: '#FF9800'
      }
    },
    {
      id: 'sahiwal',
      name: 'Sahiwal',
      characteristics: [
        'Reddish-brown with white spots',
        'Medium size (450-550 kg)',
        'Short horns',
        'Loose skin',
        'Dewlap under neck'
      ],
      arOverlay: {
        keyPoints: [
          { x: 0.4, y: 0.2, label: 'Short Horns' },
          { x: 0.5, y: 0.3, label: 'Dewlap' },
          { x: 0.6, y: 0.5, label: 'Loose Skin' },
          { x: 0.3, y: 0.6, label: 'White Spots' }
        ],
        color: '#4CAF50'
      }
    }
  ]

  const trainingLessons = [
    {
      title: 'Introduction to Breed Identification',
      description: 'Learn the basics of identifying different cattle breeds',
      duration: '5 minutes',
      objectives: [
        'Understand key physical characteristics',
        'Learn to identify breed-specific features',
        'Practice visual recognition skills'
      ]
    },
    {
      title: 'Holstein Breed Training',
      description: 'Master the identification of Holstein cattle',
      duration: '8 minutes',
      objectives: [
        'Recognize black and white patterns',
        'Identify body size and proportions',
        'Spot distinctive head shape'
      ]
    },
    {
      title: 'Indigenous Breeds Training',
      description: 'Learn about Indian indigenous cattle breeds',
      duration: '10 minutes',
      objectives: [
        'Distinguish between Gir and Sahiwal',
        'Identify hump characteristics',
        'Recognize ear and horn differences'
      ]
    },
    {
      title: 'Practical Assessment',
      description: 'Test your breed identification skills',
      duration: '15 minutes',
      objectives: [
        'Identify breeds from photos',
        'Explain identification reasoning',
        'Achieve 80% accuracy target'
      ]
    }
  ]

  useEffect(() => {
    if (isARActive && selectedBreed) {
      startARCamera()
    } else {
      stopARCamera()
    }

    return () => {
      stopARCamera()
    }
  }, [isARActive, selectedBreed])

  const startARCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      
      setCameraStream(stream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      // Start AR overlay rendering
      startAROverlay()
    } catch (error) {
      console.error('Camera access error:', error)
      alert('Camera access is required for AR training mode')
    }
  }

  const stopARCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
  }

  const startAROverlay = () => {
    const canvas = canvasRef.current
    const video = videoRef.current
    
    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')
    
    const drawOverlay = () => {
      if (!isARActive || !selectedBreed) return

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw breed-specific overlay
      const overlay = selectedBreed.arOverlay
      
      overlay.keyPoints.forEach(point => {
        const x = point.x * canvas.width
        const y = point.y * canvas.height

        // Draw key point circle
        ctx.beginPath()
        ctx.arc(x, y, 15, 0, 2 * Math.PI)
        ctx.fillStyle = overlay.color
        ctx.fill()
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 3
        ctx.stroke()

        // Draw label
        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 14px "Times New Roman", Times, serif'
        ctx.textAlign = 'center'
        ctx.fillText(point.label, x, y - 25)
      })

      // Draw breed name
      ctx.fillStyle = overlay.color
      ctx.font = 'bold 20px "Times New Roman", Times, serif'
      ctx.textAlign = 'left'
      ctx.fillText(selectedBreed.name, 20, 40)

      // Draw characteristics
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '14px "Times New Roman", Times, serif'
      ctx.textAlign = 'left'
      
      selectedBreed.characteristics.forEach((char, index) => {
        ctx.fillText(`• ${char}`, 20, 70 + (index * 20))
      })

      requestAnimationFrame(drawOverlay)
    }

    drawOverlay()
  }

  const startTraining = (breedId) => {
    const breed = breeds.find(b => b.id === breedId)
    setSelectedBreed(breed)
    setIsARActive(true)
    setCurrentLesson(0)
    setTrainingProgress(0)
  }

  const nextLesson = () => {
    if (currentLesson < trainingLessons.length - 1) {
      setCurrentLesson(currentLesson + 1)
      setTrainingProgress(((currentLesson + 1) / trainingLessons.length) * 100)
    }
  }

  const previousLesson = () => {
    if (currentLesson > 0) {
      setCurrentLesson(currentLesson - 1)
      setTrainingProgress((currentLesson / trainingLessons.length) * 100)
    }
  }

  const completeTraining = () => {
    setIsARActive(false)
    setSelectedBreed(null)
    setCurrentLesson(0)
    setTrainingProgress(100)
    alert('🎉 Training completed successfully!')
  }

  const detectBreed = async () => {
    if (!videoRef.current || !canvasRef.current) return

    setIsDetecting(true)
    
    try {
      // Capture frame from video
      const canvas = canvasRef.current
      const video = videoRef.current
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0)

      // Convert to blob for AI processing
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'))
      
      // Send to AI for breed detection
      const formData = new FormData()
      formData.append('image', blob)

      const response = await fetch('/api/predict', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      
      if (result.predictions && result.predictions.length > 0) {
        const topPrediction = result.predictions[0]
        setOverlayData({
          breed: topPrediction.breed || 'Unknown',
          confidence: topPrediction.confidence || 0,
          detected: true
        })
      }
    } catch (error) {
      console.error('Breed detection error:', error)
    } finally {
      setIsDetecting(false)
    }
  }

  return (
    <>
      <Header />
      <div className="container">
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <h1>🥽 AR Training Mode</h1>
            <div className="row" style={{ gap: 8 }}>
              <button 
                className="btn" 
                onClick={() => setIsARActive(!isARActive)}
                style={{ backgroundColor: isARActive ? '#F44336' : '#4CAF50' }}
              >
                {isARActive ? '🛑 Stop AR' : '▶️ Start AR'}
              </button>
            </div>
          </div>

          {/* Training Progress */}
          <div className="card" style={{ marginTop: 16 }}>
            <h3>📚 Training Progress</h3>
            <div style={{ marginBottom: 16 }}>
              <div style={{ 
                width: '100%', 
                height: '8px', 
                backgroundColor: '#e0e0e0', 
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${trainingProgress}%`,
                  height: '100%',
                  backgroundColor: '#4CAF50',
                  transition: 'width 0.3s ease'
                }}></div>
              </div>
              <div style={{ textAlign: 'center', marginTop: 8, fontSize: '14px', color: 'var(--color-text-muted)' }}>
                {Math.round(trainingProgress)}% Complete
              </div>
            </div>

            {/* Current Lesson */}
            <div className="card" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
              <h4>{trainingLessons[currentLesson]?.title}</h4>
              <p style={{ color: 'var(--color-text-muted)' }}>
                {trainingLessons[currentLesson]?.description}
              </p>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Duration: {trainingLessons[currentLesson]?.duration}
              </div>
              
              <div style={{ marginTop: 12 }}>
                <strong>Learning Objectives:</strong>
                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                  {trainingLessons[currentLesson]?.objectives.map((objective, index) => (
                    <li key={index} style={{ fontSize: '14px', marginBottom: 4 }}>
                      {objective}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Breed Selection */}
          <div className="card" style={{ marginTop: 16 }}>
            <h3>🐄 Select Breed for Training</h3>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
              {breeds.map(breed => (
                <div key={breed.id} className="card" style={{ 
                  border: selectedBreed?.id === breed.id ? `3px solid ${breed.arOverlay.color}` : '1px solid #e0e0e0',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => startTraining(breed.id)}>
                  <h4 style={{ color: breed.arOverlay.color }}>{breed.name}</h4>
                  <div className="stack" style={{ gap: 8 }}>
                    {breed.characteristics.map((char, index) => (
                      <div key={index} style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        • {char}
                      </div>
                    ))}
                  </div>
                  <button 
                    className="btn outline" 
                    style={{ 
                      marginTop: 12, 
                      borderColor: breed.arOverlay.color,
                      color: breed.arOverlay.color
                    }}
                  >
                    Start Training
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* AR Camera View */}
          {isARActive && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3>📹 AR Camera View</h3>
              <div style={{ position: 'relative', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
                <video
                  ref={videoRef}
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#000'
                  }}
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none'
                  }}
                />
                
                {/* AR Controls */}
                <div style={{
                  position: 'absolute',
                  bottom: 16,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: 12
                }}>
                  <button 
                    className="btn" 
                    onClick={detectBreed}
                    disabled={isDetecting}
                    style={{ fontSize: '12px', padding: '8px 16px' }}
                  >
                    {isDetecting ? '🔍 Detecting...' : '🔍 Detect Breed'}
                  </button>
                  
                  <button 
                    className="btn secondary" 
                    onClick={() => setIsARActive(false)}
                    style={{ fontSize: '12px', padding: '8px 16px' }}
                  >
                    🛑 Stop AR
                  </button>
                </div>
              </div>

              {/* Detection Results */}
              {overlayData && (
                <div className="card" style={{ marginTop: 16, backgroundColor: '#e8f5e8' }}>
                  <h4>🎯 Detection Results</h4>
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>Detected Breed:</strong> {overlayData.breed}
                    </div>
                    <div>
                      <strong>Confidence:</strong> {Math.round((overlayData.confidence || 0) * 100)}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Training Controls */}
          <div className="card" style={{ marginTop: 16 }}>
            <h3>🎮 Training Controls</h3>
            <div className="row" style={{ gap: 12, justifyContent: 'center' }}>
              <button 
                className="btn secondary" 
                onClick={previousLesson}
                disabled={currentLesson === 0}
              >
                ← Previous Lesson
              </button>
              
              <button 
                className="btn" 
                onClick={nextLesson}
                disabled={currentLesson === trainingLessons.length - 1}
              >
                Next Lesson →
              </button>
              
              <button 
                className="btn success" 
                onClick={completeTraining}
                disabled={currentLesson < trainingLessons.length - 1}
              >
                ✅ Complete Training
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="card" style={{ marginTop: 16, backgroundColor: '#e3f2fd' }}>
            <h3>📖 How to Use AR Training</h3>
            <div className="stack" style={{ gap: 12 }}>
              <div>
                <strong>1. Select a Breed:</strong> Choose the breed you want to learn about
              </div>
              <div>
                <strong>2. Start AR Mode:</strong> Click "Start AR" to activate the camera
              </div>
              <div>
                <strong>3. Point Camera:</strong> Point your camera at a cattle or reference image
              </div>
              <div>
                <strong>4. Learn Features:</strong> AR overlay will highlight key characteristics
              </div>
              <div>
                <strong>5. Practice Detection:</strong> Use "Detect Breed" to test your skills
              </div>
              <div>
                <strong>6. Complete Lessons:</strong> Progress through all training modules
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}


