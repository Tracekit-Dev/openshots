import { load } from "@tauri-apps/plugin-store";

export interface RecentProject {
  path: string;
  name: string;
  updatedAt: string;
}

const STORE_KEY = "recentProjects";
const MAX_RECENT = 10;

let storeInstance: Awaited<ReturnType<typeof load>> | null = null;

async function getStore() {
  if (!storeInstance) {
    storeInstance = await load("app-settings.json", {
      defaults: {},
      autoSave: true,
    });
  }
  return storeInstance;
}

/** Get the recent projects list, sorted by most recent first. */
export async function getRecentProjects(): Promise<RecentProject[]> {
  const store = await getStore();
  const recents = await store.get<RecentProject[]>(STORE_KEY);
  return recents || [];
}

/** Add or update a project in the recent list. Keeps max 10 entries. */
export async function addRecentProject(project: RecentProject): Promise<void> {
  const store = await getStore();
  let recents = (await store.get<RecentProject[]>(STORE_KEY)) || [];

  // Remove existing entry for same path
  recents = recents.filter((r) => r.path !== project.path);

  // Add to front
  recents.unshift(project);

  // Trim to max
  if (recents.length > MAX_RECENT) {
    recents = recents.slice(0, MAX_RECENT);
  }

  await store.set(STORE_KEY, recents);
}

/** Remove a project from recents (e.g., if file was deleted). */
export async function removeRecentProject(path: string): Promise<void> {
  const store = await getStore();
  let recents = (await store.get<RecentProject[]>(STORE_KEY)) || [];
  recents = recents.filter((r) => r.path !== path);
  await store.set(STORE_KEY, recents);
}
