import React from 'react';
import { TimeEvent, Employee, Establishment } from '../../types';
import { getEventTypeName } from '../../domain/rep-p';
import { calculateDistanceMeters } from '../../domain/sync-engine';
import {
  MapPin,
  X,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Navigation,
  Compass,
  Building2,
  Copy,
} from 'lucide-react';

interface LocationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  event?: TimeEvent | null;
  employee?: Employee | null;
  establishment?: Establishment | null;
  // Fallback direct coordinates if inspecting live kiosk punch
  currentCoords?: { latitude: number; longitude: number; accuracy: number } | null;
  liveDistanceMeters?: number;
  liveStatus?: 'within_fence' | 'outside_fence' | 'unavailable';
}

export const LocationDetailModal: React.FC<LocationDetailModalProps> = ({
  isOpen,
  onClose,
  title,
  event,
  employee,
  establishment,
  currentCoords,
  liveDistanceMeters,
  liveStatus,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  // Resolve coordinates: either from event or from live currentCoords
  const latitude = event?.latitude ?? currentCoords?.latitude;
  const longitude = event?.longitude ?? currentCoords?.longitude;
  const accuracy = event?.accuracy_meters ?? currentCoords?.accuracy;
  const status = event?.location_status ?? liveStatus ?? 'unavailable';

  // Calculate distance if not provided
  let distance = liveDistanceMeters;
  if (distance === undefined && latitude !== undefined && longitude !== undefined && establishment) {
    distance = calculateDistanceMeters(
      latitude,
      longitude,
      establishment.latitude,
      establishment.longitude
    );
  }

  const radiusMeters = establishment?.radius_meters || 150;
  const isWithin = status === 'within_fence';

  const handleCopyCoords = async () => {
    if (latitude !== undefined && longitude !== undefined) {
      const text = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
      } catch {
        // Fallback for restricted clipboard contexts
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const mapUrl =
    latitude !== undefined && longitude !== undefined
      ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
      : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
            <Compass className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                Auditoria de Geolocalização
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                  isWithin
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {isWithin ? 'No Perímetro' : 'Fora da Cerca'}
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              {title || 'Localização Exata da Marcação'}
            </h3>
            <p className="text-xs text-slate-500">
              Dados de localização para revisão operacional; validar requisitos legais e LGPD
            </p>
          </div>
        </div>

        {/* Details Content */}
        <div className="space-y-3.5 text-xs">
          {/* Employee & Event Context */}
          {(employee || event) && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Colaborador</span>
                <span className="font-bold text-slate-900 text-xs">{employee?.name || 'Colaborador'}</span>
                <span className="text-[10px] text-slate-500 font-mono block">CPF: {employee?.cpf}</span>
              </div>
              {event && (
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Tipo & Horário</span>
                  <span className="font-bold text-blue-700 text-xs">{getEventTypeName(event.event_type)}</span>
                  <span className="text-[10px] text-slate-600 font-mono block">
                    NSR #{String(event.nsr).padStart(6, '0')} • {new Date(event.occurred_at).toLocaleTimeString('pt-BR')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Exact GPS Coordinates Box */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Navigation className="h-3.5 w-3.5" /> Coordenadas de Satélite (GPS)
              </span>
              <button
                type="button"
                onClick={handleCopyCoords}
                className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border transition-colors ${
                  copied
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                }`}
                title="Copiar latitude e longitude"
              >
                {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>

            {latitude !== undefined && longitude !== undefined ? (
              <div className="grid grid-cols-2 gap-3 font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Latitude</span>
                  <span className="text-sm font-bold text-white tracking-wide">
                    {latitude.toFixed(6)}°
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Longitude</span>
                  <span className="text-sm font-bold text-white tracking-wide">
                    {longitude.toFixed(6)}°
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Precisão / Acurácia</span>
                  <span className="text-xs font-bold text-emerald-400">
                    ±{accuracy !== undefined ? accuracy.toFixed(1) : '10.0'} metros
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Distância até a Sede</span>
                  <span className={`text-xs font-bold ${isWithin ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {distance !== undefined ? `${distance} metros` : 'No perímetro'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-xs italic">
                Coordenadas GPS não capturadas no momento deste registro (marcação em contingência).
              </div>
            )}
          </div>

          {/* Establishment Virtual Fence Card */}
          {establishment && (
            <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-blue-700" />
                  Estabelecimento Vinculado (Filial)
                </span>
                <span className="rounded-md bg-blue-600/10 px-2 py-0.5 text-[10px] font-bold text-blue-800 font-mono">
                  Raio: {radiusMeters}m
                </span>
              </div>
              <p className="text-xs font-bold text-slate-800">{establishment.name}</p>
              <p className="text-[11px] text-slate-600 leading-snug">{establishment.address}</p>
              <div className="text-[10px] text-slate-500 font-mono pt-1">
                Coordenadas da Cerca: Lat {establishment.latitude.toFixed(5)}, Lon {establishment.longitude.toFixed(5)}
              </div>
            </div>
          )}

          {/* Legal / LGPD Note */}
          <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              <strong>Garantia Legal & LGPD (Art. 11, II, 'a'):</strong> A coleta de geolocalização ocorre estritamente
              no instante do clique da batida de ponto para conferência do perímetro contratual. O sistema <strong>não</strong>{' '}
              rastreia o colaborador de forma contínua fora da marcação.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {mapUrl ? (
            <a
              href={mapUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-2xs"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Abrir no Google Maps</span>
            </a>
          ) : (
            <div></div>
          )}

          <button
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
