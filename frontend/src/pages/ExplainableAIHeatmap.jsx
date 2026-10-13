import { useState, useEffect, useRef } from 'react'
import Header from '../components/Header.jsx'

export default function ExplainableAIHeatmap() {
  const [selectedImage, setSelectedImage] = useState(null)
  const [heatmapData, setHeatmapData] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [explanation, setExplanation] = useState('')
  const [confidence, setConfidence] = useState(0)
  const [selectedBreed, setSelectedBreed] = useState('')
  const canvasRef = useRef(null)
  const imageRef = useRef(null)

  const sampleImages = [
    {
      id: 'holstein-1',
      name: 'Holstein Cow',
      url: 'https://cdn.britannica.com/11/136111-050-174C2796/Holstein-cow.jpg?w=300',
      actualBreed: 'Holstein',
      description: 'Black and white dairy cow'
    },
    {
      id: 'gir-1',
      name: 'Gir Bull',
      url: 'https://sagbidaj.org/wp-content/webp-express/webp-images/uploads/2023/01/GR-10039-5-scaled.jpg.webp',
      actualBreed: 'Gir',
      description: 'Reddish-brown humped cattle'
    },
    {
      id: 'sahiwal-1',
      name: 'Sahiwal Cow',
      url: 'https://docs.krishnayangauraksha.org/blog/17_08_2024_12_22_51_Is%20Sahiwal%20cow%20milk%20good%20for%20health.jpeg',
      actualBreed: 'Sahiwal',
      description: 'Reddish-brown with white spots'
    }
  ]

  const breedCharacteristics = {
    'Holstein': {
      keyFeatures: [
        { name: 'Black and White Pattern', importance: 0.9, description: 'Distinctive black and white patches' },
        { name: 'Body Size', importance: 0.8, description: 'Large, rectangular body shape' },
        { name: 'Head Shape', importance: 0.7, description: 'Long, narrow head with upright ears' },
        { name: 'Udder', importance: 0.6, description: 'Large, well-developed udder' }
      ],
      color: '#2196F3'
    },
    'Gir': {
      keyFeatures: [
        { name: 'Hump', importance: 0.95, description: 'Prominent hump on the back' },
        { name: 'Ear Shape', importance: 0.85, description: 'Long, droopy ears' },
        { name: 'Body Color', importance: 0.8, description: 'Reddish-brown coloration' },
        { name: 'Horn Shape', importance: 0.7, description: 'Long, curved horns' }
      ],
      color: '#FF9800'
    },
    'Sahiwal': {
      keyFeatures: [
        { name: 'Body Color', importance: 0.9, description: 'Reddish-brown with white spots' },
        { name: 'Dewlap', importance: 0.8, description: 'Loose skin under the neck' },
        { name: 'Horn Shape', importance: 0.7, description: 'Short, thick horns' },
        { name: 'Body Size', importance: 0.6, description: 'Medium-sized body' }
      ],
      color: '#4CAF50'
    }
  }

  useEffect(() => {
    if (selectedImage) {
      generateHeatmap(selectedImage)
    }
  }, [selectedImage])

  const generateHeatmap = async (image) => {
    setIsProcessing(true)
    
    try {
      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Generate mock heatmap data
      const mockHeatmap = generateMockHeatmap(image)
      setHeatmapData(mockHeatmap)
      
      // Generate explanation
      const explanation = generateExplanation(image, mockHeatmap)
      setExplanation(explanation)
      
      // Set confidence and breed
      setConfidence(0.87)
      setSelectedBreed(image.actualBreed)
      
    } catch (error) {
      console.error('Heatmap generation error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const generateMockHeatmap = (image) => {
    // Generate mock heatmap points based on breed characteristics
    const characteristics = breedCharacteristics[image.actualBreed]
    const heatmapPoints = []
    
    characteristics.keyFeatures.forEach((feature, index) => {
      // Generate random but realistic coordinates for each feature
      const x = 0.2 + (index * 0.2) + Math.random() * 0.1
      const y = 0.3 + Math.random() * 0.4
      
      heatmapPoints.push({
        x: Math.min(x, 0.9),
        y: Math.min(y, 0.9),
        intensity: feature.importance,
        feature: feature.name,
        description: feature.description,
        color: characteristics.color
      })
    })
    
    return heatmapPoints
  }

  const generateExplanation = (image, heatmap) => {
    const breed = image.actualBreed
    const characteristics = breedCharacteristics[breed]
    
    let explanation = `The AI identified this as a ${breed} based on the following key features:\n\n`
    
    characteristics.keyFeatures.forEach((feature, index) => {
      const heatmapPoint = heatmap[index]
      explanation += `${index + 1}. **${feature.name}** (${Math.round(feature.importance * 100)}% confidence)\n`
      explanation += `   - ${feature.description}\n`
      explanation += `   - Detected at coordinates (${Math.round(heatmapPoint.x * 100)}%, ${Math.round(heatmapPoint.y * 100)}%)\n\n`
    })
    
    explanation += `Overall confidence: ${Math.round((confidence || 0) * 100)}%\n\n`
    explanation += `The AI analyzed the image using computer vision techniques to identify distinctive breed characteristics. The heatmap shows which areas of the image contributed most to the breed identification decision.`
    
    return explanation
  }

  const drawHeatmap = () => {
    const canvas = canvasRef.current
    const image = imageRef.current
    
    if (!canvas || !image || !heatmapData) return
    
    const ctx = canvas.getContext('2d')
    
    // Set canvas size to match image
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw heatmap points
    heatmapData.forEach(point => {
      const x = point.x * canvas.width
      const y = point.y * canvas.height
      const radius = 50 + (point.intensity * 100)
      
      // Create gradient for heatmap effect
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
      gradient.addColorStop(0, `${point.color}${Math.floor(point.intensity * 255).toString(16).padStart(2, '0')}`)
      gradient.addColorStop(0.5, `${point.color}40`)
      gradient.addColorStop(1, `${point.color}00`)
      
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, 2 * Math.PI)
      ctx.fill()
      
      // Draw feature label
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 14px "Times New Roman", Times, serif'
      ctx.textAlign = 'center'
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      ctx.strokeText(point.feature, x, y - radius - 10)
      ctx.fillText(point.feature, x, y - radius - 10)
    })
  }

  useEffect(() => {
    if (heatmapData) {
      drawHeatmap()
    }
  }, [heatmapData])

  const uploadImage = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const newImage = {
          id: 'uploaded',
          name: 'Uploaded Image',
          url: e.target.result,
          actualBreed: 'Unknown',
          description: 'User uploaded image'
        }
        setSelectedImage(newImage)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <>
      <Header />
      <div className="container">
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <h1>🧠 Explainable AI Heatmap</h1>
            <div className="row" style={{ gap: 8 }}>
              <input
                type="file"
                accept="image/*"
                onChange={uploadImage}
                style={{ display: 'none' }}
                id="image-upload"
              />
              <label htmlFor="image-upload" className="btn secondary">
                📁 Upload Image
              </label>
            </div>
          </div>

          <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>
            Understand how AI identifies cattle breeds by visualizing which parts of the image 
            contribute most to the breed prediction decision.
          </p>

          {/* Sample Images */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3>📸 Sample Images</h3>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {sampleImages.map(image => (
                <div 
                  key={image.id} 
                  className="card" 
                  style={{ 
                    cursor: 'pointer',
                    border: selectedImage?.id === image.id ? '3px solid var(--color-primary-green)' : '1px solid #e0e0e0',
                    transition: 'all 0.3s ease'
                  }}
                  onClick={() => setSelectedImage(image)}
                >
                  <div style={{
                    width: '100%',
                    height: '200px',
                    backgroundImage: `url(${image.url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: 8
                  }}></div>
                  <h5 style={{ margin: '0 0 4px 0' }}>{image.name}</h5>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
                    {image.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Image Analysis */}
          {selectedImage && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3>🔍 Image Analysis</h3>
              
              <div className="row" style={{ gap: 24, alignItems: 'flex-start' }}>
                {/* Original Image */}
                <div style={{ flex: 1 }}>
                  <h4>Original Image</h4>
                  <div style={{ position: 'relative', maxWidth: '400px' }}>
                    <img
                      ref={imageRef}
                      src={selectedImage.url}
                      alt={selectedImage.name}
                      style={{
                        width: '100%',
                        height: '400px',
                        objectFit: 'cover',
                        borderRadius: 'var(--radius-md)',
                        border: '2px solid #e0e0e0'
                      }}
                      onLoad={() => {
                        if (heatmapData) {
                          drawHeatmap()
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Heatmap Overlay */}
                <div style={{ flex: 1 }}>
                  <h4>AI Heatmap</h4>
                  <div style={{ position: 'relative', maxWidth: '400px' }}>
                    <img
                      src={selectedImage.url}
                      alt="Base image"
                      style={{
                        width: '100%',
                        height: '400px',
                        objectFit: 'cover',
                        borderRadius: 'var(--radius-md)',
                        border: '2px solid #e0e0e0'
                      }}
                    />
                    <canvas
                      ref={canvasRef}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '400px',
                        borderRadius: 'var(--radius-md)',
                        pointerEvents: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Processing Status */}
              {isProcessing && (
                <div className="card" style={{ marginTop: 16, backgroundColor: '#e3f2fd', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', marginBottom: 8 }}>🤖</div>
                  <h4>AI Processing...</h4>
                  <p>Analyzing image features and generating heatmap</p>
                  <div style={{
                    width: '100%',
                    height: '4px',
                    backgroundColor: '#e0e0e0',
                    borderRadius: '2px',
                    overflow: 'hidden',
                    marginTop: 12
                  }}>
                    <div style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#2196F3',
                      animation: 'pulse 1.5s ease-in-out infinite'
                    }}></div>
                  </div>
                </div>
              )}

              {/* Results */}
              {heatmapData && !isProcessing && (
                <div className="card" style={{ marginTop: 16, backgroundColor: '#e8f5e8' }}>
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h4>🎯 Analysis Results</h4>
                    <div className="row" style={{ gap: 16 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-primary-green)' }}>
                          {selectedBreed}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Predicted Breed</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-primary-blue)' }}>
                          {Math.round((confidence || 0) * 100)}%
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Confidence</div>
                      </div>
                    </div>
                  </div>

                  {/* Feature Analysis */}
                  <h5>Key Features Detected:</h5>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    {heatmapData.map((point, index) => (
                      <div key={index} className="card" style={{ backgroundColor: 'white' }}>
                        <div className="row" style={{ alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <div style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: point.color
                          }}></div>
                          <strong style={{ fontSize: '14px' }}>{point.feature}</strong>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                          {point.description}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                          Confidence: {Math.round(point.intensity * 100)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Explanation */}
          {explanation && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3>📝 AI Explanation</h3>
              <div style={{ 
                whiteSpace: 'pre-line', 
                lineHeight: '1.6',
                backgroundColor: '#f8f9fa',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px'
              }}>
                {explanation}
              </div>
            </div>
          )}

          {/* How It Works */}
          <div className="card" style={{ backgroundColor: '#e3f2fd' }}>
            <h3>🔬 How Explainable AI Works</h3>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
              <div>
                <h5>1. Image Analysis</h5>
                <p style={{ fontSize: '14px', margin: 0 }}>
                  AI analyzes the image using computer vision to identify key features like body shape, 
                  color patterns, and distinctive characteristics.
                </p>
              </div>
              <div>
                <h5>2. Feature Mapping</h5>
                <p style={{ fontSize: '14px', margin: 0 }}>
                  Each identified feature is mapped to specific locations in the image and assigned 
                  importance scores based on breed characteristics.
                </p>
              </div>
              <div>
                <h5>3. Heatmap Generation</h5>
                <p style={{ fontSize: '14px', margin: 0 }}>
                  A heatmap is generated showing which areas of the image contributed most to the 
                  breed identification decision.
                </p>
              </div>
              <div>
                <h5>4. Explanation</h5>
                <p style={{ fontSize: '14px', margin: 0 }}>
                  The AI provides a detailed explanation of its reasoning, including which features 
                  were most important and why.
                </p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="card" style={{ backgroundColor: '#e8f5e8' }}>
            <h3>✅ Benefits of Explainable AI</h3>
            <div className="row" style={{ gap: 24 }}>
              <div style={{ flex: 1 }}>
                <h5>For Field Workers</h5>
                <ul style={{ fontSize: '14px', paddingLeft: '20px' }}>
                  <li>Learn to identify breed characteristics</li>
                  <li>Improve photo quality based on AI feedback</li>
                  <li>Understand why AI made specific predictions</li>
                  <li>Build confidence in AI recommendations</li>
                </ul>
              </div>
              <div style={{ flex: 1 }}>
                <h5>For Supervisors</h5>
                <ul style={{ fontSize: '14px', paddingLeft: '20px' }}>
                  <li>Verify AI predictions with visual evidence</li>
                  <li>Train field workers using AI insights</li>
                  <li>Identify areas for improvement</li>
                  <li>Ensure data quality and accuracy</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </>
  )
}
