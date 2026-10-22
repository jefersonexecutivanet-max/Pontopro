import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Zap,
  X,
  RefreshCw,
  CheckCheck,
  Check,
  Clock,
  FileCheck2,
  Download,
  Plus,
  ArrowRight,
  ShieldCheck,
  Wifi,
  WifiOff,
  ChevronUp,
  Layers,
  AlertTriangle,
  AlertCircle,
  Users,
  ShieldAlert,
  Info,
  Calendar,
} from 'lucide-react';
import { CorrectionRequest, Employee } from '../../types';
import { getEventTypeName } from '../../domain/rep-p';
import { NavTabId } from '../layout/Sidebar';
import {
  canUserApproveCorrections,
  getQuickActionsSummary,
  formatPendingCorrectionsSummary,
  validateBatchApproval,
  validateOfflineSync,
} from '../../domain/quick-actions';

interface QuickActionsFloatingMenuProps {
  currentEmployee: Employee | null;
  pendingCorrections: CorrectionRequest[];
  employees: Employee[];
  pendingOfflineCount: number;
  isSyncing: boolean;
  isOnline: boolean;
  isSimulatedOffline: boolean;
  onSyncOffline: () => Promise<void>;
  onApproveCorrection: (id: string) => Promise<void>;
  onApproveAllCorrections: () => Promise<void>;
  onNavigateTab: (tab: NavTabId) => void;
  onDownloadAfd: () => void;
  onSimulateTestOfflinePunch?: () => void;
}

type MenuSection = 'overview' | 'corrections' | 'sync' | 'shortcuts';

interface FeedbackState {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export const QuickActionsFloatingMenu: React.FC<QuickActionsFloatingMenuProps> = ({
  currentEmployee,
  pendingCorrections,
  employees,
  pendingOfflineCount,
  isSyncing,
  isOnline,
  isSimulatedOffline,
  onSyncOffline,
  onApproveCorrection,
  onApproveAllCorrections,
  onNavigateTab,
  onDownloadAfd,
  onSimulateTestOfflinePunch,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [activeSection, setActiveSection] = useState<MenuSection>('overview');
  const [isApprovingAll, setIsApprovingAll] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [showConfirmBatchModal, setShowConfirmBatchModal] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Authorization check based on RBAC rules for REP-P
  const userRole = currentEmployee?.role;
  const canApprove = canUserApproveCorrections(userRole);

  const isActuallyOnline = isOnline && !isSimulatedOffline;

  // Domain summary calculation
  const summary = getQuickActionsSummary({
    pendingCorrectionsCount: pendingCorrections.length,
    pendingOfflineCount,
    isOnline: isActuallyOnline,
    isSyncing,
    userRole,
  });

  const correctionsSummary = formatPendingCorrectionsSummary(pendingCorrections);
  const isExpanded = isHovered || isOpen;

  // Clear timeouts
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  const showFeedback = useCallback((type: 'success' | 'error' | 'info', title: string, message: string) => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    setFeedback({ type, title, message });
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null);
    }, 6000);
  }, []);

  // Hover handlers with debounce to prevent flickering
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 250);
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsHovered(false);
        setShowConfirmBatchModal(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on ESC key with keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showConfirmBatchModal) {
          setShowConfirmBatchModal(false);
        } else {
          setIsOpen(false);
          setIsHovered(false);
        }
      }
    };
    if (isOpen || isHovered) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isHovered, showConfirmBatchModal]);

  // Execute single correction approval
  const handleApproveSingle = async (id: string, employeeName: string) => {
    if (!canApprove) {
      showFeedback('error', 'Ação Não Autorizada', 'Seu perfil de acesso não tem permissão para aprovar ocorrências.');
      return;
    }
    if (approvingId !== null || isApprovingAll) return;

    setApprovingId(id);
    try {
      await onApproveCorrection(id);
      showFeedback('success', 'Ajuste Aprovado', `Correção de ${employeeName} deferida com sucesso.`);
    } catch (err: any) {
      showFeedback('error', 'Falha ao Aprovar', err.message || 'Erro ao comunicar com o servidor.');
    } finally {
      setApprovingId(null);
    }
  };

  // Request batch approval with mandatory confirmation
  const handleInitiateBatchApproval = () => {
    const validation = validateBatchApproval(pendingCorrections, userRole);
    if (!validation.allowed) {
      showFeedback('error', 'Não Permitido', validation.reason || 'Operação não autorizada.');
      return;
    }
    setShowConfirmBatchModal(true);
  };

  // Confirm and execute batch approval
  const handleConfirmBatchApproval = async () => {
    const countToApprove = pendingCorrections.length;
    setIsApprovingAll(true);
    setShowConfirmBatchModal(false);

    try {
      await onApproveAllCorrections();
      showFeedback(
        'success',
        'Aprovação em Lote Concluída',
        `${countToApprove} ocorrência(s) deferida(s) com registro de auditoria.`
      );
    } catch (err: any) {
      showFeedback('error', 'Erro na Operação', err.message || 'Não foi possível aprovar os ajustes.');
    } finally {
      setIsApprovingAll(false);
    }
  };

  // Execute offline sync
  const handleSyncOfflinePunches = async () => {
    const validation = validateOfflineSync(pendingOfflineCount, isActuallyOnline, isSyncing);
    if (!validation.canSync) {
      showFeedback('info', 'Sincronização Indisponível', validation.reason || 'Não é possível sincronizar no momento.');
      return;
    }

    try {
      await onSyncOffline();
      showFeedback(
        'success',
        'Solicitação processada',
        'Confira o aviso do painel para confirmar se todos os registros foram sincronizados ou se ainda existem pendências.'
      );
    } catch (err: any) {
      showFeedback('error', 'Erro ao Sincronizar', err.message || 'Falha na transmissão do lote offline.');
    }
  };

  return (
    <aside
      aria-label="Menu de Ações Rápidas do Administrador"
      ref={menuRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end select-none"
    >
      {/* 1. Main Modal / Popover Viewport Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-actions-panel-title"
          className="mb-3 w-[calc(100vw-2rem)] sm:w-[450px] max-w-[480px] max-h-[84vh] rounded-2xl sm:rounded-3xl border border-slate-700/80 bg-slate-950/95 text-slate-100 shadow-[0_20px_60px_-15px_rgba(2,6,23,0.85),0_0_20px_rgba(37,99,235,0.15)] backdrop-blur-2xl ring-1 ring-white/10 animate-in fade-in slide-in-from-bottom-4 duration-200 overflow-hidden flex flex-col"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-800/80 px-4 sm:px-5 py-3.5 bg-slate-900">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/30 shrink-0">
                <Zap className="h-5 w-5 fill-white text-white drop-shadow-xs" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 id="quick-actions-panel-title" className="text-sm font-black text-white tracking-tight truncate">
                    Ações Rápidas
                  </h2>
                  <span className="rounded-md bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-400/30 whitespace-nowrap">
                    {canApprove ? 'Gestão & RH' : 'Consulta'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  Operações imediatas • REP-P Portaria 671
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
                title="Fechar painel (Esc)"
                aria-label="Fechar painel de ações rápidas"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Section Navigation Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-800/80 bg-slate-900/60 px-3 py-1.5 overflow-x-auto scrollbar-none text-xs">
            <button
              onClick={() => setActiveSection('overview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[11px] whitespace-nowrap transition-colors ${
                activeSection === 'overview'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Visão Geral</span>
            </button>

            <button
              onClick={() => setActiveSection('corrections')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[11px] whitespace-nowrap transition-colors ${
                activeSection === 'corrections'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              <span>Ajustes</span>
              {pendingCorrections.length > 0 && (
                <span className="rounded-full bg-rose-500 text-white px-1.5 py-0.2 text-[9px] font-black">
                  {pendingCorrections.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSection('sync')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[11px] whitespace-nowrap transition-colors ${
                activeSection === 'sync'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Offline</span>
              {pendingOfflineCount > 0 && (
                <span className="rounded-full bg-amber-400 text-slate-950 px-1.5 py-0.2 text-[9px] font-black">
                  {pendingOfflineCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSection('shortcuts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[11px] whitespace-nowrap transition-colors ${
                activeSection === 'shortcuts'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Atalhos</span>
            </button>
          </div>

          {/* In-Panel Feedback Notification Toast */}
          {feedback && (
            <div
              role="alert"
              className={`mx-4 mt-3 flex items-start justify-between gap-2.5 rounded-xl p-3 text-xs border animate-in fade-in duration-150 ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                  : feedback.type === 'error'
                  ? 'bg-rose-950/80 border-rose-500/40 text-rose-200'
                  : 'bg-blue-950/80 border-blue-500/40 text-blue-200'
              }`}
            >
              <div className="flex items-start gap-2">
                {feedback.type === 'success' && <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />}
                {feedback.type === 'error' && <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />}
                {feedback.type === 'info' && <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />}
                <div>
                  <strong className="block font-bold">{feedback.title}</strong>
                  <p className="text-[11px] opacity-90 leading-tight mt-0.5">{feedback.message}</p>
                </div>
              </div>
              <button
                onClick={() => setFeedback(null)}
                className="text-slate-400 hover:text-white p-0.5"
                aria-label="Fechar mensagem"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Confirmation Overlay for Batch Approval */}
          {showConfirmBatchModal && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-batch-title"
              className="p-4 bg-slate-900 border-b border-slate-800 text-xs space-y-3 animate-in fade-in duration-200"
            >
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 id="confirm-batch-title" className="font-bold text-white text-sm">
                    Confirmar Aprovação de {pendingCorrections.length} Ocorrência(s)?
                  </h3>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Esta ação deferirá em lote todos os ajustes pendentes com parecer formal registrado sob o usuário{' '}
                    <strong className="text-white">{currentEmployee?.name || 'Gestor'}</strong> para fins de auditoria
                    da Portaria MTP 671/2021.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfirmBatchModal(false)}
                  disabled={isApprovingAll}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 font-semibold text-slate-300 hover:bg-slate-700 hover:text-white text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBatchApproval}
                  disabled={isApprovingAll}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 font-bold text-white text-xs transition-all shadow-md shadow-emerald-900/40 disabled:opacity-50"
                >
                  {isApprovingAll ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCheck className="h-4 w-4" />
                      <span>Confirmar Aprovação ({pendingCorrections.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Main Body Content Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Permission warning banner if current role cannot approve */}
            {!canApprove && (
              <div className="flex items-start gap-2.5 rounded-xl bg-slate-900/90 border border-slate-800 p-3 text-xs text-slate-300">
                <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300 block text-[11px]">Perfil em Modo Consulta</span>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Seu usuário ({currentEmployee?.name}) está autenticado como <strong>{userRole}</strong>. Funções de
                    aprovação em lote e revisão são restritas a Gestores e Administradores.
                  </p>
                </div>
              </div>
            )}

            {/* TAB: VISÃO GERAL */}
            {activeSection === 'overview' && (
              <div className="space-y-4">
                {/* Status KPI Summary Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* KPI 1: Ajustes */}
                  <div
                    onClick={() => setActiveSection('corrections')}
                    className={`cursor-pointer rounded-2xl p-3 border transition-all ${
                      pendingCorrections.length > 0
                        ? 'bg-rose-950/30 border-rose-800/40 hover:border-rose-700/60'
                        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Ajustes RH</span>
                      <FileCheck2 className={`h-4 w-4 ${pendingCorrections.length > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-white font-mono tabular-nums">
                      {pendingCorrections.length}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {pendingCorrections.length > 0 ? 'Requer atenção imediata' : 'Tudo regularizado'}
                    </span>
                  </div>

                  {/* KPI 2: Fila Offline */}
                  <div
                    onClick={() => setActiveSection('sync')}
                    className={`cursor-pointer rounded-2xl p-3 border transition-all ${
                      pendingOfflineCount > 0
                        ? 'bg-amber-950/30 border-amber-800/40 hover:border-amber-700/60'
                        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Fila Offline</span>
                      <RefreshCw className={`h-4 w-4 ${pendingOfflineCount > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-white font-mono tabular-nums">
                      {pendingOfflineCount}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {pendingOfflineCount > 0 ? 'Aguardando sincronização' : 'Nenhum item na fila local'}
                    </span>
                  </div>
                </div>

                {/* Quick 1-Click Operations Card */}
                <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-3.5 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">Ações Rápidas Disponíveis</span>
                    <span className="text-[10px] text-slate-400">{summary.statusText}</span>
                  </div>

                  {/* Batch Approve Button */}
                  <button
                    type="button"
                    onClick={handleInitiateBatchApproval}
                    disabled={!canApprove || isApprovingAll || pendingCorrections.length === 0}
                    className={`w-full flex items-center justify-between gap-2 rounded-xl p-3 text-xs font-bold transition-all ${
                      canApprove && pendingCorrections.length > 0
                        ? 'bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-600'
                        : 'bg-slate-800/60 text-slate-500 cursor-not-allowed border border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1 rounded-lg bg-white/15">
                        <CheckCheck className={`h-4 w-4 `} />
                      </div>
                      <div className="text-left">
                        <span className="block leading-tight">
                          {isApprovingAll ? 'Aprovando todas...' : 'Aprovar Todas as Ocorrências'}
                        </span>
                        <span className="text-[10px] opacity-80 font-normal">
                          {pendingCorrections.length > 0
                            ? `${pendingCorrections.length} solicitação(ões) em 1 clique com confirmação`
                            : 'Nenhuma pendência para aprovar'}
                        </span>
                      </div>
                    </div>
                    {pendingCorrections.length > 0 && (
                      <span className="rounded-full bg-slate-950/80 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
                        {pendingCorrections.length}
                      </span>
                    )}
                  </button>

                  {/* Offline Sync Button */}
                  <button
                    type="button"
                    onClick={handleSyncOfflinePunches}
                    disabled={isSyncing || pendingOfflineCount === 0 || !isActuallyOnline}
                    className={`w-full flex items-center justify-between gap-2 rounded-xl p-3 text-xs font-bold transition-all ${
                      pendingOfflineCount > 0 && isActuallyOnline && !isSyncing
                        ? 'bg-blue-700 hover:bg-blue-600 text-white border border-blue-600'
                        : 'bg-slate-800/60 text-slate-500 cursor-not-allowed border border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1 rounded-lg bg-white/15">
                        <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      </div>
                      <div className="text-left">
                        <span className="block leading-tight">
                          {isSyncing
                            ? 'Sincronizando lote...'
                            : pendingOfflineCount > 0
                            ? 'Sincronizar Fila Offline'
                            : 'Fila Totalmente Sincronizada'}
                        </span>
                        <span className="text-[10px] opacity-80 font-normal">
                          {pendingOfflineCount > 0
                            ? `${pendingOfflineCount} batida(s) gravada(s) localmente`
                            : 'Sem pendências de rede'}
                        </span>
                      </div>
                    </div>
                    {pendingOfflineCount > 0 && (
                      <span className="rounded-full bg-slate-950/80 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300">
                        {pendingOfflineCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Connection status strip */}
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/40 border border-slate-800 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    {isActuallyOnline ? (
                      <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <Wifi className="h-3.5 w-3.5" /> Conexão online com servidor
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                        <WifiOff className="h-3.5 w-3.5" /> Modo sem internet (fila segura)
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-slate-500">Idempotência SHA-256</span>
                </div>
              </div>
            )}

            {/* TAB: AJUSTES & CORREÇÕES */}
            {activeSection === 'corrections' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Ajustes & Justificativas de Ponto</span>
                    <span className="text-[10px] text-slate-400">
                      {correctionsSummary.total} pendência(s) de {correctionsSummary.uniqueEmployees} colaborador(es)
                    </span>
                  </div>

                  {canApprove && pendingCorrections.length > 0 && (
                    <button
                      type="button"
                      onClick={handleInitiateBatchApproval}
                      disabled={isApprovingAll}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      <span>Aprovar Todos ({pendingCorrections.length})</span>
                    </button>
                  )}
                </div>

                {pendingCorrections.length === 0 ? (
                  <div className="rounded-2xl bg-slate-900/40 border border-slate-800 p-6 text-center space-y-1.5">
                    <Check className="h-8 w-8 text-emerald-400 mx-auto mb-1" />
                    <p className="text-xs font-bold text-white">Todas as Ocorrências em Dia</p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      Não há solicitações de ajuste pendentes no momento. As marcações originais seguem imutáveis.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {pendingCorrections.map((corr) => {
                      const emp = employees.find((e) => e.id === corr.employee_id);
                      const isApprovingThis = approvingId === corr.id;

                      return (
                        <div
                          key={corr.id}
                          className="flex items-center justify-between gap-3 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 p-3 text-xs transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white truncate text-xs">
                                {emp?.name || 'Colaborador'}
                              </span>
                              <span className="text-[10px] font-semibold text-blue-400 uppercase">
                                • {getEventTypeName(corr.requested_event_type)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              <span>
                                {corr.requested_date} às {corr.requested_time}
                              </span>
                              <span>•</span>
                              <span className="truncate italic text-slate-300 max-w-[200px]" title={corr.reason}>
                                "{corr.reason}"
                              </span>
                            </div>
                          </div>

                          {canApprove ? (
                            <button
                              type="button"
                              onClick={() => handleApproveSingle(corr.id, emp?.name || 'Colaborador')}
                              disabled={isApprovingThis || isApprovingAll}
                              className="flex items-center gap-1.5 shrink-0 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white px-3 py-1.5 text-xs font-bold border border-emerald-500/30 transition-all disabled:opacity-50"
                              title="Aprovar este ajuste em 1 clique"
                            >
                              {isApprovingThis ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                              <span>Aprovar</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">Pendente</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="pt-1 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onNavigateTab('corrections');
                    }}
                    className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1"
                  >
                    <span>Abrir central completa de ocorrências</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB: SINCRONIZAÇÃO OFFLINE */}
            {activeSection === 'sync' && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Sincronização de Marcações Offline</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isActuallyOnline ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {isActuallyOnline ? 'Conectado' : 'Sem Internet'}
                  </span>
                </div>

                <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-300 font-semibold">Status da Fila Local</span>
                      <span className="font-mono text-sm font-bold text-white tabular-nums">
                        {pendingOfflineCount} registro(s)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {pendingOfflineCount > 0
                        ? `Há ${pendingOfflineCount} batida(s) de ponto gravada(s) com carimbo original de ocorrência e chave criptográfica aguardando envio.`
                        : 'Todas as batidas de ponto foram sincronizadas e registradas no NSR central.'}
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={handleSyncOfflinePunches}
                      disabled={isSyncing || pendingOfflineCount === 0 || !isActuallyOnline}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-bold transition-all ${
                        pendingOfflineCount > 0 && isActuallyOnline && !isSyncing
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-950/40'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>
                        {isSyncing
                          ? 'Sincronizando lote...'
                          : pendingOfflineCount > 0
                          ? 'Sincronizar Fila Agora'
                          : 'Fila Sincronizada'}
                      </span>
                    </button>

                    {onSimulateTestOfflinePunch && (
                      <button
                        type="button"
                        onClick={onSimulateTestOfflinePunch}
                        title="Simular 1 marcação na fila para teste de sincronização"
                        className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                      >
                        + Simular Batida
                      </button>
                    )}
                  </div>
                </div>

                {/* Audit & Legal info */}
                <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p>
                    <strong>Conformidade Portaria 671:</strong> O registro preserva tanto a hora real em que o trabalhador
                    bateu o ponto (<code className="text-slate-300">occurred_at</code>) quanto o horário da sincronização
                    no servidor, garantindo total integridade jurídica.
                  </p>
                </div>
              </div>
            )}

            {/* TAB: ATALHOS RÁPIDOS */}
            {activeSection === 'shortcuts' && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-white block">Atalhos para Módulos Administrativos</span>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onDownloadAfd();
                    }}
                    className="flex items-center gap-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 p-3 text-left font-semibold text-slate-200 transition-all"
                  >
                    <Download className="h-4 w-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-xs block font-bold text-white">Exportar AFD</span>
                      <span className="text-[10px] text-slate-400">Arquivo oficial .txt</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onNavigateTab('employees');
                    }}
                    className="flex items-center gap-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 p-3 text-left font-semibold text-slate-200 transition-all"
                  >
                    <Plus className="h-4 w-4 text-blue-400 shrink-0" />
                    <div>
                      <span className="text-xs block font-bold text-white">Funcionários</span>
                      <span className="text-[10px] text-slate-400">Cadastrar e gerenciar</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onNavigateTab('punch');
                    }}
                    className="flex items-center gap-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 p-3 text-left font-semibold text-slate-200 transition-all"
                  >
                    <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="text-xs block font-bold text-white">Bater Ponto</span>
                      <span className="text-[10px] text-slate-400">Quiosque de registro</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onNavigateTab('timesheet');
                    }}
                    className="flex items-center gap-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 p-3 text-left font-semibold text-slate-200 transition-all"
                  >
                    <Calendar className="h-4 w-4 text-indigo-400 shrink-0" />
                    <div>
                      <span className="text-xs block font-bold text-white">Espelho de Ponto</span>
                      <span className="text-[10px] text-slate-400">Apuração de jornada</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onNavigateTab('compliance');
                    }}
                    className="col-span-2 flex items-center gap-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 p-3 text-left font-semibold text-slate-200 transition-all"
                  >
                    <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0" />
                    <div>
                      <span className="text-xs block font-bold text-white">Painel de Conformidade e Auditoria</span>
                      <span className="text-[10px] text-slate-400">Portaria 671, encadeamento SHA-256 e LGPD</span>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar with status & shortcut hints */}
          <div className="border-t border-slate-800 px-4 py-2.5 bg-slate-950/80 text-[10px] text-slate-400 flex items-center justify-between">
            <span className="truncate">Ações rápidas • validação regulatória pendente</span>
            <span className="hidden sm:inline font-mono text-slate-500">Pressione Esc para fechar</span>
          </div>
        </div>
      )}

      {/* 2. Speed-Dial Stack on Hover (when menu panel is closed) */}
      {!isOpen && (
        <div
          className={`flex flex-col items-end gap-2 mb-2 transition-all duration-200 origin-bottom ${
            isExpanded
              ? 'opacity-100  pointer-events-auto'
              : 'opacity-0  pointer-events-none'
          }`}
          aria-label="Atalhos Rápidos"
        >
          {/* Quick Action 1: Batch approve pending */}
          {pendingCorrections.length > 0 && canApprove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(true);
                setShowConfirmBatchModal(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-slate-900/95 hover:bg-slate-850 text-emerald-300 border border-emerald-500/40 px-3.5 py-2 text-xs font-bold shadow-lg shadow-slate-950/40 transition-transform"
              title="Aprovar todas as correções pendentes"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Aprovar {pendingCorrections.length} ajuste(s)</span>
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-black text-slate-950">
                {pendingCorrections.length}
              </span>
            </button>
          )}

          {/* Quick Action 2: Offline sync */}
          {pendingOfflineCount > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSyncOfflinePunches();
              }}
              disabled={isSyncing || !isActuallyOnline}
              className="flex items-center gap-2 rounded-xl bg-slate-900/95 hover:bg-slate-850 text-blue-300 border border-blue-500/40 px-3.5 py-2 text-xs font-bold shadow-lg shadow-slate-950/40 transition-transform disabled:opacity-50"
              title="Sincronizar fila offline"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sincronizar {pendingOfflineCount} offline</span>
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-slate-950">
                {pendingOfflineCount}
              </span>
            </button>
          )}

          {/* Quick Action 3: Export AFD */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDownloadAfd();
            }}
            className="flex items-center gap-2 rounded-xl bg-slate-900/95 hover:bg-slate-850 text-slate-200 border border-slate-700/80 px-3.5 py-2 text-xs font-semibold shadow-lg shadow-slate-950/40 transition-transform"
            title="Exportar Arquivo Fonte de Dados"
          >
            <Download className="h-3.5 w-3.5 text-cyan-400" />
            <span>Exportar AFD</span>
          </button>

          {/* Quick Action 4: Open Detailed Center */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-slate-900/95 hover:bg-slate-850 text-slate-200 border border-slate-700/80 px-3.5 py-2 text-xs font-semibold shadow-lg shadow-slate-950/40 transition-transform"
            title="Abrir painel completo"
          >
            <Layers className="h-3.5 w-3.5 text-blue-400" />
            <span>Central Completa</span>
          </button>
        </div>
      )}

      {/* 3. Main Floating Action Button (FAB) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title={isOpen ? 'Fechar painel' : 'Ações Rápidas (Clique para abrir)'}
        className={`relative flex items-center gap-2.5 rounded-xl px-4 py-3 text-xs font-bold text-white transition-colors duration-150 border min-h-[46px] ${
          isOpen
            ? 'bg-slate-900 border-slate-700 text-slate-300 shadow-slate-950/60 ring-2 ring-blue-500/30'
            : 'bg-slate-950 hover:bg-slate-900 border-slate-700/80 text-white shadow-slate-950/40 hover:border-blue-500/60 ring-1 ring-white/10'
        }`}
      >
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-lg transition-transform ${
            isOpen ? 'bg-slate-800 text-slate-400' : 'bg-blue-600 text-white shadow-xs'
          }`}
        >
          {isOpen ? <X className="h-4 w-4" /> : <Zap className="h-3.5 w-3.5 fill-white text-white" />}
        </div>

        <span className="font-extrabold tracking-tight">Ações Rápidas</span>

        {!isOpen && (
          <ChevronUp
            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
              isExpanded ? 'rotate-180 text-white' : ''
            }`}
          />
        )}

        {/* Counter Badge if there are items needing attention */}
        {summary.urgentCount > 0 && !isOpen && (
          <span
            aria-label={`${summary.urgentCount} itens pendentes`}
            className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-xs"
          >
            {summary.urgentCount}
          </span>
        )}
      </button>
    </aside>
  );
};
