# ContextOS

A living behavioral map of software.

ContextOS is an AI-powered system that analyzes codebases to build a behavioral graph of how software actually works. It maps functions, routes, and features into a connected graph, enabling impact analysis, scenario testing, and intelligent demo generation.

## Repository Structure

```
contextos/
├── apps/
│   ├── frontend/          # React + TypeScript + Vite + Tailwind
│   └── backend/           # Python + FastAPI
│
├── reference-apps/
│   ├── banking/           # Full reference app (all 5 phases)
│   ├── ecommerce/         # Lightweight generality proof
│   └── project-management/ # Optional — not scaffolded
│
├── packages/
│   └── shared-types/      # Shared TypeScript type definitions
│
├── docs/                  # Architecture and contract docs
├── scripts/               # Utility scripts
├── .gitignore
└── README.md
```

## Development

- **ContextOS Frontend** (`apps/frontend`): React + TypeScript + Vite + Tailwind. Run with `npm install && npm run dev`.
- **ContextOS Backend** (`apps/backend`): Python + FastAPI. Run with `pip install -r requirements.txt && uvicorn main:app --reload`.
- **Reference Apps** (`reference-apps/`): Banking is the full reference implementation. E-commerce is a minimal generality proof. Both are scaffolded but not yet built.
- **Shared Types** (`packages/shared-types`): TypeScript type definitions shared across the system.

## Important Scope Rule

- **Banking** is the full reference app — all 5 phases of ContextOS will be demonstrated here.
- **E-commerce** is a lightweight generality proof — 3-4 behaviors, analyzed once.
- **Project Management** is optional and is **not** scaffolded. It will only be created if the team triggers it later.

## Current Status

Repository scaffold initialized. Architecture and implementation will be developed incrementally during the hackathon.

## Development Rule

Shared contracts (in `packages/shared-types` and `docs/`) should be agreed upon before parallel feature work begins. This prevents integration conflicts between team members.
