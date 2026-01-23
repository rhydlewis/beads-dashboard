# Beads Performance Dashboard

**BETA SOFTWARE**: This tool is under active development and provided "as is," without warranty. Use at your own risk.

A local, real-time lean metrics dashboard for [Beads](https://github.com/steveyegge/beads). This tool visualizes your Beads issue database to help you understand your flow, identify bottlenecks, and track continuous improvement metrics.

![](https://raw.githubusercontent.com/rhydlewis/beads-dashboard/main/images/bd-metrics.png)

Built with **TypeScript, Vite, React 18, and Vitest** for type-safe code, fast development, and comprehensive testing.

## Features

### Views & Visualization
*   **Kanban Board**: Drag-and-drop interface with collapsible columns for visual workflow management
*   **Epics Management**: Dedicated view for tracking epics and their progress
*   **Dashboard View**: Comprehensive metrics visualization with:
    *   **Lead Time Scatterplot**: Cycle time with P50 and P85 percentile lines
    *   **Aging Work in Progress**: Scatterplot color-coded by age (Green < 7d, Orange < 30d, Red > 30d)
    *   **Cumulative Flow Diagram (CFD)**: Track flow stability over time
    *   **Throughput**: Daily closed item counts
    *   **Age Distribution**: Histogram of current work item age
*   **Table View**: Detailed, filterable list of all issues with sortable attributes

### Issue Management
*   **Create Issues**: Rich markdown editor with live preview for creating new issues
*   **Batch Creation**: Create multiple issues at once
*   **Edit Issues**: Update descriptions and status directly from the dashboard
*   **Quick Actions**: One-click status changes (Start Progress, Close)

### Productivity Features
*   **Aging Alerts**: Configurable threshold-based alerts for work items exceeding age limits
*   **Column Customization**: Resize, hide, and reorder table columns (persisted in localStorage)
*   **Real-time Updates**: Automatically refreshes when your Beads database changes
*   **Search & Filter**: Powerful filtering by status, type, priority, and text search

### Technical Features
*   **Type Safety**: Full TypeScript coverage across client and server
*   **Comprehensive Testing**: Unit tests with Vitest achieving 100% coverage on business logic
*   **Security**: XSS prevention, input sanitization, and CORS restrictions
*   **Community Ready**: Works with any Beads repository

![](https://raw.githubusercontent.com/rhydlewis/beads-dashboard/main/images/bd-aging.png)

## Quick Start (Global Install)

Install globally via npm:

```bash
npm install -g beads-dashboard
```

Then run from any directory containing a `.beads` folder:

```bash
# Run in current directory
beads-dashboard

# Run against a specific project
beads-dashboard /path/to/project

# Use custom port (default: 3001)
beads-dashboard --port=8080
```

Then open your browser to **http://localhost:3001** (or your custom port).

## Installation (Development)

You can also install and run this tool directly from the source.

```bash
# Clone the repository
git clone https://github.com/rhydlewis/beads-dashboard.git
cd beads-dashboard

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Development Mode (with Hot Module Replacement)
Run the development server with automatic reloading:

```bash
npm run dev
```

This starts:
- Frontend dev server: http://localhost:5173 (Vite with HMR)
- Backend API server: http://localhost:3001

### Production Mode
Run the built production version:

```bash
# Build first (if not already built)
npm run build

# Run production server
npm start
```

Opens at: http://localhost:3001

### Run against a different project
Point the dashboard to any directory containing a `.beads` folder:

```bash
# Production mode (recommended for viewing other projects)
npm run build
npm start -- /path/to/your/project

# Development mode (requires two terminals for HMR)
# Terminal 1: Frontend
npm run vite

# Terminal 2: Backend
npm run dev:server -- /path/to/your/project
# Then visit http://localhost:3000
```

## Development

### Project Structure
```
beads-dashboard/
├── src/
│   ├── client/              # Frontend React application
│   │   ├── main.tsx         # Entry point
│   │   ├── App.tsx          # Main app component
│   │   ├── components/      # React components
│   │   │   ├── KanbanBoard.tsx
│   │   │   ├── EpicsTable.tsx
│   │   │   ├── DashboardView.tsx
│   │   │   ├── TableView.tsx
│   │   │   └── ...
│   │   ├── hooks/           # Custom React hooks
│   │   └── utils/           # Business logic (pure functions)
│   ├── server/              # Backend Node.js server
│   │   ├── index.ts         # Express server entry
│   │   ├── routes/          # API route handlers
│   │   └── utils/           # Server utilities
│   └── shared/              # Shared types between client/server
│       └── types.ts
├── tests/
│   ├── unit/                # Unit tests
│   └── fixtures/            # Test data
├── dist/                    # Build output (gitignored)
│   ├── client/              # Vite-built frontend
│   └── server/              # Compiled TypeScript server
├── index.html               # HTML entry point (Vite)
├── vite.config.ts           # Vite configuration
├── vitest.config.ts         # Vitest configuration
└── tsconfig.json            # TypeScript configuration
```

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite (build tool + dev server with HMR)
- Recharts 2 (charts)
- @dnd-kit (drag-and-drop)
- @uiw/react-md-editor (markdown editing)
- Lucide React (icons)
- Marked (markdown rendering)
- DOMPurify (XSS prevention)
- Socket.IO Client (real-time updates)
- Tailwind CSS (styling, via CDN)

**Backend:**
- Node.js + TypeScript
- Express 5 (web server)
- Socket.IO (WebSocket server)
- Chokidar (file watching)
- Zod (validation)

**Testing & Build:**
- Vitest (test runner)
- React Testing Library (component testing)
- Supertest (API testing)
- JSDOM (DOM implementation)
- TypeScript Compiler + Vite

### Common Commands

```bash
# Development with HMR
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Run tests
npm test

# Run tests with UI
npm test:ui

# Run tests with coverage
npm test:coverage

# Type check
npm run typecheck
```

### Testing

The project includes comprehensive unit tests:

```bash
# Run all tests
npm test

# Run with UI (watch mode with browser interface)
npm test:ui

# Generate coverage report
npm test:coverage
```

**Test Coverage:**
- ✅ Business logic (metricsCalculations): 100%
- ✅ Data reading (beadsReader): 100%
- ✅ API endpoints: 100%
- ✅ React components (App, DashboardView, TableView)

### Adding New Features

1. **Define Types** in `src/shared/types.ts`
2. **Write Business Logic** as pure functions in `src/client/utils/` or `src/server/utils/`
3. **Add Unit Tests** immediately (TDD approach)
4. **Create Components** in `src/client/components/`
5. **Add API Routes** if needed in `src/server/routes/`
6. **Test** with `npm test` and `npm run dev`

See `CLAUDE.md` for detailed development workflow guidance.

## Beads Integration

### Data Access
The dashboard reads from the Beads SQLite database (`.beads/beads.db`) via the `bd` CLI tool. It provides:
- **Read access**: All metrics, issues, and visualization data
- **Write access**: Issue creation, description updates, and status changes

All mutations execute through `bd` commands and automatically sync with the database.

### Requirements
- Valid `.beads/` directory with SQLite database in the project directory
- `bd` command available in PATH
- Beads project properly initialized with `bd init`

## Global Installation

For end users, install globally:

```bash
npm install -g beads-dashboard

# Run from any Beads project directory
cd /path/to/your/beads/project
beads-dashboard
```

The CLI wrapper (`bin/beads-dashboard.js`) automatically:
- Detects production mode
- Serves pre-built files from `dist/`
- Handles custom port configuration
- Works from any directory

## License

This software is licensed under the [MIT License](LICENSE).
