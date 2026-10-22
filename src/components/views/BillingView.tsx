import React, { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, ExternalLink, LoaderCircle, ShieldAlert, XCircle } from 'lucide-react';
import { api } from '../../services/api';

type Plan = { id: 'prata' | 'ouro' | 'diamante'; name: string; price_cents: number; max_employees: number };
type BillingInfo = { plan: Plan; subscription: null | { id: string; plan_id: Plan['id']; status: string; next_due_date?: string; checkout_url?: string }; billing_configured: boolean; environment: string };
const plans: Plan[] = [
  { id: 'prata', name: 'Prata', price_cents: 14990, max_employees: 100 },
  { id: 'ouro', name: 'Ouro', price_cents: 39990, max_employees: 500 },
  { id: 'diamante', name: 'Diamante', price_cents: 69990, max_employees: 1000 },
];
const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
const statusLabel: Record<string, string> = { pending: 'Aguardando primeiro pagamento', active: 'Ativa', past_due: 'Pagamento em atraso', canceling: 'Cancelamento solicitado', canceled: 'Cancelada', inactive: 'Inativa' };

export const BillingView: React.FC = () => {
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const refresh = async () => { setError(''); try { setInfo(await api.getBillingSubscription()); } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao carregar assinatura.'); } };
  useEffect(() => { void refresh(); }, []);
  const subscribe = async (plan: Plan['id']) => {
    setBusy(true); setError(''); setNotice('');
    try { const result = await api.createBillingSubscription(plan, 'BOLETO'); setInfo(await api.getBillingSubscription()); setNotice(result.message || 'Assinatura criada. Use o link da cobrança exibido abaixo para concluir o primeiro pagamento.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Falha ao iniciar assinatura.'); }
    finally { setBusy(false); }
  };
  const cancel = async () => {
    if (!window.confirm('Deseja solicitar o cancelamento da assinatura?')) return;
    setBusy(true); setError(''); setNotice('');
    try { const result = await api.cancelBillingSubscription(); setNotice(result.message || 'Cancelamento solicitado.'); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Falha ao cancelar assinatura.'); }
    finally { setBusy(false); }
  };
  const current = info?.subscription;
  return <div className="space-y-6">
    <header><p className="text-sm font-semibold text-blue-700">PONTOPRO · ASSINATURA</p><h1 className="mt-1 text-2xl font-black text-slate-900">Plano e cobrança</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Gerencie o plano da empresa. O acesso pago só é confirmado após o provedor confirmar o pagamento por webhook autenticado.</p></header>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}
    {info && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">Situação da assinatura</h2><p className="mt-1 text-sm text-slate-600">Plano cadastrado: {info.plan.name} · Até {info.plan.max_employees} funcionários</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${current?.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{current ? statusLabel[current.status] || current.status : 'Sem assinatura contratada'}</span></div>
      {current && <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Plano contratado</p><p className="font-bold text-slate-900">{plans.find(p => p.id === current.plan_id)?.name || current.plan_id}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Próximo vencimento informado</p><p className="font-bold text-slate-900">{current.next_due_date || 'Aguardando confirmação do provedor'}</p></div></div>}
      {!info.billing_configured && <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />Cobrança ainda não configurada no servidor. Nenhum pagamento será iniciado até que as credenciais do Asaas e o token do webhook sejam configurados.</p>}
      {current?.checkout_url && current.status === 'pending' && <a className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white" href={current.checkout_url} target="_blank" rel="noreferrer">Abrir cobrança <ExternalLink className="h-4 w-4" /></a>}
      {current && ['pending', 'active', 'past_due', 'canceling'].includes(current.status) && <button disabled={busy || current.status === 'canceling'} onClick={() => void cancel()} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-700 disabled:opacity-50"><XCircle className="h-4 w-4" />Solicitar cancelamento</button>}
    </section>}
    <section><div className="mb-3"><h2 className="text-lg font-bold text-slate-900">Planos disponíveis</h2><p className="text-sm text-slate-600">Valores mensais definidos para o lançamento inicial.</p></div><div className="grid gap-4 lg:grid-cols-3">{plans.map(plan => <article key={plan.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${info?.plan.id === plan.id ? 'border-blue-500 ring-1 ring-blue-100' : 'border-slate-200'}`}><div className="flex items-center justify-between"><h3 className="text-lg font-black text-slate-900">{plan.name}</h3><CreditCard className="h-5 w-5 text-blue-600" /></div><p className="mt-3 text-2xl font-black text-slate-900">{money(plan.price_cents)}<span className="text-sm font-medium text-slate-500">/mês</span></p><p className="mt-1 text-sm text-slate-600">Até {plan.max_employees.toLocaleString('pt-BR')} funcionários ativos</p><ul className="mt-4 space-y-2 text-sm text-slate-700"><li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Controle de ponto e relatórios</li><li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Dados separados por empresa</li></ul><button disabled={busy || !info?.billing_configured || Boolean(current && ['pending','active','past_due','canceling'].includes(current.status))} onClick={() => void subscribe(plan.id)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}{current ? 'Já existe assinatura' : 'Contratar plano'}</button></article>)}</div></section>
    <p className="text-xs leading-relaxed text-slate-500">Ambiente atual: {info?.environment === 'production' ? 'produção' : 'sandbox/testes'}. Esta tela não representa contrato digital nem comprova homologação legal do sistema.</p>
  </div>;
};
