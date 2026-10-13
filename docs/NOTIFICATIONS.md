# PashuVision Multichannel Notification Architecture

## 1. Overview & Architecture

The PashuVision notification system provides an enterprise-grade, multichannel alert and reminder engine for livestock management. It is architected with strict provider abstraction, privacy masking, persistent in-app delivery, and granular user preferences.

```
                  ┌───────────────────────────────┐
                  │      NotificationService      │
                  │ (Preferences, Scheduling,     │
                  │  Category Opt-outs, Dispatch) │
                  └───────────────┬───────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
         ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  EmailProvider   │    │   SMSProvider    │    │   PushProvider   │
│  (Nodemailer /   │    │  (Twilio Client  │    │ (In-App Storage  │
│   SMTP Transport)│    │   / REST API)    │    │  & Web Push)     │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

---

## 2. Notification Delivery Outcome States

Unlike systems that falsely report delivery in development, PashuVision strictly distinguishes among 5 distinct outcome states:

| Status Code | Description | Mode / Conditions |
|---|---|---|
| **`SENT`** | The real notification was accepted and dispatched by the third-party gateway (live SMTP server, Twilio API, or Web Push). | Production or Dev with valid credentials |
| **`FAILED`** | The delivery failed due to a network error, authentication failure, invalid recipient format, or provider error. | Any mode |
| **`MOCK_DEVELOPMENT`** | Safe mock delivery logged to server console with masked recipient identifiers. Never used in production. | `NODE_ENV !== 'production'` without live credentials |
| **`NOT_CONFIGURED`** | Delivery was rejected because required credentials are missing in production. PashuVision **never** silently reports success when unconfigured. | `NODE_ENV === 'production'` without credentials |
| **`DISABLED_BY_USER`** | The notification was skipped because the user explicitly opted out of that channel (Email/SMS/Push) or alert category. | Checked against user preferences |

---

## 3. Environment Variables Reference

All credentials must be supplied strictly via environment variables (e.g., in `.env` or container secrets). **Zero secrets are hardcoded in the codebase.**

### 3.1. Email (SMTP / Nodemailer)

| Variable | Type | Default | Description |
|---|---|---|---|
| `SMTP_HOST` | String | `null` | SMTP server hostname (e.g. `smtp.gmail.com`, `smtp.sendgrid.net`, `email-smtp.us-east-1.amazonaws.com`). |
| `SMTP_PORT` | Integer | `587` | Port for SMTP server (`587` for STARTTLS, `465` for SSL/TLS, `25` for unencrypted). |
| `SMTP_SECURE` | Boolean | `false` | Set to `true` if port 465 is used with native SSL. |
| `SMTP_USER` | String | `null` | SMTP username or API user identifier. Fallback to `EMAIL_USER`. |
| `SMTP_PASS` | String | `null` | SMTP application password or API token. Fallback to `EMAIL_PASS`. |
| `EMAIL_FROM` | String | `noreply@pashuvision.com` | Display address used in the `From:` header. |

### 3.2. SMS (Twilio)

| Variable | Type | Default | Description |
|---|---|---|---|
| `TWILIO_ACCOUNT_SID` | String | `null` | Twilio Account SID (must start with `AC` and contain 34 characters). |
| `TWILIO_AUTH_TOKEN` | String | `null` | Twilio Secret Auth Token. |
| `TWILIO_PHONE_NUMBER` | String | `null` | Registered E.164 Twilio phone number (e.g. `+12025550143`). Fallback: `TWILIO_FROM`. |

### 3.3. In-App & Web Push (VAPID)

| Variable | Type | Default | Description |
|---|---|---|---|
| `VAPID_PUBLIC_KEY` | String | `null` | Application Server Public Key for Web Push encryption. |
| `VAPID_PRIVATE_KEY` | String | `null` | Application Server Private Key for Web Push authentication. |
| `VAPID_SUBJECT` | String | `mailto:admin@pashuvision.com` | Contact email or URL for the push service. |

---

## 4. Privacy & Safe Logging

All console logs and diagnostics apply automatic PII and secret masking:
- **Email Masking:** `farmer.johnson@example.com` $\rightarrow$ `f***n@example.com`
- **Phone Masking:** `+919876543210` $\rightarrow$ `+91*****3210`
- **Secrets:** Passwords and tokens are never emitted to logs, error traces, or API responses.

---

## 5. User Notification Preferences

Preferences are managed per user and stored persistently in `backend/data/notification_preferences.json` (or synced with user database tables).

### Default User Preferences
```json
{
  "email": true,
  "sms": true,
  "push": true,
  "vaccinationReminders": true,
  "healthAlerts": true,
  "approvalNotifications": true
}
```

If a user turns off `sms`, notifications routed to SMS will return `{ channel: 'sms', status: 'DISABLED_BY_USER' }`.
If a user turns off `vaccinationReminders`, any vaccination alert dispatch will be halted with `{ reason: 'OPTED_OUT_OF_CATEGORY' }`.

---

## 6. API Endpoints

### 6.1. Get User Notifications
`GET /api/notifications`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** Array of user's in-app notifications sorted newest first.

### 6.2. Mark Notification Read
`POST /api/notifications/:id/read`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** `{ "ok": true }`

### 6.3. Get Provider Channel Status
`GET /api/notifications/status`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```json
{
  "email": {
    "channel": "email",
    "configured": false,
    "status": "MOCK_DEVELOPMENT",
    "host": null,
    "from": "n***y@pashuvision.com",
    "mode": "development"
  },
  "sms": {
    "channel": "sms",
    "configured": false,
    "status": "MOCK_DEVELOPMENT",
    "from": "unknown",
    "mode": "development"
  },
  "push": {
    "channel": "push",
    "configured": true,
    "webPushConfigured": false,
    "status": "MOCK_DEVELOPMENT",
    "mode": "development"
  },
  "environment": "development"
}
```

### 6.4. Get User Preferences
`GET /api/notifications/preferences`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** Object containing channel and category booleans.

### 6.5. Update User Preferences
`PUT /api/notifications/preferences`
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Body:** `{ "sms": false, "healthAlerts": true }`
- **Response:** `{ "ok": true, "preferences": { ... } }`

### 6.6. Multi-Channel Dispatch
`POST /api/notifications/send`
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Sample Request (Generic Alert):**
```json
{
  "type": "general",
  "title": "Weather Warning",
  "message": "Heavy monsoon rainfall expected in your district. Shelter calves.",
  "email": "farmer@example.com",
  "phone": "+919876543210",
  "priority": "high",
  "channels": ["email", "sms", "push"]
}
```
- **Sample Request (Animal-Specific Workflow):**
```json
{
  "type": "vaccination",
  "animalId": "3rAPptb6ZgkLqQFo1kCg0",
  "ownerContact": {
    "userId": "user-456",
    "name": "Ramesh Kumar",
    "email": "ramesh@example.com",
    "phone": "+919876543210"
  }
}
```
- **Sample Response:**
```json
{
  "notificationId": "e1f99cfc-0da6-4654-be8d-71b3152636eb",
  "type": "vaccination",
  "title": "Vaccination Reminder - Gir",
  "message": "Dear Ramesh Kumar, your Gir (ID: 3rAPptb6ZgkLqQFo1kCg0) is due for vaccination.",
  "dispatched": true,
  "results": [
    {
      "status": "MOCK_DEVELOPMENT",
      "channel": "email",
      "messageId": "mock-email-1726723200000",
      "recipient": "r***h@example.com",
      "note": "Logged to console in development mode. Set SMTP environment variables for live delivery."
    },
    {
      "status": "MOCK_DEVELOPMENT",
      "channel": "sms",
      "sid": "mock-sms-1726723200000",
      "recipient": "+91*****3210",
      "note": "Logged to console in development mode. Configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN for live SMS delivery."
    },
    {
      "status": "MOCK_DEVELOPMENT",
      "channel": "push",
      "notificationId": "2f43b174-a6ec-43e8-8b9f-6bc718ea67fa",
      "recipient": "user-456",
      "note": "Logged to console in development mode."
    }
  ]
}
```

---

## 7. Automated Cron Schedules

The system operates background cron workers to generate automatic alerts:
- **Vaccination Reminders (`0 9 * * *`):** Evaluates all approved animal records daily at 09:00 AM. Animals aged 3–12 months generate primary series alerts; animals > 12 months generate annual booster notices.
- **Health Checks (`0 10 * * 1`):** Runs every Monday at 10:00 AM, scheduling quarterly veterinary health inspections for registered herds.
