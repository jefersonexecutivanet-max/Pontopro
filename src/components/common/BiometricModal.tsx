import React, { useRef, useState, useEffect } from 'react';
import { Camera, Check, ShieldCheck, RefreshCw, X, AlertCircle } from 'lucide-react';

interface BiometricModalProps {
  isOpen: boolean;
  onSuccess: (photoBase64?: string, score?: number) => void;
  onCancel: () => void;
  employeeName: string;
}

export const BiometricModal: React.FC<BiometricModalProps> = ({
  isOpen,
  onSuccess,
  onCancel,
  employeeName,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [verdict, setVerdict] = useState<'idle' | 'success'>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setVerdict('idle');
      setAnalyzing(false);
      return;
    }

    let localStream: MediaStream | null = null;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'user', width: 480, height: 480 } })
        .then((stream) => {
          localStream = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
          setStreamActive(true);
          setCameraError(null);
        })
        .catch((err) => {
          console.warn('[Camera] Could not access user camera directly, falling back:', err);
          setCameraError('Câmera indisponível ou permissão não concedida.');
          setStreamActive(false);
        });
    } else {
      setCameraError('Dispositivo sem suporte a captura de vídeo.');
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCapture = () => {
    const video = videoRef.current;
    if (!streamActive || !video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      setCameraError('A câmera ainda não está pronta. Conceda a permissão e tente novamente.');
      return;
    }

    setAnalyzing(true);
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      setAnalyzing(false);
      setCameraError('Não foi possível capturar a imagem neste dispositivo.');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photo = canvas.toDataURL('image/jpeg', 0.82);
    setAnalyzing(false);
    setVerdict('success');
    // Esta é uma foto de evidência do ponto, não reconhecimento facial.
    setTimeout(() => onSuccess(photo, undefined), 350);
  };



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          aria-label="Cancelar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 mb-2">
            <Camera className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Captura de foto</h3>
          <p className="text-xs text-slate-500">
            Foto obrigatória como evidência da marcação de <span className="font-semibold text-slate-800">{employeeName}</span>
          </p>
        </div>

        {/* Camera Viewport */}
        <div className="relative mx-auto h-64 w-64 overflow-hidden rounded-2xl bg-slate-950 border-4 border-indigo-500/30 flex items-center justify-center shadow-inner">
          {streamActive ? (
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover transform -scale-x-100"
            />
          ) : (
            <div className="p-4 text-center text-slate-400">
              <Camera className="h-10 w-10 mx-auto text-slate-500 mb-2" />
              <p className="text-xs font-medium text-slate-300">Câmera aguardando captura</p>
              <p className="text-[10px] text-slate-400 mt-1">A captura só funciona quando a câmera real está disponível</p>
            </div>
          )}

          {/* Alignment Oval Overlay */}
          <div className="pointer-events-none absolute inset-4 rounded-full border-2 border-dashed border-indigo-400/80"></div>

          {analyzing && (
            <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center text-white">
              <RefreshCw className="h-8 w-8 animate-spin text-indigo-400 mb-2" />
              <span className="text-xs font-semibold">Preparando evidência...</span>
              <span className="text-[10px] text-slate-300">A imagem será anexada à marcação</span>
            </div>
          )}

          {verdict === 'success' && (
            <div className="absolute inset-0 bg-emerald-600/90 flex flex-col items-center justify-center text-white">
              <Check className="h-12 w-12 text-white mb-2 animate-bounce" />
              <span className="text-sm font-bold">Foto capturada</span>
              <span className="text-xs text-emerald-100">Nenhum reconhecimento facial foi executado</span>
            </div>
          )}
        </div>

        {cameraError && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 border border-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>{cameraError} A marcação não pode continuar sem a foto obrigatória.</span>
          </div>
        )}

        <div className="mt-5 space-y-2">
          <button
            onClick={handleCapture}
            disabled={analyzing}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-50"
          >
            <Camera className="h-4 w-4" />
            Capturar foto e continuar
          </button>

        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
          <span>Foto obrigatória de evidência. Não é executado reconhecimento facial; aplique controles de acesso e retenção.</span>
        </div>
      </div>
    </div>
  );
};
