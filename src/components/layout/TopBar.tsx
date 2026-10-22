import React from 'react';
import { Company, Employee } from '../../types';
import { APP_CONFIG } from '../../config/app-config';
import {
  Menu,
  Wifi,
  WifiOff,
  RefreshCw,
  Building,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { NavTabId } from './Sidebar';

interface TopBarProps {
  currentCompany: Company | null;
  allCompanies: Company[];
  onSelectCompany?: (companyId: string) => void;
  activeTab: NavTabId;
  timeString: string;
  isOnline: boolean;
  isSimulatedOffline: boolean;
  onToggleSimulatedOffline: () => void;
  pendingOfflineCount: number;
  onSyncOffline: () => void;
  isSyncing: boolean;
  onOpenMobileMenu: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentCompany,
  allCompanies,
  onSelectCompany,
  activeTab,
  timeString,
  isOnline,
  isSimulatedOffline,
  onToggleSimulatedOffline,
  pendingOfflineCount,
  onSyncOffline,
  isSyncing,
  onOpenMobileMenu,
}) => {
  const tabTitles: Record<NavTabId, { title: string; category: string }> = {
    dashboard: { title: 'Painel Geral & Indicadores', category: 'Principal' },
    punch: { title: 'Registro de Ponto', category: 'Principal' },
    timesheet: { title: 'Espelho de Ponto & Histórico', category: 'Principal' },
    employees: { title: 'Gestão de Funcionários', category: 'Recursos Humanos' },
    schedules: { title: 'Escalas e Jornadas de Trabalho', category: 'Recursos Humanos' },
    corrections: { title: 'Ocorrências e Ajustes', category: 'Recursos Humanos' },
    reports: { title: 'Relatórios Fiscais & AFD', category: 'Recursos Humanos' },
    establishments: { title: 'Empresas e Filiais (GPS)', category: 'Administração' },
    compliance: { title: 'Conformidade REP-P (Portaria 671)', category: 'Administração' },
    license: { title: 'Licença & Assinatura Perpétua', category: 'Administração' },
    billing: { title: 'Plano e Cobrança Recorrente', category: 'Administração' },
  };

  const currentInfo = tabTitles[activeTab] || { title: 'PontoPro', category: 'Sistema' };

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 sm:px-6 backdrop-blur-md">
      {/* Left: Mobile Toggle & Breadcrumbs / Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 md:hidden hover:bg-slate-50"
          aria-label="Abrir Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex flex-col min-w-0">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <span>{currentInfo.category}</span>
            <span aria-hidden="true">/</span>
            <span className="text-slate-600 font-semibold">{currentInfo.title}</span>
          </div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
            {currentInfo.title}
          </h1>
        </div>
      </div>

      {/* Right: Company Switcher, HLB Clock & Status Pills */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Company Selector (Multi-empresa) */}
        {allCompanies.length > 1 && onSelectCompany && (
          <div className="hidden lg:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
            <Building className="h-3.5 w-3.5 text-blue-600" />
            <select
              aria-label="Selecionar Empresa"
              value={currentCompany?.id || ''}
              onChange={(e) => onSelectCompany(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer"
            >
              {allCompanies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.trade_name || c.corporate_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Live Brasília Clock (HLB) */}
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 font-mono text-xs font-bold text-amber-300 shadow-xs border border-slate-800">
          <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
          <span>HLB {timeString}</span>
        </div>

        {/* Offline Queue Sync Indicator */}
        {pendingOfflineCount > 0 && (
          <div className="flex items-center gap-1 rounded-xl bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-300/60">
            <span>{pendingOfflineCount} pendente{pendingOfflineCount > 1 ? 's' : ''}</span>
            <button
              onClick={onSyncOffline}
              disabled={isSyncing || isSimulatedOffline}
              className="ml-1 rounded-lg bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-amber-700 transition-colors disabled:opacity-40"
            >
              {isSyncing ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Sincronizar'}
            </button>
          </div>
        )}

        {/* Simulated Connection Mode Toggle */}
        <button
          onClick={onToggleSimulatedOffline}
          className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all border ${
            isSimulatedOffline
              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
          }`}
          title="Simular conexão offline para testar funcionamento da fila local"
        >
          {isSimulatedOffline ? (
            <>
              <WifiOff className="h-3.5 w-3.5 text-rose-600" />
              <span className="hidden sm:inline">Offline (Simulado)</span>
            </>
          ) : (
            <>
              <Wifi className="h-3.5 w-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Online</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
