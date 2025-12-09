import { describe, it, expect } from 'vitest';

type AppRole = 'engineer' | 'manager' | 'executive' | 'compliance';
type Action = 'view' | 'create' | 'edit' | 'delete' | 'deploy' | 'export';

// Permissions matrix
const permissionsMatrix: Record<AppRole, Record<Action, boolean>> = {
  engineer: {
    view: true,
    create: true,
    edit: true,
    delete: false,
    deploy: false,
    export: false,
  },
  manager: {
    view: true,
    create: true,
    edit: true,
    delete: true,
    deploy: true,
    export: false,
  },
  executive: {
    view: true,
    create: true,
    edit: true,
    delete: true,
    deploy: true,
    export: true,
  },
  compliance: {
    view: true,
    create: false,
    edit: false,
    delete: false,
    deploy: false,
    export: true,
  },
};

function hasPermission(role: AppRole, action: Action): boolean {
  return permissionsMatrix[role][action];
}

function enforcePermission(role: AppRole, action: Action): void {
  if (!hasPermission(role, action)) {
    throw new Error(`Permission denied: ${role} cannot perform ${action}`);
  }
}

describe('Permissions Guard', () => {
  describe('Engineer role', () => {
    it('should allow view, create, edit', () => {
      expect(hasPermission('engineer', 'view')).toBe(true);
      expect(hasPermission('engineer', 'create')).toBe(true);
      expect(hasPermission('engineer', 'edit')).toBe(true);
    });

    it('should block delete, deploy, export', () => {
      expect(hasPermission('engineer', 'delete')).toBe(false);
      expect(hasPermission('engineer', 'deploy')).toBe(false);
      expect(hasPermission('engineer', 'export')).toBe(false);
    });

    it('should throw on prohibited action', () => {
      expect(() => enforcePermission('engineer', 'deploy')).toThrow('Permission denied');
    });
  });

  describe('Manager role', () => {
    it('should allow view, create, edit, delete, deploy', () => {
      expect(hasPermission('manager', 'view')).toBe(true);
      expect(hasPermission('manager', 'create')).toBe(true);
      expect(hasPermission('manager', 'edit')).toBe(true);
      expect(hasPermission('manager', 'delete')).toBe(true);
      expect(hasPermission('manager', 'deploy')).toBe(true);
    });

    it('should block export', () => {
      expect(hasPermission('manager', 'export')).toBe(false);
    });
  });

  describe('Executive role', () => {
    it('should allow all actions', () => {
      const actions: Action[] = ['view', 'create', 'edit', 'delete', 'deploy', 'export'];
      actions.forEach((action) => {
        expect(hasPermission('executive', action)).toBe(true);
      });
    });
  });

  describe('Compliance role', () => {
    it('should allow view and export only', () => {
      expect(hasPermission('compliance', 'view')).toBe(true);
      expect(hasPermission('compliance', 'export')).toBe(true);
    });

    it('should block create, edit, delete, deploy', () => {
      expect(hasPermission('compliance', 'create')).toBe(false);
      expect(hasPermission('compliance', 'edit')).toBe(false);
      expect(hasPermission('compliance', 'delete')).toBe(false);
      expect(hasPermission('compliance', 'deploy')).toBe(false);
    });
  });

  describe('Enforcement', () => {
    it('should not throw for allowed actions', () => {
      expect(() => enforcePermission('manager', 'deploy')).not.toThrow();
      expect(() => enforcePermission('executive', 'export')).not.toThrow();
    });

    it('should throw for disallowed actions', () => {
      expect(() => enforcePermission('engineer', 'delete')).toThrow();
      expect(() => enforcePermission('compliance', 'deploy')).toThrow();
    });
  });
});
