import React from 'react';
import { LicenseStatus } from '../../types';
import { KeyRound, ShieldCheck, AlertTriangle, Building, Users, Server } from 'lucide-react';

interface LicenseViewProps { license: LicenseStatus }

export const LicenseView: React.FC<LicenseViewProps> = ({ license }) => {
  const active = license.status === 'active';
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Plano e acesso da empresa</h1>
        <p className="text-xs text-slate-500 mt-1">Resumo do limite operacional associado à empresa autenticada.</p>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 border border-blue-100"><KeyRound className="h-7 w-7" /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">{license.client_name}</h3>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>{active ? 'Acesso ativo' : 'Acesso suspenso'}</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">CNPJ: {license.client_cnpj}</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Identificador interno</span>
            <span className="text-sm font-mono font-bold text-blue-700 mt-0.5 block">{license.key}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1"><span>Empresas no contexto</span><Building className="h-4 w-4 text-blue-600" /></div>
            <div className="text-2xl font-black text-slate-900">{license.current_companies} / {license.max_companies}</div>
            <span className="text-[11px] text-slate-500">Este acesso está isolado por empresa.</span>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1"><span>Funcionários cadastrados</span><Users className="h-4 w-4 text-blue-600" /></div>
            <div className="text-2xl font-black text-slate-900">{license.current_employees} / {license.max_employees}</div>
            <span className="text-[11px] text-slate-500">Inclui os perfis ativos e administrativos.</span>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1"><span>Servidor</span><Server className="h-4 w-4 text-blue-600" /></div>
            <div className="text-sm font-bold text-slate-900 break-all mt-1">{license.hardware_lock_id}</div>
            <span className="text-[11px] text-slate-500">Referência técnica local.</span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-700" />
        <div>
          <p className="font-bold text-sm">Assinaturas e cobrança recorrente ainda não estão conectadas</p>
          <p className="mt-1 text-xs leading-relaxed">Este painel mostra o status de acesso interno, não confirma pagamento, contrato comercial, assinatura digital ou homologação legal. A cobrança só deve ser ativada após integrar um provedor, validar webhooks e definir planos e limites comerciais.</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-600 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5 text-blue-700" />
        <p className="text-xs leading-relaxed">Suspender um acesso não deve apagar registros de jornada já existentes. A política definitiva de retenção, exportação e atendimento a solicitações legais deve ser validada antes da operação comercial.</p>
      </section>
    </div>
  );
};
