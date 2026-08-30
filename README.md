# ContextOS

ContextOS is a developer tool that statically analyzes software repositories to construct a connected behavioral map—linking source files, AST symbols, API routes, frontend components, and user-facing capabilities into a queryable behavioral graph. It enables real-time impact analysis, regression detection, and capability discovery: deterministic analysis first, AI explanation last.

---

## Demo Quick Start

The fastest path to evaluating ContextOS with the Banking reference application:

```bash
# 1. Start PostgreSQL & create database
createdb contextos

# 2. Start ContextOS Backend (Terminal 1)
cd apps/backend
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 3. Start ContextOS Frontend (Terminal 2)
cd apps/frontend
npm run dev -- --port 5173

# 4. Start Banking Reference Backend (Terminal 3)
cd reference-apps/banking/backend
python3 -m uvicorn app:app --host 0.0.0.0 --port 8001 --reload

# 5. Start Banking Reference Frontend (Terminal 4)
cd reference-apps/banking/frontend
npm run dev -- --port 5174

# 6. Open ContextOS GUI in your browser:
#    http://localhost:5173
```

In the ContextOS GUI:
1. Select **Banking** from the workspace dropdown and click **Analyze**.
2. Select the **Withdraw** behavior to highlight its end-to-end execution path.
3. Click **Watch** to enable real-time file monitoring, then introduce a logic change in `reference-apps/banking/backend/services.py`.
4. Observe automatic re-analysis, impact scoring, scenario failure, and evidence generation.

---

## What ContextOS Does

ContextOS transforms source code into a structured, executable map of software behavior through a deterministic pipeline:

```text
Source Code (Python AST & TS AST)
   ↓
Static Analysis & Cross-Layer Resolution
   ↓
Behavioral Graph (NetworkX DAG)
   ↓
PostgreSQL Storage & Run Versioning
   ↓
File Watcher & ChangeSet Diffing
   ↓
BFS Traversal & Impact Analysis
   ↓
Scenario Execution & Regression Verification
   ↓
Evidence Synthesis
   ↓
Structural Capability Discovery
   ↓
AI Explanation Layer
```

1. **Static Analysis**: Parses Python AST and TypeScript/React AST (`ts-morph`) to extract function declarations, classes, call sites, API endpoints, and UI components.
2. **Cross-Layer Resolution**: Maps frontend HTTP calls to backend API routes defined in `contextos.yaml` behavior contracts.
3. **Deterministic Diffing**: Compares graph runs using stable symbol hashes (`file + symbol name + contentHash`) to isolate changesets without ID churn.
4. **Impact Traversal**: Performs Breadth-First Search (BFS) from modified nodes to measure reachability to entrypoints and calculate risk scores.
5. **Regression Verification**: Executes scenario test suites against modified paths to verify whether changes cause functional failures.
6. **AI Explanation**: Synthesizes graph evidence, impact paths, and scenario results into natural-language explanations (using cached/fallback templates for offline determinism).

---

## Current MVP Capabilities

- **Python AST Analyzer**: Extracts FastAPI routes, handlers, helper functions, Pydantic models, calls, and line ranges.
- **TypeScript AST Analyzer**: Uses `ts-morph` to parse React components, API fetch calls, and JSX dependencies.
- **Behavior Mapping**: Loads YAML behavioral contracts (`contextos.yaml`) mapping business features (e.g., `Withdraw`, `Deposit`, `Transfer`) to entrypoint routes and component trees.
- **Unified Behavioral Graph**: Constructs in-memory NetworkX directed graphs representing routes, functions, services, components, and data models.
- **PostgreSQL Run History**: Persists every analysis run, graph node/edge, changeset diff, impact report, and test evidence record.
- **Automated File Watcher**: Monitors project source directories for file modifications with configurable debounce and automatic re-analysis.
- **Deterministic Graph Diffing**: Uses content-aware hashing (`contentHash`) to accurately track node additions, removals, and modifications across runs.
- **BFS Impact Analysis**: Computes reachability metrics and risk scores based on graph depth and impacted behavior entrypoints.
- **Scenario Execution Framework**: Runs automated test suites (`pytest`) linked to behavior entrypoints and records stdout, stderr, and regression status.
- **Evidence & Regression Chain**: Links code changes -> graph impact -> failed test scenarios -> confirmed regression evidence.
- **Structural Capability Discovery**: Identifies emergent multi-layer capabilities (such as the Loan application feature) based on structural topology rules across database, service, route, and frontend UI components.
- **Interactive React Flow Visualizer**: Modern dark-mode UI with node selection, behavior path highlighting, source code inspection, tabbed analytical views, and drag-and-zoom graph interactions.
- **Reference Applications**: Bundled Banking and E-commerce sample applications for instant testing and demonstration.

---

## Architecture

```text
Reference Applications (Banking / E-commerce)
        │
        ▼
┌──────────────────────────────────────────────┐
│ ContextOS Analyzers                          │
│ Python AST (ast module) + TS AST (ts-morph)  │
└──────────────────────┬───────────────────────┘
                       ▼
┌──────────────────────────────────────────────┐
│ Behavioral Graph Engine                      │
│ NetworkX Directed Graph & Contract Resolver │
└──────────────────────┬───────────────────────┘
                       ▼
┌──────────────────────────────────────────────┐
│ PostgreSQL Database                          │
│ Graph Runs, Nodes, Edges, Changesets, Impact │
└──────────────────────┬───────────────────────┘
                       ▼
┌──────────────────────────────────────────────┐
│ ContextOS Engine Core                        │
│ File Watcher → Diff Engine → Impact Analysis │
│ Scenario Execution → Evidence → Capability   │
└──────────────────────┬───────────────────────┘
                       ▼
┌──────────────────────────────────────────────┐
│ ContextOS Frontend (React + React Flow + Vite)│
│ Interactive Canvas, Behavior Paths, Source   │
└──────────────────────────────────────────────┘
```

---

## Repository Structure

```text
ContextOS/
├── apps/
│   ├── backend/               # FastAPI backend engine, analyzers, diff, impact, DB
│   │   ├── ai/                # AI explanation layer & fallbacks
│   │   ├── analyzers/         # Python AST, ts-morph bridge, contextos parser
│   │   ├── db/                # PostgreSQL schema & persistence handlers
│   │   ├── diff/              # Graph changeset diffing engine
│   │   ├── evidence/          # Evidence builder & synthesizer
│   │   ├── graph/             # NetworkX graph builder & traversal
│   │   ├── impact/            # BFS impact analyzer & risk calculator
│   │   ├── scenarios/         # Scenario runner & pytest execution harness
│   │   └── watcher/           # Background file watcher service
│   └── frontend/              # React + React Flow + Vite GUI dashboard
│       ├── src/
│       │   ├── components/    # UI elements, buttons, tabs, React Flow canvas
│       │   ├── App.tsx        # Main application router
│       │   ├── Workspace.tsx  # Workspace dashboard & active graph view
│       │   └── Landing.tsx    # Interactive landing page
├── packages/
│   └── shared-types/          # TypeScript interfaces & validation schemas
├── reference-apps/
│   ├── banking/               # Banking reference application (Python + React)
│   │   ├── backend/           # FastAPI service, services.py, app.py, tests/
│   │   └── frontend/          # React UI components (WithdrawForm, DepositForm)
│   └── ecommerce/             # E-commerce reference application (Python + React)
│       ├── backend/           # FastAPI catalog, cart, checkout endpoints
│       └── frontend/          # React storefront UI components
├── docs/                      # Specification & architectural documentation
├── loan_feature.patch         # Reversible patch demonstrating Loan capability
├── .env.example               # Environment variable templates
├── README.md                  # Project documentation
└── .gitignore                 # Version control ignore definitions
```

---

## Prerequisites

Ensure the following tools are installed on your system:

- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **Python**: `v3.10` or higher
- **PostgreSQL**: `v14` or higher

Verify your installation:

```bash
node --version
npm --version
python3 --version
psql --version
```

---

## First-Time Setup

### 1. Clone & Environment Configuration

```bash
git clone https://github.com/ashvyagni/ContextOS.git
cd ContextOS
cp .env.example .env
```

### 2. PostgreSQL Database Setup

Ensure PostgreSQL is running, then create the `contextos` database:

```bash
createdb contextos
```

*(If using custom database credentials, edit `DATABASE_URL` in `.env` accordingly).*

### 3. ContextOS Backend Setup

```bash
cd apps/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ../..
```

### 4. Frontend & Package Setup

Install npm dependencies across the monorepo workspaces:

```bash
# Shared Types
cd packages/shared-types
npm install

# ContextOS Frontend
cd ../../apps/frontend
npm install

# Banking Frontend
cd ../../reference-apps/banking/frontend
npm install

# E-commerce Frontend
cd ../../../reference-apps/ecommerce/frontend
npm install

cd ../../../
```

---

## Environment Variables

Defined in `.env.example`:

| Variable | Required | Default Value | Purpose |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Yes | `postgresql://localhost:5432/contextos` | PostgreSQL connection string |
| `CONTEXTOS_BACKEND_PORT` | Optional | `8000` | Port for ContextOS FastAPI Backend |
| `BANKING_BACKEND_PORT` | Optional | `8001` | Port for Banking Reference Backend |
| `BANKING_FRONTEND_PORT` | Optional | `5174` | Port for Banking Reference Frontend |
| `ECOMMERCE_BACKEND_PORT` | Optional | `8002` | Port for E-commerce Reference Backend |
| `ECOMMERCE_FRONTEND_PORT` | Optional | `5175` | Port for E-commerce Reference Frontend |

---

## Services & Ports

| Service | Directory | Start Command | Port | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **ContextOS Backend** | `apps/backend` | `uvicorn main:app --port 8000` | `8000` | Core API, graph builder, diff, impact |
| **ContextOS Frontend** | `apps/frontend` | `npm run dev -- --port 5173` | `5173` | ContextOS Dashboard & Visualizer |
| **Banking Backend** | `reference-apps/banking/backend` | `python3 -m uvicorn app:app --port 8001` | `8001` | Banking API backend service |
| **Banking Frontend** | `reference-apps/banking/frontend` | `npm run dev -- --port 5174` | `5174` | Banking sample web app |
| **E-commerce Backend** | `reference-apps/ecommerce/backend` | `python3 -m uvicorn main:app --port 8002` | `8002` | E-commerce API backend service |
| **E-commerce Frontend** | `reference-apps/ecommerce/frontend` | `npm run dev -- --port 5175` | `5175` | E-commerce sample storefront |

---

## Starting Everything

For a complete demonstration, open separate terminal windows:

```bash
# Terminal 1 — PostgreSQL (Ensure service is running)
pg_ctl -D /usr/local/var/postgres start  # Or service postgresql start

# Terminal 2 — ContextOS Backend (Required)
cd apps/backend
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 3 — ContextOS Frontend (Required)
cd apps/frontend
npm run dev -- --port 5173

# Terminal 4 — Banking Backend (Required for Banking Demo)
cd reference-apps/banking/backend
python3 -m uvicorn app:app --host 0.0.0.0 --port 8001 --reload

# Terminal 5 — Banking Frontend (Required for Banking Demo)
cd reference-apps/banking/frontend
npm run dev -- --port 5174

# Terminal 6 — E-commerce Backend (Optional)
cd reference-apps/ecommerce/backend
python3 -m uvicorn main:app --host 0.0.0.0 --port 8002 --reload

# Terminal 7 — E-commerce Frontend (Optional)
cd reference-apps/ecommerce/frontend
npm run dev -- --port 5175
```

---

## Opening the Applications

| Application | URL | Description |
| :--- | :--- | :--- |
| **ContextOS Dashboard** | [http://localhost:5173](http://localhost:5173) | Main visual map & behavioral analysis dashboard |
| **Banking Application** | [http://localhost:5174](http://localhost:5174) | Banking reference user web app |
| **E-commerce Application** | [http://localhost:5175](http://localhost:5175) | E-commerce reference user storefront |
| **ContextOS OpenAPI Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive API documentation |

---

## Primary Demo — Banking Regression

This walkthrough demonstrates how ContextOS detects code modifications, calculates impact, executes tests, and presents evidence of a confirmed regression.

### Step-by-Step Flow

1. Open **ContextOS** at `http://localhost:5173`.
2. Select **Banking** from the workspace dropdown and click **Analyze**.
3. Inspect the graph stats (**Nodes: 76, Edges: 96, Behaviors: 5**).
4. Click the **Withdraw** behavior in the left panel. Observe the highlighted path across UI components, routes, service handlers, and data models.
5. Click any node in the path (e.g., `withdraw` function) and select the **Source** tab to inspect the actual source code file and line numbers.
6. Click the **Watch** button to turn on automated file monitoring (Status changes to `Watching`).
7. Open `reference-apps/banking/backend/services.py` in your text editor and modify the `withdraw` function (e.g., comment out or invert the balance check):
   ```python
   # if account.balance < amount:
   #     raise ValueError("Insufficient funds")
   ```
8. Save the file.
9. Without refreshing ContextOS, wait ~5 seconds for the watcher to debounce and trigger re-analysis.
10. Click the **Impact** tab to view the updated report:
    - Observe that **Withdraw** is flagged as affected.
    - Check the **ChangeSet** details (identifying modified nodes without fake node churn).
11. Click **Run Tests** in the Scenario panel.
12. Verify that the `test_withdraw_insufficient_funds` scenario fails, displaying a **CONFIRMED REGRESSION** state.
13. View the **Evidence** tab to read the natural-language breakdown linking the code change to scenario failure.
14. Restore `reference-apps/banking/backend/services.py` to its original state using Git:
    ```bash
    git checkout reference-apps/banking/backend/services.py
    ```

---

## Loan Capability Demo

ContextOS detects structural patterns in a codebase that correspond to emergent capabilities. This demo shows how introducing a multi-layer feature triggers capability candidate detection.

### Step-by-Step Flow

1. Ensure the workspace is clean and analyzed. Verify in the **Capability** tab that no `Loan` capability candidate exists.
2. Apply the reversible loan feature patch:
   ```bash
   git apply loan_feature.patch
   ```
3. Click **Analyze** (or wait for the Watcher to re-analyze).
4. Inspect the **Capability** tab:
   - Observe that a new **Candidate Capability** is detected.
   - Verify that it spans the database, service layer, backend route (`POST /accounts/{id}/loan`), and frontend UI component (`LoanForm.tsx`).
   - Read the AI-generated name and summary explaining the detected Loan feature.
5. Revert the patch cleanly:
   ```bash
   git apply -R loan_feature.patch
   ```
6. Click **Analyze** again.
7. Verify that the candidate capability disappears, returning the graph to a clean state.

*(Note: Always use `git apply -R loan_feature.patch` to revert demo changes safely).*

---

## E-Commerce Reference App

The E-commerce application serves as an independent multi-service reference project for validating ContextOS graph building across different domain models (catalog, cart, orders, coupons).

### Running E-commerce Independently

```bash
# Start Backend
cd reference-apps/ecommerce/backend
python3 -m uvicorn main:app --host 0.0.0.0 --port 8002 --reload

# Start Frontend
cd reference-apps/ecommerce/frontend
npm run dev -- --port 5175
```

Open ContextOS (`http://localhost:5173`), select **E-commerce** from the dropdown, and click **Analyze** to generate the E-commerce behavioral graph.

---

## Testing

ContextOS includes automated test suites across backend analyzers, API endpoints, shared types, and reference applications.

### 1. Backend & Analyzer Tests
Validates Python AST analysis, FastAPI endpoints, graph builder, diff engine, and impact traversal:
```bash
pytest apps/backend/tests
```

### 2. Banking Scenario Tests
Validates banking domain business rules and scenario executor integration:
```bash
pytest reference-apps/banking/backend/tests
```

### 3. Shared Types Validation
Validates TypeScript type definitions and contract schemas:
```bash
cd packages/shared-types
npm test
```

### 4. Frontend Production Build
Verifies TypeScript compilation and bundle creation for the React application:
```bash
cd apps/frontend
npm run build
```

---

## API Overview

The ContextOS backend exposes REST endpoints for analysis, graph retrieval, changesets, and testing:

| Category | Endpoint | Method | Purpose |
| :--- | :--- | :--- | :--- |
| **Projects** | `/projects` | GET | List all registered projects (Banking, E-commerce) |
| **Analysis** | `/projects/{id}/analyze` | POST | Trigger static analysis run & build graph |
| **Runs** | `/projects/{id}/runs` | GET | Retrieve history of analysis runs |
| **Graph** | `/projects/{id}/graph` | GET | Fetch nodes, edges, and behaviors for current run |
| **Source** | `/nodes/{id}/source` | GET | Fetch source snippet, file path, and line numbers |
| **Impact** | `/projects/{id}/impact` | GET | Fetch latest changeset, affected behaviors, and risk score |
| **Watcher** | `/watcher/status` | GET / POST | Check or toggle file watcher active status |
| **Scenarios**| `/scenarios/run` | POST | Execute scenario tests against behavioral paths |
| **Evidence** | `/evidence` | GET | Fetch generated evidence records for confirmed regressions |
| **Capabilities**| `/projects/{id}/capabilities` | GET | Fetch detected structural capability candidates |

---

## Database Schema & Persistence

ContextOS uses PostgreSQL to store analysis runs and derived behavioral artifacts:

- **`projects`**: Registered application workspaces.
- **`analysis_runs`**: Versioned execution runs indexed by timestamp and run ID.
- **`graph_nodes`**: Code entities (`route`, `handler`, `function`, `service`, `component`, `data`).
- **`graph_edges`**: Dependencies (`CALLS`, `ROUTES_TO`, `IMPLEMENTS`, `USES_MODEL`).
- **`behaviors`**: Domain feature contracts mapped to entrypoint IDs.
- **`change_sets`**: Diff records containing added, removed, and modified node sets.
- **`impact_reports`**: Affected behavior lists, reachability paths, and calculated risk scores.
- **`scenario_results`**: Executed test outputs, stdout/stderr, and regression indicators.
- **`evidence`**: Structured records linking code changes to regression findings.

---

## Troubleshooting

- **PostgreSQL Connection Error (`FATAL: database "contextos" does not exist`)**:
  Run `createdb contextos` or update `DATABASE_URL` in `.env` to match your local PostgreSQL credentials.
- **Port 8000 / 5173 Already in Use**:
  Identify running processes using `lsof -i :8000` or `lsof -i :5173` and terminate them using `kill -9 <PID>`.
- **Frontend Displays "Backend offline"**:
  Ensure the ContextOS FastAPI server is running on port 8000 (`uvicorn main:app --port 8000`).
- **Watcher Changes Not Immediate**:
  The file watcher uses a 3-second debounce to prevent partial writes during editing. Allow ~5 seconds after saving a file for the UI to update.

---

## Current Limitations

- **Offline AI Explanations**: Uses deterministic rule-based template fallback synthesis rather than live LLM cloud calls to ensure offline reproducibility during demonstrations.
- **Watcher Polling Interval**: The React dashboard polls the backend every 2 seconds when watching is active to stay synchronized with file changes.
- **Capability Rules**: Capability candidate detection currently focuses on multi-layer structural topology rules matching the database/route/UI patterns demonstrated by the Loan feature.
