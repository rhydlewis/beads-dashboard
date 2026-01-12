function TableView({ issues }) {
  const [filterText, setFilterText] = React.useState("");

  const PRIORITIES = ["Critical", "High", "Medium", "Low", "Very Low"];

  // Filter issues based on tombstone status AND search text
  const filteredIssues = issues.filter((issue) => {
    // 1. Exclude deleted issues
    if (issue.status === "tombstone") return false;

    // 2. Apply text filter if present
    if (!filterText) return true;

    const searchLower = filterText.toLowerCase();
    const idMatch = issue.id.toLowerCase().includes(searchLower);
    const titleMatch = (issue.title || "").toLowerCase().includes(searchLower);
    const statusMatch = issue.status.toLowerCase().includes(searchLower);
    const typeMatch = (issue.issue_type || "").toLowerCase().includes(searchLower);
    
    // Map priority index to string for searching
    const priorityLabel = PRIORITIES[issue.priority] || "";
    const priorityMatch = priorityLabel.toLowerCase().includes(searchLower);

    return idMatch || titleMatch || statusMatch || typeMatch || priorityMatch;
  });

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 0: return "bg-red-100 text-red-800"; // Critical
      case 1: return "bg-orange-100 text-orange-800"; // High
      case 2: return "bg-yellow-100 text-yellow-800"; // Medium
      case 3: return "bg-green-100 text-green-800"; // Low
      case 4: return "bg-slate-100 text-slate-800"; // Very Low
      default: return "bg-slate-100 text-slate-800";
    }
  };

  const getTypeStyle = (type) => {
    const t = (type || "").toLowerCase();
    if (t === 'bug') return "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20";
    if (t === 'feature' || t === 'epic') return "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-700/10";
    return "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10"; // Default (Task)
  };

  return (
    <div className="card overflow-hidden">
      {/* Search Control */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50">
        <div className="relative">
          <input
            type="text"
            placeholder="Filter by ID, Title, Status, Type, or Priority..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
          {/* Search Icon SVG */}
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b">
            <tr>
              <th className="px-6 py-3">ID</th>
              <th className="px-6 py-3">Title</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Priority</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Created</th>
              <th className="px-6 py-3">Updated</th>
              <th className="px-6 py-3">Cycle Time</th>
              <th className="px-6 py-3">Age</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredIssues.map((issue) => {
              const created = new Date(issue.created_at);
              const updated = issue.updated_at
                ? new Date(issue.updated_at)
                : null;
              const isClosed = issue.status === "closed";
              const today = new Date();
              const ageInDays = Math.floor(
                (today - created) / (1000 * 60 * 60 * 24)
              );
              const isStale = !isClosed && ageInDays > 30;

              let cycleTime = "-";
              let age = "-";

              if (isClosed && updated) {
                const diff = Math.ceil(
                  (updated - created) / (1000 * 60 * 60 * 24)
                );
                cycleTime = `${diff}d`;
              } else {
                age = `${ageInDays}d`;
              }

              const priorityLabel = PRIORITIES[issue.priority] || issue.priority;

              return (
                <tr key={issue.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono text-slate-500">
                    {issue.id}
                  </td>
                  <td className="px-6 py-3 font-medium text-slate-900">
                    {issue.title || "Untitled"}
                  </td>
                  <td className="px-6 py-3">
                     <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTypeStyle(issue.issue_type)}`}>
                        {issue.issue_type}
                     </span>
                  </td>
                  <td className="px-6 py-3">
                     <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityStyle(issue.priority)}`}>
                        {priorityLabel}
                     </span>
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                        ${
                          issue.status === "closed"
                            ? "bg-green-100 text-green-800"
                            : issue.status === "in_progress"
                            ? "bg-blue-100 text-blue-800"
                            : issue.status === "blocked"
                            ? "bg-red-100 text-red-800"
                            : issue.status === "deferred"
                            ? "bg-amber-100 text-amber-800"
                            : issue.status === "pinned"
                            ? "bg-purple-100 text-purple-800"
                            : issue.status === "hooked"
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-slate-100 text-slate-800"
                        }`}
                    >
                      {issue.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-500">
                    {created.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3 text-slate-500">
                    {updated ? updated.toLocaleDateString() : "-"}
                  </td>
                  <td className="px-6 py-3 text-slate-500">{cycleTime}</td>
                  <td
                    className={`px-6 py-3 ${
                      isStale ? "text-red-600 font-bold" : "text-slate-500"
                    }`}
                  >
                    {age}
                  </td>
                </tr>
              );
            })}
            {filteredIssues.length === 0 && (
              <tr>
                <td colSpan="9" className="px-6 py-8 text-center text-slate-400">
                  No issues found matching "{filterText}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
