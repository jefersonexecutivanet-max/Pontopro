/**
 * Centralized Configuration for PontoPro
 * Single source of truth for branding, Brazilian labor law standards, and system settings.
 */

export const APP_CONFIG = {
  name: 'PontoPro',
  fullName: 'PontoPro - Sistema de Ponto Eletrônico Profissional',
  version: '2.5.0-dev',
  tagline: 'Protótipo multiempresa de gestão de jornada em desenvolvimento',
  
  // Brazilian Regulatory Compliance (REP-P)
  compliance: {
    standard: 'Portaria MTP nº 671/2021',
    category: 'REP-P (Registrador Eletrônico de Ponto em Programa)',
    inpiRegistration: '',
    signatureAlgorithm: 'SHA-256 para integridade interna; não equivale a assinatura digital ICP-Brasil',
    timeStandard: 'Horário local do dispositivo/servidor; sincronização oficial não integrada',
    timeZone: 'America/Sao_Paulo',
    afdVersion: 'AFD-REP-P-Layout-671',
    certifyingAuthority: 'Não configurada; avaliar requisitos legais e regulatórios antes de uso em produção',
  },

  // Commercial model: Perpetual Single License (Venda Única)
  license: {
    model: 'Venda Única de Licença de Uso Perpétua',
    defaultGracePeriodDays: 30,
    supportEmail: 'suporte@pontopro.com.br',
    documentationUrl: 'https://pontopro.com.br/docs/rep-p',
  },

  // CLT Rules & Defaults (Consolidação das Leis do Trabalho)
  clt: {
    toleranceMinutesPerPunch: 5,
    maxDailyToleranceMinutes: 10, // Art. 58 § 1º CLT
    minLunchBreakHoursShortShift: 0.25, // 15 mins for 4h-6h shifts (Art. 71 § 1º CLT)
    minLunchBreakHoursStandardShift: 1.0, // 1h for >6h shifts (Art. 71 CLT)
    nightShiftStartHour: 22, // 22:00
    nightShiftEndHour: 5, // 05:00 (Art. 73 CLT)
    nightHourMultiplier: 60 / 52.5, // 1 hour = 52 min e 30 seg (Art. 73 § 1º CLT)
    nightShiftSurchargePercent: 20, // Adicional noturno de 20%
    standardOvertimeWeekdayPercent: 50, // 50% dias úteis
    standardOvertimeWeekendPercent: 100, // 100% domingos e feriados
  },

  // Offline and Sync Rules
  offline: {
    maxPendingQueueSize: 2000,
    syncIntervalMs: 15000,
    dbName: 'pontopro_offline_store',
    dbVersion: 1,
  },
};
