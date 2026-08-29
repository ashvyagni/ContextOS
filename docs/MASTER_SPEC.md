# CONTEXTOS — FINAL LOCKED MASTER IMPLEMENTATION PROMPT (v2)

This document is authoritative. All prior open questions are closed. Do not re-litigate stack, scope, or architecture — implement.
Guiding principle: **Deterministic facts first. Graph second. Evidence third. AI last.**

---

## 1. FINAL ARCHITECTURE

CODE (Banking full app, E-commerce stub)
   ↓
DETERMINISTIC ANALYZERS
   Python ast (backend)  |  ts-morph (frontend)  |  contextos.yaml (behaviors)
   ↓
BEHAVIOR GRAPH (NetworkX, versioned by AnalysisRun)
   ↓
CHANGE DETECTION (file-watcher, save-triggered)
   ↓
GRAPH DIFF → BFS IMPACT → AFFECTED BEHAVIORS → RISK SCORE
   ↓
SCENARIO SELECTION → pytest EXECUTION → EVIDENCE → CONFIRMED REGRESSION
   ↓
NEW-NODE CLUSTER DETECTION → CANDIDATE CAPABILITY (structural, deterministic)
   ↓
AI LAYER (naming/summary/explanation only, schema-validated, cached fallback)
   ↓
REACT UI (graph, impact, evidence, capability, source panels)

AI sits at the very end of the pipeline and never feeds back into graph truth, regression status, or evidence.

---

## 2. FINAL STACK

- **Frontend:** React, TypeScript, Vite, Tailwind, React Flow
- **Backend:** Python, FastAPI, SQLite
- **Analysis:** Python `ast` (stdlib) for backend; `ts-morph` for React/TS frontend
- **Graph:** NetworkX
- **Testing:** pytest (primary, regression-critical), Playwright (one optional secondary UI scenario only)
- **AI:** single provider, abstracted, schema-validated responses, mandatory cached fallback
- **Execution:** local subprocess with timeouts — no Docker
- **Editor:** VS Code (external) — ContextOS does not implement an editor

No alternatives remain open. Do not swap any of these mid-build.

---

## 3. FINAL SHARED DATA MODEL

Define in `packages/shared-types/` before any parallel work begins.

```
GraphNode {
  id, type: "behavior"|"component"|"handler"|"route"|"function"|"service"|"data"|"external"|"scenario",
  name, file, lineStart, lineEnd, language, behaviorId?, analysisRunId, metadata
}

GraphEdge {
  id, source, target,
  type: "IMPLEMENTS"|"TRIGGERS"|"CALLS"|"ROUTES_TO"|"READS"|"WRITES"|"DEPENDS_ON"|"TESTS"|"AFFECTS",
  confidence, analysisRunId, sourceRef, metadata
}

AnalysisRun { id, projectId, createdAt, status, parentRunId? }

Behavior { id, name, category, entrypoints: string[], projectId }

ChangeSet { id, analysisRunId, changedFiles: string[], addedNodeIds, removedNodeIds, modifiedNodeIds }

ImpactReport { id, changeSetId, affectedBehaviorIds: string[], riskScore, riskExplanation, path: GraphEdge[] }

Scenario { id, name, behaviorId, kind: "pytest"|"playwright", entrypoint, expectedOutcome }

ScenarioResult { id, scenarioId, analysisRunId, status: "pass"|"fail", durationMs, stdout, stderr, confirmedRegression: boolean }

CapabilityCandidate {
  id, analysisRunId, nodeIds: string[], edgeIds: string[],
  layersCovered: ("UI"|"API"|"Logic"|"Data")[],
  isExtensionOfExisting: boolean,
  status: "candidate"|"named",
  coverage: { ui, api, logic, data, validation, tests: boolean }
}

Evidence { id, scenarioResultId, capabilityCandidateId?, summary, kind: "regression"|"capability" }

DemoScript { id, name, steps: GoldenPathStep[] }

GoldenPathStep { id, order, action, expectedUIState, screenshotRef? }

AIFallbackResponse { id, triggerKey, cachedName, cachedSummary, cachedExplanation }
```

`analysisRunId` on every node/edge is what makes before/after diffing and capability detection possible — never omit it.

---

## 4. FINAL API CONTRACT (minimum viable)

```
GET  /projects
GET  /projects/{id}/graph?runId=          — current or specific graph snapshot
POST /projects/{id}/analyze               — trigger analysis (also called by file watcher)
GET  /projects/{id}/runs                  — list AnalysisRuns
GET  /projects/{id}/diff?from=&to=        — graph diff between two runs
GET  /projects/{id}/impact?changeSetId=   — impact report
POST /projects/{id}/scenarios/run         — execute selected scenario(s)
GET  /projects/{id}/scenarios/results     — latest evidence
GET  /projects/{id}/capabilities?runId=   — candidate capabilities for a run
POST /capabilities/{id}/name              — AI naming (with fallback)
GET  /nodes/{id}/source                   — file, line range, snippet
```

Nothing beyond this. No auth endpoints, no user management, no arbitrary-repo upload endpoint.

---

## 5. FINAL STATIC ANALYSIS STRATEGY

1. **contextos.yaml** is parsed first — it declares behaviors and their entrypoints (frontend file, backend route). This is the seed the analyzers resolve against; ContextOS never guesses behaviors from nothing.
2. **Python** **`ast`** walks the FastAPI backend: extracts route decorators → handler functions → their calls to services/data layer. Produces `route`, `function`, `service`, `data` nodes and `ROUTES_TO`/`CALLS`/`READS`/`WRITES` edges, each tagged with exact file + line range.
3. **ts-morph** walks the React frontend: resolves component definitions, JSX event handlers, and their calls into API clients (fetch/axios calls tied to backend routes). Produces `component`/`handler` nodes and `TRIGGERS`/`CALLS` edges.
4. A resolution step matches frontend API-call targets to backend route nodes by path+method, producing `ROUTES_TO` edges that connect the two analyzer outputs into one graph.
5. Every node/edge from this run is stamped with the current `AnalysisRun.id`. The graph is written atomically (build in memory, then swap the "current" pointer) so the UI never reads a half-built graph.

---

## 6. FINAL CHANGE / IMPACT STRATEGY

1. File watcher (debounced, save-triggered — never keystroke-level) detects changed files.
2. Only changed files are re-analyzed (Python `ast` / ts-morph re-run on those files only) → new `AnalysisRun`.
3. Diff: compare node/edge sets between run N and N+1 by stable identity (file+symbol name) → `ChangeSet` (added/removed/modified node IDs).
4. **Impact = BFS from changed nodes** over impact-relevant edge types (`CALLS`, `TRIGGERS`, `ROUTES_TO`, `DEPENDS_ON`, `AFFECTS`), with a visited set for cycle safety and a configurable max depth.
5. Any `behavior` node reached by the BFS → affected behavior.
6. Risk score = simple, explainable function of BFS depth (1 hop = high, 2 = medium, 3+ = low) — no ML, no learned weights. Explanation text is generated directly from the traversal path, not by the AI.

---

## 7. FINAL CAPABILITY STRATEGY

Structural rule (deterministic, applied before any AI call):

1. Collect all nodes/edges new to the current `AnalysisRun` (not present in the previous run).
2. Find connected components within that new-node set.
3. A component is a **candidate capability** iff:
   - every node in it is new to this run, AND
   - it spans ≥3 of {UI, API, Logic, Data} layers, AND
   - it is not reachable from an existing `behavior` node (i.e., it isn't just an extension of a path that already existed).
4. Candidates are stored as `CapabilityCandidate` with `status: "candidate"`.
5. AI is called only after structural detection succeeds, receives the structured node/edge list, and returns `{name, summary, explanation}` — schema-validated. It cannot alter `nodeIds`/`edgeIds`/`layersCovered`.
6. UI copy is fixed: **"Candidate New Capability."** Never "AI proved this is a feature."

**Loan demo (scripted):** the change is authored ahead of time to deliberately produce exactly this cluster — `LoanButton` (UI) → `POST /loan` (API) → `loan_service` + `eligibility` (Logic) → `Loan` model + transaction relation (Data). This is rehearsed, not improvised, and is the only capability-detection path that must be bulletproof.

---

## 8. FINAL TEST STRATEGY

- Scenario format: each `Scenario` maps to one `Behavior`, has a `kind` (`pytest` default, `playwright` for the one secondary case), an entrypoint (test function path), and an `expectedOutcome`.
- Golden regression flow: edit `withdraw` logic → save → impact detects `withdraw` behavior affected → scenario selector picks `withdraw_insufficient_balance` (and related) → **pytest executes directly against the FastAPI layer** (no browser) → result captured as `ScenarioResult` → `confirmedRegression = true` only when a real assertion fails.
- Scenario set stays small: the 5 banking scenarios listed in the original spec (`withdraw_success`, `withdraw_insufficient_balance`, `withdraw_invalid_amount`, `withdraw_unauthenticated`, `transaction_created`). Do not expand this list during the hackathon.
- Definition of "reliable": the exact golden regression sequence must pass 10/10 consecutive runs before Phase 3 is considered done. If it isn't, do not proceed to Phase 4 — fix reliability first.

---

## 9. FINAL SUBAGENT STRATEGY

**Hard gate:** no parallel agent begins implementation until `packages/shared-types` is written and approved by the lead engineer. This happens in hours 0–2, sequentially, owned by one person.
After the gate opens, parallelize by phase:

- **Phase 1:** Agent A = Python analyzer + FastAPI route extraction; Agent B = ts-morph analyzer + frontend graph resolution; Agent C = React Flow UI shell + project selector + source panel; Agent D = Banking + E-commerce reference app scaffolding. All four consume the frozen shared types — no agent invents its own node/edge shape.
- **Phase 2:** Centralize file-watcher + diff + BFS impact in one agent (this logic is small and tightly coupled — parallelizing it causes more coordination cost than it saves). A second agent works UI highlighting/risk display in parallel against a mocked `ImpactReport`.
- **Phase 3:** One agent owns scenario execution + pytest harness (sequential, since it must be rock-solid before anything else touches it). A second agent can build the evidence UI panel against mocked `ScenarioResult` data simultaneously.
- **Phase 4:** One agent owns the structural capability-detection algorithm (must be centrally owned — this is the most failure-prone logic in the system). A second agent builds the capability UI panel + AI naming call + fallback wiring in parallel.
- **Phase 5:** All agents converge — no new parallel workstreams, only polish/fixes/rehearsal.

Never let two agents independently define graph schema, risk-scoring logic, or the capability heuristic — these three are single-owner for the whole project.

---

## 10. FINAL REPOSITORY STRUCTURE

```
contextos/
├── apps/
│   ├── frontend/
│   └── backend/
├── reference-apps/
│   ├── banking/                  # FULL — all 5 phases
│   │   ├── frontend/
│   │   ├── backend/
│   │   ├── tests/
│   │   └── contextos.yaml
│   ├── ecommerce/                # STUB — 3-4 behaviors, analyzed once
│   │   ├── frontend/
│   │   ├── backend/
│   │   └── contextos.yaml
│   └── project-management/       # OPTIONAL — only if everything else done early
│       └── (do not scaffold unless triggered)
├── packages/
│   └── shared-types/
├── docs/
│   ├── architecture.md
│   ├── graph-schema.md
│   ├── behavior-contract.md
│   ├── scenario-contract.md
│   ├── api.md
│   ├── demo.md
│   └── setup.md
├── scripts/
├── .gitignore
└── README.md
```

No `docker/` directory. No `project-management/` scaffolding until explicitly triggered by time remaining.

---

## 11. FINAL PHASE PROMPTS

### PHASE 1 — System Comes Alive (Hours 2–10)

**Objective:** Banking app + analyzers + graph + basic UI, working end to end.
**Tasks:** Build shared-types (hours 0–2, blocking). Scaffold Banking (full) and E-commerce (stub) reference apps. Implement Python `ast` backend analyzer and `ts-morph` frontend analyzer. Parse `contextos.yaml`. Resolve frontend↔backend edges by path+method. Persist graph with `AnalysisRun` versioning. Build React Flow graph UI + project selector + clickable source panel.
**Files/modules:** `packages/shared-types`, `apps/backend/analyzers/`, `apps/backend/graph/`, `apps/frontend/graph-view/`, `reference-apps/banking/*`, `reference-apps/ecommerce/*`.
**Dependencies:** shared-types frozen first.
**Tests:** parser test, graph construction test, API smoke test, frontend smoke test.
**Definition of done:** Banking and E-commerce both run; both analyze; graph renders for both; clicking any node shows correct file/line/snippet.
**Do NOT build:** impact analysis, scenarios, capability detection, AI calls, Project Management app.

### PHASE 2 — System Understands Change (Hours 10–18)

**Objective:** Save-triggered live change → impact detection on Banking only.
**Tasks:** File watcher (debounced) on Banking source. Incremental re-analysis of changed files. Graph diff → `ChangeSet`. BFS impact traversal with cycle safety. Simple risk scoring + explanation. UI highlighting of affected behaviors.
**Files/modules:** `apps/backend/watcher/`, `apps/backend/diff/`, `apps/backend/impact/`, `apps/frontend/impact-view/`.
**Dependencies:** Phase 1 graph pipeline.
**Tests:** graph diff test, impact traversal test (including a cycle case), API smoke test.
**Definition of done:** editing `Withdraw` logic and saving visibly updates the graph and highlights the `withdraw` behavior with a risk explanation, repeatably.
**Do NOT build:** scenario execution, capability detection, E-commerce live-edit support.

### PHASE 3 — System Proves Consequences (Hours 18–26)

**Objective:** Deterministic regression confirmation via pytest.
**Tasks:** Define the 5 banking scenarios. Scenario-to-behavior mapping. Scenario selection from impact report. pytest execution harness (subprocess, timeout, stdout/stderr capture). `ScenarioResult`/`Evidence` model + UI panel.
**Files/modules:** `reference-apps/banking/tests/`, `apps/backend/scenarios/`, `apps/frontend/evidence-view/`.
**Dependencies:** Phase 2 impact report.
**Tests:** scenario selection test, execution harness test, and — critically — 10 consecutive runs of the exact golden regression sequence.
**Definition of done:** breaking `withdraw` logic and saving produces a `CONFIRMED REGRESSION` in the UI, 10/10 times.
**Do NOT build:** Playwright as primary mechanism, capability detection, AI calls.

### PHASE 4 — System Understands Additions (Hours 26–32)

**Objective:** Scripted Loan feature triggers deterministic capability detection + AI/fallback naming.
**Tasks:** Before/after graph comparison. New-node connected-component detection with the layer-coverage rule from Section 7. `CapabilityCandidate` model + UI panel with coverage checklist. AI naming call with schema validation and mandatory cached fallback (`AIFallbackResponse`) triggered on >2s/timeout/failure. Author the Loan change (`LoanButton`, `POST /loan`, `loan_service`, `eligibility`, `Loan` model, transaction relation) as a rehearsed diff.
**Files/modules:** `apps/backend/capability/`, `apps/backend/ai/`, `apps/frontend/capability-view/`.
**Dependencies:** Phase 1 diff pipeline (reuses Phase 2's diff logic).
**Tests:** capability detection test (including a false-positive case — an ordinary refactor — and confirming it's NOT flagged), AI fallback trigger test (kill the network and confirm cached response still renders).
**Definition of done:** applying the Loan change and saving shows "Candidate New Capability: Loan Management" with the coverage checklist, repeatably, with or without live AI access.
**Do NOT build:** generalized capability detection for arbitrary features, Project Management support.

### PHASE 5 — System Becomes the Product (Hours 32–36+)

**Objective:** Reliability, polish, rehearsal. No architecture changes.
**Tasks:** UI polish, graph layout tuning, loading/empty/error states for every panel, full golden-path rehearsal (Section 13) run repeatedly, README + docs, E-commerce stub generality pass (analyze once, screenshot/record for the demo).
**Files/modules:** frontend styling, `docs/*`, `README.md`.
**Dependencies:** Phases 1-4 complete.
**Tests:** full end-to-end demo script run at least 5 times without manual intervention.
**Definition of done:** the team can run Section 13's sequence cold, twice in a row, without touching code.
**Do NOT build:** Project Management app (unless genuinely idle with hours to spare), OpenTelemetry, any new architecture.

---

## 12. FINAL RISK REGISTER

| Risk | Probability | Damage | Mitigation |
|------|-------------|--------|------------|
| Live AI call fails/stalls during Loan demo | High | High | Mandatory cached `AIFallbackResponse`, auto-triggered at 2s/timeout/error (Section 7, Phase 4) |
| Scope creep back into 3 full apps | Medium-High | High | This document locks Banking=full, E-commerce=stub, PM=optional; do not revisit |
| Golden regression flaky under Playwright | Medium | High | pytest against FastAPI layer is the primary mechanism, not Playwright (Section 8) |
| Capability heuristic false-positives on ordinary refactors | Medium | Medium | Layer-coverage + "not-extension-of-existing" rule (Section 7) + explicit false-positive test case in Phase 4 |
| File watcher misses/double-fires a save event | Low-Medium | Medium | Debounce + a manual "Re-analyze" button in the UI as a fallback trigger |

---

## 13. FINAL KILLER DEMO

```
Open Banking
  ↓
Show behavior graph (React Flow)
  ↓
Click "Withdraw" → source panel shows file + line range + snippet
  ↓
Switch to VS Code, edit withdraw logic (break the balance check)
  ↓
Save
  ↓
ContextOS: graph updates, "Withdraw" behavior highlighted, risk explanation shown
  ↓
Relevant scenario auto-selected → pytest runs
  ↓
CONFIRMED REGRESSION (withdraw_insufficient_balance fails)
  ↓
Apply the pre-authored Loan feature diff
  ↓
Save
  ↓
Graph diff → new cluster detected → "Candidate New Capability: Loan Management"
  ↓
Coverage checklist: UI ✓ API ✓ Logic ✓ Data ✓ Tests ⚠
  ↓
AI (or fallback) names/summarizes it
  ↓
[Secondary, ~60-90s] Switch to E-commerce → show graph renders on a different codebase → same engine, no live edit
```

Rehearse this exact sequence, cold, at least twice before presenting. Nothing outside this sequence needs to be demo-perfect.
