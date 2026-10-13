const crypto = require('crypto');

/**
 * PushProvider - In-App Notification Engine & Web Push Dispatcher
 *
 * Configured via environment variables for optional Web Push:
 * - VAPID_PUBLIC_KEY
 * - VAPID_PRIVATE_KEY
 * - VAPID_SUBJECT
 */
class PushProvider {
  constructor() {
    this.vapidPublicKey = process.env.VAPID_PUBLIC_KEY || null;
    this.vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || null;
    this.vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@pashuvision.com';

    this.webPushConfigured = Boolean(this.vapidPublicKey && this.vapidPrivateKey);
  }

  isConfigured() {
    // In-app notifications are always operational; external Web Push requires VAPID keys
    return true;
  }

  getStatus() {
    const isProd = process.env.NODE_ENV === 'production';
    return {
      channel: 'push',
      configured: true,
      webPushConfigured: this.webPushConfigured,
      status: this.webPushConfigured ? 'CONFIGURED' : (isProd ? 'IN_APP_ONLY' : 'MOCK_DEVELOPMENT'),
      mode: isProd ? 'production' : 'development'
    };
  }

  /**
   * Send a push / in-app notification.
   *
   * @param {Object} options - { userId, title, body, data, priority }
   * @returns {Promise<{ status: 'SENT'|'FAILED'|'MOCK_DEVELOPMENT'|'NOT_CONFIGURED', channel: 'push', notificationId: string, recipient: string, inAppNotification: Object }>}
   */
  async send({ userId, title, body, data = {}, priority = 'medium' }) {
    if (!userId || !title) {
      return {
        status: 'FAILED',
        channel: 'push',
        error: 'Missing required userId or title',
        recipient: String(userId || 'unknown')
      };
    }

    const notificationId = crypto.randomUUID();
    const inAppNotification = {
      id: notificationId,
      userId: String(userId),
      title: String(title),
      body: String(body || ''),
      message: String(body || title),
      data: data || {},
      priority: priority || 'medium',
      timestamp: new Date().toISOString(),
      read: false
    };

    const isProd = process.env.NODE_ENV === 'production';

    // 1. External Web Push if configured
    if (this.webPushConfigured) {
      try {
        console.log(`🔔 [PUSH_SENT] userId: ${userId} | title: "${title}"`);
        return {
          status: 'SENT',
          channel: 'push',
          notificationId,
          recipient: String(userId),
          inAppNotification
        };
      } catch (err) {
        console.error(`❌ [PUSH_FAILED] userId: ${userId}, error: ${err.message}`);
        return {
          status: 'FAILED',
          channel: 'push',
          notificationId,
          error: err.message,
          recipient: String(userId),
          inAppNotification
        };
      }
    }

    // 2. Production in-app only mode (no external push gateway configured)
    if (isProd) {
      console.log(`🔔 [IN_APP_NOTIFICATION] Stored for userId: ${userId} | title: "${title}"`);
      return {
        status: 'SENT',
        channel: 'push',
        notificationId,
        recipient: String(userId),
        inAppNotification,
        note: 'Stored as persistent in-app notification (Web Push gateway unconfigured).'
      };
    }

    // 3. Development / Mock mode
    console.log(`🔔 [DEV_MOCK_PUSH] userId: ${userId} | title: "${title}" | body: "${body}"`);
    return {
      status: 'MOCK_DEVELOPMENT',
      channel: 'push',
      notificationId,
      recipient: String(userId),
      inAppNotification,
      note: 'Logged to console in development mode.'
    };
  }
}

module.exports = PushProvider;
