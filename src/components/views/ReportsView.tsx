import React, { useState } from 'react';
import { Company, Employee, Establishment, TimeEvent } from '../../types';
import {
  FileSpreadsheet,
  Download,
  FileText,
  Printer,
  Calendar,
  Filter,
  CheckCircle2,
  FileCheck,
  MapPin,
} from 'lucide-react';
import { formatMinutes } from '../../domain/time-calc';
import { getEventTypeName } from '../../domain/rep-p';
import { LocationDetailModal } from '../common/LocationDetailModal';

interface ReportsViewProps {
  company: Company;
  employees: Employee[];
  establishments: Establishment[];
  events: TimeEvent[];
  onDownloadAfd: () => void;
  onDownloadTechnicalTerm: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  company,
  employees,
  establishments,
  events,
  onDownloadAfd,
  onDownloadTechnicalTerm,
}) => {
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedEventForLocation, setSelectedEventForLocation] = useState<TimeEvent | null>(null);
  const [dateStart, setDateStart] = useState<string>(
    new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  );
  const [dateEnd, setDateEnd] = useState<string>(new Date().toISOString().slice(0, 10));

  // Filter events
  const filteredEvents = events.filter((ev) => {
    if (selectedEmployee !== 'all' && ev.employee_id !== selectedEmployee) return false;
    if (selectedBranch !== 'all' && ev.establishment_id !== selectedBranch) return false;
    const date = ev.occurred_at.slice(0, 10);
    if (date < dateStart || date > dateEnd) return false;
    return true;
  });

  // Export CSV with exact GPS coordinates
  const handleExportCsv = () => {
    const headers = [
      'NSR',
      'Data Ocorrencia',
      'Hora Ocorrencia',
      'Nome Colaborador',
      'CPF',
      'PIS',
      'Tipo Evento',
      'Localizacao',
      'Latitude',
      'Longitude',
      'Precisao_Metros',
      'Biometria',
      'Hash SHA-256',
    ];

    const rows = filteredEvents.map((ev) => {
      const emp = employees.find((e) => e.id === ev.employee_id);
      const dt = new Date(ev.occurred_at);

      return [
        ev.nsr,
        dt.toLocaleDateString('pt-BR'),
        dt.toLocaleTimeString('pt-BR'),
        emp ? `"${emp.name}"` : 'Colaborador',
        emp ? `"${emp.cpf}"` : '',
        emp ? `"${emp.pis_nis}"` : '',
        `"${getEventTypeName(ev.event_type)}"`,
        ev.location_status,
        ev.latitude !== undefined ? ev.latitude.toFixed(6) : '',
        ev.longitude !== undefined ? ev.longitude.toFixed(6) : '',
        ev.accuracy_meters !== undefined ? ev.accuracy_meters.toFixed(1) : '',
        ev.biometric_verified ? 'Sim' : 'Nao',
        ev.sha256_hash,
      ].join(';');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PontoPro_Relatorio_${company.cnpj.replace(/\D/g, '')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Central de Relatórios Fiscais & Exportações
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Geração de arquivos regulamentares da Portaria 671, relatórios em planilha e comprovantes fiscais
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onDownloadAfd}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            <span>Exportar AFD (.txt): validar leiaute</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Exportar Planilha (CSV)</span>
          </button>

          <button
            onClick={onDownloadTechnicalTerm}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <FileCheck className="h-4 w-4 text-blue-600" />
            <span>Atestado Art. 75</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="font-semibold text-slate-700 block mb-1">Filial</label>
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
          <label className="font-semibold text-slate-700 block mb-1">Colaborador</label>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 focus:outline-hidden"
          >
            <option value="all">Todos os Colaboradores</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.matricula})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-semibold text-slate-700 block mb-1">Data Início</label>
          <input
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 focus:outline-hidden"
          />
        </div>

        <div>
          <label className="font-semibold text-slate-700 block mb-1">Data Fim</label>
          <input
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Results Table */}
      <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Registros Filtrados</h3>
            <p className="text-xs text-slate-500">Eventos de ponto registrados no período</p>
          </div>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60">
            {filteredEvents.length} registros encontrados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3">NSR</th>
                <th className="px-6 py-3">Data e Hora</th>
                <th className="px-6 py-3">Colaborador</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3">Geolocalização</th>
                <th className="px-6 py-3">Biometria</th>
                <th className="px-6 py-3 font-mono">Hash SHA-256</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredEvents.map((ev) => {
                const emp = employees.find((e) => e.id === ev.employee_id);
                const dt = new Date(ev.occurred_at);

                return (
                  <tr key={ev.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3 font-mono font-bold text-blue-700">
                      #{String(ev.nsr).padStart(6, '0')}
                    </td>
                    <td className="px-6 py-3 font-mono font-semibold text-slate-900">
                      {dt.toLocaleDateString('pt-BR')} {dt.toLocaleTimeString('pt-BR')}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-900">
                      {emp?.name || 'Colaborador'}
                      <span className="block text-[10px] text-slate-400 font-mono">
                        CPF: {emp?.cpf}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-bold text-slate-800">
                      {getEventTypeName(ev.event_type)}
                    </td>
                    <td className="px-6 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedEventForLocation(ev)}
                        className="group flex flex-col items-start text-left focus:outline-hidden"
                        title="Ver detalhes de coordenadas e auditoria GPS"
                      >
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border transition-colors ${
                            ev.location_status === 'within_fence'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 group-hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 border-amber-200 group-hover:bg-amber-100'
                          }`}
                        >
                          <MapPin className="w-2.5 h-2.5" />
                          {ev.location_status === 'within_fence' ? 'No Perímetro' : 'Fora do Raio'}
                        </span>
                        {ev.latitude !== undefined && ev.longitude !== undefined && (
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5 group-hover:text-blue-600 transition-colors">
                            {ev.latitude.toFixed(4)}, {ev.longitude.toFixed(4)}
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-slate-500 text-[11px]" title="Verificação biométrica não está implementada no sistema">Não implementada</span>
                    </td>
                    <td className="px-6 py-3 font-mono text-[10px] text-slate-500">
                      {ev.sha256_hash.slice(0, 16)}...
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Location Audit Detail Modal */}
      {selectedEventForLocation && (
        <LocationDetailModal
          isOpen={true}
          onClose={() => setSelectedEventForLocation(null)}
          title={`Auditoria de Localização - NSR #${String(selectedEventForLocation.nsr).padStart(6, '0')}`}
          event={selectedEventForLocation}
          establishment={
            establishments.find((est) => est.id === selectedEventForLocation.establishment_id) ||
            establishments[0]
          }
        />
      )}
    </div>
  );
};
