import type { Employee } from '../../../services/employees';

// Keep unchanged records (and the collection itself) stable between status checks.
export function reconcileItems<T extends { id?: string }>(previous: T[], incoming: T[]): T[] {
  const byId = new Map(previous.map(item => [item.id, item]));
  const next = incoming.map(item => {
    const old = byId.get(item.id);
    return old && JSON.stringify(old) === JSON.stringify(item) ? old : item;
  });
  return next.length === previous.length && next.every((item, index) => item === previous[index])
    ? previous : next;
}

export function removeEmployee(groups: Record<string, Employee[]>, id: string): Record<string, Employee[]> {
  const letter = Object.keys(groups).find(key => groups[key].some(item => item.id === id));
  if (!letter) return groups;
  const next = { ...groups, [letter]: groups[letter].filter(item => item.id !== id) };
  if (!next[letter].length) delete next[letter];
  return next;
}

export function upsertEmployee(groups: Record<string, Employee[]>, employee: Employee): Record<string, Employee[]> {
  const old = Object.values(groups).flat().find(item => item.id === employee.id);
  if (old && JSON.stringify(old) === JSON.stringify(employee)) return groups;
  const letter = employee.name?.trim().split(/\s+/).pop()?.charAt(0).toUpperCase() || '#';
  const next = removeEmployee(groups, employee.id!);
  return { ...next, [letter]: [...(next[letter] || []), employee].sort((a, b) => (a.name || '').localeCompare(b.name || '')) };
}
