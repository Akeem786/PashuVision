import { Link } from 'react-router-dom'
import Footer from './components/Footer.jsx'
import DynamicStats from './components/DynamicStats.jsx'
import './App.css'

function App() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column' 
    }}>
      <main style={{ flex: 1 }}>
        {/* Hero Section - Government Style */}
        <section className="pv-hero-section">
          {/* Background Pattern */}
          <div className="pv-hero-bg-pattern"></div>
          
          <div className="pv-hero-container">
            <div className="pv-hero-grid">
              {/* Left Content */}
              <div className="pv-hero-content-left">
                <h1 className="pv-hero-title">
                  PashuVision
                </h1>
                
                <h2 className="pv-hero-subtitle">
                  Digital Livestock Management System
                </h2>
                
                <p className="pv-hero-description">
                  Empowering farmers with AI-powered breed recognition, health monitoring, and comprehensive livestock analytics for sustainable agriculture
                </p>
                
                {/* Key Features */}
                <div className="pv-hero-features">
                  <div className="pv-hero-badge">
                    🤖 AI Breed Recognition
                  </div>
                  <div className="pv-hero-badge">
                    📱 Mobile Ready
                  </div>
                  <div className="pv-hero-badge">
                    🌐 Multi-Language
                  </div>
                  <div className="pv-hero-badge">
                    🔒 Secure & Reliable
                  </div>
                </div>
                
                <div className="pv-hero-buttons">
                  <Link 
                    className="pv-btn-primary" 
                    to="/login"
                  >
                    Login to System
                  </Link>
                  <Link 
                    className="pv-btn-secondary" 
                    to="/register"
                  >
                    Register Now
                  </Link>
                </div>
              </div>

            {/* Right Content - Official Style */}
            <div className="pv-hero-content-right">
              <div className="pv-registry-card">
                <div className="pv-registry-images">
                  <img 
                    src="https://www.shutterstock.com/image-photo/white-cow-calf-lying-pasture-260nw-2365649603.jpg"
                    alt="Indian Cow"
                    className="pv-registry-img"
                  />
                  <img 
                    src="data:image/jpeg;base64,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"
                    alt="Indian Buffalo"
                    className="pv-registry-img"
                  />
                </div>
                <h3 className="pv-registry-title">
                  Digital Livestock Registry
                </h3>
                <p className="pv-registry-text">
                  Comprehensive AI-powered platform for cattle and buffalo management, health monitoring, and breed identification
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

        {/* Government Statistics Section */}
        <section className="pv-stats-section">
          <div className="pv-stats-container">
            <div className="pv-stats-header">
              <h2 className="pv-stats-heading">
                Platform Statistics
              </h2>
              <p className="pv-stats-subheading">
                Trusted by thousands of farmers and agricultural professionals across India
              </p>
            </div>
            
            <DynamicStats />
          </div>
        </section>

        {/* Features Section - Government Style */}
        <section style={{
          padding: 'var(--spacing-xl) 0',
          background: 'var(--color-bg-primary)'
        }}>
      <div className="container">
            <div style={{
              textAlign: 'center',
              marginBottom: 'var(--spacing-xl)'
            }}>
              <h2 style={{
                fontSize: '2.5rem',
                fontWeight: 'bold',
                marginBottom: 'var(--spacing-md)',
                fontFamily: 'Times New Roman, serif',
                color: 'var(--color-text-primary)'
              }}>
                Key Features
              </h2>
              <p style={{
                fontSize: '1.1rem',
                color: 'var(--color-text-secondary)',
                maxWidth: '600px',
                margin: '0 auto',
                lineHeight: 1.6
              }}>
                Advanced technology meets traditional livestock management for modern agricultural practices
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 'var(--spacing-lg)'
            }}>
              {/* Feature 1 */}
              <div className="card" style={{
                textAlign: 'center',
                padding: 'var(--spacing-xl)',
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur)',
                border: '1px solid var(--glass-border)',
                transition: 'transform 0.3s ease',
                boxShadow: 'var(--shadow-md)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-5px)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
              }}>
                <img 
                  src="https://images.unsplash.com/photo-1500595046743-cd271d694d30?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80"
                  alt="AI Technology"
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    marginBottom: 'var(--spacing-md)',
                    border: '3px solid var(--color-primary-green)'
                  }}
                />
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  marginBottom: 'var(--spacing-sm)',
                  fontFamily: 'Times New Roman, serif',
                  color: 'var(--color-text-primary)'
                }}>
                  AI-Powered Recognition
                </h3>
                <p style={{
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.6
                }}>
                  Advanced machine learning algorithms for accurate breed identification and health monitoring
                </p>
              </div>

              {/* Feature 2 */}
              <div className="card" style={{
                textAlign: 'center',
                padding: 'var(--spacing-xl)',
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur)',
                border: '1px solid var(--glass-border)',
                transition: 'transform 0.3s ease',
                boxShadow: 'var(--shadow-md)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-5px)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
              }}>
                <img 
                  src="https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80"
                  alt="Mobile Technology"
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    marginBottom: 'var(--spacing-md)',
                    border: '3px solid var(--color-primary-blue)'
                  }}
                />
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  marginBottom: 'var(--spacing-sm)',
                  fontFamily: 'Times New Roman, serif',
                  color: 'var(--color-text-primary)'
                }}>
                  Multi-Language Support
                </h3>
                <p style={{
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.6
                }}>
                  Available in English, Hindi, and Urdu with voice commands for accessibility
                </p>
              </div>

              {/* Feature 3 */}
              <div className="card" style={{
                textAlign: 'center',
                padding: 'var(--spacing-xl)',
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur)',
                border: '1px solid var(--glass-border)',
                transition: 'transform 0.3s ease',
                boxShadow: 'var(--shadow-md)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-5px)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
              }}>
                <img 
                  src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80"
                  alt="Mobile Ready"
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    marginBottom: 'var(--spacing-md)',
                    border: '3px solid var(--color-golden-yellow)'
                  }}
                />
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  marginBottom: 'var(--spacing-sm)',
                  fontFamily: 'Times New Roman, serif',
                  color: 'var(--color-text-primary)'
                }}>
                  Mobile Ready
                </h3>
                <p style={{
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.6
                }}>
                  Responsive design that works perfectly on all devices with offline capabilities
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Official CTA Section */}
        <section style={{
          padding: 'var(--spacing-xl) 0',
          background: 'linear-gradient(135deg, var(--color-primary-green), var(--color-primary-blue))',
          textAlign: 'center'
        }}>
          <div className="container">
            <h2 style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              marginBottom: 'var(--spacing-md)',
              fontFamily: 'Times New Roman, serif',
              color: 'white'
            }}>
              Join the Digital Livestock Revolution
            </h2>
            <p style={{
              fontSize: '1.2rem',
              marginBottom: 'var(--spacing-xl)',
              color: 'rgba(255,255,255,0.9)',
              maxWidth: '600px',
              margin: '0 auto var(--spacing-xl) auto'
            }}>
              Be part of India's digital transformation in livestock management
            </p>
            <div style={{
              display: 'flex',
              gap: 'var(--spacing-md)',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <Link 
                className="btn secondary" 
                to="/help"
                style={{
                  fontSize: '1.2rem',
                  padding: 'var(--spacing-md) var(--spacing-xl)',
                  background: 'transparent',
                  border: '2px solid white',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: 'var(--radius-lg)',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease',
                  fontFamily: 'Times New Roman, serif'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255,255,255,0.1)'
                  e.target.style.transform = 'translateY(-3px)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent'
                  e.target.style.transform = 'translateY(0)'
                }}
              >
                Learn More
              </Link>
        </div>
      </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default App