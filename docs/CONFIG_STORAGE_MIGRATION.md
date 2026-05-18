# Config Storage Migration

## Goal

Replace the current JSON sync workflow with a database-backed persistence layer while keeping all existing configuration files intact during the migration.

The migration must:

- avoid losing any screen, application, pose, or canvas data
- keep the current UI working while the database layer is introduced
- keep JSON import/export available during and after the migration
- introduce tests before switching the source of truth

## Current State

The UI currently relies on two persistence paths:

- browser `localStorage` for runtime persistence
- manual JSON folder sync through the File System Access API

Main domains:

- applications
- screen/widget configurations

Current issues:

- noisy `updatedAt` churn in many JSON files
- manual sync is easy to misuse
- persistence logic is spread across pages and domain modules
- there is no central storage contract to swap implementations safely

## Target Direction

Phase 1 and Phase 2 are intentionally separate:

- Phase 1 introduces abstractions and the SQLite backend foundation
- Phase 2 switches the UI/backend flow to database-first persistence

JSON files remain available as import/export artifacts throughout the migration.

## Current Status

- done:
  - UI persistence now goes through dedicated repositories
  - focused repository tests cover applications and configurations
  - a frontend storage snapshot API client now exists for the future backend path
  - a coordinated HTTP snapshot repository now exists for the future backend-backed mode
- not switched yet:
  - localStorage remains the active browser source of truth
  - folder sync remains available and untouched
  - the UI does not call the backend storage API by default yet

## Phase 1

### Scope

- add explicit persistence repositories in the UI
- add a tested SQLite storage layer in `tablet_interface`
- do not remove localStorage or folder sync
- do not change the current source of truth yet

### Frontend work

- create repository interfaces for:
  - applications
  - widget configurations
- move page-level persistence calls behind those repositories
- keep the default repository backed by current localStorage + folder sync logic

### Backend work

- add a SQLite repository module for:
  - applications
  - configurations
- add schema initialization and round-trip tests
- keep the database isolated from production request handling for now

### Safety rules

- no existing JSON file is deleted
- no automatic migration writes back to JSON files
- repository tests must verify round-trip integrity
- import behavior must be additive/upsert by default

### Exit criteria

- UI persistence is routed through repositories, not scattered direct calls
- backend SQLite repository passes tests
- full existing frontend and backend test suites stay green

### Phase 1 status

- complete for this iteration
- verified with:
  - `npm test`
  - `npm run build`
  - backend targeted/full pytest runs from `tablet_interface`

## Phase 2

### Scope

- add backend API endpoints for applications/configurations persistence
- add import/export endpoints or utilities for JSON compatibility
- switch UI repositories from browser-only storage to backend-backed storage
- keep fallback import/export tooling for demos and backups

### Backend work

- expose CRUD endpoints for applications/configurations
- support initial seeding/import from existing JSON payloads
- keep export capability to JSON for recovery and sharing

### Frontend work

- add an HTTP-backed repository implementation
- switch default runtime persistence from localStorage to backend storage
- keep explicit user-facing export/import instead of implicit folder sync as source of truth

### Safety rules

- database import must be idempotent
- exported JSON must preserve the existing payload structure
- rollback path must remain possible while the DB-first path stabilizes

### Exit criteria

- database becomes the source of truth
- JSON sync is reduced to import/export tooling
- no data loss in import/export round trips

### Next Phase 2 slices

- add explicit import/export UX instead of relying on folder sync as an implicit storage workflow
- switch the default runtime path to backend storage only after read/write parity is covered by tests
- decide the write strategy for deletes and full replacement before switching the UI default path
- wire the HTTP snapshot repository into an opt-in runtime path before making it the default

## Test Strategy

- add repository unit tests before wiring new code into pages
- add SQLite repository tests before exposing backend endpoints
- keep running:
  - `npm test`
  - `npm run build`
  - `PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 ./.venv/bin/pytest`

## Non-Goals For This Iteration

- deleting the existing JSON dataset
- removing folder sync immediately
- introducing a remote multi-user database server
- changing payload shapes used by current apps
