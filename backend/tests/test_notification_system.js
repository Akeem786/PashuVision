const assert = require('assert');
const path = require('path');
const fs = require('fs');

const EmailProvider = require('../src/services/notifications/EmailProvider');
const SMSProvider = require('../src/services/notifications/SMSProvider');
const PushProvider = require('../src/services/notifications/PushProvider');
const NotificationService = require('../src/services/NotificationService');
const AdvancedNotificationService = require('../src/services/AdvancedNotificationService');

async function runTests() {
  console.log('🚀 Starting PashuVision Notification System Verification Suite...\n');

  let passed = 0;
  let failed = 0;

  function it(desc, fn) {
    return Promise.resolve()
      .then(fn)
      .then(() => {
        console.log(`  ✅ PASS: ${desc}`);
        passed++;
      })
      .catch((err) => {
        console.error(`  ❌ FAIL: ${desc}`);
        console.error(`     Error: ${err.message}`);
        failed++;
      });
  }

  // --- UNIT TESTS: EmailProvider ---
  console.log('--- 1. Testing EmailProvider ---');

  await it('EmailProvider masks recipient email correctly', () => {
    const provider = new EmailProvider();
    assert.strictEqual(provider.maskEmail('farmer@pashuvision.com'), 'f***r@pashuvision.com');
    assert.strictEqual(provider.maskEmail('a@b.com'), 'a***@b.com');
    assert.strictEqual(provider.maskEmail(''), 'unknown');
  });

  await it('EmailProvider returns MOCK_DEVELOPMENT in development mode when unconfigured', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const provider = new EmailProvider();

    const res = await provider.send({
      to: 'farmer@example.com',
      subject: 'Vaccination Alert',
      text: 'Your cattle is due for vaccination'
    });

    assert.strictEqual(res.status, 'MOCK_DEVELOPMENT');
    assert.strictEqual(res.channel, 'email');
    assert.strictEqual(res.recipient, 'f***r@example.com');
    assert.ok(res.messageId);

    process.env.NODE_ENV = originalEnv;
  });

  await it('EmailProvider strictly returns NOT_CONFIGURED in production when SMTP is missing', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const provider = new EmailProvider();

    const res = await provider.send({
      to: 'farmer@example.com',
      subject: 'Vaccination Alert',
      text: 'Your cattle is due for vaccination'
    });

    assert.strictEqual(res.status, 'NOT_CONFIGURED');
    assert.strictEqual(res.channel, 'email');
    assert.ok(res.error.includes('not configured'));

    process.env.NODE_ENV = originalEnv;
  });

  await it('EmailProvider returns FAILED when recipient is missing', async () => {
    const provider = new EmailProvider();
    const res = await provider.send({ to: '', subject: 'Test' });
    assert.strictEqual(res.status, 'FAILED');
    assert.ok(res.error.includes('Missing required'));
  });

  // --- UNIT TESTS: SMSProvider ---
  console.log('\n--- 2. Testing SMSProvider ---');

  await it('SMSProvider masks recipient phone correctly', () => {
    const provider = new SMSProvider();
    assert.strictEqual(provider.maskPhone('+919876543210'), '+91*****3210');
    assert.strictEqual(provider.maskPhone('1234'), '****');
    assert.strictEqual(provider.maskPhone(null), 'unknown');
  });

  await it('SMSProvider returns MOCK_DEVELOPMENT in development mode when unconfigured', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const provider = new SMSProvider();

    const res = await provider.send({
      to: '+919876543210',
      message: 'Vaccination due tomorrow'
    });

    assert.strictEqual(res.status, 'MOCK_DEVELOPMENT');
    assert.strictEqual(res.channel, 'sms');
    assert.strictEqual(res.recipient, '+91*****3210');
    assert.ok(res.sid);

    process.env.NODE_ENV = originalEnv;
  });

  await it('SMSProvider strictly returns NOT_CONFIGURED in production when Twilio is missing', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const provider = new SMSProvider();

    const res = await provider.send({
      to: '+919876543210',
      message: 'Vaccination due tomorrow'
    });

    assert.strictEqual(res.status, 'NOT_CONFIGURED');
    assert.strictEqual(res.channel, 'sms');
    assert.ok(res.error.includes('not configured'));

    process.env.NODE_ENV = originalEnv;
  });

  // --- UNIT TESTS: PushProvider ---
  console.log('\n--- 3. Testing PushProvider ---');

  await it('PushProvider generates valid in-app notification payload', async () => {
    const provider = new PushProvider();
    const res = await provider.send({
      userId: 'user-123',
      title: 'Health Warning',
      body: 'Check fever symptoms',
      priority: 'high'
    });

    assert.ok(res.notificationId);
    assert.strictEqual(res.recipient, 'user-123');
    assert.ok(res.inAppNotification);
    assert.strictEqual(res.inAppNotification.title, 'Health Warning');
    assert.strictEqual(res.inAppNotification.read, false);
  });

  // --- INTEGRATION TESTS: NotificationService Preferences & Dispatch ---
  console.log('\n--- 4. Testing NotificationService Preferences & Dispatch ---');

  const testService = new NotificationService();

  await it('Returns default preferences for unknown user', () => {
    const prefs = testService.getPreferences('test-temp-user-999');
    assert.strictEqual(prefs.email, true);
    assert.strictEqual(prefs.sms, true);
    assert.strictEqual(prefs.push, true);
    assert.strictEqual(prefs.vaccinationReminders, true);
  });

  await it('Saves and enforces custom user preferences (disabling SMS)', async () => {
    const testUserId = 'test-pref-user-456';
    testService.savePreferences(testUserId, { sms: false, push: true, email: true });

    const updatedPrefs = testService.getPreferences(testUserId);
    assert.strictEqual(updatedPrefs.sms, false);
    assert.strictEqual(updatedPrefs.email, true);

    const dispatchRes = await testService.dispatchNotification({
      user: { id: testUserId, email: 'pref@test.com', phone: '+919876543210' },
      type: 'general',
      title: 'Preference Test',
      message: 'Testing disabled SMS channel'
    });

    assert.ok(dispatchRes.results);
    const smsResult = dispatchRes.results.find(r => r.channel === 'sms');
    assert.ok(smsResult);
    assert.strictEqual(smsResult.status, 'DISABLED_BY_USER');
  });

  await it('Respects category-level opt out (e.g. vaccinationReminders = false)', async () => {
    const testUserId = 'test-optout-user-789';
    testService.savePreferences(testUserId, { vaccinationReminders: false });

    const dispatchRes = await testService.dispatchNotification({
      user: { id: testUserId, email: 'optout@test.com' },
      type: 'vaccination',
      title: 'Vaccine Alert',
      message: 'Scheduled vaccine'
    });

    assert.strictEqual(dispatchRes.dispatched, false);
    assert.strictEqual(dispatchRes.reason, 'OPTED_OUT_OF_CATEGORY');
  });

  await it('AdvancedNotificationService correctly delegates to NotificationService', async () => {
    const advService = new AdvancedNotificationService(testService);
    const status = advService.getProviderStatus();

    assert.ok(status.email);
    assert.ok(status.sms);
    assert.ok(status.push);

    const emailRes = await advService.sendEmail('test@pashu.com', 'Subj', '<p>body</p>', 'body');
    assert.ok(['SENT', 'MOCK_DEVELOPMENT', 'NOT_CONFIGURED'].includes(emailRes.status));

    const smsRes = await advService.sendSMS('+919999999999', 'sms text');
    assert.ok(['SENT', 'MOCK_DEVELOPMENT', 'NOT_CONFIGURED'].includes(smsRes.status));
  });

  // --- HTTP API TESTS ---
  console.log('\n--- 5. Testing HTTP API Endpoints (:4000) ---');

  // Let's create an authentication token using existing auth mechanism or login
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
  const token = jwt.sign({ sub: 'test-user-api-id', role: 'user', name: 'Tester' }, JWT_SECRET, { expiresIn: '1h' });

  await it('GET /api/notifications/status returns safe provider status', async () => {
    const res = await fetch('http://127.0.0.1:4000/api/notifications/status', {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.email);
    assert.ok(body.sms);
    assert.ok(body.push);
    assert.ok(!body.email.pass); // Ensure secrets are never exposed
  });

  await it('GET and PUT /api/notifications/preferences work via API', async () => {
    const getRes = await fetch('http://127.0.0.1:4000/api/notifications/preferences', {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(getRes.status, 200);
    const prefs = await getRes.json();
    assert.ok('email' in prefs);

    // Update preferences
    const putRes = await fetch('http://127.0.0.1:4000/api/notifications/preferences', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ sms: false, push: true })
    });
    assert.strictEqual(putRes.status, 200);
    const putBody = await putRes.json();
    assert.strictEqual(putBody.ok, true);
    assert.strictEqual(putBody.preferences.sms, false);
  });

  await it('POST /api/notifications/send dispatches multi-channel notification', async () => {
    const sendRes = await fetch('http://127.0.0.1:4000/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'API Test Alert',
        message: 'System test message via API',
        email: 'api-farmer@example.com',
        phone: '+919876543210',
        channels: ['email', 'sms', 'push']
      })
    });
    assert.strictEqual(sendRes.status, 200);
    const body = await sendRes.json();
    assert.ok(body.notificationId);
    assert.ok(Array.isArray(body.results));
    const channels = body.results.map(r => r.channel);
    assert.ok(channels.includes('email'));
    assert.ok(channels.includes('sms'));
    assert.ok(channels.includes('push'));
  });

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
