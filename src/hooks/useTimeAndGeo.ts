import { useState, useEffect } from 'react';
import { Establishment, LocationStatus } from '../types';
import { evaluateGeofence } from '../domain/sync-engine';

export interface UseTimeAndGeoReturn {
  currentTime: Date;
  timeString: string;
  dateString: string;
  isOnline: boolean;
  isSimulatedOffline: boolean;
  setIsSimulatedOffline: (val: boolean | ((prev: boolean) => boolean)) => void;
  coords: { latitude: number; longitude: number; accuracy: number } | null;
  locationStatus: LocationStatus;
  distanceMeters?: number;
  refreshLocation: () => void;
  geoError?: string;
}

export function useTimeAndGeo(establishment?: Establishment): UseTimeAndGeoReturn {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [isOnlineState, setIsOnlineState] = useState<boolean>(navigator.onLine);
  // Never fabricate coordinates: location remains unavailable until the device supplies a real GPS reading.
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [geoError, setGeoError] = useState<string | undefined>();

  // Timer: 1 second interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => setIsOnlineState(true);
    const handleOffline = () => setIsOnlineState(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Geolocation request
  const refreshLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocalização não suportada neste dispositivo.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGeoError(undefined);
      },
      (err) => {
        console.warn('[Geo] Permission or signal issue, using establishment default fallback:', err.message);
        setGeoError(err.message);
        // Do not substitute the establishment's coordinates for the employee's position.
        setCoords(null);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
    );
  };

  useEffect(() => {
    refreshLocation();
  }, [establishment?.id]);

  // Evaluate geofence
  let locationStatus: LocationStatus = 'unavailable';
  let distanceMeters: number | undefined;

  if (establishment && coords) {
    const evaluation = evaluateGeofence({
      employeeLat: coords.latitude,
      employeeLon: coords.longitude,
      establishmentLat: establishment.latitude,
      establishmentLon: establishment.longitude,
      radiusMeters: establishment.radius_meters,
    });
    locationStatus = evaluation.status;
    distanceMeters = evaluation.distanceMeters;
  }

  // Format strings in pt-BR
  const timeString = currentTime.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const dateString = currentTime.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const isActuallyOnline = isOnlineState && !isSimulatedOffline;

  return {
    currentTime,
    timeString,
    dateString,
    isOnline: isActuallyOnline,
    isSimulatedOffline,
    setIsSimulatedOffline,
    coords,
    locationStatus,
    distanceMeters,
    refreshLocation,
    geoError,
  };
}
