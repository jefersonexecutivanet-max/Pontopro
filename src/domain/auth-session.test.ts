import test from 'node:test';
import assert from 'node:assert';

interface AuthSessionUser {
  id: string;
  cpf: string;
  email: string;
  matricula: string;
  role: 'employee' | 'manager' | 'company_admin' | 'auditor';
}

function resolveUserByIdentifier(users: AuthSessionUser[], identifier: string): AuthSessionUser | null {
  const cleanId = String(identifier).trim().toLowerCase();
  const cleanDigits = cleanId.replace(/\D/g, '');

  return (
    users.find((u) => {
      const uCpfDigits = u.cpf.replace(/\D/g, '');
      return (
        (cleanDigits.length >= 6 && uCpfDigits === cleanDigits) ||
        u.email.toLowerCase() === cleanId ||
        u.matricula.toLowerCase() === cleanId ||
        u.id === cleanId
      );
    }) || null
  );
}

function getAllowedTabsForRole(role: string): string[] {
  switch (role) {
    case 'employee':
      return ['punch', 'timesheet', 'corrections'];
    case 'manager':
      return ['dashboard', 'punch', 'timesheet', 'employees', 'schedules', 'corrections', 'reports', 'establishments', 'compliance'];
    case 'company_admin':
      return ['dashboard', 'punch', 'timesheet', 'employees', 'schedules', 'corrections', 'reports', 'establishments', 'compliance', 'license'];
    case 'auditor':
      return ['dashboard', 'timesheet', 'employees', 'reports', 'compliance', 'license'];
    default:
      return ['punch'];
  }
}

function canMigrateUserInSession(): boolean {
  // Requirement: "Cada usuario terá seu acesso não consegindo migrar pra outro usuario"
  // Direct in-session migration is permanently disabled. Must perform logout.
  return false;
}

const mockUsers: AuthSessionUser[] = [
  {
    id: 'emp-carlos',
    cpf: '234.567.890-12',
    email: 'carlos.silva@techcorp.com.br',
    matricula: 'ENG-00104',
    role: 'employee',
  },
  {
    id: 'emp-mariana',
    cpf: '345.678.901-23',
    email: 'mariana.rh@techcorp.com.br',
    matricula: 'RH-00021',
    role: 'manager',
  },
  {
    id: 'emp-roberto',
    cpf: '456.789.012-34',
    email: 'roberto.admin@techcorp.com.br',
    matricula: 'ADM-00001',
    role: 'company_admin',
  },
];

test('resolveUserByIdentifier resolves correctly by formatted and unformatted CPF', () => {
  const byFormatted = resolveUserByIdentifier(mockUsers, '234.567.890-12');
  assert.strictEqual(byFormatted?.id, 'emp-carlos');

  const byDigits = resolveUserByIdentifier(mockUsers, '23456789012');
  assert.strictEqual(byDigits?.id, 'emp-carlos');
});

test('resolveUserByIdentifier resolves correctly by matricula and email', () => {
  const byMatricula = resolveUserByIdentifier(mockUsers, 'ENG-00104');
  assert.strictEqual(byMatricula?.id, 'emp-carlos');

  const byEmail = resolveUserByIdentifier(mockUsers, 'mariana.rh@techcorp.com.br');
  assert.strictEqual(byEmail?.id, 'emp-mariana');
});

test('resolveUserByIdentifier returns null for unknown credentials', () => {
  const unknown = resolveUserByIdentifier(mockUsers, '99999999999');
  assert.strictEqual(unknown, null);
});

test('getAllowedTabsForRole restricts employee to personal punch and timesheet', () => {
  const employeeTabs = getAllowedTabsForRole('employee');
  assert.deepStrictEqual(employeeTabs, ['punch', 'timesheet', 'corrections']);
  assert.strictEqual(employeeTabs.includes('dashboard'), false);
  assert.strictEqual(employeeTabs.includes('employees'), false);
  assert.strictEqual(employeeTabs.includes('establishments'), false);
  assert.strictEqual(employeeTabs.includes('license'), false);
});

test('canMigrateUserInSession always returns false (no account migration allowed without logout)', () => {
  assert.strictEqual(canMigrateUserInSession(), false);
});
