/**
 * PontoPro - Main Application Entrypoint
 * Full-stack Electronic Time Tracking & HR SaaS (Portaria MTP 671/2021 REP-P)
 * Enterprise Design Redesign
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api, getOfflineQueue } from './services/api';
import { useTimeAndGeo } from './hooks/useTimeAndGeo';
import { Sidebar, NavTabId } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { MobileNav } from './components/layout/MobileNav';
import { ReceiptModal } from './components/common/ReceiptModal';
import { LegalDocuments, type LegalDocumentType } from './components/common/LegalDocuments';
import { EmployeePunchView } from './components/views/EmployeePunchView';
import { DashboardView } from './components/views/DashboardView';
import { TimesheetView } from './components/views/TimesheetView';
import { EmployeesView } from './components/views/EmployeesView';
import { SchedulesView } from './components/views/SchedulesView';
import { CorrectionsView } from './components/views/CorrectionsView';
import { ReportsView } from './components/views/ReportsView';
import { EstablishmentsView } from './components/views/EstablishmentsView';
import { ComplianceView } from './components/views/ComplianceView';
import { LicenseView } from './components/views/LicenseView';
import { BillingView } from './components/views/BillingView';
import { LoginView } from './components/views/LoginView';
import {
  Company,
  Establishment,
  Employee,
  WorkSchedule,
  TimeEvent,
  PunchReceipt,
  CorrectionRequest,
  LicenseStatus,
  AuditLog,
  EventType,
} from './types';
import { RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { localDateKey } from './utils/date';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [currentEstablishment, setCurrentEstablishment] = useState<Establishment | undefined>();
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [allEstablishments, setAllEstablishments] = useState<Establishment[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [allSchedules, setAllSchedules] = useState<WorkSchedule[]>([]);
  const [allEvents, setAllEvents] = useState<TimeEvent[]>([]);
  const [allReceipts, setAllReceipts] = useState<PunchReceipt[]>([]);
  const [allCorrections, setAllCorrections] = useState<CorrectionRequest[]>([]);
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Navigation and Layout State
  const [activeTab, setActiveTab] = useState<NavTabId>('punch');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [activeReceipt, setActiveReceipt] = useState<PunchReceipt | null>(null);
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isSubmittingPunch, setIsSubmittingPunch] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warn' } | null>(null);
  const [legalDocument, setLegalDocument] = useState<LegalDocumentType | null>(null);

  // Time & Geolocation Hook
  const {
    timeString,
    dateString,
    isOnline,
    isSimulatedOffline,
    setIsSimulatedOffline,
    coords,
    locationStatus,
    geoError,
    distanceMeters,
    refreshLocation,
  } = useTimeAndGeo(currentEstablishment);

  const showToast = (text: string, type: 'success' | 'warn' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const checkSessionAndLoad = useCallback(
    async (targetCompanyId?: string) => {
      // Não consulta /auth/me sem token: usuário deslogado é um estado normal,
      // não uma falha que precise aparecer no console do navegador.
      if (!api.hasAuthSession()) {
        setIsAuthenticated(false);
        setCurrentEmployee(null);
        setCurrentCompany(null);
        setCurrentEstablishment(undefined);
        setLoading(false);
        return;
      }
      try {
        const meData = await api.getMe();
        if (!meData) {
          setIsAuthenticated(false);
          setCurrentEmployee(null);
          setLoading(false);
          return;
        }

        // Owner (saas_owner) session
        if (meData.owner) {
          setIsAuthenticated(true);
          setCurrentEmployee(null);
          setCurrentCompany(null);
          setCurrentEstablishment(undefined);
          setActiveTab('dashboard');
          setAllCompanies(meData.companies || []);
          setLoading(false);
          return;
        }

        if (!meData?.employee) {
          setIsAuthenticated(false);
          setCurrentEmployee(null);
          setLoading(false);
          return;
        }

        const compId = targetCompanyId || meData.company.id;

        // Quando a cobrança é explicitamente exigida em produção, manter o administrador
        // autenticado no painel de cobrança em vez de falhar ao carregar as áreas bloqueadas.
        if (meData.company.billing_required && meData.employee.role === 'company_admin') {
          try {
            const billing = await api.getBillingSubscription();
            if (billing.enforcement_enabled && billing.subscription?.status !== 'active') {
              setCurrentEmployee(meData.employee);
              setCurrentCompany(meData.company);
              setCurrentEstablishment(meData.establishment);
              setIsAuthenticated(true);
              setActiveTab('billing');
              setLoading(false);
              return;
            }
          } catch (billingError) {
            console.warn('Não foi possível consultar o status da assinatura durante a inicialização.', billingError);
          }
        }

        const [
          comps,
          ests,
          emps,
          scheds,
          events,
          receipts,
          corrections,
          lic,
          logs,
        ] = await Promise.all([
          api.getCompanies(),
          api.getEstablishments(compId),
          api.getEmployees(compId),
          api.getSchedules(compId),
          api.getPunches(compId),
          api.getReceipts(meData.employee.id),
          api.getCorrections(compId),
          meData.employee.role === 'company_admin' ? api.getLicenseStatus() : Promise.resolve(null),
          meData.employee.role === 'employee' ? Promise.resolve([] as AuditLog[]) : api.getAuditLogs(compId),
        ]);

        const foundComp = comps.find((c) => c.id === compId) || meData.company || comps[0];
        const foundEst = ests.find((e) => e.id === meData.employee.establishment_id) || ests[0];

        setCurrentEmployee(meData.employee);
        setCurrentCompany(foundComp);
        setCurrentEstablishment(foundEst);
        setAllCompanies(comps);
        setAllEstablishments(ests);
        setAllEmployees(emps);
        setAllSchedules(scheds);
        setAllEvents(events);
        setAllReceipts(receipts);
        setAllCorrections(corrections);
        setLicense(lic);
        setAuditLogs(logs);
        setIsAuthenticated(true);

        const queue = getOfflineQueue();
        setPendingOfflineCount(queue.filter((item) => item.company_id === compId).length);
      } catch (err) {
        setIsAuthenticated(false);
        setCurrentEmployee(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    checkSessionAndLoad();
  }, [checkSessionAndLoad]);

  // Handle Login
  const handleLoginSuccess = async (data: {
    employee?: Employee;
    owner?: { email: string; role: string };
    company?: Company;
    establishment?: Establishment;
    companies?: Company[];
  }) => {
    setLoading(true);

    if (data.owner) {
      // Owner (saas_owner) login — full access to all companies
      setIsAuthenticated(true);
      setCurrentEmployee(null);
      setCurrentCompany(null);
      setCurrentEstablishment(undefined);
      setActiveTab('dashboard');
      setAllCompanies(data.companies || []);
      showToast(`Bem-vindo, ${data.owner.email}! Acesso do proprietário autenticado.`);
      setLoading(false);
      return;
    }

    setCurrentEmployee(data.employee!);
    setCurrentCompany(data.company!);
    setCurrentEstablishment(data.establishment!);
    setIsAuthenticated(true);

    if (data.employee!.role === 'employee') {
      setActiveTab('punch');
    } else if (data.employee!.role === 'auditor') {
      setActiveTab('compliance');
    } else {
      setActiveTab('dashboard');
    }

    showToast(`Bem-vindo, ${data.employee!.name}! Sessão autenticada.`);
    await checkSessionAndLoad(data.company!.id);
  };

  // Handle Logout (Strict Individual Session - No account migration without logout)
  const handleLogout = async () => {
    setLoading(true);
    try {
      await api.logout();
    } catch {}
    setCurrentEmployee(null);
    setCurrentCompany(null);
    setCurrentEstablishment(undefined);
    setIsAuthenticated(false);
    setActiveTab('punch');
    setLoading(false);
    showToast('SessÃ£o encerrada com sucesso.');
  };

  // Strict RBAC tab safety check: Prevent employee from navigating to admin views
  useEffect(() => {
    if (isAuthenticated && currentEmployee?.role === 'employee') {
      const employeeAllowedTabs: NavTabId[] = ['punch', 'timesheet', 'corrections'];
      if (!employeeAllowedTabs.includes(activeTab)) {
        setActiveTab('punch');
      }
    }
  }, [isAuthenticated, currentEmployee, activeTab]);

  // Handle Switch Active Company
  const handleSelectCompany = async (companyId: string) => {
    setLoading(true);
    await checkSessionAndLoad(companyId);
    showToast('Empresa ativa alternada.');
  };

  // Handle Punch Recording (Online or Offline Queue)
  const handleRecordPunch = async (
    eventType: EventType,
    photo?: string,
    score?: number
  ): Promise<PunchReceipt | null> => {
    if (!currentEmployee || !currentCompany) return null;
    setIsSubmittingPunch(true);

    try {
      const payload = {
        idempotency_key: `IDEM-${crypto.randomUUID()}`,
        company_id: currentCompany.id,
        establishment_id: currentEstablishment?.id || 'est-sp-matriz',
        employee_id: currentEmployee.id,
        event_type: eventType,
        occurred_at: new Date().toISOString(),
        device_id: 'NAVIGATOR-WEB-PWA',
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        accuracy_meters: coords?.accuracy,
        biometric_verified: !!score,
        biometric_score: score,
        biometric_photo: photo,
        is_offline: isSimulatedOffline || !navigator.onLine,
        location_permission_granted: true,
      };

      const result = await api.recordPunch(payload, isSimulatedOffline);

      if (result.isQueuedOffline) {
        setPendingOfflineCount((prev) => prev + 1);
        showToast('MarcaÃ§Ã£o gravada na fila offline! SerÃ¡ sincronizada quando houver conexÃ£o.', 'warn');
      } else {
        showToast('Ponto registrado e assinado com sucesso!');
        // Refresh punches
        const updatedEvents = await api.getPunches(currentCompany.id);
        const updatedReceipts = await api.getReceipts(currentEmployee.id);
        setAllEvents(updatedEvents);
        setAllReceipts(updatedReceipts);
      }

      return result.receipt;
    } catch (err: any) {
      showToast(err.message || 'Erro ao registrar marcaÃ§Ã£o.', 'warn');
      return null;
    } finally {
      setIsSubmittingPunch(false);
    }
  };

  // Handle Offline Queue Sync
  const handleSyncOffline = async () => {
    if (!currentCompany) return;
    setIsSyncing(true);
    try {
      const syncResult = await api.syncOfflineBatch(currentCompany.id);
      const remaining = typeof syncResult.remainingForCompany === 'number'
        ? syncResult.remainingForCompany
        : getOfflineQueue().filter((item) => item.company_id === currentCompany.id).length;
      setPendingOfflineCount(remaining);
      const errorCount = Array.isArray(syncResult.errors) ? syncResult.errors.length : 0;
      if (errorCount > 0 || remaining > 0) {
        showToast(`SincronizaÃ§Ã£o parcial: ${syncResult.processed} registro(s) processado(s); ${remaining} desta empresa continuam pendentes e ${errorCount} precisam de atenÃ§Ã£o.`, 'warn');
      } else {
        showToast(`SincronizaÃ§Ã£o concluÃ­da: ${syncResult.processed} registro(s) processado(s).`);
      }
      // Reload events & receipts
      const updatedEvents = await api.getPunches(currentCompany.id);
      const updatedReceipts = await api.getReceipts(currentEmployee?.id || '');
      setAllEvents(updatedEvents);
      setAllReceipts(updatedReceipts);
    } catch (err: any) {
      showToast(err.message || 'Erro ao sincronizar.', 'warn');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // SincronizaÃ§Ã£o automÃ¡tica quando a conexÃ£o retorna; registros com erro permanecem na fila.
  useEffect(() => {
    if (isOnline && isAuthenticated && currentCompany && pendingOfflineCount > 0 && !isSyncing) {
      void handleSyncOffline().catch(() => { /* A fila permanece guardada para nova tentativa. */ });
    }
    // handleSyncOffline is intentionally omitted: it is recreated on render and the count/online
    // state are the event triggers. This avoids repeated sync loops after a successful batch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, isAuthenticated, currentCompany?.id, pendingOfflineCount, isSyncing]);

  // Handle Create Employee
  const handleCreateEmployee = async (data: Partial<Employee>) => {
    if (!currentCompany) return;
    try {
      await api.createEmployee({ ...data, company_id: currentCompany.id });
      const updated = await api.getEmployees(currentCompany.id);
      setAllEmployees(updated);
      showToast('Novo funcionÃ¡rio cadastrado com sucesso!');
    } catch (err: any) {
      showToast(err.message || 'Erro ao cadastrar.', 'warn');
    }
  };

  // Handle Create Establishment
  const handleCreateEstablishment = async (data: Partial<Establishment>) => {
    if (!currentCompany) return;
    try {
      await api.createEstablishment({ ...data, company_id: currentCompany.id });
      const updated = await api.getEstablishments(currentCompany.id);
      setAllEstablishments(updated);
      showToast('Nova filial cadastrada com sucesso!');
    } catch (err: any) {
      showToast(err.message || 'Erro ao cadastrar filial.', 'warn');
    }
  };

  // Handle Create Correction
  const handleCreateCorrection = async (data: Partial<CorrectionRequest>) => {
    try {
      await api.createCorrection(data);
      if (currentCompany) {
        const updated = await api.getCorrections(currentCompany.id);
        setAllCorrections(updated);
      }
      showToast('SolicitaÃ§Ã£o de correÃ§Ã£o enviada para anÃ¡lise do RH!');
    } catch (err: any) {
      showToast(err.message || 'Erro ao solicitar correÃ§Ã£o.', 'warn');
    }
  };

  // Handle Review Correction
  const handleReviewCorrection = async (
    id: string,
    status: 'approved' | 'rejected',
    notes?: string
  ) => {
    try {
      await api.reviewCorrection(id, status, notes);
      if (currentCompany) {
        const updated = await api.getCorrections(currentCompany.id);
        setAllCorrections(updated);
      }
      showToast(`SolicitaÃ§Ã£o ${status === 'approved' ? 'aprovada' : 'recusada'} com sucesso!`);
    } catch (err: any) {
      showToast(err.message || 'Erro ao revisar.', 'warn');
      throw err;
    }
  };

  // 1-Click single approval helper
  const handleApproveSingleCorrection = async (id: string) => {
    await handleReviewCorrection(id, 'approved', 'AprovaÃ§Ã£o rÃ¡pida em 1 clique');
  };

  // 1-Click batch approval helper
  const handleApproveAllCorrections = async () => {
    if (!currentCompany) return;
    const pendingList = allCorrections.filter((c) => c.status === 'pending');
    if (pendingList.length === 0) {
      showToast('Nenhum ajuste pendente para aprovaÃ§Ã£o.', 'warn');
      return;
    }
    try {
      const res = await api.batchApproveCorrections(currentCompany.id);
      const updated = await api.getCorrections(currentCompany.id);
      setAllCorrections(updated);
      showToast(`${res.count || pendingList.length} solicitaÃ§Ã£o(Ãµes) aprovada(s) com sucesso em 1 clique!`);
    } catch (err: any) {
      showToast(err.message || 'Erro ao aprovar em lote.', 'warn');
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white">
        <RefreshCw className="h-10 w-10 animate-spin text-blue-500 mb-4" />
        <h2 className="text-base font-extrabold tracking-tight">Iniciando PontoPro...</h2>
        <p className="text-xs text-slate-400 mt-1">
          Carregando mÃ³dulos de conformidade REP-P e banco de dados multiempresa
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !currentEmployee) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const todayIso = localDateKey(new Date());
  const employeeTodayEvents = allEvents.filter(
    (e) => e.employee_id === currentEmployee?.id && localDateKey(new Date(e.occurred_at)) === todayIso
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-bold text-white shadow-2xl transition-all ${
            toastMessage.type === 'success' ? 'bg-emerald-600' : 'bg-amber-600'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Desktop Collapsible Sidebar in Deep Navy */}
      <Sidebar
        currentEmployee={currentEmployee}
        currentCompany={currentCompany}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={handleLogout}
      />

      {/* Mobile Drawer Navigation */}
      <MobileNav
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        currentEmployee={currentEmployee}
        currentCompany={currentCompany}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onLogout={handleLogout}
      />

      {/* Main View Area with TopBar */}
      <div className="flex flex-1 flex-col min-w-0">
        <TopBar
          currentCompany={currentCompany}
          allCompanies={allCompanies}
          onSelectCompany={handleSelectCompany}
          activeTab={activeTab}
          timeString={timeString}
          isOnline={isOnline}
          isSimulatedOffline={isSimulatedOffline}
          onToggleSimulatedOffline={() => {
            setIsSimulatedOffline((prev) => !prev);
            showToast(
              !isSimulatedOffline
                ? 'Modo Sem Internet ativado! MarcaÃ§Ãµes serÃ£o gravadas em fila local.'
                : 'ConexÃ£o restabelecida. Pronto para sincronizar.'
            );
          }}
          pendingOfflineCount={pendingOfflineCount}
          onSyncOffline={handleSyncOffline}
          isSyncing={isSyncing}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && currentCompany && (
            <DashboardView
              company={currentCompany}
              employees={allEmployees}
              schedules={allSchedules}
              establishments={allEstablishments}
              events={allEvents}
              receipts={allReceipts}
              corrections={allCorrections}
              currentEmployee={currentEmployee}
              pendingOfflineCount={pendingOfflineCount}
              isSyncing={isSyncing}
              isOnline={isOnline}
              isSimulatedOffline={isSimulatedOffline}
              onSyncOffline={handleSyncOffline}
              onApproveCorrection={handleApproveSingleCorrection}
              onApproveAllCorrections={handleApproveAllCorrections}
              onDownloadAfd={() => api.downloadAfd(currentCompany.id)}
              onDownloadTechnicalTerm={() => api.downloadTechnicalTerm(currentCompany.id)}
              onNavigateTab={setActiveTab}
              onSelectReceipt={setActiveReceipt}
            />
          )}

          {activeTab === 'punch' && currentEmployee && (
            <EmployeePunchView
              employee={currentEmployee}
              establishment={currentEstablishment}
              timeString={timeString}
              dateString={dateString}
              locationStatus={locationStatus}
              geoError={geoError}
              distanceMeters={distanceMeters}
              coords={coords}
              onRefreshLocation={refreshLocation}
              isOnline={isOnline}
              onRecordPunch={handleRecordPunch}
              todayEvents={employeeTodayEvents}
              receipts={allReceipts}
              isSubmitting={isSubmittingPunch}
            />
          )}

          {activeTab === 'timesheet' && (
            <TimesheetView
              employees={allEmployees}
              schedules={allSchedules}
              events={allEvents}
              currentEmployee={currentEmployee}
            />
          )}

          {activeTab === 'employees' && (
            <EmployeesView
              employees={allEmployees}
              schedules={allSchedules}
              establishments={allEstablishments}
              onCreateEmployee={handleCreateEmployee}
            />
          )}

          {activeTab === 'schedules' && currentCompany && (
            <SchedulesView
              company={currentCompany}
              schedules={allSchedules}
            />
          )}

          {activeTab === 'corrections' && currentEmployee && (
            <CorrectionsView
              corrections={allCorrections}
              employees={allEmployees}
              currentEmployee={currentEmployee}
              onCreateCorrection={handleCreateCorrection}
              onReviewCorrection={handleReviewCorrection}
            />
          )}

          {activeTab === 'reports' && currentCompany && (
            <ReportsView
              company={currentCompany}
              employees={allEmployees}
              establishments={allEstablishments}
              events={allEvents}
              onDownloadAfd={() => api.downloadAfd(currentCompany.id)}
              onDownloadTechnicalTerm={() => api.downloadTechnicalTerm(currentCompany.id)}
            />
          )}

          {activeTab === 'establishments' && currentCompany && (
            <EstablishmentsView
              company={currentCompany}
              establishments={allEstablishments}
              onCreateEstablishment={handleCreateEstablishment}
            />
          )}

          {activeTab === 'compliance' && currentCompany && (
            <ComplianceView
              company={currentCompany}
              events={allEvents}
              employees={allEmployees}
              auditLogs={auditLogs}
              onDownloadAfd={() => api.downloadAfd(currentCompany.id)}
              onDownloadTechnicalTerm={() => api.downloadTechnicalTerm(currentCompany.id)}
            />
          )}

          {activeTab === 'license' && license && (
            <LicenseView license={license} />
          )}

          {activeTab === 'billing' && currentEmployee?.role === 'company_admin' && (
            <BillingView />
          )}
        </main>

        {/* Global Receipt Modal */}
        <ReceiptModal
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />

        {/* Bottom Footer */}
        <footer className="border-t border-slate-200 bg-white py-4 px-6 text-xs text-slate-500">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
            <p><span className="font-semibold text-slate-800">PontoPro</span> Â· GestÃ£o de jornada de trabalho</p>
            <nav aria-label="Documentos legais" className="flex flex-wrap items-center justify-center gap-4">
              <button type="button" onClick={() => setLegalDocument('privacy')} className="rounded-md px-2 py-1 hover:text-slate-900">PolÃ­tica de Privacidade</button>
              <button type="button" onClick={() => setLegalDocument('terms')} className="rounded-md px-2 py-1 hover:text-slate-900">Termos e CondiÃ§Ãµes</button>
            </nav>
          </div>
        </footer>
        {legalDocument && <LegalDocuments type={legalDocument} onClose={() => setLegalDocument(null)} onChangeType={setLegalDocument} />}
      </div>
    </div>
  );
}
