/**
 * REP-P (Registrador Eletrônico de Ponto em Programa) - Portaria MTP 671/2021
 * Pure functions for hash chaining, AFD file generation, and receipt generation.
 */

import { computeSha256 } from '../utils/crypto';
import { APP_CONFIG } from '../config/app-config';
import { normalizeCnpj } from '../utils/cnpj';
import { TimeEvent, Company, Employee, PunchReceipt, EventType } from '../types';

/**
 * Computes SHA-256 digital digest for punch integrity and cryptographic chaining
 */
export function computeEventHash(params: {
  previousHash: string;
  nsr: number;
  companyCnpj: string;
  employeeCpf: string;
  occurredAt: string;
  eventType: string;
}): string {
  const cleanCnpj = normalizeCnpj(params.companyCnpj);
  const cleanCpf = params.employeeCpf.replace(/\D/g, '');
  const rawData = [
    params.previousHash || '0'.repeat(64),
    String(params.nsr).padStart(9, '0'),
    cleanCnpj,
    cleanCpf,
    params.occurredAt,
    params.eventType,
  ].join('|');

  return computeSha256(rawData);
}

/**
 * Verifies if an event's hash is cryptographically valid against the previous hash
 */
export function verifyEventIntegrity(
  event: TimeEvent,
  companyCnpj: string,
  employeeCpf: string
): boolean {
  const calculated = computeEventHash({
    previousHash: event.previous_hash,
    nsr: event.nsr,
    companyCnpj,
    employeeCpf,
    occurredAt: event.occurred_at,
    eventType: event.event_type,
  });

  return calculated === event.sha256_hash;
}

/**
 * Maps event types to official human-readable PT-BR terms
 */
export function getEventTypeName(type: EventType): string {
  switch (type) {
    case 'entry':
      return 'Entrada';
    case 'lunch_start':
      return 'Saída Intervalo';
    case 'lunch_end':
      return 'Retorno Intervalo';
    case 'exit':
      return 'Saída';
    case 'overtime_start':
      return 'Início Hora Extra';
    case 'overtime_end':
      return 'Fim Hora Extra';
    default:
      return type;
  }
}

/**
 * Formats a Date to Portaria 671 format: DDMMYYYY and HHMM
 */
export function formatAfdDateTime(isoString: string): { dateStr: string; timeStr: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(isoString));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value || '00';
  return {
    dateStr: `${part('day')}${part('month')}${part('year')}`,
    timeStr: `${part('hour')}${part('minute')}`,
  };
}

/**
 * Generates Comprovante de Registro de Ponto do Trabalhador
 * Pursuing requirements of Art. 79 & 80 da Portaria MTP 671/2021
 */
export function generatePunchReceipt(
  event: TimeEvent,
  company: Company,
  employee: Employee
): PunchReceipt {
  const receiptCode = `${normalizeCnpj(company.cnpj).slice(-4)}-${String(event.nsr).padStart(6, '0')}-${event.sha256_hash.slice(0, 8).toUpperCase()}`;

  return {
    nsr: event.nsr,
    company_cnpj: company.cnpj,
    company_name: company.corporate_name,
    employee_cpf: employee.cpf,
    employee_name: employee.name,
    employee_pis: employee.pis_nis,
    event_type: event.event_type,
    occurred_at: event.occurred_at,
    received_at: event.received_at,
    sha256_hash: event.sha256_hash,
    signature: `HASH-INTERNO-${event.sha256_hash.slice(0, 16).toUpperCase()}`,
    receipt_code: receiptCode,
    inpi_registration: APP_CONFIG.compliance.inpiRegistration,
    latitude: event.latitude,
    longitude: event.longitude,
    accuracy_meters: event.accuracy_meters,
  };
}

/**
 * Generates Portaria 671/2021 compliant AFD (Arquivo Fonte de Dados) string
 * 
 * Header:
 * Pos 1-9: 000000000 (NSR = 0)
 * Pos 10: 1 (Tipo de registro Header)
 * Pos 11: 1 (1 = CNPJ, 2 = CPF)
 * Pos 12-25: CNPJ empregador (14 dígitos)
 * Pos 26-39: CEI/CAEPF/CNO (14 dígitos vazios se não houver)
 * Pos 40-189: Razão social (150 chars)
 * Pos 190-206: Número de registro no INPI do programa (17 chars)
 * Pos 207-214: Data inicial (DDMMAAAA)
 * Pos 215-222: Data final (DDMMAAAA)
 * Pos 223-230: Data geração (DDMMAAAA)
 * Pos 231-234: Hora geração (HHMM)
 * 
 * Detail (Tipo 3 - Registro de Ponto):
 * Pos 1-9: NSR (9 dígitos sequencial)
 * Pos 10: 3 (Tipo de registro Ponto)
 * Pos 11-18: Data do evento (DDMMAAAA)
 * Pos 19-22: Hora do evento (HHMM)
 * Pos 23-34: PIS do empregado (11 ou 12 dígitos)
 * Pos 35-100: Hash SHA-256 (64 chars)
 * 
 * Trailer (Tipo 9):
 * Pos 1-9: 999999999
 * Pos 10: 9
 * Pos 11-19: Total de registros tipo 3
 */
export function generateAfdContent(params: {
  company: Company;
  events: Array<{ event: TimeEvent; employee: Employee }>;
  startDate: Date;
  endDate: Date;
}): string {
  const { company, events, startDate, endDate } = params;
  const cleanCnpj = normalizeCnpj(company.cnpj).padEnd(14, '0').slice(0, 14);
  const companyName = company.corporate_name.padEnd(150, ' ').slice(0, 150);
  const inpiReg = APP_CONFIG.compliance.inpiRegistration.padEnd(17, ' ').slice(0, 17);

  const startFormatted = formatAfdDateTime(startDate.toISOString()).dateStr;
  const endFormatted = formatAfdDateTime(endDate.toISOString()).dateStr;
  const nowFormatted = formatAfdDateTime(new Date().toISOString());

  // Header line
  const header = [
    '000000000',
    '1',
    '1',
    cleanCnpj,
    ''.padEnd(14, '0'),
    companyName,
    inpiReg,
    startFormatted,
    endFormatted,
    nowFormatted.dateStr,
    nowFormatted.timeStr,
  ].join('');

  // Event lines
  const detailLines: string[] = [];
  events.forEach(({ event, employee }) => {
    const dt = formatAfdDateTime(event.occurred_at);
    const nsrStr = String(event.nsr).padStart(9, '0');
    const pisClean = employee.pis_nis.replace(/\D/g, '').padEnd(12, '0').slice(0, 12);
    const hash64 = (event.sha256_hash || '').padEnd(64, '0').slice(0, 64);

    const line = `${nsrStr}3${dt.dateStr}${dt.timeStr}${pisClean}${hash64}`;
    detailLines.push(line);
  });

  // Trailer line
  const countStr = String(detailLines.length).padStart(9, '0');
  const trailer = `9999999999${countStr}`;

  return [header, ...detailLines, trailer].join('\r\n');
}

/**
 * Returns a non-official technical draft for review
 */
export function getTechnicalTerm(company: Company): string {
  return `
================================================================================
             RASCUNHO DE DOCUMENTO TÉCNICO: NÃO OFICIAL
                    PONTOPRO • EM DESENVOLVIMENTO
================================================================================

AVISO:
Este documento é apenas um rascunho informativo gerado pelo protótipo. Não é
atestado técnico oficial, declaração de homologação, certificação REP-P ou
assinatura de responsável técnico. Não deve ser assinado, protocolado ou usado
como comprovação de conformidade sem revisão especializada e validação legal.

1. DADOS DO SISTEMA:
Nome: ${APP_CONFIG.name}
Versão: ${APP_CONFIG.version}
Registro no INPI: ${APP_CONFIG.compliance.inpiRegistration || 'PENDENTE DE VALIDAÇÃO'}
Assinatura digital: NÃO CONFIGURADA
Fonte oficial de tempo: NÃO INTEGRADA

2. DADOS INFORMADOS DO EMPREGADOR:
Razão Social: ${company.corporate_name}
CNPJ: ${company.cnpj}

3. RECURSOS IMPLEMENTADOS NO PROTÓTIPO:
- Registro de eventos com carimbo de data/hora fornecido pelo dispositivo.
- Encadeamento interno de hashes SHA-256 para verificação de integridade.
- Exportação de registros em formato de texto que precisa ser validado contra o
  leiaute oficial aplicável antes de qualquer uso regulatório.
- Fila local de marcações offline com sincronização em lote.

4. ITENS QUE EXIGEM VALIDAÇÃO ANTES DE PRODUÇÃO:
- Enquadramento e requisitos aplicáveis ao REP-P e Portaria MTP nº 671/2021.
- Leiautes AFD/AEJ e comprovantes exigidos pela regulamentação vigente.
- Assinatura digital, carimbo de tempo e cadeia de custódia quando aplicáveis.
- Autenticação, autorização, isolamento multiempresa e auditoria de segurança.
- LGPD, finalidade, retenção e acesso a dados pessoais e imagens.

Gerado em: ${new Date().toLocaleString('pt-BR')}
Responsável técnico: NÃO INFORMADO
Assinatura: NÃO APLICÁVEL: RASCUNHO NÃO ASSINADO
================================================================================
`.trim();
}
