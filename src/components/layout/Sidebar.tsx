import React from 'react';
import { Employee, Company, UserRole } from '../../types';
import { APP_CONFIG } from '../../config/app-config';
import {
  LayoutDashboard,
  Clock,
  CalendarCheck,
  Users,
  CalendarRange,
  FileCheck2,
  FileSpreadsheet,
  Building2,
  Shield,
  KeyRound,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserCheck,
} from 'lucide-react';

export type NavTabId =
  | 'dashboard'
  | 'punch'
  | 'timesheet'
  | 'employees'
  | 'schedules'
  | 'corrections'
  | 'reports'
  | 'establishments'
  | 'compliance'
  | 'license'
  | 'billing';

interface SidebarProps {
  currentEmployee: Employee | null;
  currentCompany: Company | null;
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onLogout: () => void;
}

interface NavSection {
  title: string;
  items: Array<{
    id: NavTabId;
    label: string;
    icon: React.ElementType;
    roles: UserRole[];
  }>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentEmployee,
  currentCompany,
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  onLogout,
}) => {
  const currentRole = currentEmployee?.role || 'employee';

  const roleLabels: Record<string, string> = {
    employee: 'Colaborador',
    manager: 'Gestor / RH',
    company_admin: 'Administrador',
    auditor: 'Auditor Fiscal MTE',
    saas_owner: 'Proprietário SaaS',
  };

  const navSections: NavSection[] = [
    {
      title: 'Principal',
      items: [
        {
          id: 'dashboard',
          label: 'Painel Geral',
          icon: LayoutDashboard,
          roles: ['company_admin', 'manager', 'auditor'],
        },
        {
          id: 'punch',
          label: 'Registrar Ponto',
          icon: Clock,
          roles: ['employee', 'manager', 'company_admin'],
        },
        {
          id: 'timesheet',
          label: 'Histórico & Espelho',
          icon: CalendarCheck,
          roles: ['employee', 'manager', 'company_admin', 'auditor'],
        },
      ],
    },
    {
      title: 'Recursos Humanos',
      items: [
        {
          id: 'employees',
          label: 'Funcionários',
          icon: Users,
          roles: ['company_admin', 'manager', 'auditor'],
        },
        {
          id: 'schedules',
          label: 'Escalas e Jornadas',
          icon: CalendarRange,
          roles: ['company_admin', 'manager'],
        },
        {
          id: 'corrections',
          label: 'Ocorrências e Ajustes',
          icon: FileCheck2,
          roles: ['employee', 'manager', 'company_admin'],
        },
        {
          id: 'reports',
          label: 'Relatórios & AFD',
          icon: FileSpreadsheet,
          roles: ['company_admin', 'manager', 'auditor'],
        },
      ],
    },
    {
      title: 'Administração',
      items: [
        {
          id: 'establishments',
          label: 'Empresas e Filiais',
          icon: Building2,
          roles: ['company_admin'],
        },
        {
          id: 'compliance',
          label: 'Conformidade REP-P',
          icon: Shield,
          roles: ['company_admin', 'manager', 'auditor'],
        },
        {
          id: 'license',
          label: 'Licença & Assinatura',
          icon: KeyRound,
          roles: ['company_admin'],
        },
        {
          id: 'billing',
          label: 'Plano e Cobrança',
          icon: CreditCard,
          roles: ['company_admin'],
        },
      ],
    },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col justify-between shrink-0 bg-slate-950 border-r border-slate-900 transition-all duration-300 z-30 select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Brand Header */}
      <div>
        <div className="flex items-center justify-between px-4 h-16 border-b border-slate-900">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-base shadow-sm">
                P
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-sm tracking-tight text-white leading-none">
                  {APP_CONFIG.name}
                </span>
                <span className="text-[10px] font-semibold text-blue-400 mt-0.5">
                  REP-P Portaria 671
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-base shadow-sm">
              P
            </div>
          )}

          <button
            onClick={onToggleCollapse}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-900 hover:text-white transition-colors"
            title={collapsed ? 'Expandir Menu' : 'Recolher Menu'}
            aria-label={collapsed ? 'Expandir Menu' : 'Recolher Menu'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Company Badge (when expanded) */}
        {!collapsed && currentCompany && (
          <div className="mx-3 mt-3 px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Empresa Ativa
            </span>
            <span className="text-xs font-bold text-slate-200 truncate block mt-0.5">
              {currentCompany.trade_name || currentCompany.corporate_name}
            </span>
          </div>
        )}

        {/* Navigation Sections */}
        <nav className="p-3 space-y-5 mt-1 overflow-y-auto max-h-[calc(100vh-220px)] scrollbar-none">
          {navSections.map((section) => {
            const visibleItems = section.items.filter((item) => item.roles.includes(currentRole));
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                {!collapsed && (
                  <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    {section.title}
                  </span>
                )}

                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelectTab(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-bold'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                      } ${collapsed ? 'justify-center px-0' : ''}`}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </div>

      {/* User Session & Logout Footer */}
      <div className="p-3 border-t border-slate-900 bg-slate-950">
        {!collapsed ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 px-2 py-1">
              <div className="relative shrink-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 font-bold text-xs border border-blue-500/30">
                  {currentEmployee?.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-slate-950"></span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-200 truncate">
                  {currentEmployee?.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-blue-400 font-medium truncate">
                    {roleLabels[currentRole] || currentRole}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {currentEmployee?.matricula}
                  </span>
                </div>
              </div>
            </div>

            {/* Individual Session Badge */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-800/80 text-[10px] text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
              <span className="truncate">Sessão individual intransferível</span>
            </div>

            {/* Formal Logout Button */}
            <button
              onClick={onLogout}
              id="btn-sidebar-logout"
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3 py-2 text-xs font-bold transition-all cursor-pointer"
              title="Encerrar sessão de forma segura"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Encerrar Sessão</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 font-bold text-xs border border-blue-500/30"
              title={`${currentEmployee?.name} (${roleLabels[currentRole]}) - Sessão individual`}
            >
              {currentEmployee?.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <button
              onClick={onLogout}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
              title="Encerrar sessão (Logout)"
              aria-label="Encerrar Sessão"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
