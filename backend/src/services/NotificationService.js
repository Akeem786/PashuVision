const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const crypto = require('crypto');

const EmailProvider = require('./notifications/EmailProvider');
const SMSProvider = require('./notifications/SMSProvider');
const PushProvider = require('./notifications/PushProvider');

/**
 * NotificationService - Multichannel notification engine for PashuVision
 * Orchestrates Email, SMS, and Push dispatches with user preferences and strict delivery states:
 * - SENT: Real provider successfully delivered
 * - FAILED: Delivery error reported by provider
 * - MOCK_DEVELOPMENT: Logged to console in non-production mode
 * - NOT_CONFIGURED: Production mode with missing credentials
 * - DISABLED_BY_USER: Channel opt-out via user preferences
 */
class NotificationService {
  constructor() {
    this.emailProvider = new EmailProvider();
    this.smsProvider = new SMSProvider();
    this.pushProvider = new PushProvider();

    this.notifications = [];
    this.scheduleReminders();
  }

  getDataDir() {
    const dir = process.env.VERCEL ? '/tmp/data' : path.join(__dirname, '..', '..', 'data');
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (e) {
        // directory creation fallback
      }
    }
    return dir;
  }

  getPreferencesFile() {
    return path.join(this.getDataDir(), 'notification_preferences.json');
  }

  getNotificationsFile() {
    return path.join(this.getDataDir(), 'notifications.json');
  }

  /**
   * Get provider status for health inspection without exposing credentials
   */
  getProviderStatus() {
    return {
      email: this.emailProvider.getStatus(),
      sms: this.smsProvider.getStatus(),
      push: this.pushProvider.getStatus(),
      environment: process.env.NODE_ENV || 'development'
    };
  }

  /**
   * Retrieve notification preferences for a user
   */
  getPreferences(userId) {
    const defaultPrefs = {
      email: true,
      sms: true,
      push: true,
      vaccinationReminders: true,
      healthAlerts: true,
      approvalNotifications: true
    };

    if (!userId) return defaultPrefs;

    try {
      const file = this.getPreferencesFile();
      if (fs.existsSync(file)) {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (data[userId]) {
          return { ...defaultPrefs, ...data[userId] };
        }
      }
    } catch (e) {
      console.error('Error reading preferences:', e.message);
    }
    return defaultPrefs;
  }

  /**
   * Save user notification preferences
   */
  savePreferences(userId, newPrefs) {
    if (!userId) return false;
    try {
      const file = this.getPreferencesFile();
      let data = {};
      if (fs.existsSync(file)) {
        try {
          data = JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch (_) {
          data = {};
        }
      }
      const existing = data[userId] || {
        email: true,
        sms: true,
        push: true,
        vaccinationReminders: true,
        healthAlerts: true,
        approvalNotifications: true
      };
      data[userId] = { ...existing, ...newPrefs, updatedAt: new Date().toISOString() };
      fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
      return data[userId];
    } catch (e) {
      console.error('Error saving notification preferences:', e.message);
      return false;
    }
  }

  /**
   * Universal multichannel notification dispatcher
   *
   * @param {Object} params
   * @param {Object} params.user - { id, email, phone, name }
   * @param {string} params.type - 'vaccination' | 'health_alert' | 'approval' | 'general'
   * @param {string} params.title - Title / subject
   * @param {string} params.message - Body text
   * @param {string} [params.html] - Optional HTML for email
   * @param {string} [params.priority] - 'high' | 'medium' | 'low'
   * @param {string[]} [params.channels] - Requested channels ['email', 'sms', 'push']
   * @param {Object} [params.metadata] - Extra metadata
   */
  async dispatchNotification({
    user = {},
    type = 'general',
    title,
    message,
    html = null,
    priority = 'medium',
    channels = ['email', 'sms', 'push'],
    metadata = {}
  }) {
    const userId = user.id || user.userId || user.sub;
    const email = user.email;
    const phone = user.phone;
    const prefs = this.getPreferences(userId);

    const results = [];

    // Check type-level opt-out
    if (type === 'vaccination' && prefs.vaccinationReminders === false) {
      return {
        notificationId: crypto.randomUUID(),
        type,
        title,
        message,
        dispatched: false,
        reason: 'OPTED_OUT_OF_CATEGORY',
        results: [{ channel: 'all', status: 'DISABLED_BY_USER' }]
      };
    }
    if (type === 'health_alert' && prefs.healthAlerts === false) {
      return {
        notificationId: crypto.randomUUID(),
        type,
        title,
        message,
        dispatched: false,
        reason: 'OPTED_OUT_OF_CATEGORY',
        results: [{ channel: 'all', status: 'DISABLED_BY_USER' }]
      };
    }
    if (type === 'approval' && prefs.approvalNotifications === false) {
      return {
        notificationId: crypto.randomUUID(),
        type,
        title,
        message,
        dispatched: false,
        reason: 'OPTED_OUT_OF_CATEGORY',
        results: [{ channel: 'all', status: 'DISABLED_BY_USER' }]
      };
    }

    // 1. Email Channel
    if (channels.includes('email')) {
      if (prefs.email === false) {
        results.push({ channel: 'email', status: 'DISABLED_BY_USER', recipient: this.emailProvider.maskEmail(email) });
      } else if (!email) {
        results.push({ channel: 'email', status: 'FAILED', error: 'No recipient email address provided', recipient: 'none' });
      } else {
        const emailRes = await this.emailProvider.send({
          to: email,
          subject: title,
          html: html || `<div style="font-family:sans-serif;"><h3>${title}</h3><p>${message}</p></div>`,
          text: message
        });
        results.push(emailRes);
      }
    }

    // 2. SMS Channel
    if (channels.includes('sms')) {
      if (prefs.sms === false) {
        results.push({ channel: 'sms', status: 'DISABLED_BY_USER', recipient: this.smsProvider.maskPhone(phone) });
      } else if (!phone) {
        results.push({ channel: 'sms', status: 'FAILED', error: 'No recipient phone number provided', recipient: 'none' });
      } else {
        const smsRes = await this.smsProvider.send({
          to: phone,
          message: `${title}: ${message}`
        });
        results.push(smsRes);
      }
    }

    // 3. Push Channel & In-App Storage
    if (channels.includes('push')) {
      if (prefs.push === false) {
        results.push({ channel: 'push', status: 'DISABLED_BY_USER', recipient: String(userId || 'none') });
      } else {
        const pushRes = await this.pushProvider.send({
          userId: userId || 'broadcast',
          title,
          body: message,
          data: { type, ...metadata },
          priority
        });
        results.push(pushRes);

        // Also save to persistent notifications.json for user fetching
        if (pushRes.inAppNotification) {
          const inApp = {
            ...pushRes.inAppNotification,
            type,
            ownerName: user.name || 'Owner',
            animalId: metadata.animalId || null,
            dueDate: metadata.dueDate || null
          };
          this.saveNotifications([inApp]);
        }
      }
    }

    const hasSuccess = results.some(r => r.status === 'SENT' || r.status === 'MOCK_DEVELOPMENT');

    return {
      notificationId: crypto.randomUUID(),
      type,
      title,
      message,
      dispatched: hasSuccess,
      results
    };
  }

  // --- Specialized Workflow Reminders ---

  async sendVaccinationReminder(animal, ownerContact = {}) {
    const title = `Vaccination Reminder - ${animal.predictedBreed || 'Animal'}`;
    const message = `Dear ${animal.ownerName || 'Owner'}, your ${animal.predictedBreed || 'animal'} (ID: ${animal.id || 'N/A'}) is due for vaccination.`;
    const html = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px;">
        <h2 style="color: #11a36a; margin-top: 0;">Vaccination Reminder</h2>
        <p>Dear <strong>${animal.ownerName || 'Owner'}</strong>,</p>
        <p>This is a reminder that your animal is due for scheduled vaccination.</p>
        <div style="background: #f8fafc; border-left: 4px solid #11a36a; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 4px 0;"><strong>Animal ID:</strong> ${animal.id || 'N/A'}</p>
          <p style="margin: 4px 0;"><strong>Breed:</strong> ${animal.predictedBreed || 'Unknown'}</p>
          <p style="margin: 4px 0;"><strong>Age:</strong> ${animal.ageMonths || 'N/A'} months</p>
          <p style="margin: 4px 0;"><strong>Location:</strong> ${animal.location || 'N/A'}</p>
        </div>
        <p>Please contact your nearest registered veterinary officer to update the vaccination record.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;">PashuVision Automated Livestock Health Monitoring</p>
      </div>
    `;

    return this.dispatchNotification({
      user: {
        id: ownerContact.userId || animal.userId,
        name: animal.ownerName,
        email: ownerContact.email,
        phone: ownerContact.phone
      },
      type: 'vaccination',
      title,
      message,
      html,
      priority: 'high',
      metadata: { animalId: animal.id }
    });
  }

  async sendHealthAlert(animal, healthData = {}, ownerContact = {}) {
    const issues = healthData?.diseases || [];
    const recommendations = healthData?.recommendations || [];
    const title = `Health Alert - ${animal.predictedBreed || 'Animal'}`;
    const issueCount = issues.length || 1;
    const message = `Health alert: ${issueCount} potential issue(s) detected in your ${animal.predictedBreed || 'animal'}. Consult your veterinarian.`;

    const html = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px;">
        <h2 style="color: #e53e3e; margin-top: 0;">⚠️ Health Alert Notice</h2>
        <p>Dear <strong>${animal.ownerName || 'Owner'}</strong>,</p>
        <p>Our veterinary analysis system flagged potential health concerns for your animal (ID: ${animal.id || 'N/A'}).</p>
        <div style="background: #fff5f5; border-left: 4px solid #e53e3e; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 4px 0;"><strong>Breed:</strong> ${animal.predictedBreed || 'Unknown'}</p>
          ${issues.map(d => `<p style="margin: 4px 0;">• ${d.type || 'Condition'}: Severity ${d.severity || 'Medium'}</p>`).join('')}
        </div>
        ${recommendations.length ? `<p><strong>Recommendations:</strong></p><ul>${recommendations.map(r => `<li>${r}</li>`).join('')}</ul>` : ''}
        <p style="color: #c53030; font-weight: bold;">Immediate veterinary inspection is advised.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;">PashuVision Health Intelligence</p>
      </div>
    `;

    return this.dispatchNotification({
      user: {
        id: ownerContact.userId || animal.userId,
        name: animal.ownerName,
        email: ownerContact.email,
        phone: ownerContact.phone
      },
      type: 'health_alert',
      title,
      message,
      html,
      priority: 'high',
      metadata: { animalId: animal.id, healthData }
    });
  }

  async sendApprovalNotification(animal, ownerContact = {}) {
    const title = `Record Approved - ${animal.predictedBreed || 'Animal'}`;
    const message = `Congratulations! Your animal record for ${animal.predictedBreed || 'livestock'} (ID: ${animal.id || 'N/A'}) has been officially approved.`;

    const html = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px;">
        <h2 style="color: #2b6cb0; margin-top: 0;">✅ Animal Record Approved</h2>
        <p>Dear <strong>${animal.ownerName || 'Owner'}</strong>,</p>
        <p>Great news! Your animal record has passed supervisor verification and is now verified in the PashuVision registry.</p>
        <div style="background: #ebf8ff; border-left: 4px solid #3182ce; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 4px 0;"><strong>Animal ID:</strong> ${animal.id || 'N/A'}</p>
          <p style="margin: 4px 0;"><strong>Verified Breed:</strong> ${animal.predictedBreed || 'N/A'}</p>
          <p style="margin: 4px 0;"><strong>Status:</strong> Approved & Registered</p>
        </div>
        <p>You can now generate official QR passports and certificates from your dashboard.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;">PashuVision National Livestock Register</p>
      </div>
    `;

    return this.dispatchNotification({
      user: {
        id: ownerContact.userId || animal.userId,
        name: animal.ownerName,
        email: ownerContact.email,
        phone: ownerContact.phone
      },
      type: 'approval',
      title,
      message,
      html,
      priority: 'medium',
      metadata: { animalId: animal.id }
    });
  }

  // --- Automated Cron Reminders ---

  scheduleReminders() {
    // Check for vaccination reminders daily at 9 AM
    cron.schedule('0 9 * * *', () => {
      this.checkVaccinationReminders();
    });

    // Check for general health reminders weekly (Mondays at 10 AM)
    cron.schedule('0 10 * * 1', () => {
      this.checkHealthReminders();
    });
  }

  async checkVaccinationReminders() {
    try {
      const animals = this.getAnimals();
      const reminders = [];

      animals.forEach(animal => {
        if (!animal.ageMonths || animal.status !== 'approved') return;

        const age = animal.ageMonths;

        if (age >= 3 && age <= 12) {
          reminders.push({
            id: crypto.randomUUID(),
            animalId: animal.id,
            userId: animal.userId || 'system',
            ownerName: animal.ownerName || 'Owner',
            type: 'vaccination',
            title: 'Vaccination Due',
            message: `${animal.predictedBreed || 'Animal'} needs primary vaccination series`,
            priority: 'high',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            timestamp: new Date().toISOString(),
            read: false
          });
        }

        if (age > 12 && age % 12 === 0) {
          reminders.push({
            id: crypto.randomUUID(),
            animalId: animal.id,
            userId: animal.userId || 'system',
            ownerName: animal.ownerName || 'Owner',
            type: 'vaccination',
            title: 'Annual Vaccination Due',
            message: `${animal.predictedBreed || 'Animal'} needs annual booster vaccination`,
            priority: 'medium',
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            timestamp: new Date().toISOString(),
            read: false
          });
        }

        if (animal.gender === 'female' && age >= 24) {
          reminders.push({
            id: crypto.randomUUID(),
            animalId: animal.id,
            userId: animal.userId || 'system',
            ownerName: animal.ownerName || 'Owner',
            type: 'health',
            title: 'Pregnancy Care Check',
            message: `${animal.predictedBreed || 'Animal'} eligible for pregnancy care program`,
            priority: 'low',
            dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
            timestamp: new Date().toISOString(),
            read: false
          });
        }
      });

      if (reminders.length > 0) {
        this.saveNotifications(reminders);
        console.log(`[NotificationService] Generated ${reminders.length} automated vaccination reminders.`);
      }
    } catch (error) {
      console.error('Error checking vaccination reminders:', error);
    }
  }

  async checkHealthReminders() {
    try {
      const animals = this.getAnimals();
      const reminders = [];

      animals.forEach(animal => {
        if (animal.status !== 'approved') return;

        reminders.push({
          id: crypto.randomUUID(),
          animalId: animal.id,
          userId: animal.userId || 'system',
          ownerName: animal.ownerName || 'Owner',
          type: 'health',
          title: 'Quarterly Health Inspection',
          message: `Schedule routine veterinary check for ${animal.predictedBreed || 'animal'}`,
          priority: 'low',
          dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          timestamp: new Date().toISOString(),
          read: false
        });
      });

      if (reminders.length > 0) {
        this.saveNotifications(reminders);
        console.log(`[NotificationService] Generated ${reminders.length} automated health reminders.`);
      }
    } catch (error) {
      console.error('Error checking health reminders:', error);
    }
  }

  getAnimals() {
    const animalsFile = path.join(this.getDataDir(), 'animals.json');
    try {
      if (!fs.existsSync(animalsFile)) return [];
      return JSON.parse(fs.readFileSync(animalsFile, 'utf8'));
    } catch {
      return [];
    }
  }

  saveNotifications(newNotifications) {
    const notificationsFile = this.getNotificationsFile();
    try {
      let existing = [];
      if (fs.existsSync(notificationsFile)) {
        try {
          existing = JSON.parse(fs.readFileSync(notificationsFile, 'utf8'));
        } catch (_) {
          existing = [];
        }
      }
      
      const allNotifications = [...existing, ...newNotifications];
      fs.writeFileSync(notificationsFile, JSON.stringify(allNotifications, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }

  getNotifications(userId, limit = 50) {
    const notificationsFile = this.getNotificationsFile();
    try {
      if (!fs.existsSync(notificationsFile)) return [];
      const all = JSON.parse(fs.readFileSync(notificationsFile, 'utf8'));
      
      // Filter by userId or system/broadcast notifications
      const userNotifications = all.filter(n => 
        !userId || n.userId === userId || n.userId === 'system' || n.userId === 'broadcast'
      );
      
      return userNotifications
        .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
        .slice(0, limit);
    } catch {
      return [];
    }
  }

  markAsRead(notificationId) {
    const notificationsFile = this.getNotificationsFile();
    try {
      if (!fs.existsSync(notificationsFile)) return;
      const notifications = JSON.parse(fs.readFileSync(notificationsFile, 'utf8'));
      const updated = notifications.map(n => 
        n.id === notificationId ? { ...n, read: true, readAt: new Date().toISOString() } : n
      );
      fs.writeFileSync(notificationsFile, JSON.stringify(updated, null, 2), 'utf8');
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }
}

module.exports = NotificationService;
