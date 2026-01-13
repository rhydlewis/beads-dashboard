#!/usr/bin/env node

// Check for help flag
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Beads Performance Dashboard

A local, real-time lean metrics dashboard for Beads issue tracker.
Visualizes flow, bottlenecks, and continuous improvement metrics with
support for multiple time granularities (hourly to daily views).

USAGE:
  beads-dashboard [PROJECT_PATH] [OPTIONS]

ARGUMENTS:
  PROJECT_PATH    Path to project directory containing .beads/ folder
                  (default: current directory)

OPTIONS:
  --port=PORT     Port to run the server on (default: 3001)
  --help, -h      Show this help message

EXAMPLES:
  # Run in current directory
  beads-dashboard

  # Run for a specific project
  beads-dashboard /path/to/my-project

  # Use a custom port
  beads-dashboard --port=8080

  # Run for specific project on custom port
  beads-dashboard /path/to/my-project --port=8080

Once running, open http://localhost:3001 (or your custom port) in your browser
to view the dashboard. The dashboard will automatically refresh when your
.beads/issues.jsonl file changes.

FEATURES:
  • Real-time updates via WebSocket
  • Time granularity picker (hourly/4-hourly/8-hourly/daily)
  • Lead time scatterplot with percentile lines
  • Aging WIP visualization with color-coded thresholds
  • Cumulative flow diagram
  • Age distribution and throughput charts
  • Interactive table view with filtering
  • Edit issue descriptions and status directly from UI
`);
  process.exit(0);
}

// Set production environment before loading the server
process.env.NODE_ENV = 'production';

// Dynamically import the server (not hoisted like static import)
await import('../dist/server/server/index.js');
