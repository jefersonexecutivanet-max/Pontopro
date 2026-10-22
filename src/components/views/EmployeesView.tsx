import React, { useState } from 'react';
import { Employee, Establishment, WorkSchedule, UserRole } from '../../types';
import {
  Users,
  UserPlus,
  Search,
  Camera,
  XCircle,
  Building,
  Shield,
  X,
  Filter,
  Eye,
  CalendarRange,
  Clock,
  Phone,
  Mail,
} from 'lucide-react';

interface EmployeesViewProps {
  employees: Employee[];
  establishments: Establishment[];
  schedules: WorkSchedule[];
  onCreateEmployee: (data: Partial<Employee>) => Promise<void>;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  employees,
  establishments,
  schedules,
  onCreateEmployee,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);

  // New employee form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [pis, setPis] = useState('');
  const [matricula, setMatricula] = useState('');
  const [pin, setPin] = useState('');
  const [department, setDepartment] = useState('Engenharia de Software');
  const [position, setPosition] = useState('Analista de Sistemas');
  const [establishmentId, setEstablishmentId] = useState(establishments[0]?.id || '');
  const [scheduleId, setScheduleId] = useState(schedules[0]?.id || '');
  const [role, setRole] = useState<UserRole>('employee');

  // Departments list for filter
  const departments = Array.from(new Set(employees.map((e) => e.department)));

  const filteredEmployees = employees.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.cpf.includes(searchTerm) ||
      e.matricula.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = selectedBranch === 'all' || e.establishment_id === selectedBranch;
    const matchesDept = selectedDepartment === 'all' || e.department === selectedDepartment;
    return matchesSearch && matchesBranch && matchesDept;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreateEmployee({
      name,
      email,
      cpf,
      pis_nis: pis,
      matricula,
      pin,
      department,
      position,
      establishment_id: establishmentId,
      work_schedule_id: scheduleId,
      role,
    });
    setIsModalOpen(false);
    setName('');
    setEmail('');
    setCpf('');
    setPis('');
    setMatricula('');
    setPin('');
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Gestão de Funcionários & Colaboradores
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Cadastro de funcionários com matrícula, credenciais individuais e jornada vinculada
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          <UserPlus className="h-4 w-4" />
          <span>Cadastrar Funcionário</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou matrícula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
          />
        </div>

        <div>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 focus:outline-hidden"
          >
            <option value="all">Todas as Filiais</option>
            {establishments.map((est) => (
              <option key={est.id} value={est.id}>
                {est.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 focus:outline-hidden"
          >
            <option value="all">Todos os Departamentos</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map((emp) => {
          const est = establishments.find((e) => e.id === emp.establishment_id);
          const sched = schedules.find((s) => s.id === emp.work_schedule_id);

          return (
            <div
              key={emp.id}
              className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 font-bold text-blue-700 text-sm border border-blue-100">
                    {emp.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 leading-snug">{emp.name}</h3>
                    <p className="text-xs text-slate-500">{emp.position}</p>
                    <span className="text-[10px] text-blue-600 font-semibold">{emp.department}</span>
                  </div>
                </div>

                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  {emp.role}
                </span>
              </div>

              <div className="space-y-1 rounded-2xl bg-slate-50 p-3 text-xs font-mono text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">CPF:</span>
                  <span className="font-semibold text-slate-800">{emp.cpf}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">PIS/NIS:</span>
                  <span>{emp.pis_nis}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Matrícula:</span>
                  <span className="font-bold text-blue-700">{emp.matricula}</span>
                </div>
                <div className="flex justify-between font-sans pt-1 border-t border-slate-200 text-[11px]">
                  <span className="text-slate-400">Filial:</span>
                  <span className="truncate max-w-[150px] font-semibold text-slate-700">
                    {est?.name || 'Matriz SP'}
                  </span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <span className="flex items-center gap-1 text-amber-700 text-[11px] font-semibold" title="WebAuthn/passkeys ainda não foi integrado">
                    <XCircle className="h-3.5 w-3.5" />
                    Passkey indisponível
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setDetailEmployee(emp)}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <Eye className="h-3 w-3" />
                    <span>Detalhes</span>
                  </button>

                  <button
                    type="button"
                    disabled
                    title="Autenticação WebAuthn/passkeys ainda não foi integrada e validada"
                    className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-400 cursor-not-allowed"
                  >
                    <Camera className="h-3 w-3" />
                    <span>Em breve</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Employee Detail Drawer / Modal */}
      {detailEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <button
              onClick={() => setDetailEmployee(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white font-black text-lg">
                {detailEmployee.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{detailEmployee.name}</h3>
                <p className="text-xs text-slate-500">{detailEmployee.position} • {detailEmployee.department}</p>
                <span className="text-[10px] text-blue-600 font-semibold font-mono">
                  Matrícula: {detailEmployee.matricula}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200 font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px]">CPF</span>
                  <span className="font-bold text-slate-800">{detailEmployee.cpf}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">PIS/NIS</span>
                  <span className="font-semibold text-slate-800">{detailEmployee.pis_nis}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">E-mail</span>
                  <span className="text-slate-800 truncate block font-sans">{detailEmployee.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Perfil de Acesso</span>
                  <span className="font-bold text-blue-700 font-sans">{detailEmployee.role}</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-200 text-blue-950">
                <span className="font-bold block text-xs">Escala e Jornada Vinculada</span>
                <p className="text-[11px] text-blue-800 mt-0.5">
                  {schedules.find((s) => s.id === detailEmployee.work_schedule_id)?.name || 'Comercial Padrão 44h'}
                </p>
                <p className="text-[10px] text-blue-600 mt-1">
                  Tolerância legal de 10 min diários conforme Art. 58 § 1º CLT
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200 text-amber-950">
                <span className="font-bold block text-xs">Autenticação biométrica / passkeys</span>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  WebAuthn/passkeys ainda não está integrado. O sistema não declara biometria cadastrada nem usa identificadores simulados.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setDetailEmployee(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cadastrar Funcionário */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">Cadastrar Novo Funcionário</h3>
            <p className="text-xs text-slate-500 mb-5">
              Insira os dados cadastrais obrigatórios conforme Portaria 671 e eSocial
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Juliana de Oliveira Prado"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">CPF *</label>
                  <input
                    type="text"
                    required
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">PIS / NIS *</label>
                  <input
                    type="text"
                    required
                    value={pis}
                    onChange={(e) => setPis(e.target.value)}
                    placeholder="000.00000.00-0"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Matrícula Interna *</label>
                  <input
                    type="text"
                    required
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value)}
                    placeholder="Ex: MAT-0192"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">E-mail Profissional</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@empresa.com.br"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">{role === 'employee' ? 'PIN individual de acesso * (mínimo de 6 caracteres)' : 'Senha administrativa * (mínimo de 12 caracteres)'}</label>
                <input type="password" required minLength={role === 'employee' ? 6 : 12} value={pin} onChange={(e) => setPin(e.target.value)} autoComplete="new-password" placeholder={role === 'employee' ? "Defina o PIN do funcionário" : "Defina uma senha forte"} className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-hidden" />
                <p className="mt-1 text-[11px] text-slate-500">A credencial é armazenada como hash; use senha forte para perfis administrativos.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Cargo</label>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="Ex: Desenvolvedor"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Departamento</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Ex: TI, RH, Vendas"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Filial / Estabelecimento</label>
                  <select
                    value={establishmentId}
                    onChange={(e) => setEstablishmentId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-hidden"
                  >
                    {establishments.map((est) => (
                      <option key={est.id} value={est.id}>
                        {est.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Escala / Jornada</label>
                  <select
                    value={scheduleId}
                    onChange={(e) => setScheduleId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-hidden"
                  >
                    {schedules.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Perfil de Acesso</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-hidden"
                >
                  <option value="employee">Colaborador (Registrar e consultar ponto)</option>
                  <option value="manager">Gestor / RH (Aprovações e relatórios)</option>
                  <option value="company_admin">Administrador Geral da Empresa</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm"
                >
                  Salvar Funcionário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
