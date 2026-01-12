# Beads Performance Dashboard

A local, real-time lean metrics dashboard for [Beads](https://github.com/steveyegge/beads). This tool visualizes your Beads issue database to help you understand your flow, identify bottlenecks, and track continuous improvement metrics.

## Features

*   **Real-time Updates**: Automatically refreshes when your Beads database changes.
*   **Lean Metrics**:
    *   **Lead Time Scatterplot**: Visualizes cycle time with P50 and P85 percentile lines.
    *   **Aging Work in Progress**: Scatterplot color-coded by age (Green < 7d, Orange < 30d, Red > 30d).
    *   **Cumulative Flow Diagram (CFD)**: Tracks flow stability over time.
    *   **Throughput**: Daily closed item counts.
    *   **Age Distribution**: Histogram of current work item age.
*   **Table View**: A detailed list of all active issues with sortable attributes.
*   **Community Ready**: Designed to run against any Beads repository.

## Installation

You can install and run this tool directly from the source.

```bash
# Clone the repository
git clone https://github.com/your-username/beads-dashboard.git
cd beads-dashboard

# Install dependencies
npm install
```

## Usage

### Run against the current directory
If you are inside a project that already has a `.beads` directory:

```bash
npm start
```

### Run against a different project
You can point the dashboard to any other directory containing a `.beads` folder:

```bash
npm start -- /path/to/your/other/project
```

Then open your browser to **http://localhost:3000**.

## Development

The project uses a simple Node.js/Express backend with Socket.IO for live updates and a React frontend (via CDN for simplicity/hackability).

*   `server.js`: Handles file watching, data parsing, and API serving.
*   `public/index.html`: Contains the React application and chart logic.

## License

MIT
