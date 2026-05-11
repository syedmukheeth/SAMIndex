<div align="center">

<img src="./assets/logo.png" alt="SAMIndex Logo" width="120" height="120" style="border-radius:24px"/>

# SAMIndex

### The Neural Brain for Your Source Code.
### Engineered for Contextual Intelligence — Built for Scale.

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-sam--index.vercel.app-0070f3?style=for-the-badge&logoColor=white)](https://sam-index.vercel.app)
[![GitHub Stars](https://img.shields.io/github/stars/syedmukheeth/SAMIndex?style=for-the-badge&color=7928ca&logo=github)](https://github.com/syedmukheeth/SAMIndex/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/syedmukheeth/SAMIndex?style=for-the-badge&color=50e3c2&logo=github)](https://github.com/syedmukheeth/SAMIndex/forks)
[![License](https://img.shields.io/badge/License-MIT-000000?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.1.0-ffffff?style=for-the-badge&color=000000)](CHANGELOG.md)

</div>

---

## 🌌 Why SAMIndex? (The Vision)

> "Most search engines find files. SAMIndex understands logic."

I built SAMIndex because I was tired of "Keyword Blindness." As codebases grow, finding *where* something is becomes easier than understanding *why* it is. SAMIndex was created to bridge the **Context Gap** between raw code and developer intent.

### What it solves:
- **Keyword Blindness**: Replaces traditional `grep` searches with Neural Understanding. You don't search for "auth middleware"; you ask "How does the system handle JWT rotation?".
- **Indexing Latency**: Traditional API-based indexing is slow and hits rate limits. Our **Turbo Indexing** strategy uses ZIP-stream processing to bypass GitHub limits, indexing massive repos in seconds.
- **Provider Lock-in**: Engineered with a **Dual-AI Engine** that seamlessly switches between Google Gemini and NVIDIA NIM (Llama 3.1) based on your availability and performance needs.

---

## 🌟 What makes SAMIndex different?

| Principle | Implementation |
|---|---|
| **Neural Understanding** | Uses LLMs (Gemini/NVIDIA) to build a semantic brain of your code |
| **Turbo Indexing** | ZIP-based scanning to bypass GitHub API rate limits by 90% |
| **Event-Driven Pipeline** | BullMQ + Redis for resilient, asynchronous background indexing |
| **Digital Obsidian UI** | Premium glassmorphism design system with sub-100ms interaction latency |
| **Workspace Isolation** | Deep-search within specific repos or perform global neural queries |
| **Identity-First Security** | Passport.js Google OAuth + JWT rotation for senior-grade security |

---

## ✨ Feature Showcase

<table>
<tr>
<td width="50%">

**🧠 Neural Intelligence**
- **Semantic Code Search**: Ask questions in natural language.
- **Dual-AI Engine**: Gemini 1.5 Flash + NVIDIA NIM support.
- **Auto-Summarization**: Intelligent README analysis for repo value props.
- **Contextual Brain**: Understands cross-file dependencies and logic.

</td>
<td width="50%">

**⚡ Turbo Infrastructure**
- **ZIP-Stream Indexing**: High-speed snapshot processing.
- **Asynchronous Workflows**: BullMQ handles heavy indexing in the background.
- **Real-time Progress**: Socket.IO updates during "Neural Establishment."
- **Cache-First Search**: Redis-backed query optimization.

</td>
</tr>
<tr>
<td width="50%">

**🛡️ Security & Scalability**
- **Google OAuth**: Enterprise-grade authentication.
- **JWT Rotation**: Secure session management.
- **Rate Limiting**: Protection against API abuse.
- **Sanitized Persistence**: NoSQL injection protection.

</td>
<td width="50%">

**🎨 UX & Aesthetic**
- **Digital Obsidian UI**: Custom glassmorphism design system.
- **Framer Motion**: Smooth micro-animations and transitions.
- **Three.js Visuals**: Interactive background meshes.
- **Responsive Parity**: Premium experience on Mobile, Tablet, and Desktop.

</td>
</tr>
</table>

---

## 🏗️ System Design & Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                │
│   React 19 + Vite  │  Framer Motion  │  Lucide Icons                │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS / WSS
┌────────────────────────────▼────────────────────────────────────────┐
│                       EXPRESS BACKEND                               │
│              REST API + Socket.IO Control Plane                     │
└──────────┬──────────────────────────────────────────┬──────────────┘
           │                                          │
┌──────────▼──────────┐                   ┌──────────▼──────────────┐
│   BullMQ Worker     │                   │   Neural Engine         │
│  (Indexing Service) │                   │  (Gemini / NVIDIA)      │
└──────────┬──────────┘                   └──────────┬──────────────┘
           │                                          │
┌──────────▼──────────────────────────────────────────▼──────────────┐
│                       DATA LAYER                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────┐   │
│  │  MongoDB 9  │  │  Redis 7    │  │  GitHub API / ZIP        │   │
│  │  (Neural    │  │  (Queue,    │  │  (Source Layer)          │   │
│  │   Brain)    │  │   Cache)    │  │                          │   │
│  └─────────────┘  └─────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ File Structure

```
SAMIndex/
├── 📁 frontend/                    # React + Vite (Digital Obsidian)
│   └── src/
│       ├── 📁 assets/              # Premium branding & logos
│       ├── 📁 components/          # Glassmorphism UI components
│       │   ├── Layout.jsx          # App shell with backdrop blur
│       │   ├── Search/             # Neural search interface
│       │   └── Indexing/           # Progress bars & scan states
│       ├── 📁 hooks/               # Custom intelligence hooks
│       ├── 📁 pages/               # Dashboard, Repository, Settings
│       ├── 📁 services/            # API & WebSocket connectors
│       ├── index.css               # Global Design Tokens
│       └── App.jsx                 # Root router
│
├── 📁 backend/                     # Node.js + Express API
│   └── src/
│       ├── 📁 modules/             # Domain-Driven Design
│       │   ├── auth/               # Google OAuth & JWT
│       │   ├── repository/         # CRUD & Indexing logic
│       │   ├── search/             # Neural query processing
│       │   └── ai/                 # Gemini & NVIDIA NIM adapters
│       ├── 📁 middleware/          # Security & Validation
│       ├── 📁 queues/              # BullMQ configuration
│       ├── 📁 workers/             # Background processing logic
│       ├── 📁 models/              # Mongoose (Neural Schema)
│       └── server.js               # Entry point
│
├── 📁 assets/                      # Global static assets
├── 📄 DEPLOYMENT.md                # Deployment guide
├── 📄 .env.example                 # Config template
└── 📄 vercel.json                  # Frontend hosting config
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| ![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black&style=flat-square) | UI Framework |
| ![Vite](https://img.shields.io/badge/Vite_8-646CFF?logo=vite&logoColor=white&style=flat-square) | Modern Build Tool |
| ![Tailwind](https://img.shields.io/badge/Tailwind_4-06B6D4?logo=tailwindcss&logoColor=white&style=flat-square) | Atomic Styling |
| ![Framer Motion](https://img.shields.io/badge/Framer_Motion_12-0055FF?logo=framer&logoColor=white&style=flat-square) | Premium Animations |
| ![Three.js](https://img.shields.io/badge/Three.js-000000?logo=threedotjs&logoColor=white&style=flat-square) | 3D Visual Mesh |
| ![Lucide](https://img.shields.io/badge/Lucide-F43F5E?logo=lucide&logoColor=white&style=flat-square) | Icon Suite |

### Backend
| Technology | Purpose |
|---|---|
| ![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white&style=flat-square) | JS Runtime |
| ![Express](https://img.shields.io/badge/Express_5-000000?logo=express&logoColor=white&style=flat-square) | API Framework |
| ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white&style=flat-square) | Neural Persistence |
| ![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white&style=flat-square) | Queue & Caching |
| ![BullMQ](https://img.shields.io/badge/BullMQ-FF4154?style=flat-square) | Background Processing |
| ![Passport](https://img.shields.io/badge/Passport-34E27A?logo=passport&logoColor=white&style=flat-square) | Authentication |

### Neural & Infra
| Technology | Purpose |
|---|---|
| ![Gemini](https://img.shields.io/badge/Gemini_1.5-4285F4?logo=google-gemini&logoColor=white&style=flat-square) | Neural Core |
| ![NVIDIA](https://img.shields.io/badge/NVIDIA_NIM-76B900?logo=nvidia&logoColor=white&style=flat-square) | Alternative Neural Engine |
| ![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white&style=flat-square) | Edge Hosting |
| ![Render](https://img.shields.io/badge/Render-46E3B7?logo=render&logoColor=black&style=flat-square) | Backend Compute |

---

## 🚀 Getting Started

### Prerequisites

```bash
node >= 18.0.0
npm  >= 9.0.0
MongoDB (Atlas or Local)
Redis (Upstash or Local)
```

---

### Local Development

#### 1. Clone & Install
```bash
git clone https://github.com/syedmukheeth/SAMIndex.git
cd SAMIndex

# Install Backend
cd backend && npm install

# Install Frontend
cd ../frontend && npm install
```

#### 2. Configure Environment
Create a `.env` in the `backend` folder:
```bash
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
GITHUB_TOKEN=your_github_token
GEMINI_API_KEY=your_key # Detects nvapi- prefix for NVIDIA NIM
REDIS_HOST=your_host
REDIS_PORT=your_port
REDIS_PASSWORD=your_password
```

#### 3. Launch
```bash
# In backend/
npm run dev

# In frontend/
npm run dev
```

---

## 🔐 Security Standards

- ✅ **JWT Rotation**: Prevents session hijacking.
- ✅ **Helmet.js**: Hardened HTTP headers.
- ✅ **Rate Limiting**: Prevents brute-force indexing.
- ✅ **NoSQL Sanitization**: Protection against MongoDB injection.
- ✅ **Google OAuth**: Secure identity provider.

---

## 👨‍💻 Developer

<div align="center">

Built with 🖤 from India by

**Syed Mukheeth**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?logo=linkedin&logoColor=white&style=for-the-badge)](https://www.linkedin.com/in/syedmukheeth)
[![GitHub](https://img.shields.io/badge/GitHub-181717?logo=github&logoColor=white&style=for-the-badge)](https://github.com/syedmukheeth)

</div>

---

<div align="center">

**If SAMIndex helped you understand your code better, please ⭐ the repo!**

*© 2026 SAMIndex — A Neural Code Intelligence Experiment*

</div>
