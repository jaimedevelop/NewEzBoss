import type { Employee, DatabaseResult } from '../../../services/employees';

// Module state survives navigation away from People while requests finish.
export function createEmployeeDeletionState() {
  let snapshot = { hidden: new Map<string, Employee>(), errors: new Map<string, string>() };
  const listeners = new Set<() => void>();
  const publish = () => { snapshot = { hidden: new Map(snapshot.hidden), errors: new Map(snapshot.errors) }; listeners.forEach(listener => listener()); };
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => snapshot,
    async remove(employee: Employee, owner: string, request: (id: string) => Promise<DatabaseResult>) {
      if (!employee.id || snapshot.hidden.has(employee.id)) return;
      const id = employee.id;
      snapshot.hidden.set(id, employee);
      snapshot.errors.delete(owner);
      publish();
      try {
        const result = await request(id);
        if (!result.success) throw new Error(result.error || 'Failed to delete employee');
        // Keep successful deletions hidden from any older requests still in flight.
      } catch (error) {
        snapshot.hidden.delete(id);
        snapshot.errors.set(owner, `Could not delete ${employee.name || 'employee'}. ${error instanceof Error ? error.message : 'Please try again.'}`);
        publish();
      }
    },
  };
}
export const employeeDeletionState = createEmployeeDeletionState();
