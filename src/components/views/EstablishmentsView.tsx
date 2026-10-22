import React, { useState } from 'react';
import { Establishment, Company } from '../../types';
import { Building2, MapPin, Plus, ShieldCheck, X } from 'lucide-react';

interface EstablishmentsViewProps {
  company: Company;
  establishments: Establishment[];
  onCreateEstablishment: (data: Partial<Establishment>) => Promise<void>;
}

export const EstablishmentsView: React.FC<EstablishmentsViewProps> = ({
  company,
  establishments,
  onCreateEstablishment,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radiusMeters, setRadiusMeters] = useState(150);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreateEstablishment({
      company_id: company.id,
      name,
      code: code || undefined,
      cnpj: cnpj || company.cnpj,
      address,
      latitude: Number(latitude),
      longitude: Number(longitude),
      radius_meters: radiusMeters,
    });
    setIsModalOpen(false);
    setName('');
    setCode('');
    setAddress('');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Filiais & Perímetros Geográficos (Geofence)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestão multifilial e configuração de cercas virtuais por coordenadas de satélite
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Cadastrar Nova Filial</span>
        </button>
      </div>

      {/* Grid of Establishments */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {establishments.map((est) => (
          <div
            key={est.id}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-mono font-bold text-indigo-700 border border-indigo-100">
                  {est.code}
                </span>
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  Ativo
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 mb-1">{est.name}</h3>
              <p className="text-xs text-slate-500 mb-3">{est.address}</p>
              <p className="text-[11px] font-mono text-slate-600">CNPJ: {est.cnpj}</p>
            </div>

            {/* Geofence Parameters Card */}
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between font-sans text-slate-500 font-semibold text-[11px]">
                <span className="flex items-center gap-1 text-indigo-700">
                  <MapPin className="h-3.5 w-3.5" />
                  Cerca Eletrônica (Geofence)
                </span>
                <span className="text-emerald-700 font-bold">{est.radius_meters} metros</span>
              </div>

              <div className="pt-1 text-[11px] text-slate-600 space-y-0.5">
                <div>Latitude: <span className="text-slate-900 font-bold">{est.latitude}</span></div>
                <div>Longitude: <span className="text-slate-900 font-bold">{est.longitude}</span></div>
                <div>Fuso Horário: <span className="text-slate-700">{est.timezone}</span></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nova Filial */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">Cadastrar Nova Filial</h3>
            <p className="text-xs text-slate-500 mb-5">
              Defina a localização física e o raio de tolerância do ponto
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nome do Estabelecimento *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Filial Campinas (Distrito Industrial)"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Código da Filial</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Ex: FILIAL-003-CP"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">CNPJ do Estabelecimento</label>
                  <input
                    type="text"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    placeholder="CNPJ numérico ou alfanumérico"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Endereço Completo</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, Número, Bairro, Cidade - UF"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Latitude real da filial *</label>
                  <input
                    type="number"
                    step="0.00001"
                    required
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Longitude real da filial *</label>
                  <input
                    type="number"
                    step="0.00001"
                    required
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Raio (Metros)</label>
                  <input
                    type="number"
                    min="50"
                    max="5000"
                    required
                    value={radiusMeters}
                    onChange={(e) => setRadiusMeters(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-700"
                >
                  Salvar Filial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
