/** Normaliza CNPJ numérico legado ou alfanumérico para comparação consistente. */
export function normalizeCnpj(raw: string): string {
  return String(raw || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
}

/** Valida estrutura e dígitos verificadores do CNPJ numérico ou alfanumérico. */
export function isValidCnpj(raw: string): boolean {
  const cnpj = normalizeCnpj(raw);
  if (cnpj.length !== 14 || !/^[A-Z0-9]{12}\d{2}$/.test(cnpj) || /^(.)\1{13}$/.test(cnpj)) return false;
  const value = (char: string) => char.charCodeAt(0) - 48;
  const calc = (base: string, weights: number[]) => {
    const sum = base.split('').reduce((acc, char, i) => acc + value(char) * weights[i], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  const first = calc(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = calc(cnpj.slice(0, 12) + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return cnpj.endsWith(`${first}${second}`);
}
