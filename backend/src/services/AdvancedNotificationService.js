const NotificationService = require('./NotificationService');

/**
 * AdvancedNotificationService - Compatibility wrapper over NotificationService
 * Provides backwards-compatible method signatures while delegating to the unified
 * provider abstraction engine (EmailProvider, SMSProvider, PushProvider).
 */
class AdvancedNotificationService {
  constructor(sharedNotificationService = null) {
    this.service = sharedNotificationService || new NotificationService();
  }

  async sendEmail(to, subject, html, text) {
    return this.service.emailProvider.send({ to, subject, html, text });
  }

  async sendSMS(to, message) {
    return this.service.smsProvider.send({ to, message });
  }

  async sendPushNotification(userId, title, body, data = {}) {
    return this.service.pushProvider.send({ userId, title, body, data });
  }

  async sendVaccinationReminder(animal, ownerContact) {
    return this.service.sendVaccinationReminder(animal, ownerContact);
  }

  async sendHealthAlert(animal, disease, ownerContact) {
    return this.service.sendHealthAlert(animal, disease, ownerContact);
  }

  async sendApprovalNotification(animal, ownerContact) {
    return this.service.sendApprovalNotification(animal, ownerContact);
  }

  getNotifications(userId, limit = 50) {
    return this.service.getNotifications(userId, limit);
  }

  markAsRead(notificationId) {
    return this.service.markAsRead(notificationId);
  }

  getProviderStatus() {
    return this.service.getProviderStatus();
  }
}

module.exports = AdvancedNotificationService;
