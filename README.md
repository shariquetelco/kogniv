# KOGNIV

**AI-Powered Document-to-Knowledge Engine**

Transform any document into structured, searchable knowledge cards. Upload PDFs, DOCX, TXT, or Markdown files and KOGNIV automatically extracts, categorizes, and organizes the content into an interactive card-based knowledge base.

---

## Features

- **Document Parsing** — PDF, DOCX, TXT, Markdown support
- **Smart Card Extraction** — Auto-splits documents into knowledge cards
- **Split-View Reader** — 30/70 card navigation + reader layout
- **Rich Text Editor** — H1/H2/H3 headings, bold, italic, lists, color, highlight
- **Heading Outline** — Auto-generated navigation tree from document headings
- **Workspaces** — Organize cards into separate workspaces
- **Categories & Filters** — Tag and filter cards by category
- **Search** — Full-text search with `Ctrl+S` keyboard shortcut
- **Dark Mode** — Toggle dark/light themes
- **Theme Presets** — 8 color themes (Ocean, Midnight, Forest, Sunset, etc.)
- **Export** — PDF and JSON export
- **Import** — JSON import to merge workspaces

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML, CSS, ES Modules (no framework) |
| State | Centralized pub/sub state management |
| Storage | localStorage (Supabase migration planned) |
| Parsing | PDF.js, Mammoth.js, Marked.js |
| Export | html2pdf.js |
| Hosting | Vercel (static) |
| Container | Docker (Nginx) |

---

## Project Structure

```
kogniv/
├── frontend/              # Web application
│   ├── index.html         # Entry point
│   ├── css/styles.css     # All styles
│   └── js/                # ES modules
│       ├── app.js         # Router, events, entry point
│       ├── state.js       # Centralized state (pub/sub)
│       ├── storage.js     # localStorage abstraction
│       ├── parser.js      # Document parsing
│       ├── ui.js          # All rendering logic
│       ├── modal.js       # Modal system
│       ├── theme.js       # Dark mode + theme presets
│       └── utils.js       # Shared utilities
├── assets/                # Icons, screenshots, branding
├── docs/                  # Documentation
├── docker/                # Docker config
│   └── nginx.conf         # Nginx config for container
├── .github/workflows/     # CI/CD pipelines
│   └── ci.yml             # Build + deploy pipeline
├── Dockerfile             # Container build
├── docker-compose.yml     # One-command local run
├── .dockerignore          # Docker build exclusions
├── vercel.json            # Vercel deployment config
├── package.json           # Project metadata
├── CHANGELOG.md           # Version history
└── README.md              # This file
```

---

## Quick Start

### Local Development

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/kogniv.git
cd kogniv

# Install dev dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:3000
```

### Docker

```bash
# Build and run
docker compose up --build

# Open http://localhost:8080

# Or manual build
docker build -t kogniv .
docker run -p 8080:80 kogniv
```

---

## Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (v2.0.0) — Breaking changes, major redesigns
- **MINOR** (v1.1.0) — New features, backwards compatible
- **PATCH** (v1.0.1) — Bug fixes, small improvements

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

## Deployment

### Vercel (Production)

Automatic deployment via GitHub Actions on push to `main`.

### Docker (Self-Hosted)

```bash
docker compose up -d
```

Serves on port 8080 via Nginx.

---

## Roadmap

- [ ] Supabase database integration
- [ ] User authentication
- [ ] AI-powered card generation
- [ ] Collaborative workspaces
- [ ] Mobile app (iOS + Android)
- [ ] API for third-party integrations

---

## License

Proprietary. All rights reserved.
