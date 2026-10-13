const twilio = require('twilio');

/**
 * SMSProvider - Twilio SMS Dispatcher with Safe Phone Masking & Dev Mocking
 *
 * Configured via environment variables:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_PHONE_NUMBER (or TWILIO_FROM)
 */
class SMSProvider {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || null;
    this.authToken = process.env.TWILIO_AUTH_TOKEN || null;
    this.fromPhone = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM || process.env.TWILIO_PHONE || null;

    this.client = null;
    if (this.isConfigured()) {
      try {
        this.client = twilio(this.accountSid, this.authToken);
      } catch (err) {
        console.error('❌ Failed to initialize Twilio client:', err.message);
      }
    }
  }

  /**
   * Helper to mask phone numbers for safe logging (e.g. +91*****4567)
   */
  maskPhone(phone) {
    if (!phone || typeof phone !== 'string') return 'unknown';
    const cleaned = phone.trim();
    if (cleaned.length <= 4) return '****';
    const prefix = cleaned.slice(0, 3);
    const suffix = cleaned.slice(-4);
    return `${prefix}*****${suffix}`;
  }

  isConfigured() {
    const hasValidSid = Boolean(
      this.accountSid &&
      this.accountSid.startsWith('AC') &&
      this.accountSid.length === 34 &&
      !this.accountSid.includes('mock')
    );
    const hasValidToken = Boolean(
      this.authToken &&
      this.authToken.length >= 16 &&
      !this.authToken.includes('mock')
    );
    const hasPhone = Boolean(this.fromPhone && !this.fromPhone.includes('1234567890'));

    return hasValidSid && hasValidToken && hasPhone;
  }

  getStatus() {
    const configured = this.isConfigured();
    const isProd = process.env.NODE_ENV === 'production';
    return {
      channel: 'sms',
      configured,
      status: configured ? 'CONFIGURED' : (isProd ? 'NOT_CONFIGURED' : 'MOCK_DEVELOPMENT'),
      from: this.maskPhone(this.fromPhone),
      mode: isProd ? 'production' : 'development'
    };
  }

  /**
   * Send an SMS message.
   *
   * @param {Object} options - { to, message }
   * @returns {Promise<{ status: 'SENT'|'FAILED'|'MOCK_DEVELOPMENT'|'NOT_CONFIGURED', channel: 'sms', sid?: string, error?: string, recipient: string }>}
   */
  async send({ to, message }) {
    const maskedRecipient = this.maskPhone(to);
    const isProd = process.env.NODE_ENV === 'production';

    if (!to || !message) {
      return {
        status: 'FAILED',
        channel: 'sms',
        error: 'Missing required recipient phone (to) or message text',
        recipient: maskedRecipient
      };
    }

    // 1. Live Twilio SMS delivery when configured
    if (this.isConfigured() && this.client) {
      try {
        const result = await this.client.messages.create({
          from: this.fromPhone,
          to,
          body: message
        });

        console.log(`📱 [SMS_SENT] to: ${maskedRecipient}, sid: ${result.sid}`);
        return {
          status: 'SENT',
          channel: 'sms',
          sid: result.sid,
          recipient: maskedRecipient
        };
      } catch (err) {
        console.error(`❌ [SMS_FAILED] to: ${maskedRecipient}, error: ${err.message}`);
        return {
          status: 'FAILED',
          channel: 'sms',
          error: err.message,
          recipient: maskedRecipient
        };
      }
    }

    // 2. Production mode without valid Twilio credentials: strictly NOT_CONFIGURED
    if (isProd) {
      console.warn(`⚠️ [SMS_NOT_CONFIGURED] Attempted to dispatch SMS to ${maskedRecipient} in production without Twilio credentials.`);
      return {
        status: 'NOT_CONFIGURED',
        channel: 'sms',
        error: 'Twilio SMS provider credentials are not configured in production.',
        recipient: maskedRecipient
      };
    }

    // 3. Development / Staging mock mode with clear logging
    console.log(`📱 [DEV_MOCK_SMS] to: ${maskedRecipient} | message: "${message.substring(0, 100).trim()}..."`);
    return {
      status: 'MOCK_DEVELOPMENT',
      channel: 'sms',
      sid: `mock-sms-${Date.now()}`,
      recipient: maskedRecipient,
      note: 'Logged to console in development mode. Configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN for live SMS delivery.'
    };
  }
}

module.exports = SMSProvider;
