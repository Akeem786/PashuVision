import { useTranslation } from 'react-i18next'

export default function Footer() {
  return (
    <footer style={{
      background: 'var(--glass-bg)',
      backdropFilter: 'var(--glass-blur)',
      borderTop: '1px solid var(--glass-border)',
      marginTop: 'auto',
      padding: 'var(--spacing-md) 0',
      fontFamily: 'Times New Roman, serif'
    }}>
      <div className="footer-container" style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 var(--spacing-lg)'
      }}>
        {/* Professional Footer */}
        <div className="footer-content" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--spacing-md)'
        }}>
          {/* Copyright */}
          <div style={{
            color: 'var(--color-text-muted)',
            fontSize: '0.85rem',
            fontWeight: '400',
            letterSpacing: '0.3px'
          }}>
            © 2026 PashuVision. All rights reserved.
          </div>
          
          {/* Contact Info */}
          <div className="footer-contact" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-md)'
          }}>
            <div style={{
              color: 'var(--color-text-primary)',
              fontSize: '0.85rem',
              fontWeight: '500',
              letterSpacing: '0.2px'
            }}>
              Developed by <span style={{ color: 'var(--color-primary, #11a36a)', fontWeight: '700' }}>Akeem</span>
            </div>
            <div className="footer-divider" style={{
              width: '1px',
              height: '16px',
              background: 'var(--color-border)'
            }}></div>
            <div style={{
              color: 'var(--color-text-primary)',
              fontSize: '0.85rem',
              fontWeight: '500',
              letterSpacing: '0.2px'
            }}>
              +91 9320621856
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
