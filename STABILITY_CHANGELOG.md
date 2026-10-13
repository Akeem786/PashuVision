# PashuVision Stability & Code Quality Changelog

This document details all stability, reliability, security, and error-handling improvements implemented as part of the Phase 1 stability audit.

---

## 1. Backend Server (`backend/src/server.js`)

### Why:
- **Duplicate Route Definitions**: Eight routes (`/api/voice/process`, `/api/voice/create-animal`, `/api/blockchain/stats`, `/api/blockchain/animal/:id/history`, `/api/blockchain/animal/:id/verify`, `/api/blockchain/animal/:id/certificate`, `/api/ar/breed/:breed`, `/api/ar/health`) were duplicated verbatim in lines 2463–2552, causing redundant route matching and maintenance risks.
- **Un-awaited Async Calls**: `getUsers()` was called synchronously without `await` in `POST /api/auth/send-otp`, `POST /api/auth/verify-otp`, and `POST /api/auth/biometric`. Because `getUsers()` returns a Promise, calling `.find()` threw `TypeError: users.find is not a function`, crashing authentication workflows. Similarly, `getAnimals()` was not awaited in `POST /api/notifications/send`.
- **Missing File Upload Validation**: Multer was initialized with `memoryStorage()` and no size limits or MIME-type filters, leaving the server vulnerable to memory exhaustion DoS and arbitrary file uploads.
- **Unrestricted CORS**: `app.use(cors())` allowed all origins without environment variable configuration.
- **No Rate Limiting**: Authentication endpoints were vulnerable to brute-force credential stuffing and OTP spamming.
- **Generic Error Responses**: Uncaught Multer errors and CORS rejections were not formatted as clean JSON with proper HTTP status codes.

### Changes:
1. **Configurable CORS**: Added `CORS_ALLOWED_ORIGINS` environment variable support with safe development defaults (`http://localhost:5173`, `http://localhost:3000`, `http://127.0.0.1:5173`, `http://127.0.0.1:3000`, and Vercel preview domain detection) for both Express and Socket.IO.
2. **Rate Limiting**: Implemented in-memory sliding window rate limiters:
   - `authLimiter`: 50 requests per 15 minutes on `/api/auth/*` (returns `429 Too Many Requests` with `Retry-After` header).
   - `apiLimiter`: 600 requests per 15 minutes on `/api/*`.
3. **File Upload Validation**:
   - `imageUpload`: Restricts uploads to `image/jpeg`, `image/png`, `image/webp` with extensions `.jpg`, `.jpeg`, `.png`, `.webp`, a 5MB maximum file size limit, and max 6 files per request.
   - `audioUpload`: Restricts audio input for `/api/voice/process` to supported audio types with a 10MB limit.
4. **Duplicate Routes Removed**: Deleted the redundant route declarations in lines 2605–2694. Verified with automated AST/regex analysis that 0 duplicate routes remain.
5. **Fixed Async/Await Bugs**:
   - Made `/api/auth/send-otp` handler `async` and awaited `getUsers()` and `logActivity()`.
   - Made `/api/auth/verify-otp` handler `async` and awaited `getUsers()` and `logActivity()`.
   - Made `/api/auth/biometric` handler `async` and awaited `getUsers()` and `logActivity()`.
   - Awaited `getAnimals()` in `/api/notifications/send`.
6. **Global Error Handling**: Added Express error-handling middleware that intercepts `MulterError` (size limits, file counts), CORS rejection errors, and application errors, returning consistent JSON responses with appropriate HTTP status codes (400, 401, 403, 404, 429, 500).

---

## 2. Notification Service (`backend/src/services/NotificationService.js`)

### Why:
- **Path Resolution Bug**: The service used `path.join(__dirname, '..', 'data', 'notifications.json')`. Because `__dirname` is `backend/src/services`, `..` resolved to `backend/src`, making the target path `backend/src/data/notifications.json`. The application data folder is actually located at `backend/data`. This caused an unhandled `ENOENT: no such file or directory` error whenever the daily vaccination cron scheduler executed.

### Changes:
1. Created a `getDataDir()` method that resolves `path.join(__dirname, '..', '..', 'data')` (or `/tmp/data` on Vercel) and ensures the directory exists with `fs.mkdirSync(dir, { recursive: true })`.
2. Updated `getAnimals()`, `saveNotifications()`, `getNotifications()`, and `markAsRead()` to use `this.getDataDir()`.

---

## 3. Blockchain Integration Service (`frontend/src/services/BlockchainIntegrationService.js`)

### Why:
- **Browser-Incompatible Dependencies**: The frontend service directly called `require('crypto')` and referenced Node.js `Buffer` objects (`Buffer.from(...)`). In standard browser environments (Vite React SPA), these caused runtime reference errors (`require is not defined` / `Buffer is not defined`) during transaction encoding and hash generation.

### Changes:
1. Added browser-safe `_toHex(str)` and `_fromHex(hex)` methods utilizing `TextEncoder` and `TextDecoder` (with fallback to `Buffer` in Node testing environments).
2. Implemented a browser-compatible synchronous hash function with fallback to `crypto.createHash` when running under Node.js.
3. Replaced all `require('crypto')` and `Buffer` calls across `generateHash`, `encodeAnimalData`, `encodeUpdateData`, `encodeHealthData`, `encodeVaccinationData`, `extractHashFromTransaction`, `getEventTopic`, and `decodeEventData`.

---

## 4. Frontend API Utility (`frontend/src/utils/api.js`)

### Why:
- Unhandled HTTP status codes (401, 403, 404, 429, 500) and network dropouts resulted in confusing or raw error messages (such as `[object Object]` or `Failed to fetch`).

### Changes:
1. Enhanced `apiRequest` to map standard HTTP status codes into clear, actionable messages:
   - 401: Session expired / sign-in required.
   - 403: Permission / authorization required.
   - 404: Resource not found.
   - 429: Rate limit exceeded / slow down.
   - 500+: Server error notification.
2. Standardized network error reporting so offline or unreachable server scenarios display friendly instructions to the user.

---

## 5. OTP Login UI (`frontend/src/pages/OTPLogin.jsx`)

### Why:
- Calling `await res.json()` multiple times on the same `Response` stream caused `TypeError: body stream already read` or uncaught syntax errors if the server returned non-JSON error pages.

### Changes:
1. Implemented safe single-read JSON parsing with try/catch fallback in `sendOTP`, `verifyOTP`, and `setupPassword`.
2. Improved user error feedback display.

---

## 6. Security & Secret Protection

### Verified:
- `SUPABASE_SERVICE_ROLE_KEY` is exclusively consumed by backend services (`backend/src/services/DatabaseService.js`, `api/index.js`, `backend/create-admin-user.js`).
- No Supabase service-role key is exposed to or bundled within the frontend client.
- All secrets (`JWT_SECRET`, database keys, credentials) are loaded from environment variables with safe development fallbacks.

---

## 7. Verification Summary

- **Frontend Production Build**: `npm run build` completed with 0 errors (Vite build output verified).
- **Backend Syntax Check**: `node --check` passed for all backend services, predictor classes, and entry points.
- **Duplicate Route Check**: Automated AST/regex check reported 0 duplicate routes across all HTTP methods.
- **Automated API Integration Tests**:
  - `GET /api/test` returned 200 OK.
  - `POST /api/auth/register` returned 201 Created with valid JWT.
  - `GET /api/animals` authenticated request returned 200 OK.
  - `POST /api/predict` rejected non-image MIME type (`text/plain`) with 400 Bad Request.
  - `POST /api/predict` rejected oversized payload (>5MB) with 400 Bad Request (`File size limit exceeded`).
  - Rate limiting on `/api/auth/` successfully throttled excessive requests with 429 Too Many Requests and `Retry-After`.
