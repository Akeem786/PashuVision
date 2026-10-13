const nodemailer = require('nodemailer');

/**
 * EmailProvider - SMTP Email Dispatcher with Safe Logging & Dev Mocking
 *
 * Configured via environment variables:
 * - SMTP_HOST
 * - SMTP_PORT (default 587)
 * - SMTP_SECURE (default false, true for 465)
 * - SMTP_USER (or EMAIL_USER)
 * - SMTP_PASS (or EMAIL_PASS)
 * - EMAIL_FROM
 */
class EmailProvider {
  constructor() {
    this.host = process.env.SMTP_HOST || (process.env.EMAIL_USER && process.env.EMAIL_USER.includes('@gmail.com') ? 'smtp.gmail.com' : null);
    this.port = parseInt(process.env.SMTP_PORT, 10) || 587;
    this.secure = process.env.SMTP_SECURE === 'true' || this.port === 465;
    this.user = process.env.SMTP_USER || process.env.EMAIL_USER || null;
    this.pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || null;
    this.from = process.env.EMAIL_FROM || this.user || 'noreply@pashuvision.com';

    this.transporter = null;
    if (this.isConfigured()) {
      try {
        this.transporter = nodemailer.createTransport({
          host: this.host,
          port: this.port,
          secure: this.secure,
          auth: {
            user: this.user,
            pass: this.pass
          }
        });
      } catch (err) {
        console.error('❌ Failed to initialize Nodemailer transport:', err.message);
      }
    }
  }

  /**
   * Helper to mask email address for safe logging (e.g. j***e@example.com)
   */
  maskEmail(email) {
    if (!email || typeof email !== 'string') return 'unknown';
    const parts = email.split('@');
    if (parts.length !== 2) return '***';
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) return `${name[0]}***@${domain}`;
    return `${name[0]}***${name[name.length - 1]}@${domain}`;
  }

  isConfigured() {
    return Boolean(this.host && this.user && this.pass && !this.pass.includes('your-app-password') && !this.user.includes('your-email'));
  }

  getStatus() {
    const configured = this.isConfigured();
    const isProd = process.env.NODE_ENV === 'production';
    return {
      channel: 'email',
      configured,
      status: configured ? 'CONFIGURED' : (isProd ? 'NOT_CONFIGURED' : 'MOCK_DEVELOPMENT'),
      host: this.host ? this.host.replace(/(?<=.{3}).(?=.*?\.)/g, '*') : null,
      from: this.maskEmail(this.from),
      mode: isProd ? 'production' : 'development'
    };
  }

  /**
   * Send an email message.
   *
   * @param {Object} options - { to, subject, html, text }
   * @returns {Promise<{ status: 'SENT'|'FAILED'|'MOCK_DEVELOPMENT'|'NOT_CONFIGURED', channel: 'email', messageId?: string, error?: string, recipient: string }>}
   */
  async send({ to, subject, html, text }) {
    const maskedRecipient = this.maskEmail(to);
    const isProd = process.env.NODE_ENV === 'production';

    if (!to || !subject) {
      return {
        status: 'FAILED',
        channel: 'email',
        error: 'Missing required recipient (to) or subject',
        recipient: maskedRecipient
      };
    }

    // 1. Live SMTP Delivery when configured
    if (this.isConfigured() && this.transporter) {
      try {
        const mailOptions = {
          from: this.from,
          to,
          subject,
          html,
          text: text || html?.replace(/<[^>]*>?/gm, '')
        };

        const result = await this.transporter.sendMail(mailOptions);
        console.log(`📧 [EMAIL_SENT] to: ${maskedRecipient}, messageId: ${result.messageId}`);
        return {
          status: 'SENT',
          channel: 'email',
          messageId: result.messageId,
          recipient: maskedRecipient
        };
      } catch (err) {
        console.error(`❌ [EMAIL_FAILED] to: ${maskedRecipient}, error: ${err.message}`);
        return {
          status: 'FAILED',
          channel: 'email',
          error: err.message,
          recipient: maskedRecipient
        };
      }
    }

    // 2. Production mode without credentials: strictly NOT_CONFIGURED
    if (isProd) {
      console.warn(`⚠️ [EMAIL_NOT_CONFIGURED] Attempted to dispatch email to ${maskedRecipient} in production without SMTP credentials.`);
      return {
        status: 'NOT_CONFIGURED',
        channel: 'email',
        error: 'SMTP email provider credentials are not configured in production.',
        recipient: maskedRecipient
      };
    }

    // 3. Development / Staging mock mode with clear logging
    console.log(`📧 [DEV_MOCK_EMAIL] to: ${maskedRecipient} | subject: "${subject}"`);
    console.log(`   Preview: "${(text || html || '').substring(0, 100).trim()}..."`);
    return {
      status: 'MOCK_DEVELOPMENT',
      channel: 'email',
      messageId: `mock-email-${Date.now()}`,
      recipient: maskedRecipient,
      note: 'Logged to console in development mode. Set SMTP environment variables for live delivery.'
    };
  }
}

module.exports = EmailProvider;
