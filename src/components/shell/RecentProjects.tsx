import { useEffect, useState, useCallback } from "react";
import {
  getRecentProjects,
  removeRecentProject,
  type RecentProject,
} from "../../lib/recent-projects";
import { openProjectFromPath } from "../../lib/project-file";

/** Format a date string as a relative time ("2 hours ago", "Yesterday", etc.) */
function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** Strip file extension from a project filename. */
function displayName(name: string): string {
  return name.replace(/\.openshots$/, "");
}

export default function RecentProjects() {
  const [projects, setProjects] = useState<RecentProject[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    try {
      const list = await getRecentProjects();
      setProjects(list);
    } catch (err) {
      console.error("[RecentProjects] Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const handleOpen = useCallback((path: string) => {
    void openProjectFromPath(path);
  }, []);

  const handleRemove = useCallback(
    async (e: React.MouseEvent, path: string) => {
      e.stopPropagation();
      await removeRecentProject(path);
      void loadProjects();
    },
    [loadProjects],
  );

  if (loading || projects.length === 0) return null;

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center gap-3 w-full mb-2">
        <div className="flex-1 h-px bg-zinc-800/60" />
        <span className="text-[11px] text-zinc-600">recent projects</span>
        <div className="flex-1 h-px bg-zinc-800/60" />
      </div>

      <div className="max-h-[240px] overflow-y-auto space-y-0.5">
        {projects.map((project) => (
          <button
            key={project.path}
            onClick={() => handleOpen(project.path)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/60 transition-colors group text-left"
          >
            {/* File icon */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-zinc-600 shrink-0"
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>

            <div className="flex-1 min-w-0">
              <span className="text-[13px] text-zinc-300 truncate block">
                {displayName(project.name)}
              </span>
            </div>

            <span className="text-[11px] text-zinc-600 shrink-0 group-hover:hidden">
              {formatRelativeDate(project.updatedAt)}
            </span>

            {/* Remove button - visible on hover */}
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => void handleRemove(e, project.path)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleRemove(e as unknown as React.MouseEvent, project.path);
              }}
              className="text-[11px] text-zinc-600 hover:text-zinc-300 shrink-0 hidden group-hover:block"
            >
              x
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
