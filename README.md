# ResearchPilot AI 🚀

> An all-in-one AI-powered research discovery, gamified learning, and student productivity operating system.

---

## 🏗️ Architecture

```
hack/
├── backend/          # Node.js + Express API
│   ├── src/
│   │   ├── db/           # PostgreSQL + pgvector connection & schema
│   │   ├── middleware/   # JWT auth, Multer uploads
│   │   ├── routes/       # API route handlers
│   │   ├── services/     # Gemini AI integration
│   │   └── utils/        # Text chunking, PDF parsing
│   └── package.json
└── frontend/         # React + Vite + Tailwind CSS
    ├── src/
    │   ├── components/   # Sidebar, FileUploader
    │   ├── contexts/     # AuthContext (JWT + gamification state)
    │   ├── pages/        # Dashboard, Matrix, Chat, Gaps, Courses, Focus, Leaderboard, Planner
    │   └── services/     # Axios API client
    └── package.json
```

---

## ⚙️ Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ with **pgvector** extension installed
- Google Gemini API key

### 1. Clone & Install
```bash
# Install all dependencies
npm run install:all
```

### 2. Configure Environment Variables

**Backend** (`backend/.env`):
```env
DATABASE_URL=postgresql://user:password@localhost:5432/researchpilot
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_minimum_32_character_secret_key
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
MAX_FILE_SIZE_MB=50
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=/api/v1
```

### 3. Set up PostgreSQL with pgvector
```sql
-- In PostgreSQL, enable pgvector extension:
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```
> The schema runs automatically on first startup.

### 4. Run Development Servers

**Terminal 1 — Backend:**
```bash
npm run dev:backend
# Server starts at http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
npm run dev:frontend
# App opens at http://localhost:5173
```

---

## 🎯 Features

| Module | Description |
|--------|-------------|
| **Dashboard** | Drag-and-drop uploader for PDFs, PPTs, audio, YouTube, web URLs, Anki decks |
| **Research Matrix** | Side-by-side comparison: Methodology, Datasets, Results, Limitations |
| **Evidence Chat** | RAG-powered Q&A with `[Document, Page]` inline citations |
| **Gap Discovery** | AI analysis of research limitations → 3 actionable proposals |
| **Courses** | Auto-generated modules, 3D flashcards, adaptive quizzes with XP |
| **Focus Timer** | Forest-style Pomodoro with animated growing trees |
| **Leaderboard** | Weekly XP rankings: Bronze → Silver → Gold → Diamond |
| **Planner** | Week/month calendar with color-coded academic events |

---

## 🔌 API Endpoints

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login, receive JWT |
| GET | `/api/v1/auth/me` | Get current user profile |

### Ingestion
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/v1/ingest/file` | Upload files (PDF, PPT, Audio, TXT) |
| POST | `/api/v1/ingest/url` | Ingest YouTube / web URL |
| POST | `/api/v1/ingest/anki` | Ingest Anki flashcard deck |
| GET | `/api/v1/ingest/sources` | List all user sources |
| DELETE | `/api/v1/ingest/sources/:id` | Delete a source |

### Research
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/v1/research/matrix` | Comparative metadata table |
| POST | `/api/v1/research/chat` | RAG chat with pgvector cosine search |
| POST | `/api/v1/research/gaps` | Research gap analysis |

### Courses & Gamification
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/v1/course/generate` | Generate adaptive course |
| GET | `/api/v1/course` | List courses |
| GET | `/api/v1/course/:id` | Get course details |
| POST | `/api/v1/course/quiz/start` | Start quiz session |
| GET | `/api/v1/course/quiz/state/:id` | Get quiz state |
| PUT | `/api/v1/course/quiz/state/:id` | Update quiz state |
| POST | `/api/v1/course/focus/complete` | Log focus session + XP |
| GET | `/api/v1/course/league/leaderboard` | Weekly leaderboard |

### Schedule
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/schedule` | List events (filter by date range) |
| POST | `/api/v1/schedule` | Create event |
| PUT | `/api/v1/schedule/:id` | Update event |
| DELETE | `/api/v1/schedule/:id` | Delete event |

---

## 🛡️ Security
- **JWT** authentication on all protected routes
- **bcrypt** (12 rounds) password hashing
- **Helmet** security headers
- **Rate limiting**: 200 req/15min (API), 20 req/15min (auth)
- **CORS** restricted to configured frontend origin
- User data isolation via `WHERE user_id = req.user.id`

---

## 🧠 AI Pipeline
```
File Upload → Text Extraction → Chunking (800 chars, 150 overlap)
     → text-embedding-004 (768-dim vectors) → pgvector HNSW index

RAG Chat:
Question → Embedding → pgvector cosine search (<-> operator)
         → Top-K chunks → gemini-2.0-flash → Cited response
```
