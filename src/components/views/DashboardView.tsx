import React, { useState } from 'react';
import { Company, Employee, Establishment, TimeEvent, PunchReceipt, CorrectionRequest, WorkSchedule } from '../../types';
import { localDateKey } from '../../utils/date';
import { getEventTypeName } from '../../domain/rep-p';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  AlertCircle,
  FileCheck2,
  CalendarRange,
  Download,
  Plus,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Coffee,
  MapPin,
} from 'lucide-react';
import { NavTabId } from '../layout/Sidebar';
import { LocationDetailModal } from '../common/LocationDetailModal';

interface DashboardViewProps {
  company: Company;
  employees: Employee[];
  schedules: WorkSchedule[];
  establishments: Establishment[];
  events: TimeEvent[];
  receipts: PunchReceipt[];
  corrections: CorrectionRequest[];
  currentEmployee?: Employee | null;
  pendingOfflineCount?: number;
  isSyncing?: boolean;
  isOnline?: boolean;
  isSimulatedOffline?: boolean;
  onSyncOffline?: () => Promise<void>;
  onApproveCorrection?: (id: string) => Promise<void>;
  onApproveAllCorrections?: () => Promise<void>;
  onDownloadAfd: () => void;
  onDownloadTechnicalTerm: () => void;
  onNavigateTab: (tab: NavTabId) => void;
  onSelectReceipt: (receipt: PunchReceipt) => void;
  onSimulateTestOfflinePunch?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  company,
  employees,
  schedules,
  establishments,
  events,
  receipts,
  corrections,
  currentEmployee,
  pendingOfflineCount = 0,
  isSyncing = false,
  isOnline = true,
  isSimulatedOffline = false,
  onSyncOffline = async () => {},
  onApproveCorrection = async () => {},
  onApproveAllCorrections = async () => {},
  onDownloadAfd,
  onDownloadTechnicalTerm,
  onNavigateTab,
  onSelectReceipt,
  onSimulateTestOfflinePunch,
}) => {
  const [selectedEventForLocation, setSelectedEventForLocation] = useState<TimeEvent | null>(null);
  const activeEmployees = employees.filter((employee) => employee.active);
  const totalEmployees = activeEmployees.length;

  // Analyze today's events
  const todayIso = localDateKey(new Date());
  const todayEvents = events.filter((ev) => localDateKey(new Date(ev.occurred_at)) === todayIso);

  // Employee presence map
  const employeePunchesMap = new Map<string, TimeEvent[]>();
  todayEvents.forEach((ev) => {
    const list = employeePunchesMap.get(ev.employee_id) || [];
    list.push(ev);
    employeePunchesMap.set(ev.employee_id, list);
  });

  let presentCount = 0;
  let inLunchCount = 0;
  let lateCount = 0;

  employeePunchesMap.forEach((pList) => {
    const types = pList.map((p) => p.event_type);
    if (types.includes('entry') && !types.includes('exit')) {
      presentCount++;
      if (types.includes('lunch_start') && !types.includes('lunch_end')) {
        inLunchCount++;
      }
    }

    const firstEntry = pList
      .filter((p) => p.event_type === 'entry')
      .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime())[0];
    if (firstEntry) {
      const employee = employees.find((item) => item.id === pList[0]?.employee_id);
      const schedule = schedules.find((item) => item.id === employee?.work_schedule_id);
      // Do not invent an 08:00 shift when the employee has no linked schedule.
      if (schedule?.entry_time) {
        const [entryHour, entryMinute] = schedule.entry_time.split(':').map(Number);
        const expectedMinutes = entryHour * 60 + entryMinute + Math.max(0, schedule.tolerance_minutes || 0);
        const actual = new Date(firstEntry.occurred_at);
        const actualMinutes = actual.getHours() * 60 + actual.getMinutes();
        // Overnight shifts need cross-midnight schedule attribution; avoid false late alerts until that is available.
        const isLate = !schedule.night_shift_enabled && actualMinutes > expectedMinutes;
        if (isLate) lateCount++;
      }
    }
  });

  const absentCount = Math.max(0, activeEmployees.filter((employee) => !employeePunchesMap.has(employee.id)).length);
  const pendingCorrectionsCount = corrections.filter((c) => c.status === 'pending').length;

  const validPunchesCount = todayEvents.filter((e) => e.location_status === 'within_fence').length;
  const outsideFenceCount = todayEvents.filter((e) => e.location_status === 'outside_fence').length;
  const offlinePunchesCount = todayEvents.filter((e) => e.is_offline).length;

  // Real hourly distribution bar data
  const hourBuckets = [
    { label: '07h-09h', count: 0 },
    { label: '09h-12h', count: 0 },
    { label: '12h-14h', count: 0 },
    { label: '14h-17h', count: 0 },
    { label: '17h-19h', count: 0 },
    { label: '19h-22h', count: 0 },
  ];

  todayEvents.forEach((ev) => {
    const hour = new Date(ev.occurred_at).getHours();
    if (hour >= 7 && hour < 9) hourBuckets[0].count++;
    else if (hour >= 9 && hour < 12) hourBuckets[1].count++;
    else if (hour >= 12 && hour < 14) hourBuckets[2].count++;
    else if (hour >= 14 && hour < 17) hourBuckets[3].count++;
    else if (hour >= 17 && hour < 19) hourBuckets[4].count++;
    else if (hour >= 19 && hour < 22) hourBuckets[5].count++;
  });

  const maxBucketCount = Math.max(1, ...hourBuckets.map((b) => b.count));
  const recentEvents = [...events].sort((a, b) => b.nsr - a.nsr).slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-3xl bg-slate-950 p-6 sm:p-7 text-white shadow-xl border border-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
              Visão Executiva do RH
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-[11px] text-slate-300">
              {company.corporate_name} (CNPJ: {company.cnpj})
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
            Painel de Monitoramento & Indicadores
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Acompanhamento em tempo real de presença, atrasos, ocorrências pendentes e integridade do REP-P.
          </p>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigateTab('punch')}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition-colors shadow-md shadow-blue-600/20"
          >
            <Clock className="h-4 w-4" />
            <span>Registrar Ponto</span>
          </button>

          <button
            onClick={() => onNavigateTab('employees')}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 transition-colors border border-slate-800"
          >
            <Plus className="h-4 w-4 text-blue-400" />
            <span>Novo Funcionário</span>
          </button>

          <button
            onClick={onDownloadAfd}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 transition-colors border border-slate-800"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            <span>Exportar AFD</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip (5 Main Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* 1. Ativos */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Ativos</span>
            <Users className="h-4 w-4 text-slate-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{totalEmployees}</div>
          <span className="text-[11px] text-emerald-600 font-semibold">Funcionários com vínculo ativo</span>
        </div>

        {/* 2. Marcações Hoje */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Batidas Hoje</span>
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600">{todayEvents.length}</div>
          <span className="text-[11px] text-slate-500">Eventos de ponto</span>
        </div>

        {/* 3. Presentes */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Presentes</span>
            <UserCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">{presentCount}</div>
          <span className="text-[11px] text-slate-500">
            {inLunchCount > 0 ? `${inLunchCount} em almoço` : 'Em jornada'}
          </span>
        </div>

        {/* 4. Atrasos / Ausentes */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Atrasos</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600">{lateCount}</div>
          <span className="text-[11px] text-slate-500">{absentCount} ausente{absentCount !== 1 ? 's' : ''}</span>
        </div>

        {/* 5. Ocorrências Pendentes */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Ajustes RH</span>
            <FileCheck2 className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600">
            {pendingCorrectionsCount}
          </div>
          <button
            onClick={() => onNavigateTab('corrections')}
            className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-0.5"
          >
            <span>Analisar pendências</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Distribution Chart & Status Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Hourly Punch Distribution Bar Chart */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Distribuição das Batidas de Ponto por Horário
              </h3>
              <p className="text-xs text-slate-500">Concentração de entradas, intervalos e saídas ao longo do dia</p>
            </div>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>

          <div className="grid grid-cols-6 gap-3 items-end h-44 pt-4 px-2">
            {hourBuckets.map((bucket) => {
              const heightPercent = Math.max(12, Math.round((bucket.count / maxBucketCount) * 100));
              return (
                <div key={bucket.label} className="flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-xs font-bold text-slate-700 font-mono">{bucket.count}</span>
                  <div
                    className="w-full max-w-[40px] rounded-t-xl bg-blue-600 transition-all duration-300 hover:bg-blue-500"
                    style={{ height: `${heightPercent}%` }}
                  ></div>
                  <span className="text-[10px] font-semibold text-slate-500 truncate w-full text-center">
                    {bucket.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resumo de Validação & Integridade */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900">Resumo de Validação</h3>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/60">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-emerald-950">Marcações Válidas</span>
                </div>
                <span className="font-black text-emerald-700">{validPunchesCount}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/60">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="font-semibold text-amber-950">Fora do Raio / GPS</span>
                </div>
                <span className="font-black text-amber-700">{outsideFenceCount}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/80 border border-blue-200/60">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="font-semibold text-blue-950">Sincronizadas Offline</span>
                </div>
                <span className="font-black text-blue-700">{offlinePunchesCount}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Integridade interna:</span>
            <span className="font-mono font-bold text-slate-800">Hash encadeado SHA-256</span>
          </div>
        </div>
      </div>

      {/* Live Punch Stream Table */}
      <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 px-6 py-4 gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">Últimas Marcações Registradas</h3>
            <p className="text-xs text-slate-500">Lista cronológica de marcações com código interno de integridade</p>
          </div>
          <button
            onClick={() => onNavigateTab('reports')}
            className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
          >
            <span>Ver todos os registros</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3">NSR</th>
                <th className="px-6 py-3">Horário</th>
                <th className="px-6 py-3">Funcionário</th>
                <th className="px-6 py-3">Tipo de Evento</th>
                <th className="px-6 py-3">Localização</th>
                <th className="px-6 py-3">Biometria</th>
                <th className="px-6 py-3 font-mono">Hash SHA-256</th>
                <th className="px-6 py-3 text-right">Comprovante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {recentEvents.map((evt) => {
                const emp = employees.find((e) => e.id === evt.employee_id);
                const matchedReceipt = receipts.find((r) => r.nsr === evt.nsr);
                const timeStr = new Date(evt.occurred_at).toLocaleTimeString('pt-BR');

                return (
                  <tr key={evt.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3 font-mono font-bold text-blue-700">
                      #{String(evt.nsr).padStart(6, '0')}
                    </td>
                    <td className="px-6 py-3 font-mono font-semibold text-slate-900">
                      {timeStr}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-900">
                      {emp?.name || 'Funcionário'}
                      <span className="block text-[10px] text-slate-400 font-mono">
                        CPF: {emp?.cpf}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-bold text-slate-800">
                      {getEventTypeName(evt.event_type)}
                    </td>
                    <td className="px-6 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedEventForLocation(evt)}
                        className="group text-left transition-transform"
                        title="Clique para ver auditoria e coordenadas disponíveis"
                      >
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border transition-colors ${
                            evt.location_status === 'within_fence'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 group-hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 border-amber-200 group-hover:bg-amber-100'
                          }`}
                        >
                          <MapPin className="h-3 w-3" />
                          {evt.location_status === 'within_fence' ? 'No Perímetro' : 'Fora do Raio'}
                        </span>
                        {evt.latitude !== undefined && evt.longitude !== undefined && (
                          <span className="block text-[10px] text-slate-400 font-mono mt-0.5 group-hover:text-blue-600 transition-colors">
                            {evt.latitude.toFixed(4)}°, {evt.longitude.toFixed(4)}°
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-3">
                      {evt.biometric_verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                          <ShieldCheck className="h-3 w-3" />
                          Facial {evt.biometric_score || 98.5}%
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Não coletada</span>
                      )}
                    </td>
                    <td className="px-6 py-3 font-mono text-[10px] text-slate-500">
                      {evt.sha256_hash.slice(0, 16)}...
                    </td>
                    <td className="px-6 py-3 text-right">
                      {matchedReceipt ? (
                        <button
                          onClick={() => onSelectReceipt(matchedReceipt)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 transition-colors shadow-2xs"
                        >
                          Visualizar
                        </button>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Location Detail Modal for Audit */}
      <LocationDetailModal
        isOpen={selectedEventForLocation !== null}
        onClose={() => setSelectedEventForLocation(null)}
        event={selectedEventForLocation}
        employee={employees.find((e) => e.id === selectedEventForLocation?.employee_id)}
        establishment={
          establishments.find((est) => est.id === selectedEventForLocation?.establishment_id) ||
          establishments[0]
        }
      />
    </div>
  );
};
