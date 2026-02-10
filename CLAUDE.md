# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Beads Performance Dashboard is a local, real-time lean metrics dashboard for the [Beads](https://github.com/steveyegge/beads) issue tracker. It visualizes the Beads SQLite database (`.beads/beads.db`) via the `bd` CLI to provide insights into flow, bottlenecks, and continuous improvement metrics.

Built with **TypeScript, Vite, React 18, and Vitest**, the dashboard provides type-safe code, fast HMR development, and comprehensive unit test coverage for critical business logic.

Use https://steveyegge.github.io/beads/llms.txt for more detailed reference on how to use beads.

## Common Commands

### Development
```bash
# Install dependencies
npm install

# Run in development mode (HMR enabled)
npm run dev
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001

# Run tests
npm test

# Run tests with UI
npm test:ui

# Run tests with coverage
npm test:coverage

# Type check without emitting
npm run typecheck
```

### Production
```bash
# Build for production
npm run build

# Run production build
npm start
```

### Global Installation (for end users)
```bash
# Install globally
npm install -g beads-dashboard

# Run from any directory (both commands work identically)
beads-dashboard
# or use the shorter alias
bd-dash

# Run against a specific project
beads-dashboard /path/to/project
# or
bd-dash /path/to/project

# Use custom port (default: 3001 in dev, 3001 in prod)
beads-dashboard --port=8080
# or
bd-dash --port=8080
```

## Architecture

### Project Structure
```
beads-dashboard/
├── src/
│   ├── client/              # Frontend React application
│   │   ├── main.tsx         # Entry point
│   │   ├── App.tsx          # Main app component
│   │   ├── components/      # React components
│   │   │   ├── DashboardView.tsx
│   │   │   └── TableView.tsx
│   │   ├── hooks/           # Custom React hooks
│   │   │   └── useMetrics.ts
│   │   └── utils/           # Business logic (pure functions)
│   │       └── metricsCalculations.ts
│   ├── server/              # Backend Node.js server
│   │   ├── index.ts         # Express server entry
│   │   ├── routes/          # API route handlers
│   │   │   └── api.ts
│   │   └── utils/           # Server utilities
│   │       └── beadsReader.ts
│   └── shared/              # Shared types between client/server
│       └── types.ts
├── tests/
│   ├── unit/                # Unit tests
│   │   ├── metricsCalculations.test.ts
│   │   ├── beadsReader.test.ts
│   │   └── api.test.ts
│   ├── fixtures/            # Test data
│   │   └── sample-issues.jsonl
│   └── setup.ts             # Test setup
├── dist/                    # Build output
│   ├── client/              # Vite-built frontend
│   └── server/              # Compiled TypeScript server
├── public/                  # Static assets
├── index.html               # HTML entry point
├── vite.config.ts           # Vite configuration
├── vitest.config.ts         # Vitest configuration
├── tsconfig.json            # TypeScript config (client)
└── tsconfig.node.json       # TypeScript config (server)
```

### Backend (`src/server/`)

**Technology:** TypeScript, Express 5, Socket.IO, Chokidar

#### Server (`src/server/index.ts`)
- Express + Socket.IO server
- Serves built static files in production
- Proxies to Vite dev server in development
- Watches `.beads/` directory for changes
- Emits `refresh` event on file changes

#### API Routes (`src/server/routes/api.ts`)
- `GET /api/data` - Returns all issues from Beads SQLite database via `bd list --json`
- `POST /api/issues/:id` - Updates issue description via `bd update --body-file`
- `POST /api/issues/:id/status` - Updates issue status via `bd update --status`

All mutations trigger `bd sync --flush-only` to persist changes.

#### Data Reader (`src/server/utils/beadsReader.ts`)
- Reads issues from Beads SQLite database via `bd list --json --status=all` command
- Returns parsed JSON array of all issues
- Type-safe parsing with `Issue` interface
- Note: We use the CLI instead of direct SQLite access to respect Beads' data access patterns

### Frontend (`src/client/`)

**Technology:** TypeScript, React 18, Recharts 2, Lucide React Icons, Tailwind CSS, Socket.IO Client

#### Entry Point (`main.tsx`)
React StrictMode mount point.

#### App Component (`App.tsx`)
- Fetches issues from `/api/data`
- Listens for Socket.IO `refresh` events
- Tab navigation (All Issues / Dashboard)
- Uses `useMetrics` hook for calculations

#### Components

**DashboardView** (`components/DashboardView.tsx`):
- Summary cards (avg age, WIP count, stale items, days tracked)
- Four main charts using Recharts:
  - Lead Time Scatterplot with P50/P85 percentile lines
  - Aging WIP scatterplot with color-coded ages
  - Cumulative Flow Diagram (area chart)
  - Age Distribution + Daily Throughput (bar charts)
- All data passed via `metrics` prop

**TableView** (`components/TableView.tsx`):
- Filterable/searchable table of all issues
- Column filters with localStorage persistence (status, type, priority)
- Quick action buttons (Start Progress, Close)
- Modal for viewing/editing issue descriptions (markdown support)
- Lucide React icons instead of hardcoded SVG
- Shows: ID (shortened), title, type, priority, status, dates, cycle time, age

#### Business Logic (`utils/metricsCalculations.ts`)

**Pure functions** for testability:
- `calculateLeadTime(issues)` - Cycle time data for closed issues
- `calculateAgingWIP(issues, today)` - Age and color for open issues
- `calculateCumulativeFlow(issues, today)` - Running totals of created/closed
- `calculateAgeDistribution(issues, today)` - Bucketed age histogram
- `calculateAverageAge(issues, today)` - Mean age of open issues
- `calculatePercentile(values, percentile)` - Percentile calculation
- `calculateMetrics(issues, today)` - Main function combining all metrics

All functions are fully unit tested with 100% coverage.

#### Hooks (`hooks/useMetrics.ts`)
- Memoized wrapper around `calculateMetrics()`
- Prevents unnecessary recalculation

### Shared Types (`src/shared/types.ts`)

TypeScript interfaces used across client and server:
- `Issue` - Main issue interface matching Beads issue data structure
- `IssueStatus` - Union type of valid statuses
- `IssueType` - Union type of issue types (task, bug, feature, epic)
- `Priority` - 0-4 (Critical to Lowest)
- `Metrics` - Calculated dashboard metrics
- `LeadTimeDataPoint`, `AgingWipDataPoint`, `FlowChartDataPoint`, `AgeChartDataPoint` - Chart data structures
- `UpdateIssueDescriptionRequest`, `UpdateIssueStatusRequest` - API request types

### Technology Stack

**Frontend:**
- React 18 (proper npm dependency, not CDN)
- TypeScript
- Vite (build tool + dev server with HMR)
- Recharts 2 (charts)
- Lucide React (icons)
- Marked (markdown rendering)
- Socket.IO Client (real-time updates)
- Tailwind CSS (styling, via CDN)

**Backend:**
- Node.js + TypeScript
- Express 5 (web server)
- Socket.IO (WebSocket server)
- Chokidar (file watching)
- TSX (TypeScript execution in dev)

**Testing:**
- Vitest (test runner)
- React Testing Library (component testing utilities)
- Supertest (API endpoint testing)
- JSDOM (DOM implementation for tests)

**Build:**
- TypeScript Compiler (server compilation)
- Vite (frontend bundling)

## Development Workflow

### Adding New Features

1. **Define Types** (`src/shared/types.ts`)
   - Add/update interfaces for any new data structures

2. **Business Logic** (`src/client/utils/`)
   - Write pure functions for any calculations
   - Add unit tests immediately

3. **Backend** (`src/server/`)
   - Add API routes if needed
   - Update `beadsReader` if data format changes
   - Write API tests

4. **Frontend** (`src/client/components/`)
   - Create/update React components
   - Use TypeScript for type safety
   - Import Lucide icons for any UI elements

5. **Test**
   ```bash
   npm test           # Run all tests
   npm run typecheck  # Check types
   npm run dev        # Test in browser
   ```

### Adding New Charts

1. Add metric calculation function in `src/client/utils/metricsCalculations.ts`
2. Write unit tests for the calculation
3. Update `calculateMetrics()` to include new metric in returned object
4. Update `Metrics` interface in `src/shared/types.ts`
5. Pass computed data to `DashboardView` via `metrics` prop
6. Add Recharts component in `DashboardView.tsx`

### Modifying Issue Display

- Table columns/filtering: Edit `TableView.tsx`
- Status colors: Update Tailwind classes in status rendering
- Priority/type styling: Import new Lucide icons and update mappings
- Add new issue fields: Update `Issue` interface in `src/shared/types.ts`

### File Watching Behavior

- Server watches `.beads/` directory for any file changes (via Chokidar)
- If `.beads/` doesn't exist at startup, watches parent directory for its creation
- All changes trigger `refresh` Socket.IO event
- Frontend automatically refetches data on `refresh` event via Socket.IO listener

### Styling

- Uses Tailwind CSS utility classes throughout (loaded via CDN)
- Custom `.card` class defined in `<style>` block in `index.html`
- No separate CSS files
- Responsive design with Tailwind's `md:` breakpoints

## Testing

### Unit Tests

**Metrics Calculations** (`tests/unit/metricsCalculations.test.ts`):
- Tests all pure calculation functions
- Edge cases: empty arrays, single issues, same-day closures
- Percentile calculations
- Date range filling in CFD
- **46 test cases**, all passing

**Beads Reader** (`tests/unit/beadsReader.test.ts`):
- Reading data via `bd list --json` command
- Handling command execution errors gracefully
- Missing .beads directory (returns empty array)
- Empty lines and whitespace

**API Endpoints** (`tests/unit/api.test.ts`):
- GET /api/data (success and error cases)
- POST /api/issues/:id (description updates)
- POST /api/issues/:id/status (status updates)
- Request validation (missing fields)

### Running Tests

```bash
# Run all tests
npm test

# Run with UI (watch mode)
npm test:ui

# Run with coverage report
npm test:coverage

# Run specific test file
npm test tests/unit/metricsCalculations.test.ts
```

### Test Coverage

Essential coverage achieved:
- ✅ Business logic (metricsCalculations): 100%
- ✅ Data reading (beadsReader): 100%
- ✅ API endpoints (api routes): 100%

## Build Process

### Development Build

```bash
npm run dev
```

- Frontend: Vite dev server on `http://localhost:3000` with HMR
- Backend: TSX runs TypeScript server on `http://localhost:3001`
- Vite proxies API requests to backend
- Changes to TypeScript files trigger automatic reload

### Production Build

```bash
npm run build
```

1. **Build Client** (`npm run build:client`):
   - Vite bundles React app
   - Output: `dist/client/`
   - Optimized, minified, tree-shaken

2. **Build Server** (`npm run build:server`):
   - TypeScript compiles server code
   - Output: `dist/server/`
   - Preserves directory structure from `src/`

3. **Run Production** (`npm start`):
   - Node runs compiled server: `node dist/server/server/index.js`
   - Server serves built client files from `dist/client/`
   - Environment: `NODE_ENV=production`

### CLI Tool Deployment

The dashboard can be installed globally:

```bash
npm link  # For local development
# or
npm install -g beads-dashboard  # For end users
```

The dashboard provides two command aliases:
- `beads-dashboard` - Full command name
- `bd-dash` - Shorter alias

Both commands point to `bin/beads-dashboard.js` which:
- Points to `server.js` (for backward compatibility)
- Server auto-detects production mode
- Serves pre-built files from `dist/`

## Beads Integration

This dashboard is **read-only except for description and status editing** via the UI.

To modify issues programmatically:
- Use `bd` CLI commands in the project directory
- Dashboard will auto-refresh via file watching
- Description edits work through `bd update --body-file` command execution
- Status updates work through `bd update --status` command execution

### Requirements

The dashboard assumes:
- Valid `.beads/` directory with SQLite database exists in the project directory
- `bd` command is available in PATH (for all data access and mutation operations)
- Beads project is properly initialized with `bd init`

### Data Model

Issues are stored in `.beads/beads.db` (SQLite database) and accessed via the `bd` CLI.
The dashboard retrieves issues using `bd list --json --status=all` which returns this structure:
```typescript
{
  id: "beads-dashboard-abc123",  // Project prefix + hash
  title: "Issue title",
  description: "Markdown description",
  status: "open" | "in_progress" | "blocked" | "closed" | "tombstone" | "deferred" | "pinned" | "hooked",
  issue_type: "task" | "bug" | "feature" | "epic",
  priority: 0-4,  // 0=Critical, 1=High, 2=Medium, 3=Low, 4=Lowest
  created_at: "ISO 8601 timestamp",
  updated_at: "ISO 8601 timestamp"
}
```

## Migration Notes

This project was migrated from a CDN-based approach to a modern TypeScript + Vite setup. Key changes:

1. **No more CDN dependencies** - All libraries are proper npm dependencies
2. **TypeScript throughout** - Full type safety for client and server
3. **Build step required** - Must run `npm run build` before production deployment
4. **Testing infrastructure** - Comprehensive unit tests with Vitest
5. **Proper icons** - Lucide React instead of hardcoded SVG
6. **Organized structure** - Clear separation of concerns (components, utils, types)
7. **Fast development** - Vite HMR provides instant feedback

The migration maintains backward compatibility for the CLI tool and all existing functionality while providing a modern development experience.
