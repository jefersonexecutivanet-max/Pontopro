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
  X,
  LogOut,
} from 'lucide-react';
import { NavTabId } from './Sidebar';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmployee: Employee | null;
  currentCompany: Company | null;
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  onLogout: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  isOpen,
  onClose,
  currentEmployee,
  currentCompany,
  activeTab,
  onSelectTab,
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

  const menuItems = [
    { id: 'dashboard' as NavTabId, label: 'Painel Geral', icon: LayoutDashboard, roles: ['company_admin', 'manager', 'auditor'] },
    { id: 'punch' as NavTabId, label: 'Registrar Ponto', icon: Clock, roles: ['employee', 'manager', 'company_admin'] },
    { id: 'timesheet' as NavTabId, label: 'Espelho de Ponto', icon: CalendarCheck, roles: ['employee', 'manager', 'company_admin', 'auditor'] },
    { id: 'employees' as NavTabId, label: 'Funcionários', icon: Users, roles: ['company_admin', 'manager', 'auditor'] },
    { id: 'schedules' as NavTabId, label: 'Escalas e Jornadas', icon: CalendarRange, roles: ['company_admin', 'manager'] },
    { id: 'corrections' as NavTabId, label: 'Ocorrências e Ajustes', icon: FileCheck2, roles: ['employee', 'manager', 'company_admin'] },
    { id: 'reports' as NavTabId, label: 'Relatórios & AFD', icon: FileSpreadsheet, roles: ['company_admin', 'manager', 'auditor'] },
    { id: 'establishments' as NavTabId, label: 'Empresas e Filiais', icon: Building2, roles: ['company_admin', 'manager'] },
    { id: 'compliance' as NavTabId, label: 'Conformidade REP-P', icon: Shield, roles: ['company_admin', 'manager', 'auditor'] },
    { id: 'license' as NavTabId, label: 'Licença & Assinatura', icon: KeyRound, roles: ['company_admin', 'auditor'] },
    { id: 'billing' as NavTabId, label: 'Plano e Cobrança', icon: CreditCard, roles: ['company_admin'] },
  ];

  const visibleItems = menuItems.filter((i) => i.roles.includes(currentRole));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex md:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative flex w-full max-w-xs flex-1 flex-col bg-slate-950 text-white shadow-2xl">
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-900">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-sm">
              P
            </div>
            <span className="font-extrabold text-sm tracking-tight">{APP_CONFIG.name}</span>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-900 hover:text-white"
            aria-label="Fechar Menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-b border-slate-900 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 font-bold text-sm border border-blue-500/30 shrink-0">
              {currentEmployee?.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{currentEmployee?.name}</p>
              <p className="text-[10px] text-blue-400 font-medium">
                {roleLabels[currentRole] || currentRole}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                Mat: {currentEmployee?.matricula}
              </p>
            </div>
          </div>

          <div className="mt-3">
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              id="btn-mobile-logout"
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 py-2 px-3 text-xs font-bold transition-all"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Encerrar Sessão</span>
            </button>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
