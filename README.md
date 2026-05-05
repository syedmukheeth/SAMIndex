# <p align="center"><img src="./assets/logo.png" width="120" alt="SAMIndex Logo"></p>
# <p align="center">SAMIndex</p>
### <p align="center">Next-Generation Code Intelligence & Repository Indexing</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.0-blue?style=for-the-badge&logo=none" alt="Version">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge&logo=none" alt="License">
  <img src="https://img.shields.io/badge/Frontend-Vite%20%2B%20React-61DAFB?style=for-the-badge&logo=react" alt="Frontend">
  <img src="https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?style=for-the-badge&logo=node.js" alt="Backend">
</p>

---

## 🌌 Overview
**SAMIndex** is a high-fidelity code intelligence platform designed for senior developers who need instant, neural-powered insights across their entire repository ecosystem. By leveraging advanced indexing algorithms and a "Digital Obsidian" glassmorphism aesthetic, SAMIndex transforms how you explore, search, and understand complex codebases.

## ✨ Key Features
- 🧠 **Neural Repository Indexing**: High-speed background scanning using BullMQ and Redis for massive repository support.
- 🔍 **Hybrid Search Engine**: Seamlessly switch between **Global Search** (cross-repo) and **Workspace Mode** (repo-locked) for targeted exploration.
- 💎 **Digital Obsidian UI**: A premium, state-of-the-art interface built with glassmorphism, fluid animations (Framer Motion), and dark-mode optimization.
- 🔐 **Secure Intelligence**: Native Google OAuth 2.0 integration and secure "Guest Mode" for flexible access.
- ⚡ **Real-time Synchronization**: Live progress tracking during indexing with neural-style scanning animations.

---

## 🛠 Tech Stack

### Frontend
- **Framework**: [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Styling**: Vanilla CSS (Premium Custom Tokens)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State Management**: React Hooks & Context API

### Backend
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [MongoDB Atlas](https://www.mongodb.com/atlas/database)
- **Caching & Queues**: [Upstash Redis](https://upstash.com/) + [BullMQ](https://docs.bullmq.io/)
- **Authentication**: [Passport.js](http://www.passportjs.org/) (Google Strategy) + JWT

### Infrastructure
- **Frontend Hosting**: [Vercel](https://vercel.com/)
- **Backend Hosting**: [Render](https://render.com/)
- **Version Control**: Git & GitHub

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v18+)
- MongoDB connection string
- Upstash Redis credentials
- GitHub Personal Access Token (for indexing)
- Google OAuth Credentials

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/syedmukheeth/SAMIndex.git

# Install Backend dependencies
cd backend
npm install

# Install Frontend dependencies
cd ../frontend
npm install
```

### 3. Environment Setup
Create a `.env` file in the `backend` directory based on `.env.example`:
```env
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_id
GOOGLE_CLIENT_SECRET=your_google_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback
FRONTEND_URL=http://localhost:5173
GITHUB_TOKEN=your_github_token
REDIS_HOST=your_redis_host
REDIS_PORT=your_redis_port
REDIS_PASSWORD=your_redis_password
REDIS_TLS=true
```

### 4. Running Locally
```bash
# Start Backend
cd backend
npm run dev

# Start Frontend (new terminal)
cd frontend
npm run dev
```

---

## 🛡 Security & Authentication
SAMIndex implements a multi-layer security model:
1. **JWT Strategy**: Stateless authentication via encrypted JSON Web Tokens.
2. **OAuth 2.0**: Secure social login via Google.
3. **CORS Policies**: Strict origin filtering to protect API integrity.
4. **Helmet.js**: Enhanced security headers for production safety.

## 📈 Roadmap
- [ ] AI-Powered Code Summarization (GPT-4 Integration)
- [ ] Deep Link Search (specific line-level navigation)
- [ ] Team Collaboration Workspaces
- [ ] Multi-provider OAuth (GitHub, GitLab, Bitbucket)

---

<p align="center">Built with 🖤 by the SAMIndex Team</p>
<p align="center"><i>Intelligence that scales with your code.</i></p>
