# LinkedIn AI Bot

A self-running LinkedIn content bot powered by **Claude (Anthropic AI)**. It finds trending tech news, writes professional long-form LinkedIn posts, optionally generates banner images, and publishes automatically on a schedule you set.

## Quick Start

See the full beginner-friendly guide (PDF/DOCX) for step-by-step setup with screenshots.

### Prerequisites
- Node.js v18+
- API keys: Anthropic (Claude), Hugging Face, LinkedIn (see guide Step 4)

### 1. Clone and install
```bash
git clone https://github.com/YOUR_USERNAME/linkedin-ai-bot.git
cd linkedin-ai-bot

cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure API keys
```bash
cd backend
cp .env.example .env
# Edit .env and fill in your 4 API keys
```

### 3. Run
```bash
# Terminal 1 — backend engine
cd backend && node server.js

# Terminal 2 — dashboard
cd frontend && npm run dev

# Open http://localhost:5173
```

## Project Structure

```
linkedin-ai-bot/
├── backend/
│   ├── server.js                  # Express API server
│   ├── .env.example               # Copy to .env and fill in keys
│   ├── package.json
│   └── services/
│       ├── newsScraper.js         # RSS + HTML news fetching
│       ├── claudeWriter.js        # Claude AI post generation  ← customize tone here
│       ├── imageComposer.js       # Hugging Face banner images
│       ├── linkedinPublisher.js   # LinkedIn API v2 posting
│       ├── queueManager.js        # Scheduled post queue
│       └── scheduler.js           # Auto-posting + cron jobs
└── frontend/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.jsx                # Main app + tab navigation
        ├── main.jsx
        ├── api/api.js             # Backend API calls
        └── components/
            ├── ManualTab.jsx      # Browse news, scan, generate, publish
            ├── CreateTab.jsx      # Custom content + scheduling
            └── AutoTab.jsx        # Auto-scheduler + queue viewer
```

## Customization

| What to change | File |
|---|---|
| Writing tone / persona / post length | `backend/services/claudeWriter.js` |
| News sources (add/remove RSS feeds) | `backend/services/newsScraper.js` |
| Auto-scheduler topic list | `backend/services/newsScraper.js` → `DEFAULT_TOPICS` |
| Image generation style | `backend/services/imageComposer.js` |

## License

MIT — free to use, modify, and build on. No attribution required.
"# linkedin-ai-bot" 
