import React, { useState } from 'react';
import { Employee, WorkSchedule, TimeEvent } from '../../types';
import { calculateDailySummary, formatMinutes } from '../../domain/time-calc';
import { Calendar, User, Clock, Printer, Download, AlertCircle } from 'lucide-react';

interface TimesheetViewProps {
  employees: Employee[];
  schedules: WorkSchedule[];
  events: TimeEvent[];
  currentEmployee?: Employee | null;
}

export const TimesheetView: React.FC<TimesheetViewProps> = ({
  employees,
  schedules,
  events,
  currentEmployee,
}) => {
  const isEmployeeRole = currentEmployee?.role === 'employee';
  const initialId = isEmployeeRole && currentEmployee ? currentEmployee.id : (employees[0]?.id || '');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(initialId);
  const effectiveEmployeeId = isEmployeeRole && currentEmployee ? currentEmployee.id : selectedEmployeeId;
  const employee = employees.find((e) => e.id === effectiveEmployeeId) || currentEmployee || employees[0];
  const schedule = schedules.find((s) => s.id === employee?.work_schedule_id) || schedules[0];

  // Group employee events by date (YYYY-MM-DD)
  const employeeEvents = events.filter((e) => e.employee_id === selectedEmployeeId);
  const eventsByDate = new Map<string, TimeEvent[]>();
  employeeEvents.forEach((ev) => {
    const dStr = ev.occurred_at.slice(0, 10);
    const list = eventsByDate.get(dStr) || [];
    list.push(ev);
    eventsByDate.set(dStr, list);
  });

  // Build 15-day timesheet slice around current date
  const today = new Date();
  const daysInView: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    daysInView.push(d.toISOString().slice(0, 10));
  }
  daysInView.reverse();

  let totalWorkedMinutes = 0;
  let totalBalanceMinutes = 0;
  let totalNightMinutes = 0;
  let totalOvertime50 = 0;

  const dailyRows = daysInView.map((dStr) => {
    const dayEvents = eventsByDate.get(dStr) || [];
    const dateObj = new Date(`${dStr}T12:00:00Z`);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const summary = calculateDailySummary(dStr, employee?.id || '', dayEvents, schedule, isWeekend);

    totalWorkedMinutes += summary.worked_minutes;
    totalBalanceMinutes += summary.balance_minutes;
    totalNightMinutes += summary.night_shift_minutes;
    totalOvertime50 += summary.overtime_50_minutes;

    // Extract up to 4 punches
    const sorted = [...dayEvents].sort(
      (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
    );
    const p1 = sorted.find((e) => e.event_type === 'entry')?.occurred_at.slice(11, 16) || '-';
    const p2 = sorted.find((e) => e.event_type === 'lunch_start')?.occurred_at.slice(11, 16) || '-';
    const p3 = sorted.find((e) => e.event_type === 'lunch_end')?.occurred_at.slice(11, 16) || '-';
    const p4 = sorted.find((e) => e.event_type === 'exit')?.occurred_at.slice(11, 16) || '-';

    return {
      date: dStr,
      dayName: dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }),
      p1,
      p2,
      p3,
      p4,
      summary,
      isWeekend,
    };
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Top Header & Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Espelho de Ponto Individual</h1>
          <p className="text-xs text-slate-500 mt-1">
            Apuração de jornada conforme Art. 84 da Portaria MTP 671/2021 (Relatório de Ponto do Empregado)
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isEmployeeRole ? (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100/80 px-3 py-1.5 text-xs font-bold text-slate-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>{employee?.name} ({employee?.matricula})</span>
              <span className="text-[10px] text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded-md">
                Espelho Pessoal
              </span>
            </div>
          ) : (
            <>
              <label htmlFor="select-employee" className="text-xs font-semibold text-slate-600">
                Colaborador:
              </label>
              <select
                id="select-employee"
                aria-label="Selecionar Colaborador"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-xs"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.matricula})
                  </option>
                ))}
              </select>
            </>
          )}

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Employee & Schedule Info Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-slate-400 font-semibold block uppercase text-[10px]">Colaborador</span>
          <span className="font-bold text-slate-900 text-sm">{employee?.name}</span>
          <span className="text-slate-500 block font-mono">CPF: {employee?.cpf}</span>
        </div>
        <div>
          <span className="text-slate-400 font-semibold block uppercase text-[10px]">Departamento / Cargo</span>
          <span className="font-bold text-slate-900">{employee?.department}</span>
          <span className="text-slate-500 block">{employee?.position}</span>
        </div>
        <div>
          <span className="text-slate-400 font-semibold block uppercase text-[10px]">Escala Contratual</span>
          <span className="font-bold text-slate-900">{schedule?.name}</span>
          <span className="text-slate-500 block">{schedule?.daily_expected_hours}h diárias • {schedule?.weekly_hours}h semanais</span>
        </div>
        <div>
          <span className="text-slate-400 font-semibold block uppercase text-[10px]">Regras Aplicadas</span>
          <span className="font-semibold text-indigo-700 block">Tolerância Art. 58 CLT (10 min)</span>
          <span className="text-slate-500 block">Hora noturna reduzida (52m30s)</span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Total Trabalhado</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{formatMinutes(totalWorkedMinutes)}</div>
          <span className="text-[11px] text-slate-500">No período selecionado</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Saldo Banco de Horas</span>
          <div
            className={`text-2xl font-black mt-1 ${
              totalBalanceMinutes >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {formatMinutes(totalBalanceMinutes, true)}
          </div>
          <span className="text-[11px] text-slate-500">Compensação apurada</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Horas Extras (50%)</span>
          <div className="text-2xl font-black text-amber-600 mt-1">{formatMinutes(totalOvertime50)}</div>
          <span className="text-[11px] text-slate-500">Dias úteis e sábados</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Adicional Noturno</span>
          <div className="text-2xl font-black text-indigo-600 mt-1">{formatMinutes(totalNightMinutes)}</div>
          <span className="text-[11px] text-slate-500">Com redução ficta legal</span>
        </div>
      </div>

      {/* Daily Breakdown Table */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Detalhamento Diário das Marcações</h3>
          <span className="text-xs text-slate-400">Cálculo conforme jornada cadastrada; validar requisitos legais</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3">Data</th>
                <th className="px-6 py-3">Dia</th>
                <th className="px-6 py-3 text-center">Entrada 1</th>
                <th className="px-6 py-3 text-center">Saída Intervalo</th>
                <th className="px-6 py-3 text-center">Retorno Intervalo</th>
                <th className="px-6 py-3 text-center">Saída Final</th>
                <th className="px-6 py-3 text-center">Trabalhado</th>
                <th className="px-6 py-3 text-center">Saldo Diário</th>
                <th className="px-6 py-3 text-center">Noturno</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {dailyRows.map((row) => (
                <tr
                  key={row.date}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    row.isWeekend ? 'bg-slate-50/40 text-slate-400' : ''
                  }`}
                >
                  <td className="px-6 py-3 font-semibold text-slate-900">{row.date}</td>
                  <td className="px-6 py-3 font-sans capitalize text-slate-500">{row.dayName}</td>
                  <td className="px-6 py-3 text-center font-bold text-slate-800">{row.p1}</td>
                  <td className="px-6 py-3 text-center text-slate-600">{row.p2}</td>
                  <td className="px-6 py-3 text-center text-slate-600">{row.p3}</td>
                  <td className="px-6 py-3 text-center font-bold text-slate-800">{row.p4}</td>
                  <td className="px-6 py-3 text-center font-bold text-slate-900">
                    {formatMinutes(row.summary.worked_minutes)}
                  </td>
                  <td
                    className={`px-6 py-3 text-center font-bold ${
                      row.summary.balance_minutes >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {formatMinutes(row.summary.balance_minutes, true)}
                  </td>
                  <td className="px-6 py-3 text-center text-indigo-700">
                    {row.summary.night_shift_minutes > 0
                      ? formatMinutes(row.summary.night_shift_minutes)
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
