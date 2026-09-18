/**
 * Projects are not a launch feature and have not yet been migrated to the API.
 * Keep estimate creation independent of the legacy Firebase collection rather
 * than silently querying an unscoped/nonexistent API table.
 */
export async function getLaunchProjects(): Promise<{ success: boolean; data?: any[]; error?: unknown }> {
  return { success: true, data: [] };
}
