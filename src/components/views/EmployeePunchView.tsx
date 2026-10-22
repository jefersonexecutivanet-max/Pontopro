import React, { useState } from 'react';
import { Employee, Establishment, TimeEvent, PunchReceipt, EventType, LocationStatus } from '../../types';
import { getEventTypeName } from '../../domain/rep-p';
import { BiometricModal } from '../common/BiometricModal';
import { ReceiptModal } from '../common/ReceiptModal';
import { LocationDetailModal } from '../common/LocationDetailModal';
import {
  Clock,
  MapPin,
  Camera,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calendar,
  Timer,
  Utensils,
  LogOut,
  Info,
  ShieldCheck,
  Navigation,
  Compass,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { diffInMinutes, formatMinutes } from '../../domain/time-calc';

interface EmployeePunchViewProps {
  employee: Employee;
  establishment?: Establishment;
  timeString: string;
  dateString: string;
  locationStatus: LocationStatus;
  geoError?: string;
  distanceMeters?: number;
  coords?: { latitude: number; longitude: number; accuracy: number } | null;
  onRefreshLocation?: () => void;
  isOnline: boolean;
  onRecordPunch: (eventType: EventType, photo?: string, score?: number) => Promise<PunchReceipt | null>;
  todayEvents: TimeEvent[];
  receipts: PunchReceipt[];
  isSubmitting: boolean;
}

export const EmployeePunchView: React.FC<EmployeePunchViewProps> = ({
  employee,
  establishment,
  timeString,
  dateString,
  locationStatus,
  geoError,
  distanceMeters,
  coords,
  onRefreshLocation,
  isOnline,
  onRecordPunch,
  todayEvents,
  receipts,
  isSubmitting,
}) => {
  const [selectedReceipt, setSelectedReceipt] = useState<PunchReceipt | null>(null);
  const [pendingEventType, setPendingEventType] = useState<EventType | null>(null);
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isRefreshingGps, setIsRefreshingGps] = useState(false);

  const handleTriggerGpsRefresh = () => {
    setIsRefreshingGps(true);
    if (onRefreshLocation) {
      onRefreshLocation();
    }
    setTimeout(() => setIsRefreshingGps(false), 800);
  };

  const handleInitiatePunch = async (type: EventType) => {
    // A permissão de localização é obrigatória; a obtenção das coordenadas não.
    // Se o usuário negar a permissão, bloquear. Se houver timeout/sem sinal, permitir sem GPS.
    if (!navigator.geolocation) {
      window.alert('Este dispositivo não oferece geolocalização. Ative um navegador compatível para registrar o ponto.');
      return;
    }
    try {
      if (navigator.permissions?.query) {
        const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (permission.state === 'denied') {
          window.alert('A permissão de localização é obrigatória. Ative a localização nas configurações do navegador e tente novamente.');
          return;
        }
      }
    } catch { /* Navegadores sem Permissions API ainda podem solicitar a permissão via geolocation. */ }
    let permissionDenied = false;
    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve(),
        (error) => { permissionDenied = error.code === error.PERMISSION_DENIED; resolve(); },
        { enableHighAccuracy: true, timeout: 4500, maximumAge: 0 }
      );
    });
    if (permissionDenied) {
      window.alert('Você precisa conceder a permissão de localização para registrar o ponto.');
      return;
    }
    setPendingEventType(type);
    // Photo evidence is required for every punch; this is not facial recognition.
    setIsBioModalOpen(true);
  };

  const handleBiometricSuccess = async (photo?: string, score?: number) => {
    setIsBioModalOpen(false);
    if (pendingEventType) {
      const receipt = await onRecordPunch(pendingEventType, photo, score);
      if (receipt) {
        setSelectedReceipt(receipt);
      }
      setPendingEventType(null);
    }
  };

  const executePunch = async (type: EventType) => {
    const receipt = await onRecordPunch(type);
    if (receipt) {
      setSelectedReceipt(receipt);
    }
    setPendingEventType(null);
  };

  const eventTypesToday = todayEvents.map((e) => e.event_type);
  const hasEntry = eventTypesToday.includes('entry');
  const hasLunchStart = eventTypesToday.includes('lunch_start');
  const hasLunchEnd = eventTypesToday.includes('lunch_end');
  const hasExit = eventTypesToday.includes('exit');

  // Compute worked minutes so far today
  let minutesToday = 0;
  const sorted = [...todayEvents].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
  );
  let entryTime: Date | null = null;
  sorted.forEach((e) => {
    const d = new Date(e.occurred_at);
    if (e.event_type === 'entry') entryTime = d;
    else if (e.event_type === 'lunch_start' && entryTime) {
      minutesToday += diffInMinutes(entryTime, d);
      entryTime = null;
    } else if (e.event_type === 'lunch_end') entryTime = d;
    else if (e.event_type === 'exit' && entryTime) {
      minutesToday += diffInMinutes(entryTime, d);
      entryTime = null;
    }
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Employee Header Profile */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl bg-slate-950 p-6 text-white shadow-xl border border-slate-900">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white font-black text-lg shadow-md shrink-0">
            {employee.name
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">{employee.name}</h2>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                Ativo
              </span>
            </div>
            <p className="text-xs text-slate-300">
              {employee.position} • {employee.department}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              CPF: {employee.cpf} | Matrícula: {employee.matricula}
            </p>
          </div>
        </div>

        {/* Establishment Card */}
        <div className="rounded-2xl bg-slate-900/90 p-3.5 border border-slate-800 text-right w-full sm:w-auto">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Estabelecimento Vinculado
          </span>
          <span className="text-xs font-bold text-slate-200 block mt-0.5">
            {establishment?.name || 'Matriz São Paulo'}
          </span>
          <span className="text-[11px] text-blue-400 block font-mono">
            Raio autorizado: {establishment?.radius_meters || 150}m
          </span>
        </div>
      </div>

      {/* Main Kiosk Punch Area */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs text-center space-y-6">
        <div>
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span>{dateString}</span>
          </div>

          {/* Big Live Digital Clock */}
          <div className="font-mono text-5xl sm:text-6xl font-black tracking-tight text-slate-900 my-1">
            {timeString}
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Horário exibido pelo dispositivo (referência local)
          </p>
        </div>

        {/* Unified Clean Environmental & GPS Ribbon */}
        <div className="mx-auto max-w-2xl rounded-2xl bg-slate-50 border border-slate-200/90 p-3 sm:px-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl shrink-0 ${
              locationStatus === 'within_fence'
                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
            }`}>
              <MapPin className="h-4 w-4" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">
                  {establishment?.name || 'Matriz São Paulo'}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  locationStatus === 'within_fence'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {locationStatus === 'within_fence'
                    ? `No raio (${distanceMeters ?? 0}m)`
                    : locationStatus === 'outside_fence'
                      ? `Fora do raio (${distanceMeters ?? 0}m)`
                      : 'Localização indisponível'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {coords ? (
                  <>GPS ±{coords.accuracy.toFixed(1)}m · Lat: {coords.latitude.toFixed(5)}°, Lon: {coords.longitude.toFixed(5)}°</>
                ) : (
                  <>{geoError ? `GPS indisponível: ${geoError}` : 'Aguardando leitura real do GPS'}</>
                )}
                {employee.biometric_registered && <> · Cadastro biométrico existente</>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={handleTriggerGpsRefresh}
              disabled={isRefreshingGps}
              className="rounded-lg border border-slate-300 bg-white hover:bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-colors"
              title="Atualizar GPS"
            >
              <RefreshCw className={`h-3 w-3 inline mr-1 ${isRefreshingGps ? 'animate-spin text-blue-600' : ''}`} />
              <span>Calibrar</span>
            </button>
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 text-[11px] font-bold shadow-xs transition-colors"
            >
              Ver Mapa
            </button>
          </div>
        </div>

        {/* 4 Main Punch Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto pt-2">
          {/* 1. Entrada */}
          <button
            onClick={() => handleInitiatePunch('entry')}
            disabled={isSubmitting}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
              !hasEntry
                ? 'border-blue-600 bg-blue-50/60 hover:bg-blue-100 text-blue-950 font-bold  shadow-sm'
                : 'border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100'
            }`}
          >
            <Clock className="mb-1 h-7 w-7 text-blue-600" aria-hidden="true" />
            <span className="text-sm font-extrabold text-slate-900">Entrada</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Início da jornada</span>
            {hasEntry && <span className="text-[10px] text-emerald-600 font-bold mt-1">Registrado</span>}
          </button>

          {/* 2. Saída Intervalo */}
          <button
            onClick={() => handleInitiatePunch('lunch_start')}
            disabled={isSubmitting}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
              hasEntry && !hasLunchStart
                ? 'border-blue-600 bg-blue-50/60 hover:bg-blue-100 text-blue-950 font-bold  shadow-sm'
                : 'border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100'
            }`}
          >
            <Utensils className="mb-1 h-7 w-7 text-blue-600" aria-hidden="true" />
            <span className="text-sm font-extrabold text-slate-900">Saída Almoço</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Início do intervalo</span>
            {hasLunchStart && <span className="text-[10px] text-emerald-600 font-bold mt-1">Registrado</span>}
          </button>

          {/* 3. Retorno Intervalo */}
          <button
            onClick={() => handleInitiatePunch('lunch_end')}
            disabled={isSubmitting}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
              hasLunchStart && !hasLunchEnd
                ? 'border-blue-600 bg-blue-50/60 hover:bg-blue-100 text-blue-950 font-bold  shadow-sm'
                : 'border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100'
            }`}
          >
            <Clock className="mb-1 h-7 w-7 text-blue-600" aria-hidden="true" />
            <span className="text-sm font-extrabold text-slate-900">Retorno Almoço</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Fim do intervalo</span>
            {hasLunchEnd && <span className="text-[10px] text-emerald-600 font-bold mt-1">Registrado</span>}
          </button>

          {/* 4. Saída Final */}
          <button
            onClick={() => handleInitiatePunch('exit')}
            disabled={isSubmitting}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
              (hasLunchEnd || (hasEntry && !hasLunchStart)) && !hasExit
                ? 'border-rose-500 bg-rose-50/60 hover:bg-rose-100 text-rose-950 font-bold  shadow-sm'
                : 'border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100'
            }`}
          >
            <LogOut className="mb-1 h-7 w-7 text-rose-600" aria-hidden="true" />
            <span className="text-sm font-extrabold text-slate-900">Saída Final</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Fim do expediente</span>
            {hasExit && <span className="text-[10px] text-rose-600 font-bold mt-1">Registrado</span>}
          </button>
        </div>

        {/* Secondary: Overtime actions */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => handleInitiatePunch('overtime_start')}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Timer className="h-3.5 w-3.5 text-amber-600" />
            <span>Registrar Início de Hora Extra</span>
          </button>
          <button
            onClick={() => handleInitiatePunch('overtime_end')}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <span>Fim de Hora Extra</span>
          </button>
        </div>

        {/* Daily Summary Progress Counter */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-around text-xs max-w-md mx-auto">
          <div>
            <span className="text-slate-400 block text-[10px] font-bold uppercase">Tempo Trabalhado</span>
            <span className="text-base font-black text-slate-900 font-mono">
              {formatMinutes(minutesToday)}
            </span>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div>
            <span className="text-slate-400 block text-[10px] font-bold uppercase">Jornada Contratual</span>
            <span className="text-base font-black text-blue-600 font-mono">08:00</span>
          </div>
        </div>
      </div>

      {/* Today's Punches History & Receipts */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Marcações Realizadas Hoje</h3>
            <p className="text-xs text-slate-500">Histórico de pontos registrados e comprovantes emitidos</p>
          </div>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60">
            {todayEvents.length} eventos registrados
          </span>
        </div>

        {todayEvents.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Clock className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-medium">Nenhum ponto registrado hoje ainda.</p>
            <p className="text-[11px] text-slate-400 mt-1">Utilize os botões acima para registrar sua entrada.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {todayEvents.map((evt) => {
              const dateObj = new Date(evt.occurred_at);
              const timeStr = dateObj.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });
              const matchedReceipt = receipts.find((r) => r.nsr === evt.nsr);

              return (
                <div key={evt.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-700 font-mono">
                      #{String(evt.nsr).padStart(4, '0')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {getEventTypeName(evt.event_type)}
                        </span>
                        {evt.is_offline && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                            Offline
                          </span>
                        )}
                        {evt.biometric_photo && (
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-800">
                            Foto anexada
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-slate-500">
                        {timeStr} • SHA-256: {evt.sha256_hash.slice(0, 16)}...
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (matchedReceipt) {
                        setSelectedReceipt(matchedReceipt);
                      }
                    }}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors shadow-2xs"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Comprovante</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Biometric Verification Modal */}
      <BiometricModal
        isOpen={isBioModalOpen}
        employeeName={employee.name}
        onSuccess={handleBiometricSuccess}
        onCancel={() => {
          setIsBioModalOpen(false);
          setPendingEventType(null);
        }}
      />

      {/* Portaria 671 Receipt Modal */}
      <ReceiptModal
        receipt={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
      />

      {/* Exact Location & Virtual Fence Modal */}
      <LocationDetailModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        employee={employee}
        establishment={establishment}
        currentCoords={coords}
        liveDistanceMeters={distanceMeters}
        liveStatus={locationStatus}
      />
    </div>
  );
};
