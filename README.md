# SamIndex 🚀

A production-grade GitHub search engine and authority ranking system built with the **MERN** stack (MongoDB, Express, React, Node.js).

## 🌟 Features

- **High-Performance Search**: Combined search for users and repositories using MongoDB full-text indexing.
- **Authority Ranking**: Proprietary formula `(followers * 2) + (repoStars * 1.5)` to rank professional impact.
- **Real-time Ingestion**: Sync user data and their top 100 repositories directly from GitHub API.
- **Optimized UI**: GitHub-inspired design with debounced live search, skeleton loaders, and smooth transitions.
- **Production Infrastructure**:
  - Centralized Error Handling
  - In-memory Caching (Node-Cache)
  - Rate Limiting & Security Headers (Helmet, CORS)
  - Background Cron Jobs for Daily Data Refresh

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS 4, Framer Motion, Lucide-React.
- **Backend**: Node.js, Express, MongoDB, Mongoose.
- **Utilities**: Node-cron (Automation), Axios (API), Node-cache (Performance).

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB (Running locally or via Atlas)
- GitHub Personal Access Token (Optional, for higher rate limits)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd SAMIndex
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your MongoDB URI and GitHub Token
   npm run dev
   ```

3. **Setup Frontend**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/fetch/:username` | Ingest/Sync user data from GitHub |
| `GET`  | `/api/v1/search?q=` | Combined text search (Users + Repos) |
| `GET`  | `/api/v1/user/:username` | Get detailed profile & repositories |
| `GET`  | `/api/v1/health` | API Health check |

## 📂 Project Structure

```text
SAMIndex/
├── backend/
│   ├── src/
│   │   ├── config/       # Database connection
│   │   ├── controllers/  # Request handlers
│   │   ├── models/       # Mongoose schemas
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # GitHub API & Cron logic
│   │   ├── utils/        # Error & Ranking helpers
│   │   └── server.js     # Entry point
├── frontend/
│   ├── src/
│   │   ├── components/   # UI & Layout components
│   │   ├── pages/        # Search & Profile views
│   │   ├── services/     # API Client
│   │   ├── hooks/        # Custom React hooks
│   │   └── App.jsx       # Routing
```

## ⚖️ License

MIT
