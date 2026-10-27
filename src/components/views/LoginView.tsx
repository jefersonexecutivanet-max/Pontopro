import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../services/api';
import { signIn } from '../../services/firebase-auth';
import { LegalDocuments, type LegalDocumentType } from '../common/LegalDocuments';

interface LoginViewProps {
  onLoginSuccess: (data: {
    employee?: any;
    owner?: any;
    company?: any;
    establishment?: any;
  }) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [legalDocument, setLegalDocument] = useState<LegalDocumentType | null>(null);

  const handleAuthenticate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Informe seu e-mail.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Informe sua senha.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // Autentica via Firebase Auth
      await signIn(email, password);

      // Após sucesso no Firebase, cria sessão no servidor
      const result = await api.login(email, password, true);
      onLoginSuccess(result);
    } catch (firebaseErr: any) {
      // Se o Firebase rejeitar as credenciais, tenta login direto via servidor
      // (útil para o proprietário configurado via variáveis de ambiente)
      if (firebaseErr?.code === 'auth/invalid-credential' || firebaseErr?.code === 'auth/wrong-password') {
        try {
          const result = await api.login(email, password, false);
          onLoginSuccess(result);
          return;
        } catch (serverErr: any) {
          setErrorMessage(
            serverErr?.message || 'Credenciais inválidas. Verifique os dados digitados e tente novamente.'
          );
        }
      } else {
        setErrorMessage(
          firebaseErr?.message || 'Credenciais inválidas. Verifique os dados digitados e tente novamente.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Clean Global Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white font-black text-lg">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base tracking-tight">PontoPro</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Sistema de controle de jornada
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 text-xs text-slate-400 font-medium">
            <span>Registro de jornada</span>
            <span aria-hidden="true" className="text-slate-600">|</span>
            <span>Acesso por perfil</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 lg:py-16 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center w-full">
          
          {/* Left Column: Hero & Value Proposition */}
          <div className="lg:col-span-7 space-y-8 order-2 lg:order-1">
            <div className="space-y-4">
              <p className="text-sm font-semibold text-blue-400">PontoPro · Controle de jornada</p>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
                Registre o ponto e acompanhe a jornada de trabalho em um só lugar.
              </h1>

              <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl">
                Registros de entrada e saída, consulta de jornadas, solicitações de correção e relatórios para a administração da empresa.
              </p>
            </div>

            {/* Key Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="border border-slate-800 bg-slate-900/60 rounded-2xl p-4">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Registros de jornada
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Consulte as marcações e os comprovantes vinculados ao seu acesso.
                </p>
              </div>

              <div className="border border-slate-800 bg-slate-900/60 rounded-2xl p-4">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-400" />
                  Geolocalização do dispositivo
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Quando habilitada, a localização ajuda a verificar a área definida pela empresa.
                </p>
              </div>

              <div className="border border-slate-800 bg-slate-900/60 rounded-2xl p-4">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Lock className="h-4 w-4 text-blue-400" />
                  Permissões por perfil
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  As telas e ações disponíveis dependem do perfil atribuído à conta.
                </p>
              </div>
            </div>

          </div>

          {/* Right Column: Clean Focused Login Card */}
          <div className="lg:col-span-5 order-1 lg:order-2">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 sm:p-8 shadow-xl">
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Acessar Plataforma
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Entre com seu e-mail e senha
                </p>
              </div>

              <div className="mb-5 rounded-md border border-slate-700 bg-slate-800 p-3 text-xs leading-relaxed text-slate-200">
                <strong className="block text-blue-100">Primeiro acesso à plataforma?</strong>
                Ainda não existe empresa ou funcionário até o proprietário configurar o sistema e cadastrar a primeira empresa.
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                  <span className="leading-snug">{errorMessage}</span>
                </div>
              )}

              {/* Login Form */}
              <form
                onSubmit={handleAuthenticate}
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                  >
                    E-mail
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      disabled={loading}
                      className="w-full rounded-md border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-xs font-medium text-white placeholder-slate-500 focus:border-blue-500 focus:outline-hidden transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-semibold text-slate-300"
                    >
                      Senha
                    </label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      disabled={loading}
                      className="w-full rounded-md border border-slate-800 bg-slate-950 pl-10 pr-10 py-2.5 text-xs font-medium text-white placeholder-slate-500 focus:border-blue-500 focus:outline-hidden transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                      aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-login-submit"
                  disabled={loading}
                  className="w-full mt-2 flex items-center justify-center gap-2 rounded-md bg-blue-600 hover:bg-blue-500 py-3 text-xs font-bold text-white transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                      <span>Autenticando...</span>
                    </>
                  ) : (
                    <>
                      <span>Entrar no Sistema</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
                <div className="mt-3 text-center">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!email.trim()) { setErrorMessage('Digite seu e-mail para redefinir a senha.'); return; }
                      try {
                        await resetPassword(email.trim());
                        setErrorMessage('');
                        setNotice('E-mail de redefinição de senha enviado para ' + email.trim());
                      } catch (err: any) {
                        setErrorMessage(err.message || 'Não foi possível enviar o e-mail de redefinição.');
                      }
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              </form>

            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-4 px-6 text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
          <p>PontoPro © {new Date().getFullYear()} · Sistema de controle de jornada</p>
          <nav aria-label="Documentos legais" className="flex flex-wrap items-center justify-center gap-4">
            <button type="button" onClick={() => setLegalDocument('privacy')} className="rounded-md px-2 py-1 text-slate-300 hover:text-white">Política de Privacidade</button>
            <button type="button" onClick={() => setLegalDocument('terms')} className="rounded-md px-2 py-1 text-slate-300 hover:text-white">Termos e Condições</button>
          </nav>
        </div>
      </footer>
      {legalDocument && <LegalDocuments type={legalDocument} onClose={() => setLegalDocument(null)} onChangeType={setLegalDocument} />}
    </div>
  );
};
