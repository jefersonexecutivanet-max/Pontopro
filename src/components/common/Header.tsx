import React from 'react';
import { Employee, Company } from '../../types';
import { APP_CONFIG } from '../../config/app-config';
import {
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
  Shield,
  UserCheck,
  Building2,
  FileCheck2,
  Users,
  CalendarCheck,
  Settings,
  KeyRound,
  FileText,
  BadgeAlert,
} from 'lucide-react';

export type ActiveTab =
  | 'punch'
  | 'dashboard'
  | 'timesheet'
  | 'employees'
  | 'corrections'
  | 'establishments'
  | 'compliance'
  | 'license';

interface HeaderProps {
  currentEmployee: Employee | null;
  currentCompany: Company | null;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onSwitchUser: (employeeId: string) => void;
  allEmployees: Employee[];
  timeString: string;
  isOnline: boolean;
  isSimulatedOffline: boolean;
  onToggleSimulatedOffline: () => void;
  pendingOfflineCount: number;
  onSyncOffline: () => void;
  isSyncing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentEmployee,
  currentCompany,
  activeTab,
  onSelectTab,
  onSwitchUser,
  allEmployees,
  timeString,
  isOnline,
  isSimulatedOffline,
  onToggleSimulatedOffline,
  pendingOfflineCount,
  onSyncOffline,
  isSyncing,
}) => {
  const roleLabels: Record<string, string> = {
    employee: 'Colaborador',
    manager: 'Gestor / RH',
    company_admin: 'Administrador',
    auditor: 'Auditor Fiscal',
    saas_owner: 'Proprietário SaaS',
  };

  const navItems = [
    { id: 'punch' as const, label: 'Registrar Ponto', icon: Clock, roles: ['employee', 'manager', 'company_admin'] },
    { id: 'dashboard' as const, label: 'Painel Geral', icon: Building2, roles: ['manager', 'company_admin', 'auditor'] },
    { id: 'timesheet' as const, label: 'Espelho de Ponto', icon: CalendarCheck, roles: ['employee', 'manager', 'company_admin', 'auditor'] },
    { id: 'employees' as const, label: 'Colaboradores', icon: Users, roles: ['manager', 'company_admin', 'auditor'] },
    { id: 'corrections' as const, label: 'Ajustes & Justificativas', icon: FileCheck2, roles: ['employee', 'manager', 'company_admin'] },
    { id: 'establishments' as const, label: 'Filiais & GPS', icon: Settings, roles: ['manager', 'company_admin'] },
    { id: 'compliance' as const, label: 'Conformidade REP-P', icon: Shield, roles: ['manager', 'company_admin', 'auditor'] },
    { id: 'license' as const, label: 'Licença de Uso', icon: KeyRound, roles: ['company_admin', 'auditor'] },
  ];

  const currentRole = currentEmployee?.role || 'employee';
  const visibleNavItems = navItems.filter((item) => item.roles.includes(currentRole));

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
      {/* Top Banner: Regulatory & Network Status */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 bg-slate-900 px-4 py-2 text-xs text-white">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold tracking-tight text-white">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-500 text-[11px] font-black">
              P
            </span>
            <span className="text-sm font-extrabold">{APP_CONFIG.name}</span>
          </div>
          <span className="hidden md:inline-block h-3 w-px bg-slate-700"></span>
          <span className="hidden md:inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
            <Shield className="h-3 w-3" />
            REP-P • Portaria MTP nº 671/2021
          </span>
          <span className="hidden lg:inline text-slate-400 text-[11px]">
            {currentCompany?.corporate_name} (CNPJ: {currentCompany?.cnpj})
          </span>
        </div>

        {/* Right side status indicators */}
        <div className="flex items-center gap-3">
          {/* HLB Brasilia Time Clock */}
          <div className="flex items-center gap-1.5 rounded-md bg-slate-800 px-2.5 py-1 text-xs font-mono font-bold text-amber-300 border border-slate-700">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            <span>HLB {timeString} (UTC-3)</span>
          </div>

          {/* Pending Offline Queue Indicator */}
          {pendingOfflineCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-md bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300 border border-amber-500/30">
              <BadgeAlert className="h-3.5 w-3.5 text-amber-400" />
              <span>{pendingOfflineCount} offline</span>
              <button
                onClick={onSyncOffline}
                disabled={isSyncing || isSimulatedOffline}
                className="ml-1 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-slate-950 hover:bg-amber-400 transition-colors disabled:opacity-40"
              >
                {isSyncing ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Sincronizar'}
              </button>
            </div>
          )}

          {/* Network Simulator Toggle */}
          <button
            onClick={onToggleSimulatedOffline}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors border ${
              isSimulatedOffline
                ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Simula perda de internet para testar fila offline e sincronização idempotente"
          >
            {isSimulatedOffline ? (
              <>
                <WifiOff className="h-3.5 w-3.5 text-rose-400" />
                <span>Modo Sem Internet (Simulado)</span>
              </>
            ) : (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                <span>Online</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Navbar: Navigation Links & Active User Switcher */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User profile & rapid role switch */}
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-900">
              {currentEmployee?.name || 'Carregando...'}
            </span>
            <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">
              {roleLabels[currentRole] || currentRole}
            </span>
          </div>

          {/* Quick switcher select */}
          <div className="relative">
            <label htmlFor="role-select" className="sr-only">Trocar Perfil</label>
            <select
              id="role-select"
              aria-label="Trocar Perfil"
              value={currentEmployee?.id || ''}
              onChange={(e) => onSwitchUser(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-xs hover:border-slate-400 focus:border-indigo-500 focus:outline-hidden"
            >
              {allEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({roleLabels[emp.role] || emp.role})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
