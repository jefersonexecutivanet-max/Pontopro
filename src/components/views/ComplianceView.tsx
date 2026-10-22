import React, { useState } from 'react';
import { Company, TimeEvent, Employee, AuditLog } from '../../types';
import { verifyEventIntegrity } from '../../domain/rep-p';
import {
  ShieldCheck,
  FileCheck,
  Download,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Search,
  ExternalLink,
  Scale,
  Eye,
} from 'lucide-react';

interface ComplianceViewProps {
  company: Company;
  events: TimeEvent[];
  employees: Employee[];
  auditLogs: AuditLog[];
  onDownloadAfd: () => void;
  onDownloadTechnicalTerm: () => void;
}

export const ComplianceView: React.FC<ComplianceViewProps> = ({
  company,
  events,
  employees,
  auditLogs,
  onDownloadAfd,
  onDownloadTechnicalTerm,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || '');
  const selectedEvent = events.find((e) => e.id === selectedEventId) || events[0];
  const selectedEmp = employees.find((e) => e.id === selectedEvent?.employee_id);

  // Verification calculation
  const isIntegrityValid =
    selectedEvent && selectedEmp
      ? verifyEventIntegrity(selectedEvent, company.cnpj, selectedEmp.cpf)
      : false;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Top Banner */}
      <div className="rounded-3xl bg-linear-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Checklist técnico de conformidade (não é certificação oficial)
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Portaria MTP nº 671/2021 & LGPD
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Ferramentas de verificação de integridade e exportação para revisão técnica. A presença desses recursos não comprova certificação, homologação ou conformidade legal completa.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
            <span>Configuração regulatória: pendente de validação</span>
            <span>•</span>
            <span>Horário do dispositivo/servidor (fonte oficial não integrada)</span>
            <span>•</span>
            <span>Hash interno de integridade (não é assinatura ICP-Brasil)</span>
          </div>
        </div>

        {/* Official Export Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            onClick={onDownloadAfd}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-md"
          >
            <Download className="h-4 w-4" />
            <span>Exportar AFD (.txt)</span>
          </button>

          <button
            onClick={onDownloadTechnicalTerm}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <FileCheck className="h-4 w-4 text-indigo-400" />
            <span>Atestado Técnico (Art. 75)</span>
          </button>
        </div>
      </div>

      {/* Grid: Hash Chain Verifier & Regulatory Checkpoints */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SHA-256 Cryptographic Chain Inspector */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Auditoria de Integridade Criptográfica (SHA-256)
              </h3>
              <p className="text-xs text-slate-500">
                Verifique em tempo real se o registro foi adulterado no banco
              </p>
            </div>
            <Lock className="h-5 w-5 text-indigo-600" />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Selecione uma marcação para auditar:
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono text-slate-800 focus:outline-hidden"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  NSR #{String(ev.nsr).padStart(6, '0')} - {ev.event_type} (
                  {new Date(ev.occurred_at).toLocaleTimeString('pt-BR')})
                </option>
              ))}
            </select>
          </div>

          {selectedEvent && selectedEmp && (
            <div className="space-y-3 rounded-2xl bg-slate-50 p-4 border border-slate-200 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-400 block">HASH ANTERIOR (CHAIN):</span>
                <span className="text-slate-600 break-all text-[11px]">
                  {selectedEvent.previous_hash}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block">DADOS COMPUTADOS:</span>
                <p className="text-slate-800 text-[11px]">
                  NSR: {selectedEvent.nsr} | CNPJ: {company.cnpj} | CPF: {selectedEmp.cpf} |
                  Data: {selectedEvent.occurred_at} | Tipo: {selectedEvent.event_type}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block">HASH GRAVADO NO BANCO:</span>
                <span className="text-indigo-800 font-bold break-all text-[11px]">
                  {selectedEvent.sha256_hash}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-sans">
                <span className="font-semibold text-slate-700">Resultado da Auditoria:</span>
                {isIntegrityValid ? (
                  <span className="flex items-center gap-1 font-bold text-emerald-600 text-xs">
                    <CheckCircle2 className="h-4 w-4" />
                    Integridade verificada
                  </span>
                ) : (
                  <span className="flex items-center gap-1 font-bold text-rose-600 text-xs">
                    <AlertTriangle className="h-4 w-4" />
                    REGISTRO ADULTERADO
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* LGPD & Sensitive Data Governance */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Governança LGPD (Lei 13.709/2018)
              </h3>
              <p className="text-xs text-slate-500">
                Tratamento legal de biometria facial e geolocalização no trabalho
              </p>
            </div>
            <Scale className="h-5 w-5 text-indigo-600" />
          </div>

          <div className="space-y-3 text-xs">
            <div className="rounded-2xl bg-emerald-50/60 p-3.5 border border-emerald-200/80">
              <span className="font-bold text-emerald-900 block mb-0.5">
                Hipótese Legal para Biometria Facial
              </span>
              <p className="text-emerald-800 text-[11px]">
                Art. 11, II, "a" da LGPD: Cumprimento de obrigação legal imposta pela Portaria MTP nº
                671/2021 para autenticação inequívoca do trabalhador e prevenção a fraudes em
                relações empregatícias.
              </p>
            </div>

            <div className="rounded-2xl bg-indigo-50/60 p-3.5 border border-indigo-200/80">
              <span className="font-bold text-indigo-900 block mb-0.5">
                Finalidade e Proporcionalidade do GPS
              </span>
              <p className="text-indigo-800 text-[11px]">
                Coleta pontual estritamente no instante do clique de registro de ponto para checagem
                de perímetro contratual. O sistema <strong>não</strong> monitora continuamente a
                localização do trabalhador fora do instante da marcação.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200">
              <span className="font-bold text-slate-800 block mb-0.5">
                Direitos dos Titulares & Retenção
              </span>
              <p className="text-slate-600 text-[11px]">
                Prazo legal de conservação dos dados de jornada: 5 anos (Art. 7º, XXIX da
                Constituição Federal e CLT). Não eliminação arbitrária de comprovantes de marcação.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Stream */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            Trilha de Auditoria do Sistema (Audit Trail)
          </h3>
          <span className="text-xs text-slate-400 font-semibold">
            {auditLogs.length} eventos auditados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Ação</th>
                <th className="px-6 py-3">Usuário</th>
                <th className="px-6 py-3">Papel</th>
                <th className="px-6 py-3">Alvo / Detalhes</th>
                <th className="px-6 py-3 text-right">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-3 text-slate-900">
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-6 py-3 font-bold text-indigo-700 font-sans">
                    {log.action}
                  </td>
                  <td className="px-6 py-3 font-sans text-slate-800 font-semibold">
                    {log.user_name}
                  </td>
                  <td className="px-6 py-3 font-sans">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                      {log.user_role}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-500 text-[11px] truncate max-w-xs">
                    {JSON.stringify(log.details)}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-400">{log.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
