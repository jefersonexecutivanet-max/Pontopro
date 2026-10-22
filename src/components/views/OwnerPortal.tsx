import React, { useEffect, useState } from 'react';
import { Building2, ShieldCheck, LogOut, Plus, Power, RefreshCw, AlertCircle, CheckCircle2, Users, CreditCard, Check } from 'lucide-react';

type Company = { id: string; cnpj: string; corporate_name: string; trade_name: string; contact_email: string; active: boolean; created_at: string; license_key: string };
type Owner = { email: string };
type OwnerBillingSummary = { configured: boolean; environment: string; subscriptions: Array<{ id: string; company_id: string; company_name: string; plan_id: string; status: string; next_due_date?: string }> };
const TOKEN_KEY = 'pontopro_owner_token';
const OWNER_EMAIL_KEY = 'pontopro_owner_email';

async function request(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a operação.');
  return data;
}

export const OwnerPortal: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '');
  const [owner, setOwner] = useState<Owner | null>(() => {
    const email = sessionStorage.getItem(OWNER_EMAIL_KEY);
    return email ? { email } : null;
  });
  const [email, setEmail] = useState('finho60@hotmail.com');
  const [password, setPassword] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [billingSummary, setBillingSummary] = useState<OwnerBillingSummary | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ corporate_name: '', trade_name: '', cnpj: '', contact_email: '', address: '', radius_meters: '150', establishment_name: '', admin_name: '', admin_email: '', admin_password: '', employee_count: '', plan: 'Prata' });

  const loadCompanies = async (authToken: string) => {
    const list = await request('/api/owner/companies', authToken);
    setCompanies(list);
    try { setBillingSummary(await request('/api/owner/billing', authToken)); } catch { setBillingSummary(null); }
  };

  useEffect(() => {
    fetch('/api/owner/setup-status').then(r => r.json()).then(data => setConfigured(Boolean(data.configured))).catch(() => setError('Não foi possível conectar ao servidor.'));
  }, []);

  useEffect(() => {
    if (!token) return;
    loadCompanies(token).catch((e: Error) => {
      setError(e.message);
      setToken('');
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(OWNER_EMAIL_KEY);
    });
  }, [token]);

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(configured ? '/api/owner/login' : '/api/owner/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha na autenticação.');
      sessionStorage.setItem(TOKEN_KEY, data.token); sessionStorage.setItem(OWNER_EMAIL_KEY, data.owner.email);
      setToken(data.token); setOwner(data.owner); setConfigured(true); setPassword(''); setNotice('Acesso do proprietário confirmado.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro inesperado.'); }
    finally { setBusy(false); }
  };

  const createCompany = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const data = await request('/api/owner/companies', token, { method: 'POST', body: JSON.stringify(form) });
      setNotice(`Empresa cadastrada. Administrador: ${data.administrator.email}. Plano: ${form.plan}. A senha definida deve ser entregue com segurança ao administrador.`);
      setForm({ corporate_name: '', trade_name: '', cnpj: '', contact_email: '', address: '', radius_meters: '150', establishment_name: '', admin_name: '', admin_email: '', admin_password: '', employee_count: '', plan: 'Prata' });
      setShowForm(false); await loadCompanies(token);
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao cadastrar empresa.'); }
    finally { setBusy(false); }
  };

  const toggleCompany = async (company: Company) => {
    setError(''); setNotice('');
    try { await request(`/api/owner/companies/${company.id}/status`, token, { method: 'PATCH', body: JSON.stringify({ active: !company.active }) }); await loadCompanies(token); setNotice(`Acesso da empresa ${company.active ? 'suspenso' : 'reativado'}.`); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível alterar o status.'); }
  };

  const getPlanForEmployees = (count: number) => {
    if (count <= 100) return { name: 'Plano Prata', limit: 'Até 100 funcionários' };
    if (count <= 500) return { name: 'Plano Ouro', limit: 'Até 500 funcionários' };
    if (count <= 1000) return { name: 'Plano Diamante', limit: 'Até 1000 funcionários' };
    return { name: 'Plano Diamante', limit: 'Acima de 1000 funcionários' };
  };

  const field = (key: keyof typeof form, label: string, placeholder: string, type = 'text', required = true) => (
    <label className="block text-sm font-semibold leading-5 text-slate-800">{label}<input required={required} type={type} step={type === 'number' ? 'any' : undefined} value={form[key]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} placeholder={placeholder} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-950 placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" /></label>
  );

  const logout = () => {
    setToken('');
    setOwner(null);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(OWNER_EMAIL_KEY);
    onExit();
  };
  const employeeCountNum = Number((form as any).employee_count) || 0;
  const suggestedPlan = employeeCountNum > 0 ? getPlanForEmployees(employeeCountNum) : null;

  if (!token || !owner) return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <form onSubmit={submitAuth} className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-7 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-blue-600 p-3"><ShieldCheck /></div>
          <div>
            <h1 className="text-xl font-black">PontoPro · Proprietário</h1>
            <p className="text-xs text-slate-400">Acesso exclusivo à gestão das empresas</p>
          </div>
        </div>
        {error && <p role="alert" className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
        <label className="block text-xs font-semibold text-slate-300">E-mail do proprietário
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white" />
        </label>
        <label className="mt-4 block text-xs font-semibold text-slate-300">{configured ? 'Senha do proprietário' : 'Crie a senha do proprietário'}
          <input type="password" required minLength={12} value={password} onChange={e => setPassword(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white" placeholder="Mínimo de 12 caracteres" />
        </label>
        {!configured && <p className="mt-3 text-xs leading-relaxed text-amber-300">Primeiro acesso: esta senha será armazenada como hash no servidor. Guarde-a com segurança; não existe senha padrão.</p>}
        <button disabled={busy || configured === null} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold hover:bg-blue-500 disabled:opacity-50">
          {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{configured ? 'Entrar como proprietário' : 'Configurar proprietário'}
        </button>
        <button type="button" onClick={onExit} className="mt-3 w-full py-2 text-xs text-slate-400 hover:text-white">Voltar</button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-600 p-2.5"><ShieldCheck /></div>
            <div>
              <h1 className="font-black">PontoPro · Painel do proprietário</h1>
              <p className="text-xs text-slate-400">Gestão central de empresas e acessos</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-400 sm:inline">{owner.email}</span>
            <button onClick={logout} className="flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs hover:bg-slate-800"><LogOut className="h-4 w-4" />Sair</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs text-slate-500">Empresas cadastradas</p>
            <p className="mt-2 text-3xl font-black">{companies.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs text-slate-500">Acessos ativos</p>
            <p className="mt-2 text-3xl font-black text-emerald-600">{companies.filter(c => c.active).length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs text-slate-500">Acessos suspensos</p>
            <p className="mt-2 text-3xl font-black text-amber-600">{companies.filter(c => !c.active).length}</p>
          </div>
        </div>
        {billingSummary && <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-black text-slate-900">Assinaturas e cobrança</h2><p className="mt-1 text-sm text-slate-600">Status recebido do registro interno de assinaturas; pagamento só é confirmado pelo webhook validado.</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${billingSummary.configured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{billingSummary.configured ? 'Integração configurada' : 'Integração não configurada'}</span></div>
          <p className="mt-2 text-xs text-slate-500">Ambiente: {billingSummary.environment === 'production' ? 'produção' : 'sandbox/testes'} · {billingSummary.subscriptions.length} assinatura(s) registrada(s)</p>
          {billingSummary.subscriptions.length > 0 && <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs text-slate-500"><th className="py-2">Empresa</th><th>Plano</th><th>Status</th><th>Vencimento</th></tr></thead><tbody>{billingSummary.subscriptions.map(sub => <tr key={sub.id} className="border-b border-slate-100"><td className="py-3 font-semibold text-slate-800">{sub.company_name}</td><td className="capitalize">{sub.plan_id}</td><td>{({ pending: 'Aguardando pagamento', active: 'Ativa', past_due: 'Em atraso', canceling: 'Cancelamento solicitado', canceled: 'Cancelada', inactive: 'Inativa' } as Record<string, string>)[sub.status] || sub.status}</td><td>{sub.next_due_date || '—'}</td></tr>)}</tbody></table></div>}
        </section>}
        {showForm && (
          <form onSubmit={createCompany} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {field('corporate_name', 'Razão social', 'Ex.: Ltda')}
              {field('trade_name', 'Nome fantasia', 'Ex.: Ponto da Rua')}
              {field('cnpj', 'CNPJ', 'Ex.: 00.000.000/0001-00')}
              {field('contact_email', 'E-mail de contato', 'contato@empresa.com.br', 'email')}
              {field('address', 'Endereço/CEP da filial', 'Av., nº, bairro, cidade/UF, CEP')}
              <label className="block text-sm font-semibold leading-5 text-slate-800">Plano de cadastro
                <select value={form.plan} onChange={e => setForm(prev => ({ ...prev, plan: e.target.value }))} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-950 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100">
                  <option value="Prata">Plano Prata (até 100 funcionários · R$ 149,90/mês)</option>
                  <option value="Ouro">Plano Ouro (até 500 funcionários · R$ 399,90/mês)</option>
                  <option value="Diamante">Plano Diamante (até 1000 funcionários · R$ 699,90/mês)</option>
                </select>
              </label>
              {field('radius_meters', 'Raio da cerca virtual (metros)', 'Ex.: 150', 'number')}
              {field('establishment_name', 'Nome da matriz/filial', 'Matriz')}
              {field('admin_name', 'Nome do administrador', 'Nome completo')}
              {field('admin_email', 'E-mail de acesso', 'admin@empresa.com.br', 'email')}
              {field('admin_password', 'Senha inicial (mín. 12 caracteres)', 'Crie uma senha forte', 'password')}
              {field('employee_count' as any, 'Quantidade estimada de funcionários', 'Ex.: 50', 'number')}
            </div>
            {suggestedPlan && <div className="sm:col-span-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"><strong>Plano sugerido:</strong> {suggestedPlan.name} ({suggestedPlan.limit})</div>}
            <div className="sm:col-span-2"><button disabled={busy} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Salvando...' : 'Cadastrar empresa e liberar acesso'}</button></div>
          </form>
        )}
        <button type="button" onClick={() => setShowForm(!showForm)} className={!showForm ? 'rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-500' : 'rounded-xl bg-slate-200 px-5 py-3 text-sm font-bold text-slate-900'}>
          {!showForm ? 'Cadastrar empresa' : 'Cancelar cadastro'}
        </button>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] table-auto text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="pb-3 font-semibold">Empresa</th>
                <th className="pb-3 font-semibold text-right">Status</th>
                <th className="pb-3 font-semibold text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id} className="border-b border-slate-100">
                  <td className="py-3">{company.trade_name}</td>
                  <td className="py-3 text-right">{company.active ? <span className="text-emerald-600 font-semibold">Ativo</span> : <span className="text-amber-600 font-semibold">Suspenso</span>}</td>
                  <td className="py-3 text-right"><button onClick={() => toggleCompany(company)} className="text-xs text-blue-600 hover:underline">{company.active ? 'Suspender' : 'Reativar'}</button></td>
                </tr>
              ))}
              {companies.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-slate-400 text-sm">Nenhuma empresa cadastrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};
