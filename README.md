# LogPilot AI 🚀
### AI-Powered Log Intelligence & Incident Resolution Platform

LogPilot AI parses unstructured application logs, computes rich real-time system metrics (health scores, error distribution, success rates), diagnoses issues using the Groq Llama-3 AI models, and includes an interactive incident assistant.

---

## 🛠️ Tech Stack
- **Frontend:** React, Vite, Tailwind CSS, Recharts, react-dropzone, Lucide Icons
- **Backend:** Node.js, Express, Multer
- **Database:** MongoDB Atlas (Mongoose) with a dynamic Local JSON DB Fallback (`backend/data/db.json`)
- **AI Engine:** Groq API SDK (with smart mock fallbacks if no API key is set)
- **Containerization:** Docker & Docker Compose

---

## ⚙️ Environment Variables
Create a `.env` file under the `backend/` folder. The application will detect if keys are missing and gracefully run with stubs/JSON fallbacks:

```env
PORT=5000
MONGODB_URI=mongodb+srv://...           # (Optional) Falls back to local db.json if blank
GROQ_API_KEY=gsk_...                     # (Optional) Falls back to smart SRE mock diagnostics if blank
NODE_ENV=development
```

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js (v18+)
- npm (or yarn)

### Step 1: Install Dependencies
Run npm install in both directories.
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Step 2: Start the Servers
You can run both concurrently:

```bash
# Start Backend (port 5000)
cd backend
npm start

# Start Frontend (port 5173 with proxy to backend)
cd ../frontend
npm run dev
```

Open `http://localhost:5173` in your browser. Drag and drop the root-level `sample-app.log` file to test the full parsing and diagnostic flow.

---

## 📦 Run with Docker (Local Parity)
From the root workspace folder, simply run:
```bash
docker compose up --build
```
The application will bundle the frontend assets, start the Express server, and be available at `http://localhost:5000` (serving the compiled React app statically).

---

## 🗺️ Project Structure
```text
├── backend/
│   ├── data/             # Local database JSON store
│   ├── parser/           # Regex-based log parser logic
│   ├── services/         # Database and Groq AI service abstractions
│   ├── uploads/          # Multi-part file upload directory
│   ├── server.js         # Express app and route wiring
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # Consolidated React UI & Recharts dashboard
│   │   ├── index.css     # Global stylesheets and custom dark variables
│   │   └── main.jsx
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
├── sample-app.log        # Ready-to-use testing file
├── docker-compose.yml    # Orchestration configuration
└── README.md
```

---

## ✨ Features Implemented vs. Future Roadmap

### ✅ Implemented Features (MVP)
- **Regex Log Parser:** Extracts timestamps, levels, modules, and messages; handles malformed lines safely.
- **Dynamic Database Fallback:** Detects missing MongoDB config and seamlessly falls back to `backend/data/db.json`.
- **Groq AI SRE Analyzer:** Automatically structures diagnostic analysis (Root Cause, Severity, Actions, Preventive Steps) with retry fallback safety.
- **Recharts Dashboard:** Renders interactive pie charts for log levels and bar charts for service counts.
- **Incident Chat Assistant:** Interactive message board to ask specific questions about the uploaded log context.
- **Dark Mode Support:** Fully responsive Tailwind-styled dark/light toggle.

### 🔮 Future Enhancements (v2 Roadmap)
- **Historical Report Querying:** Query and filter past diagnostic sessions.
- **Vector DB / RAG Pipeline:** Connect logs with runtime codebase context via ChromaDB/Pinecone.
- **Slack & PagerDuty Integration:** Route critical FATAL diagnostics straight to notification channels.
- **Live Tail Log Ingestion:** Stream logs via WebSockets from fluentd or Logstash in real-time.
