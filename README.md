# 🐄 PashuVision — AI Livestock Management System

![Banner](https://capsule-render.vercel.app/api?type=waving&color=0:0d1117,100:0a1f0a&height=200&section=header&text=PashuVision&fontSize=52&fontColor=4ade80&animation=twinkling&fontAlignY=35&desc=AI%20Breed%20Recognition%20%2B%20Intelligent%20Livestock%20Management&descAlignY=55&descColor=bbf7d0)

<p align="center">
  <strong>Next-Generation AI Breed Recognition & Intelligent Livestock Management Platform</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite-61DAFB?style=flat-square&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-339933?style=flat-square&logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/AI%20Microservice-PyTorch%20%7C%20Flask-EE4C2C?style=flat-square&logo=pytorch" alt="PyTorch" />
  <img src="https://img.shields.io/badge/Database-Supabase%20%2F%20Local%20JSON-3ECF8E?style=flat-square&logo=supabase" alt="Database" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License" />
</p>

<p align="center">
  <a href="https://pashu-vision-five.vercel.app/">
    <img src="https://img.shields.io/badge/🔴%20Live%20Demo-pashu--vision--five.vercel.app-4ade80?style=for-the-badge&logo=vercel&logoColor=white" />
  </a>
</p>

---

## 📌 Overview

**PashuVision** is an end-to-end digital livestock management ecosystem powered by deep learning computer vision models. It enables farmers, veterinarians, breeding centers, and agricultural administrators to accurately identify indigenous and exotic cattle and buffalo breeds from photographs, track individual animal health records, manage vaccinations, and generate unique QR passports.

- 📱 **Full-Stack Architecture**: React (Vite) + Node.js (Express) + Python (PyTorch Flask Microservice)

> 🔴 **Try it live:** [pashu-vision-five.vercel.app](https://pashu-vision-five.vercel.app/)

---

## ✨ Key Features

### 🧠 1. AI-Powered Breed Identification
- **Real-Time Visual Classification**: Deep learning inference using a quantized **ConvNeXt Base** network covering 41 indigenous and exotic cattle/buffalo breeds.
- **Species Classification**: Automatic distinction between Cattle (*Bos taurus/indicus*) and Buffalo (*Bubalus bubalis*).
- **Crossbreed & Trait Detection**: Identification of common hybrid breeds with confidence scores and descriptive phenotypic traits.
- **Lazy Loading & Memory Optimization**: Model loads on-demand with INT8 quantization (94.6 MB) for high responsiveness on consumer hardware.

### 📋 2. Digital Animal Health & Passport Records
- **Unique Animal Profiles**: Manage age, gender, ownership history, tags, lactation cycle, and geolocation.
- **Dynamic QR Code Generation**: Instantly generate scannable QR tags for each animal, linking directly to its health history.
- **Vaccination & Health Log**: Track pending vaccinations, medical treatments, and seasonal health alerts.
- **Export Capabilities**: Export animal logs and herd statistics to CSV or Excel for offline reporting.

### 🛡️ 3. Role-Based Access Control (RBAC)
- **Role Permissions**: Tiered privilege levels for Administrators, Field Officers, and Farmers.
- **Record Management**: Users can create, update, and manage their assigned animal profiles; Admins have full review and verification workflows.
- **Audit Trails**: Built-in security logging for animal status updates, approvals, and credential modifications.

### 📚 4. Comprehensive Breed Catalog
- **Curated Database**: Detailed profiles for registered breeds including origin, physical characteristics, milk yield potential, and climate adaptability.
- **Rare Breed Tagging**: Special identification for endangered indigenous breeds to support conservation efforts.
- **Admin Management**: Full CRUD interface for adding and updating breed benchmarks.

### 🌐 5. Real-Time & Offline Resilience
- **Hybrid Storage Engine**: Seamlessly runs with **Supabase (PostgreSQL)** in cloud deployments and automatically falls back to **Local JSON file storage** during offline or local development.
- **WebSocket Synchronization**: Live updates via Socket.IO for status changes and notifications.

---

## 🏗️ Architecture & Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser                         │
│             React 19 + Vite + TailwindCSS                   │
│                 (Port: 5173 / Vercel)                       │
└───────────────────────────────┬─────────────────────────────┘
                                │ HTTP / WebSocket
┌───────────────────────────────▼─────────────────────────────┐
│                   Backend API Gateway                       │
│                Node.js + Express Server                     │
│                (Port: 4000 / Local/Vercel)                  │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
    HTTP Proxy / Internal Call                │
                │                             ▼
┌───────────────▼─────────────┐ ┌─────────────────────────────┐
│     AI Model Microservice   │ │       Database Layer        │
│   Python Flask + PyTorch    │ │  • Supabase (PostgreSQL)    │
│    ConvNeXt Quantized       │ │  • Local JSON Data Fallback │
│   (Port: 5001 / Railway)    │ └─────────────────────────────┘
└─────────────────────────────┘
```

### Stack Breakdown

| Layer | Technologies Used |
|---|---|
| **Frontend** | React 19, Vite, React Router 6, Chart.js, TailwindCSS, Socket.io-client, QRcode.react |
| **Backend** | Node.js 22, Express, Socket.IO, Multer, JWT, bcryptjs, @supabase/supabase-js |
| **AI / ML** | Python 3.11/3.12, PyTorch, Torchvision, Flask, Flask-CORS, Pillow, OpenCV |
| **Model** | ConvNeXt Base (Quantized INT8, ~94.6 MB, 41 classes) |
| **Database** | Supabase (PostgreSQL with RLS) or Local File Storage (`backend/data/`) |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.0.0 or later (v20+ / v22 recommended)
- **Python**: v3.11 or v3.12 (with `torch` and `flask` installed)
- **Git**

> 💡 Want to skip local setup entirely? Check out the **[live demo](https://pashu-vision-five.vercel.app/)** instead.

---

### Option A: One-Command All-in-One Startup (Recommended)

From the project root:

```bash
# 1. Install workspace dependencies
npm install

# 2. Run all 3 services concurrently (AI Service + Backend + Frontend)
npm run dev
```

> **Windows Users**: You can also double-click `run_project.bat` to launch all services automatically.

---

### Option B: Step-by-Step Manual Startup

#### Step 1: AI Model Microservice (Port 5001)
```bash
cd backend/models
python pytorch_service.py
# Or using Python launcher:
# py -3.12 pytorch_service.py
```
*Health check URL: http://localhost:5001/health*

#### Step 2: Node.js Backend Server (Port 4000)
```bash
cd backend
npm install
npm run dev
```
*API Base URL: http://localhost:4000*

#### Step 3: Frontend Development App (Port 5173)
```bash
cd frontend
npm install
npm run dev
```
*Access Web App: http://localhost:5173*

---

## ⚙️ Configuration & Environment Variables

### Backend (`backend/.env`)
```env
PORT=4000
NODE_ENV=development
JWT_SECRET=your-secure-jwt-secret
PYTORCH_SERVICE_URL=http://localhost:5001

# Optional: Supabase Database (if omitted, local JSON database is used automatically)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:4000
```

---

## 📡 Key API Endpoints

### 🔐 Authentication
- `POST /api/auth/register` — Register a new account
- `POST /api/auth/login` — Authenticate and receive JWT token
- `GET  /api/me` — Retrieve logged-in user profile
- `PUT  /api/me` — Update user profile details and avatar

### 🐂 Animal Records
- `GET    /api/animals` — List animal records (role-filtered)
- `POST   /api/animals` — Create an animal record with photo upload
- `GET    /api/animals/:id` — Retrieve full record details
- `PUT    /api/animals/:id` — Update record details
- `DELETE /api/animals/:id` — Remove record (Admin or Owner)
- `POST   /api/animals/:id/approve` — Verify and approve record (Admin)

### 🤖 AI Breed Inference
- `POST /api/predict` — Submit an animal photo for multi-breed identification & confidence metrics
- `POST /api/species` — Classify species (Cattle vs. Buffalo vs. Non-animal)

### 📊 Breed Management (Admin)
- `GET    /api/admin/breeds` — Fetch full breed database
- `POST   /api/admin/breeds` — Add new breed entry
- `PUT    /api/admin/breeds/:id` — Update breed metadata
- `DELETE /api/admin/breeds/:id` — Delete breed entry

---

## ☁️ Deployment

> 🔴 **Live Frontend:** [pashu-vision-five.vercel.app](https://pashu-vision-five.vercel.app/)

PashuVision follows a decoupled deployment architecture — the React frontend is hosted on **Vercel**, while the Node.js backend and PyTorch AI microservice can be deployed to any persistent host (e.g., Railway, Render, Fly.io, AWS, or Docker VPS).

---

## 📂 Project Structure

```
PashuVision/
├── backend/
│   ├── data/                 # Local JSON database & file store
│   ├── models/               # PyTorch model checkpoints & Python service
│   │   ├── pytorch_service.py # Flask AI microservice
│   │   └── requirements.txt  # Python requirements
│   ├── src/
│   │   ├── ai/               # Model caller adapters (PyTorchPredictor)
│   │   ├── services/         # Database, Notifications & Business Logic
│   │   └── server.js         # Express main entry point
│   └── package.json
│
├── frontend/
│   ├── public/               # Static assets & icons
│   ├── src/
│   │   ├── components/       # Reusable UI widgets, Modals, Navbar
│   │   ├── pages/            # Dashboard, Predict, Animals, Breeds, Admin
│   │   ├── services/         # API integration services
│   │   └── App.jsx           # Main routing & state
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── run_ai.js                 # Automatic Python version resolver & runner
├── run_project.bat           # Windows quick-launcher script
└── package.json              # Fullstack workspace orchestrator
```

---

## 🤖 AI Model Specifications

- **Base Architecture**: ConvNeXt Base
- **Optimization**: INT8 Dynamic Quantization
- **Weight Footprint**: ~94.6 MB (reduced from ~1.0 GB)
- **Supported Classes**: 41 Cattle & Buffalo Breeds
- **Inference Latency**: ~120ms - 350ms on standard CPU
- **Hardware Requirement**: Runs on standard CPU; GPU acceleration (CUDA) supported if available

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. **Fork** the repository
2. **Create** your feature branch (`git checkout -b feature/NewFeature`)
3. **Commit** your changes (`git commit -m 'feat: add new feature'`)
4. **Push** to your branch (`git push origin feature/NewFeature`)
5. Open a **Pull Request**

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **PyTorch & timm** communities for model architectures and weights.
- **ONNX Runtime** team for lightweight inference tooling.
- **Supabase** for managed database and auth primitives.
- **React & Vite** communities for modern frontend tooling.
- For complete contributor details and history, see [CONTRIBUTORS.md](CONTRIBUTORS.md).

---

<p align="center">
  <strong>PashuVision</strong> — <em>Empowering Livestock Agriculture Through Intelligent Vision</em>
</p>

<p align="center">
  🔴 <a href="https://pashu-vision-five.vercel.app/"><strong>Live Demo</strong></a> &nbsp;•&nbsp; ⭐ If you found this project helpful, please <strong>star the repo</strong> and share it!
</p>

![Footer](https://capsule-render.vercel.app/api?type=waving&color=0:0a1f0a,100:0d1117&height=120&section=footer&fontColor=4ade80)
