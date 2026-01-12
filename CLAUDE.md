# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Beads Performance Dashboard is a local, real-time lean metrics dashboard for the [Beads](https://github.com/steveyegge/beads) issue tracker. It visualizes the Beads database (`.beads/issues.jsonl`) to provide insights into flow, bottlenecks, and continuous improvement metrics.

## Common Commands

### Running the application

**Global installation (recommended for users):**
```bash
# Install globally
npm install -g beads-dashboard

# Run from any directory
beads-dashboard

# Run against a specific project
beads-dashboard /path/to/project

# Use custom port
beads-dashboard --port=8080
```

**Local development:**
```bash
# Install dependencies
npm install

# Run locally
npm start

# Run against a specific project
npm start -- /path/to/project

# Use custom port
npm start -- --port=8080
```

Default port is 3000, access at http://localhost:3000

### Development
```bash
# Install dependencies
npm install

# Link for local testing (makes beads-dashboard command available)
npm link

# No build step required - uses CDN-loaded React and Babel
# No linting or testing configured yet
```

## Architecture

### Backend (server.js)
- **Express + Socket.IO server** that serves static files and provides real-time updates
- **File watching**: Uses `chokidar` to watch `.beads/` directory for changes
- **Data loading**: Reads and parses `.beads/issues.jsonl` (newline-delimited JSON)
- **API endpoints**:
  - `GET /api/data` - Returns all parsed issues
  - `POST /api/issues/:id` - Updates issue description via `bd update` CLI command
- **Live updates**: Emits `refresh` event via Socket.IO when files change

### Frontend Architecture (public/)

The frontend uses **no build step** - React, Babel, and all dependencies are loaded from CDNs. This makes it highly hackable but means changes are interpreted at runtime.

#### Structure
- `public/index.html` - Main entry point with embedded React app
- `public/components/DashboardView.js` - Charts and metrics visualizations
- `public/components/TableView.js` - Sortable/filterable table of all issues

#### State Management
- Main app state lives in `Dashboard` component in `index.html`
- Uses `React.useState` and `React.useMemo` for local state
- Socket.IO listener triggers `fetchData()` on file changes
- No global state management library (Redux, Zustand, etc.)

#### Metrics Calculation (index.html)
The `metrics` memoized value computes all dashboard data:
- **Lead Time**: Cycle time from creation to closure with P50/P85 percentiles
- **Aging WIP**: Current open issues colored by age (green <7d, orange <30d, red >30d)
- **Cumulative Flow Diagram**: Running totals of created/closed over time
- **Throughput**: Daily closed issue counts
- **Age Distribution**: Histogram of current work item age in buckets

Key logic:
- Filters out `tombstone` status (deleted issues)
- Builds continuous timeline from earliest issue to today
- Maintains running totals for CFD visualization

#### Components

**DashboardView** (components/DashboardView.js):
- Summary cards (avg age, WIP count, stale items, days tracked)
- Four main charts using Recharts:
  - Lead Time Scatterplot with percentile lines
  - Aging WIP scatterplot with color-coded ages
  - Cumulative Flow Diagram (area chart)
  - Age Distribution + Daily Throughput (bar charts)

**TableView** (components/TableView.js):
- Filterable table of all issues (excludes tombstones)
- Search across ID, title, status, type, priority
- Shows: ID (shortened), title, type, priority, status, dates, cycle time, age
- Modal for viewing/editing issue descriptions
- Description editing calls `POST /api/issues/:id` which uses `bd update --body-file`
- Descriptions render as markdown using `marked.js`
- Priority mapping: 0=Critical, 1=High, 2=Medium, 3=Low, 4=Lowest
- Type icons: Bug, Feature, Epic, Task (default)

### Data Model

Issues are stored in `.beads/issues.jsonl` with this structure:
```javascript
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

### Technology Stack
- **Backend**: Node.js, Express 5, Socket.IO, Chokidar
- **Frontend**: React 18 (CDN), Recharts 2 (CDN), Tailwind CSS (CDN), Babel Standalone (CDN)
- **Markdown**: marked.js for description rendering
- **Icons**: Inline SVG (Lucide-style) embedded in components

## Development Notes

### Adding New Charts
1. Add metric calculation logic in `index.html` metrics `useMemo`
2. Pass computed data to `DashboardView` via `metrics` prop
3. Add Recharts component in `DashboardView.js`
4. Use existing `CustomTooltip` pattern for hover interactions

### Modifying Issue Display
- Table columns/filtering: Edit `TableView.js`
- Status colors: Update inline Tailwind classes in status rendering
- Priority/type styling: Modify `getPriorityStyle()` and `getTypeInfo()` functions

### File Watching Behavior
- Server watches `.beads/` directory for any file changes
- If `.beads/` doesn't exist at startup, watches parent directory for its creation
- All changes trigger `refresh` Socket.IO event
- Frontend automatically refetches data on `refresh` event

### CDN Dependencies
All frontend libraries loaded via CDN in `index.html`:
- React 18.2.0 (production)
- Recharts 2.12.7
- Tailwind CSS (with typography plugin)
- Babel Standalone (for JSX transformation)
- Lucide icons
- marked.js

No build step means changes to components take effect on page refresh, but also means no TypeScript, no tree-shaking, and larger bundle sizes.

### Styling
- Uses Tailwind CSS utility classes throughout
- Custom `.card` class defined in `<style>` block in `index.html`
- No separate CSS files
- Responsive design with Tailwind's `md:` breakpoints

## Beads Integration

This dashboard is read-only except for description editing. To modify issues:
- Use `bd` CLI commands in the project directory
- Dashboard will auto-refresh via file watching
- Description edits work through `bd update --body-file` command execution

The dashboard assumes:
- Valid `.beads/issues.jsonl` file exists
- Issues follow Beads JSONL format
- `bd` command is available in PATH (for description editing)
