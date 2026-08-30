# ContextOS

A living behavioral map of software.

ContextOS is a developer tool that statically analyzes codebases to build a behavioral graph — mapping functions, routes, components, and data flows into a connected graph. It enables impact analysis, regression detection, and capability discovery. Deterministic analysis first, AI last.

## Architecture

```
Reference Application Source Code
        ↓
  ┌─────────────┐
  │ Python AST   │ ← Backend analyzer
  │ ts-morph     │ ← Frontend analyzer
  └─────────────┘
        ↓
  Unified Behavioral Graph (NetworkX)
        ↓
  PostgreSQL (persistent storage)
        ↓
  FastAPI (REST API)
        ↓
  ┌──────────────────────────────────────┐
  │ Impact Analysis (BFS traversal)      │
  │ Graph Diff (ChangeSet)               │
  │ Scenario Execution (pytest)          │
  │ Evidence Builder                     │
  │ AI Explanation (cached fallback)     │
  └──────────────────────────────────────┘
        ↓
  ContextOS React GUI (React Flow)
```

## Repository Structure

```
contextos/
├── apps/
│   ├── frontend/            # ContextOS GUI — React + TypeScript + Vite + Tailwind + React Flow
│   └── backend/             # ContextOS API — Python + FastAPI + NetworkX + PostgreSQL
│       ├── analyzers/       # Python AST analyzer + ts-morph frontend analyzer
│       ├── graph/           # NetworkX graph builder
│       ├── db/              # PostgreSQL persistence layer
│       ├── watcher/         # File system watcher with debouncing
│       ├── diff/            # Graph diffing engine (ChangeSet)
│       ├── impact/          # BFS impact analysis
│       ├── scenarios/       # Scenario registry + pytest executor
│       ├── evidence/        # Evidence builder
│       ├── ai/              # AI explanation layer with cached fallback
│       └── tests/           # 93 tests (analyzer, graph, API, frontend, integration)
│
├── packages/
│   └── shared-types/        # Frozen TypeScript type contract (44 tests)
│
├── reference-apps/
│   ├── banking/             # Full reference app — 5 behaviors, React/TS frontend + FastAPI backend
│   │   └── backend/tests/   # 11 regression scenarios (withdraw, deposit, transfer)
│   └── ecommerce/           # Second reference app — 4 behaviors, GraviComm store
│
├── docs/                    # Architecture docs, master spec (not in git)
├── .env.example             # Environment variable template
└── README.md
```

## Prerequisites

- **Node.js** ≥ 18 (tested with v26)
- **Python** ≥ 3.11 (tested with 3.14)
- **PostgreSQL** ≥ 14 (tested with 15)
- **npm** (comes with Node.js)

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Required:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://localhost:5432/contextos` | PostgreSQL connection string |

## Installation

### 1. ContextOS frontend

```bash
cd apps/frontend && npm install && cd ../..
```

### 2. ContextOS backend

```bash
cd apps/backend
pip3 install --break-system-packages -r requirements.txt
cd ../..
```

### 3. Banking frontend

```bash
cd reference-apps/banking/frontend && npm install && cd ../../..
```

### 4. E-commerce frontend

```bash
cd reference-apps/ecommerce/frontend && npm install && cd ../../..
```

### 5. PostgreSQL setup

```bash
brew services start postgresql@15
createdb contextos
```

## Startup Commands

Run each in a separate terminal:

| Terminal | Application | Command | URL |
|---|---|---|---|
| 1 | **ContextOS Backend** | `cd apps/backend && python3 -m uvicorn main:app --port 8000 --reload` | http://localhost:8000 |
| 2 | **ContextOS Frontend** | `cd apps/frontend && npm run dev` | http://localhost:5173 |
| 3 | **Banking Backend** | `cd reference-apps/banking/backend && python3 -m uvicorn app:app --port 8001` | http://localhost:8001 |
| 4 | **Banking Frontend** | `cd reference-apps/banking/frontend && npm run dev` | http://localhost:5174 |
| 5 | **E-commerce Backend** | `cd reference-apps/ecommerce/backend && python3 -m uvicorn main:app --port 8002` | http://localhost:8002 |
| 6 | **E-commerce Frontend** | `cd reference-apps/ecommerce/frontend && npm run dev` | http://localhost:5175 |

## Ports

| Service | Port |
|---|---|
| ContextOS Backend | 8000 |
| ContextOS Frontend | 5173 |
| Banking Backend | 8001 |
| Banking Frontend | 5174 |
| E-commerce Backend | 8002 |
| E-commerce Frontend | 5175 |

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/projects` | List all registered projects |
| `POST` | `/projects/{id}/analyze` | Run full analysis pipeline |
| `POST` | `/projects/{id}/analyze-with-impact` | Analyze with graph diff + impact |
| `GET` | `/projects/{id}/graph` | Get latest graph (nodes, edges, behaviors) |
| `GET` | `/projects/{id}/runs` | List analysis run history |
| `GET` | `/nodes/{id}/source` | Get source code snippet for a node |
| `GET` | `/projects/{id}/changesets` | Get latest ChangeSet |
| `GET` | `/projects/{id}/impact` | Get latest ImpactReport |
| `GET` | `/projects/{id}/scenarios` | List defined scenarios |
| `POST` | `/projects/{id}/scenarios/{sid}/run` | Run a single scenario |
| `POST` | `/projects/{id}/scenarios/run-all` | Run all scenarios for a project |
| `GET` | `/projects/{id}/scenario-results` | Get scenario execution results |
| `GET` | `/projects/{id}/evidence` | Get evidence items |
| `POST` | `/projects/{id}/build-evidence` | Build evidence from analysis |
| `POST` | `/projects/{id}/explain` | Get AI explanation |
| `GET` | `/watcher/status` | Get file watcher status |
| `POST` | `/watcher/start/{id}` | Start file watcher for a project |
| `POST` | `/watcher/stop/{id}` | Stop file watcher |

## Testing

```bash
# Backend tests (93 tests)
cd apps/backend && python3 -m pytest tests/ -v

# Banking scenario tests (11 tests)
cd reference-apps/banking/backend && python3 -m pytest tests/ -v

# Shared types tests (44 tests)
cd packages/shared-types && npm test

# Frontend build
cd apps/frontend && npm run build
```

## Live Demo Flow (Banking Regression)

1. Open Banking at http://localhost:5174 — verify it works (accounts, withdraw, deposit)
2. Open ContextOS at http://localhost:5173
3. Select "Banking" from the project dropdown
4. Click **Analyze** — graph renders with real behavioral data
5. Click a behavior (e.g., "Withdraw") — graph highlights its path
6. Click a node — source code appears in the right panel
7. Click **Run Tests** — all 6 banking scenarios execute
8. View results: pass/fail status for each scenario
9. Click **Impact** tab — see risk assessment and affected behaviors
10. Click **Watch** — file watcher monitors Banking source for changes
11. Modify Banking source code (e.g., break the withdraw balance check)
12. Save — ContextOS auto-detects change, re-analyses, diffs, computes impact
13. View: changed files, affected behaviors, risk score, AI explanation

## What's Implemented

### Phase 1 — Static Analysis
- Python AST analyzer (routes, handlers, functions, classes, call edges)
- ts-morph frontend analyzer (React components, event handlers, fetch API calls)
- Frontend-to-backend route resolution with parameter normalization
- NetworkX graph construction with behavior seeds and IMPLEMENTS edges
- PostgreSQL persistence with atomic graph publication
- React Flow visualization with behavior selection, source panel, project selector
- Both reference apps fully functional and analyzable

### Phase 2 — Impact Engine
- File system watcher with debouncing (watches project source for changes)
- Graph diff engine (produces ChangeSet: added/removed/modified nodes)
- BFS impact traversal (determines affected nodes and behaviors)
- Risk scoring (0.0–1.0 based on change scope)
- Evidence builder (links changes → impacts → scenarios → conclusions)

### Phase 3 — Regression Detection
- Scenario registry (6 banking scenarios, 4 e-commerce scenarios)
- pytest execution harness (subprocess, timeout, stdout/stderr capture)
- Confirmed regression detection (scenario failure = confirmed regression)
- Evidence system (every conclusion backed by evidence)

### AI Layer
- Cached explanation engine (no live API required)
- Behavior-level summaries and impact explanations
- Graceful fallback when evidence is insufficient
- AI never invents graph facts — only explains deterministic findings

## Graph Schema

### Node Types
`behavior` · `component` · `handler` · `route` · `function` · `service` · `data` · `external` · `scenario`

### Edge Types
`IMPLEMENTS` · `TRIGGERS` · `CALLS` · `ROUTES_TO` · `READS` · `WRITES` · `DEPENDS_ON` · `TESTS` · `AFFECTS`

Every `GraphNode` and `GraphEdge` carries an `analysisRunId` linking it to a specific analysis execution.

## Troubleshooting

**PostgreSQL not running:**
```bash
brew services start postgresql@15
```

**Frontend can't reach backend:**
Ensure the ContextOS backend is running on port 8000. The Vite dev server proxies API requests to `http://localhost:8000`.

**E-commerce backend won't start:**
```bash
pip3 install --break-system-packages sqlalchemy fastapi uvicorn
```

## License

Built at DevJams'26 hackathon.
