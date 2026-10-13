# PashuVision — Complete Codebase Audit Report

**Date of Audit**: September 19, 2026  
**Auditor**: Antigravity AI Engineering  
**Project Goal**: AI-powered livestock platform for cattle and buffalo breed recognition, animal records, QR identification, health/vaccination records, explainable AI, weight estimation, blockchain verification, notifications, and admin management.

---

## 1. Executive Summary

A comprehensive, line-by-line audit of the entire PashuVision codebase (React/Vite frontend, Node.js/Express backend, Python PyTorch service, AI models, and database integrations) was conducted.

### Key Takeaways:
1. **Core Platform (Records, Users, Breeds CRUD, Authentication)**: **REAL & FUNCTIONAL**. The application provides working CRUD operations for animal records, breed catalogs, user roles (Admin vs User), and client-side QR generation.
2. **AI Breed Prediction**: **PARTIALLY REAL / BROKEN LOCALLY**. The inference architecture (ConvNeXt Base via Flask/PyTorch) is written, but **zero model weight files (`.pth` or `.onnx`) exist in the repository**. The local environment lacks `torch`/`torchvision` in requirements, making the Python microservice inoperable without external deployment or weight downloads.
3. **"AI" Weight Estimation**: **100% MOCK & UNUSED**. It is client-side heuristic math using `Math.random()`. No computer vision or regression model exists. Furthermore, the frontend service is not imported anywhere.
4. **Explainable AI (Heatmap)**: **100% MOCK**. Generates random dots with `Math.random()` over hardcoded breed coordinates. No Grad-CAM, attention map, or neural network interpretability algorithm exists.
5. **Blockchain**: **MOCK, BROKEN & UNUSED**. Backend uses an in-memory toy JS array calculating local SHA-256 hashes. Frontend service has Node.js code (`require('crypto')`, `Buffer`) in browser files and is never imported.
6. **Voice & Marketplace**: **ORPHANED / DEAD CODE**. 9 marketplace API routes and 2 voice routes exist in `server.js` with **zero UI in the frontend**.
7. **Architectural Duplication & Bugs**: `server.js` contains identical duplicate routes copy-pasted across 140 lines; `Scan.jsx` and `NFCScanning.jsx` have global reference bugs; and Multer file uploads lack size and MIME validation.

---

## 2. Current Architecture Overview

```
                        ┌────────────────────────────────────────┐
                        │      Client Browser (React 19 + Vite)  │
                        │  Dashboard, Records, Admin, Scan, AR   │
                        └──────────────────┬─────────────────────┘
                                           │ HTTP / WebSocket (:4000)
                                           ▼
                        ┌────────────────────────────────────────┐
                        │       Node.js / Express Backend        │
                        │       (backend/src/server.js)          │
                        │  - JWT Auth (bcryptjs)                 │
                        │  - Records & Breeds CRUD               │
                        │  - Socket.IO Real-time Updates         │
                        │  - Multer Image Ingestion              │
                        └───────┬────────────────────────┬───────┘
                                │                        │
         Database Layer         │                        │ HTTP (:5001)
                                ▼                        ▼
      ┌───────────────────────────────┐     ┌────────────────────────────┐
      │       DatabaseService         │     │  Python PyTorch Service    │
      │  - Supabase PostgreSQL (Prod) │     │  (backend/models)          │
      │  - Local JSON Fallback (Dev)  │     │  - Flask + timm (ConvNeXt) │
      │    (backend/data/*.json)      │     │  ❌ Missing model weights   │
      └───────────────────────────────┘     └────────────────────────────┘
```

---

## 3. Comprehensive Feature Status & Classification Matrix

| # | Feature / Module | Status | Files Responsible | Description / Reality Check |
|---|---|---|---|---|
| 1 | **User Auth (Email/Pass + JWT)** | **REAL** | `backend/src/server.js`<br>`frontend/src/pages/Login.jsx`<br>`frontend/src/pages/Register.jsx` | Bcrypt password hashing, JWT token issue/verification, role authorization (Admin/User). |
| 2 | **Animal Records CRUD** | **REAL** | `backend/src/server.js`<br>`frontend/src/pages/Records.jsx`<br>`frontend/src/pages/RecordNew.jsx` | Full listing, filtering by breed/date/status, CSV export, creation with photo uploads. |
| 3 | **Breed Database Management** | **REAL** | `backend/src/server.js`<br>`frontend/src/pages/AdminBreeds.jsx`<br>`frontend/src/pages/AdminBreedImages.jsx` | Admin catalog with 41 breeds, characteristics, milk yield, rare breed flag, image galleries. |
| 4 | **Admin User Management** | **REAL** | `backend/src/server.js`<br>`frontend/src/pages/AdminUsers.jsx` | User listing, toggle active status, role switching, permissions assignment, deletion. |
| 5 | **Database Layer (Supabase / JSON)** | **REAL** | `backend/src/services/DatabaseService.js`<br>`backend/data/*.json` | Supabase client integration with local JSON storage fallback. |
| 6 | **QR Code Generation** | **REAL** | `frontend/src/pages/Records.jsx`<br>`frontend/src/pages/RecordDetail.jsx` | Client-side SVG/Canvas QR generation via `qrcode.react`. |
| 7 | **In-App Notifications** | **REAL** | `backend/src/services/NotificationService.js`<br>`frontend/src/pages/Notifications.jsx` | Stores and reads notifications in `data/notifications.json` with daily vaccination cron. |
| 8 | **ConvNeXt Breed Prediction** | **PARTIALLY REAL / BROKEN** | `backend/models/pytorch_service.py`<br>`backend/src/ai/PyTorchPredictor.js`<br>`backend/src/ai/ConvNeXtPredictor.js` | Code for ConvNeXt inference exists, but **no model weights exist in repo**; `torch` is omitted from `requirements.txt`. |
| 9 | **QR Code Camera Scanner** | **PARTIALLY REAL / BUGGY** | `frontend/src/pages/Scan.jsx` | Loads `qr-scanner` from CDN, accesses camera, but throws `ReferenceError: QrScanner is not defined` if `window.QrScanner` is not used. |
| 10 | **NFC Tag Scanning** | **PARTIALLY REAL / BROKEN** | `frontend/src/pages/NFCScanning.jsx` | Uses Web NFC (`NDEFReader`), only works on Android Chrome over HTTPS; crashes desktop browsers if `window.NDEFReader` is not checked. |
| 11 | **SMS / Email Alerts** | **PARTIALLY REAL (MOCK IN DEV)** | `backend/src/services/AdvancedNotificationService.js` | Nodemailer & Twilio wrappers; prints mock log messages to console if credentials are empty. |
| 12 | **OTP Phone Login** | **PARTIALLY REAL** | `backend/src/server.js`<br>`frontend/src/pages/OTPLogin.jsx` | 6-digit random code stored in memory map `otpStore`; mock SMS logged to console. |
| 13 | **Biometric Login** | **MOCK & BROKEN** | `backend/src/server.js`<br>`frontend/src/pages/Login.jsx` | Client requests `navigator.credentials.create`; backend skips signature verification and crashes on `const users = getUsers()` (missing `await`). |
| 14 | **AI Weight Estimation** | **MOCK & UNUSED** | `frontend/src/services/AIWeightEstimationService.js` | Generates random numbers: `180 + Math.random() * 40`. Service is not imported by any page. |
| 15 | **Explainable AI (Heatmap)** | **MOCK** | `frontend/src/pages/ExplainableAIHeatmap.jsx` | `generateMockHeatmap()` plots random dots using `Math.random()`. No Grad-CAM or computer vision interpretability. |
| 16 | **Blockchain Verification** | **MOCK, BROKEN & UNUSED** | `backend/src/services/BlockchainService.js`<br>`frontend/src/services/BlockchainIntegrationService.js` | Backend is an in-memory JS array; frontend contains Node.js `require('crypto')` in browser code; never imported. |
| 17 | **AR Training Mode** | **MOCK** | `frontend/src/pages/ARTrainingMode.jsx`<br>`backend/src/services/ARService.js` | Draws static 2D canvas text boxes over webcam stream. No real 3D tracking, SLAM, or WebXR. |
| 18 | **Voice Input Service** | **UNUSED & BROKEN** | `backend/src/services/VoiceInputService.js`<br>`frontend/src/services/VoiceGuidanceService.js` | Requires Google Cloud service account keys (throws metadata warnings); zero frontend pages call `/api/voice/*`. |
| 19 | **Marketplace API** | **UNUSED / DEAD CODE** | `backend/src/services/MarketplaceService.js`<br>`backend/src/server.js` | 9 complete CRUD routes backed by `marketplace.json`, but zero UI exists in the frontend. |
| 20 | **Dynamic Landing Stats** | **MOCK** | `frontend/src/components/DynamicStats.jsx` | Hardcoded `10,247+ animals`, `94.7% accuracy` updated via `Math.random()` timer every 30s. |

---

## 4. Deep-Dive Findings by Subsystem

### 4.1. AI & Machine Learning Infrastructure

#### Breed Recognition
- **Architecture**: `ConvNeXt Tiny / Base` via Python `timm` library, exposed through a Flask microservice (`pytorch_service.py`) on port 5001.
- **Flaws**:
  1. **No local model weights**: The model file `best_model_convnext_base_acc0.7007.pth` or `best_model_quantized.pth` is missing from `backend/models/`.
  2. **Incomplete Python dependencies**: `backend/models/requirements.txt` specifies `flask`, `flask-cors`, `timm`, `Pillow`, `numpy<2.0`, `gunicorn`, but **omits `torch` and `torchvision`**.
  3. **Dead Node.js ONNX code**: `ConvNeXtPredictor.js` and ONNX fallback in `PyTorchPredictor.js` require `model.onnx`, which does not exist in the repo.
  4. **Species Detection**: Inferred purely from string matching on predicted breed names (`Murrah`, `Mehsana`, etc.) rather than a dedicated classification head.

#### Explainable AI (Heatmap)
- **Status**: **100% Mock**.
- **Location**: `frontend/src/pages/ExplainableAIHeatmap.jsx:100-121`
- **Proof**:
  ```javascript
  const generateMockHeatmap = (image) => {
    const characteristics = breedCharacteristics[image.actualBreed]
    const heatmapPoints = []
    characteristics.keyFeatures.forEach((feature, index) => {
      const x = 0.2 + (index * 0.2) + Math.random() * 0.1
      const y = 0.3 + Math.random() * 0.4
      heatmapPoints.push({ x, y, intensity: feature.importance, ... })
    })
    return heatmapPoints
  }
  ```
- **Issue**: There is no PyTorch Grad-CAM hook, no feature map extraction, and no backend API endpoint for heatmap computation.

#### AI Weight Estimation
- **Status**: **100% Mock & Unused**.
- **Location**: `frontend/src/services/AIWeightEstimationService.js:101-140`
- **Proof**:
  ```javascript
  estimateBodySize(imageData) {
    return {
      length: 180 + Math.random() * 40,
      height: 140 + Math.random() * 30,
      width: 60 + Math.random() * 20,
      confidence: 0.8
    }
  }
  ```
- **Issue**: No backend endpoint exists; no computer vision model for body dimension regression exists. The file is not imported anywhere.

---

### 4.2. Blockchain & Verification

- **Backend**: `backend/src/services/BlockchainService.js` is an in-memory toy chain (`this.chain = []`) performing trivial proof-of-work loops on local Node.js memory. When the backend restarts, the entire chain resets.
- **Frontend**: `frontend/src/services/BlockchainIntegrationService.js` contains invalid browser code:
  - Line 348: `const crypto = require('crypto')` (Node CJS syntax inside Vite ESM frontend)
  - Line 356: `Buffer.from(...)` (`Buffer` is undefined in browser)
  - Line 20: `new Web3(provider)` (`Web3` is never imported)
- **Status**: Unused. No animal record verification on Ethereum/Polygon or any distributed ledger actually occurs.

---

### 4.3. Backend Server & API Routes (`server.js`)

#### 1. Major Copy-Paste Route Duplication
In `backend/src/server.js`:
- Lines **2409–2448** define voice animal creation and blockchain stats/history/verify/certificate endpoints.
- Lines **2477–2539** duplicate the **exact same code blocks and route paths** a second time.
- Impact: Confusing maintenance overhead; potential unpredictable middleware execution order.

#### 2. Biometric Authentication Crash Bug
In `backend/src/server.js` line 783:
```javascript
app.post('/api/auth/biometric', (req, res) => {
  ...
  const users = getUsers(); // BUG: getUsers() is an async function returning a Promise!
  const user = users.find(u => u.email === email); // CRASH: TypeError: users.find is not a function
```
The endpoint crashes with a 500 error on every invocation.

#### 3. Multer Security Vulnerability (DoS & Arbitrary File Storage)
In `backend/src/server.js` line 104:
```javascript
const upload = multer({ storage: multer.memoryStorage() });
```
- No `limits: { fileSize: ... }`: A client can upload a 1GB file into memory, crashing the Node process with an Out-of-Memory (OOM) error.
- No `fileFilter`: Accepts any file extension (`.exe`, `.sh`, `.html`, `.svg` with XSS payloads).

#### 4. Orphaned Backend Services
- `MarketplaceService.js`: 9 API endpoints in `server.js` (`/api/marketplace/*`), 452 lines of service logic, but no frontend consumer.
- `VoiceInputService.js`: 2 API endpoints (`/api/voice/*`), 271 lines, but no frontend consumer.

---

### 4.4. Database & Persistence Layer

- **Supabase vs Local JSON**:
  - `DatabaseService.js` correctly connects to Supabase tables (`users`, `animals`, `breeds`, `activity_logs`).
  - Fallback to local JSON files in `backend/data/` works when `SUPABASE_URL` is omitted.
- **Inconsistencies**:
  - `NotificationService.js` line 105 directly calls `fs.readFileSync(path.join(__dirname, '..', 'data', 'animals.json'))` rather than using `DatabaseService`. If Supabase is used, notifications still read stale local JSON files.
  - `MarketplaceService.js` reads/writes directly to `data/marketplace.json` rather than Supabase.
  - `NotificationService.js` reads/writes to `data/notifications.json` rather than Supabase.

---

### 4.5. Deployment Configuration & Compatibility

#### Vercel Serverless Function Mismatch (`vercel.json`)
- `vercel.json` rewrites `/api/(.*)` to `api/index.js`, executing `server.js` inside an AWS Lambda/Vercel serverless environment.
- **Critical incompatibilities with serverless**:
  1. **Socket.IO (WebSockets)**: Serverless lambdas cannot maintain long-lived WebSocket connections. Real-time updates fail on Vercel.
  2. **Cron Schedules (`node-cron`)**: In `NotificationService.js`, cron jobs scheduled via `cron.schedule('0 9 * * *')` freeze when the lambda terminates after a request.
  3. **Ephemeral Storage (`/tmp/images`)**: Uploaded images stored in `/tmp/images` disappear when the lambda instance recycles.
- **Recommendation**: Deploy backend to a stateful container runtime (Railway, Render, DigitalOcean, or AWS ECS/EC2) instead of Vercel serverless.

---

## 5. Security Vulnerabilities & Code Quality Assessment

| Vulnerability / Flaw | Location | Severity | Impact |
|---|---|---|---|
| **Unbounded File Uploads** | `backend/src/server.js:104` | **Critical** | Server crash via memory exhaustion (DoS); storage of malicious files. |
| **Hardcoded Fallback Secret** | `backend/src/server.js:42` | **High** | `JWT_SECRET = process.env.JWT_SECRET \|\| 'dev-secret-change-me'`. Tokens forgeable if env var missing. |
| **Biometric Auth Bypass / Crash** | `backend/src/server.js:778-811` | **High** | Unhandled Promise crash (`users.find`); simulates success without public key cryptographic verification. |
| **Wildcard CORS** | `backend/src/server.js:100` | **Medium** | `app.use(cors())` permits cross-origin requests from any website without whitelist. |
| **ReferenceErrors on Scan Pages** | `frontend/src/pages/Scan.jsx:49,58`<br>`frontend/src/pages/NFCScanning.jsx:61` | **Medium** | Uncaught `ReferenceError: QrScanner is not defined` and `NDEFReader is not defined` on non-supported browsers. |
| **Stale File System Data Access** | `backend/src/services/NotificationService.js:105` | **Low** | Bypasses Supabase database to read local `animals.json`. |

---

## 6. Prioritized Implementation Roadmap

To transition PashuVision from a partially simulated prototype into a production-ready AI livestock management platform, follow this sequential 5-phase roadmap:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Phase 1     │     │     Phase 2     │     │     Phase 3     │     │     Phase 4     │     │     Phase 5     │
│   Stability &   │ ──► │  Real AI Model  │ ──► │ Clean & Remove  │ ──► │ Real Explainable│ ──► │ Production Cloud│
│    Security     │     │   Integration   │     │    Dead Code    │     │   AI & Features │     │   Deployment    │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Phase 1: Stability, Security & Core Cleanup (Immediate)
- [ ] **Sanitize Multer**: Add file size limits (`5MB`) and strict image MIME-type filter (`image/jpeg`, `image/png`, `image/webp`).
- [ ] **Fix Route Duplication**: Delete duplicated lines 2477–2539 in `backend/src/server.js`.
- [ ] **Fix Biometric Route Crash**: `await getUsers()` and either implement proper WebAuthn FIDO2 verification (`@simplewebauthn/server`) or disable the biometric mock until ready.
- [ ] **Fix Scanner References**: Guard `window.QrScanner` in `Scan.jsx` and `window.NDEFReader` in `NFCScanning.jsx`.
- [ ] **Enforce Strong JWT Secret**: Reject startup in production if `JWT_SECRET` equals default.

### Phase 2: Real AI Model Integration & Microservice Fixes
- [ ] **Model Weights Packaging**: Provide a verified, downloadable release artifact or cloud storage bucket (AWS S3 / Cloudflare R2) containing `best_model_quantized.pth` or ONNX format.
- [ ] **Fix Python Microservice Requirements**: Add `torch>=2.1.0` and `torchvision>=0.16.0` to `backend/models/requirements.txt`.
- [ ] **Model Benchmark & Health Check**: Add automated model verification test to validate inference latency and top-1 / top-5 accuracy on standard test images.

### Phase 3: Dead Code & Orphan Elimination
- [ ] **Remove or Implement Unused Frontend Services**: Delete or connect `AIWeightEstimationService.js`, `AutoQRGenerationService.js`, `BlockchainIntegrationService.js`, and `VoiceGuidanceService.js`.
- [ ] **Purge or UI-Connect Marketplace**: Either build a farmer Marketplace UI in frontend or remove `MarketplaceService.js` and `/api/marketplace/*` routes.
- [ ] **Unify Notification Service**: Refactor `NotificationService.js` to query `DatabaseService` instead of hardcoded `animals.json`.

### Phase 4: Genuine Explainable AI & Weight Estimation
- [ ] **Implement Real Grad-CAM**: Replace random coordinate generation in `ExplainableAIHeatmap.jsx` with a backend PyTorch endpoint that calculates layer activation maps using `torchcam` or standard hook on the final ConvNeXt layer (`model.stages[-1].blocks[-1]`).
- [ ] **Address Weight Estimation**: Either train a regression model (e.g. estimating weight from pixel measurements with calibrated reference object) or replace with standard veterinary heart-girth/body-length formulas (Shaeffer's formula). Do not claim it is "AI" if using mathematical formulas.

### Phase 5: Production Deployment & Architecture Alignment
- [ ] **Migrate Backend from Vercel to Container Host**: Deploy Node backend to Railway, Render, or ECS so WebSockets (Socket.IO) and Cron jobs run persistently.
- [ ] **Migrate Frontend to Static CDN**: Deploy Vite static bundle (`frontend/dist`) to Cloudflare Pages, Vercel, or Netlify.
- [ ] **Deploy PyTorch Service**: Host Python service on Railway or AWS EC2 with GPU/CPU optimization and set `PYTORCH_SERVICE_URL`.

---

## 7. Required Dependencies & Modifications Table

| Component | Required Package / Dependency | Modification Files | Risk / Complexity |
|---|---|---|---|
| **File Upload Security** | None (multer options) | `backend/src/server.js` | Low |
| **PyTorch Microservice** | `torch`, `torchvision` in `requirements.txt` | `backend/models/requirements.txt`<br>`backend/models/pytorch_service.py` | Medium (package size / wheel compilation) |
| **Real Grad-CAM** | `torchcam` or manual PyTorch backward hooks | `backend/models/pytorch_service.py`<br>`frontend/src/pages/ExplainableAIHeatmap.jsx` | Medium-High |
| **QR Scanner Fix** | None (`window.QrScanner` check) | `frontend/src/pages/Scan.jsx` | Low |
| **WebAuthn (Real Biometrics)** | `@simplewebauthn/server`, `@simplewebauthn/browser` | `backend/src/server.js`<br>`frontend/src/pages/Login.jsx` | High (requires FIDO credential DB storage) |
| **WebSocket / Cron Stability** | Docker / Container runtime | `railway.json`, `Dockerfile`, `vercel.json` | Medium |
