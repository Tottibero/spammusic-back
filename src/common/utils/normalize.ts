// utils/normalize.ts
export function normalizeForSearch(s: string) {
  return s
    .normalize('NFD')            // separa diacríticos
    .replace(/\p{Diacritic}/gu, '') // quita diacríticos
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
