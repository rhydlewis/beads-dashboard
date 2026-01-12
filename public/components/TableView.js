function TableView({ issues }) {
  const [filterText, setFilterText] = React.useState("");
  const [activeDescription, setActiveDescription] = React.useState(null);

  const PRIORITIES = ["Critical", "High", "Medium", "Low", "Very Low"];

  // Icons
  const Icons = {
    Critical: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    High: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    Medium: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    Low: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <polyline points="19 12 12 19 5 12" />
      </svg>
    ),
    "Very Low": (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 18L12 22L16 18" />
        <path d="M12 2V22" />
      </svg>
    ),
    Copy: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
      </svg>
    ),
    PanelTopOpen: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <line x1="3" x2="21" y1="9" y2="9" />
      </svg>
    ),
    Close: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
    )
  };

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
    const typeMatch = (issue.issue_type || "").toLowerCase().includes(
      searchLower
    );

    // Map priority index to string for searching
    const priorityLabel = PRIORITIES[issue.priority] || "";
    const priorityMatch = priorityLabel.toLowerCase().includes(searchLower);

    return idMatch || titleMatch || statusMatch || typeMatch || priorityMatch;
  });

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 0:
        return "bg-red-100 text-red-800 border border-red-200"; // Critical
      case 1:
        return "bg-orange-100 text-orange-800 border border-orange-200"; // High
      case 2:
        return "bg-yellow-100 text-yellow-800 border border-yellow-200"; // Medium
      case 3:
        return "bg-green-100 text-green-800 border border-green-200"; // Low
      case 4:
        return "bg-slate-100 text-slate-800 border border-slate-200"; // Very Low
      default:
        return "bg-slate-100 text-slate-800 border border-slate-200";
    }
  };

  const getTypeStyle = (type) => {
    const t = (type || "").toLowerCase();
    if (t === "bug")
      return "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20";
    if (t === "feature" || t === "epic")
      return "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-700/10";
    return "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10"; // Default (Task)
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here, but for now we'll rely on user action
  };

  return (
    <>
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

                const priorityLabel =
                  PRIORITIES[issue.priority] || issue.priority;
                const PriorityIcon = Icons[priorityLabel] || null;
                
                // Remove prefix from ID (e.g. beads-dashboard-123 -> 123)
                // Assumes format is prefix-hash, so taking last segment
                const shortId = issue.id.includes('-') ? issue.id.split('-').pop() : issue.id;

                return (
                  <tr key={issue.id} className="hover:bg-slate-50 group">
                    <td className="px-6 py-3 font-mono text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                            <span>{shortId}</span>
                            <button 
                                onClick={() => handleCopy(issue.id)}
                                className="text-slate-300 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
                                title="Copy full ID"
                            >
                                {Icons.Copy}
                            </button>
                        </div>
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                            <span>{issue.title || "Untitled"}</span>
                            <button 
                                onClick={() => setActiveDescription(issue)}
                                className="text-slate-300 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                                title="View Description"
                            >
                                {Icons.PanelTopOpen}
                            </button>
                        </div>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTypeStyle(
                          issue.issue_type
                        )}`}
                      >
                        {issue.issue_type}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${getPriorityStyle(
                          issue.priority
                        )}`}
                      >
                        {PriorityIcon}
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
                  <td
                    colSpan="9"
                    className="px-6 py-8 text-center text-slate-400"
                  >
                    No issues found matching "{filterText}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Description Modal */}
      {activeDescription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-start p-6 border-b border-slate-100">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">{activeDescription.title}</h3>
                        <p className="text-sm text-slate-500 font-mono mt-1">{activeDescription.id}</p>
                    </div>
                    <button 
                        onClick={() => setActiveDescription(null)}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                    >
                        {Icons.Close}
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {activeDescription.description ? (
                        <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                            {activeDescription.description}
                        </div>
                    ) : (
                        <div className="text-slate-400 italic text-center py-8">
                            No description provided for this issue.
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-lg flex justify-end">
                    <button 
                        onClick={() => setActiveDescription(null)}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
      )}
    </>
  );
}
