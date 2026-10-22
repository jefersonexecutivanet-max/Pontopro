import React from 'react';
import { PunchReceipt } from '../../types';
import { getEventTypeName } from '../../domain/rep-p';
import { CheckCircle2, Copy, Printer, X, ShieldCheck } from 'lucide-react';

interface ReceiptModalProps {
  receipt: PunchReceipt | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, onClose }) => {
  if (!receipt) return null;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(receipt.sha256_hash);
    alert('Código Hash SHA-256 copiado para a área de transferência!');
  };

  const handlePrint = () => {
    window.print();
  };

  const dateObj = new Date(receipt.occurred_at);
  const formattedDate = dateObj.toLocaleDateString('pt-BR');
  const formattedTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Marcação Registrada com Sucesso
            </span>
            <h3 className="text-lg font-bold text-slate-900">
              Comprovante de Registro de Ponto
            </h3>
            <p className="text-xs text-slate-500">Conforme Portaria MTP nº 671/2021 (Art. 80 - REP-P)</p>
          </div>
        </div>

        {/* Receipt Ticket Body */}
        <div className="mt-5 space-y-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-5 font-mono text-xs text-slate-800">
          <div className="text-center pb-3 border-b border-dashed border-slate-300">
            <p className="font-bold text-sm tracking-wide text-slate-950 uppercase">{receipt.company_name}</p>
            <p className="text-slate-600 mt-0.5">CNPJ: {receipt.company_cnpj}</p>
            <p className="text-[10px] text-slate-500 mt-1">REGISTRO INPI (VALIDAÇÃO PENDENTE): {receipt.inpi_registration || 'Não informado'}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-500 block">COLABORADOR:</span>
              <span className="font-bold">{receipt.employee_name}</span>
            </div>
            <div>
              <span className="text-slate-500 block">CPF:</span>
              <span className="font-semibold">{receipt.employee_cpf}</span>
            </div>
            <div>
              <span className="text-slate-500 block">PIS / NIS:</span>
              <span className="font-semibold">{receipt.employee_pis}</span>
            </div>
            <div>
              <span className="text-slate-500 block">NSR (SEQUENCIAL):</span>
              <span className="font-bold text-indigo-700">#{String(receipt.nsr).padStart(6, '0')}</span>
            </div>
          </div>

          <div className="rounded-lg bg-emerald-100/70 p-3 text-center border border-emerald-200">
            <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
              {getEventTypeName(receipt.event_type)}
            </span>
            <div className="text-2xl font-extrabold text-slate-900 my-1">
              {formattedTime}
            </div>
            <span className="text-xs font-medium text-slate-600">
              Data: {formattedDate} (fuso de Brasília)
            </span>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-dashed border-slate-300 text-[10px]">
            <div>
              <span className="text-slate-500 block">CÓDIGO DE CONTROLE DO COMPROVANTE:</span>
              <span className="font-bold text-slate-900">{receipt.receipt_code}</span>
            </div>
            <div>
              <span className="text-slate-500 block">CÓDIGO INTERNO DE INTEGRIDADE:</span>
              <span className="font-mono text-slate-700">{receipt.signature}</span>
            </div>
            <div className="break-all">
              <span className="text-slate-500 block">HASH CRIPTOGRÁFICO SHA-256 (ENCADEADO):</span>
              <span className="text-slate-600 font-mono text-[9px]">{receipt.sha256_hash}</span>
            </div>
            {receipt.latitude !== undefined && receipt.longitude !== undefined && (
              <div className="pt-1.5 border-t border-dashed border-slate-300 flex items-center justify-between text-[10px]">
                <span className="text-slate-500 font-bold">COORDENADAS INFORMADAS PELO DISPOSITIVO:</span>
                <span className="font-mono text-slate-800 font-semibold">
                  Lat {receipt.latitude.toFixed(6)}, Lon {receipt.longitude.toFixed(6)}
                  {receipt.accuracy_meters !== undefined ? ` (±${receipt.accuracy_meters.toFixed(0)}m)` : ''}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>Este comprovante apresenta um hash interno. Ele não equivale, por si só, a uma assinatura digital ICP-Brasil nem comprova homologação oficial.</span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            onClick={handleCopyHash}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Copy className="h-4 w-4" />
            Copiar Hash
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
            <button
              onClick={onClose}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Concluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
