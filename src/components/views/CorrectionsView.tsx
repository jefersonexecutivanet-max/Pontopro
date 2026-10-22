import React, { useState } from 'react';
import { CorrectionRequest, Employee, EventType } from '../../types';
import { getEventTypeName } from '../../domain/rep-p';
import {
  FileCheck2,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  User,
  X,
} from 'lucide-react';

interface CorrectionsViewProps {
  corrections: CorrectionRequest[];
  employees: Employee[];
  currentEmployee: Employee;
  onCreateCorrection: (data: Partial<CorrectionRequest>) => Promise<void>;
  onReviewCorrection: (id: string, status: 'approved' | 'rejected', notes?: string) => Promise<void>;
}

export const CorrectionsView: React.FC<CorrectionsViewProps> = ({
  corrections,
  employees,
  currentEmployee,
  onCreateCorrection,
  onReviewCorrection,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('08:00');
  const [eventType, setEventType] = useState<EventType>('entry');
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState('');

  // Review modal state
  const [reviewModalTarget, setReviewModalTarget] = useState<CorrectionRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected'>('approved');

  const isManagerOrAdmin = ['manager', 'company_admin', 'saas_owner', 'auditor'].includes(
    currentEmployee.role
  );

  const displayedCorrections = isManagerOrAdmin
    ? corrections
    : corrections.filter((c) => c.employee_id === currentEmployee.id);

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreateCorrection({
      company_id: currentEmployee.company_id,
      employee_id: currentEmployee.id,
      requested_date: date,
      requested_time: time,
      requested_event_type: eventType,
      reason,
      attachment_name: attachment || undefined,
    });
    setIsModalOpen(false);
    setReason('');
  };

  const handleConfirmReview = async () => {
    if (!reviewModalTarget) return;
    await onReviewCorrection(reviewModalTarget.id, reviewDecision, reviewNotes);
    setReviewModalTarget(null);
    setReviewNotes('');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Ajustes & Justificativas de Ponto
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Fluxo formal de tratamento de ocorrências. Os registros originais nunca são apagados
            ou sobrescritos.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Solicitar Correção / Inclusão</span>
        </button>
      </div>

      {/* Info Notice Portaria 671 */}
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-xs text-indigo-900 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block">Regra Legal de Imutabilidade (Portaria MTP 671/2021)</span>
          <p className="text-[11px] text-indigo-700 mt-0.5">
            O programa não permite apagar ou substituir registros de marcação já efetuados. O
            tratamento de ponto consiste na inclusão justificada de evento de correção com parecer
            do gestor e auditoria contínua.
          </p>
        </div>
      </div>

      {/* Corrections List */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            {isManagerOrAdmin ? 'Histórico de Solicitações da Empresa' : 'Minhas Solicitações de Ajuste'}
          </h3>
          <span className="text-xs text-slate-400 font-semibold">{displayedCorrections.length} itens</span>
        </div>

        {displayedCorrections.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <FileCheck2 className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-medium">Nenhuma solicitação de ajuste registrada.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayedCorrections.map((req) => {
              const emp = employees.find((e) => e.id === req.employee_id);
              const isPending = req.status === 'pending';

              return (
                <div key={req.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {emp?.name || 'Colaborador'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        ({emp?.matricula})
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          req.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {req.status === 'approved'
                          ? 'Aprovado'
                          : req.status === 'rejected'
                          ? 'Recusado'
                          : 'Aguardando Análise'}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-indigo-700">
                      Evento solicitado: {getEventTypeName(req.requested_event_type)} em{' '}
                      {req.requested_date} às {req.requested_time}
                    </p>

                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-700">Justificativa: </span>
                      {req.reason}
                    </p>

                    {req.attachment_name && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                        <FileText className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Anexo: {req.attachment_name}</span>
                      </div>
                    )}

                    {req.reviewed_by_name && (
                      <p className="text-[11px] text-slate-400 font-medium pt-1">
                        Analisado por: <span className="font-bold text-slate-700">{req.reviewed_by_name}</span> em{' '}
                        {new Date(req.reviewed_at!).toLocaleString('pt-BR')}
                        {req.review_notes && ` • Parecer: "${req.review_notes}"`}
                      </p>
                    )}
                  </div>

                  {/* Actions for Manager / Admin */}
                  {isManagerOrAdmin && isPending && (
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        onClick={() => {
                          setReviewModalTarget(req);
                          setReviewDecision('approved');
                          setReviewNotes('Solicitação deferida em conformidade com as regras internas.');
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Aprovar</span>
                      </button>

                      <button
                        onClick={() => {
                          setReviewModalTarget(req);
                          setReviewDecision('rejected');
                          setReviewNotes('Solicitação indeferida por inconsistência de justificativa.');
                        }}
                        className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Recusar</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">Nova Solicitação de Ajuste</h3>
            <p className="text-xs text-slate-500 mb-4">
              Informe a ocorrência para posterior validação pelo RH
            </p>

            <form onSubmit={handleSubmitNew} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Horário *</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tipo de Evento *</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as EventType)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden"
                >
                  <option value="entry">Entrada</option>
                  <option value="lunch_start">Saída para Intervalo</option>
                  <option value="lunch_end">Retorno de Intervalo</option>
                  <option value="exit">Saída Final</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Motivo / Justificativa *</label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Falha temporária no leitor do smartphone, atestado médico nº 402, serviço externo autorizado..."
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden"
                ></textarea>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nome do Anexo (Comprovante / Atestado)</label>
                <input
                  type="text"
                  value={attachment}
                  onChange={(e) => setAttachment(e.target.value)}
                  placeholder="Ex: atestado_medico_outubro.pdf"
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700"
                >
                  Enviar Solicitação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Decision Modal */}
      {reviewModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Parecer Formal da Solicitação
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Registrar decisão auditável para o colaborador
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Decisão</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 font-bold text-emerald-700">
                    <input
                      type="radio"
                      name="decision"
                      checked={reviewDecision === 'approved'}
                      onChange={() => setReviewDecision('approved')}
                    />
                    Aprovar
                  </label>
                  <label className="flex items-center gap-1.5 font-bold text-rose-700">
                    <input
                      type="radio"
                      name="decision"
                      checked={reviewDecision === 'rejected'}
                      onChange={() => setReviewDecision('rejected')}
                    />
                    Recusar
                  </label>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Parecer / Observações do RH</label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:outline-hidden"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setReviewModalTarget(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmReview}
                  className={`rounded-xl px-4 py-2 font-bold text-white shadow-sm ${
                    reviewDecision === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Confirmar Decisão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
