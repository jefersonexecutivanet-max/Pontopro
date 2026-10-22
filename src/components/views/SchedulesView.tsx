import React, { useState } from 'react';
import { WorkSchedule, Company } from '../../types';
import {
  CalendarRange,
  Clock,
  Plus,
  Moon,
  Sun,
  ShieldAlert,
  CheckCircle2,
  X,
} from 'lucide-react';

interface SchedulesViewProps {
  company: Company;
  schedules: WorkSchedule[];
  onCreateSchedule?: (data: Partial<WorkSchedule>) => Promise<void>;
}

export const SchedulesView: React.FC<SchedulesViewProps> = ({
  company,
  schedules,
  onCreateSchedule,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<WorkSchedule['type']>('standard_44h');
  const [weeklyHours, setWeeklyHours] = useState(44);
  const [dailyHours, setDailyHours] = useState(8);
  const [entryTime, setEntryTime] = useState('08:00');
  const [lunchStart, setLunchStart] = useState('12:00');
  const [lunchEnd, setLunchEnd] = useState('13:00');
  const [exitTime, setExitTime] = useState('17:00');
  const [tolerance, setTolerance] = useState(10);
  const [nightShift, setNightShift] = useState(false);

  const daysOfWeek = [
    { key: 'seg', label: 'Segunda', active: true },
    { key: 'ter', label: 'Terça', active: true },
    { key: 'qua', label: 'Quarta', active: true },
    { key: 'qui', label: 'Quinta', active: true },
    { key: 'sex', label: 'Sexta', active: true },
    { key: 'sab', label: 'Sábado', active: false },
    { key: 'dom', label: 'Domingo', active: false },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onCreateSchedule) {
      await onCreateSchedule({
        company_id: company.id,
        name,
        type,
        weekly_hours: Number(weeklyHours),
        daily_expected_hours: Number(dailyHours),
        entry_time: entryTime,
        lunch_start_time: lunchStart,
        lunch_end_time: lunchEnd,
        exit_time: exitTime,
        tolerance_minutes: Number(tolerance),
        night_shift_enabled: nightShift,
      });
    }
    setIsModalOpen(false);
    setName('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Escalas e Jornadas de Trabalho
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Parâmetros de apuração conforme regras da CLT e acordos coletivos da empresa {company.trade_name}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Cadastrar Nova Escala</span>
        </button>
      </div>

      {/* Info Card on CLT Tolerance */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-xs text-blue-900 flex items-start gap-3">
        <Clock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block">Tolerância Legal e Adicional Noturno (CLT)</span>
          <p className="text-[11px] text-blue-700 mt-0.5">
            O motor de cálculo do PontoPro aplica o Art. 58 § 1º da CLT (variações de até 5 minutos por batida, com máximo diário de 10 minutos). Para turnos noturnos, aplica-se automaticamente a redução ficta (52min30s) e adicional de 20% conforme Art. 73.
          </p>
        </div>
      </div>

      {/* Grid of Schedules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {schedules.map((sc) => (
          <div
            key={sc.id}
            className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 border border-blue-200/60 uppercase tracking-wider">
                    {sc.type.replace('_', ' ')}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-2">{sc.name}</h3>
                </div>

                <div className="text-right">
                  <span className="text-xl font-black text-slate-900">{sc.weekly_hours}h</span>
                  <span className="text-[10px] text-slate-400 block font-semibold">Semanais</span>
                </div>
              </div>

              {/* Time Blocks */}
              <div className="grid grid-cols-4 gap-2 text-center my-4 font-mono">
                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200">
                  <span className="text-[10px] font-sans font-semibold text-slate-400 block">Entrada</span>
                  <span className="text-sm font-bold text-slate-900">{sc.entry_time}</span>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200">
                  <span className="text-[10px] font-sans font-semibold text-slate-400 block">Intervalo</span>
                  <span className="text-sm font-bold text-slate-700">{sc.lunch_start_time}</span>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200">
                  <span className="text-[10px] font-sans font-semibold text-slate-400 block">Retorno</span>
                  <span className="text-sm font-bold text-slate-700">{sc.lunch_end_time}</span>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200">
                  <span className="text-[10px] font-sans font-semibold text-slate-400 block">Saída</span>
                  <span className="text-sm font-bold text-slate-900">{sc.exit_time}</span>
                </div>
              </div>

              {/* Days of week chips */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-500 mr-1">Dias:</span>
                {daysOfWeek.map((d, idx) => {
                  const isWorkDay = sc.type === 'standard_44h' ? idx < 5 : idx < 6;
                  return (
                    <span
                      key={d.key}
                      className={`h-6 w-7 flex items-center justify-center rounded-md text-[10px] font-bold ${
                        isWorkDay
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {d.key[0].toUpperCase()}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Footer Features */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span className="font-semibold text-slate-500">
                Tolerância CLT: <strong className="text-slate-800">{sc.tolerance_minutes} min</strong>
              </span>

              {sc.night_shift_enabled ? (
                <span className="flex items-center gap-1 text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  <Moon className="h-3 w-3" />
                  Turno Noturno (+20%)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 text-[11px]">
                  <Sun className="h-3 w-3" />
                  Diurno Padrão
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nova Escala */}
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

            <h3 className="text-lg font-bold text-slate-900 mb-1">Cadastrar Nova Escala</h3>
            <p className="text-xs text-slate-500 mb-5">
              Defina os horários contratuais e tolerâncias de jornada
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nome da Escala *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Comercial 40h (Seg a Sex)"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tipo de Escala</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-hidden"
                  >
                    <option value="standard_44h">Padrão 44h</option>
                    <option value="6x1">Escala 6x1</option>
                    <option value="12x36">Plantão 12x36</option>
                    <option value="flexible">Flexível</option>
                    <option value="night_shift">Turno Noturno</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Carga Horária Semanal</label>
                  <input
                    type="number"
                    value={weeklyHours}
                    onChange={(e) => setWeeklyHours(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 font-mono">
                <div>
                  <label className="font-semibold font-sans text-slate-700 block mb-1 text-[11px]">Entrada</label>
                  <input
                    type="time"
                    value={entryTime}
                    onChange={(e) => setEntryTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-semibold font-sans text-slate-700 block mb-1 text-[11px]">Almoço</label>
                  <input
                    type="time"
                    value={lunchStart}
                    onChange={(e) => setLunchStart(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-semibold font-sans text-slate-700 block mb-1 text-[11px]">Retorno</label>
                  <input
                    type="time"
                    value={lunchEnd}
                    onChange={(e) => setLunchEnd(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-semibold font-sans text-slate-700 block mb-1 text-[11px]">Saída</label>
                  <input
                    type="time"
                    value={exitTime}
                    onChange={(e) => setExitTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="night-chk"
                  checked={nightShift}
                  onChange={(e) => setNightShift(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="night-chk" className="font-semibold text-slate-800 cursor-pointer">
                  Habilitar cálculo automático de Adicional Noturno (22:00 às 05:00)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700 shadow-sm"
                >
                  Salvar Escala
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
