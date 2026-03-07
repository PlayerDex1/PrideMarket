/**
 * PrideMarket – format utilities
 */

/** Remove " was added on the market" que vem do parser do Discord */
export function cleanItemName(name: string): string {
    return name.replace(/\s*was added on the market\.?\s*/gi, '').trim();
}

/** Sempre 3 casas decimais no estilo pt-BR (vírgula decimal) */
export function formatPrice(value: number): string {
    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
    });
}

/** Versão compacta para contextos pequenos: 1.234,567 → "1,2k" */
export function formatCompactPrice(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
    return formatPrice(value);
}

/** Extrai quantidade de nomes como "Adena [250000000 pcs.]" */
export function extractQuantity(name: string): number {
    const m =
        name.match(/\[\s*(\d[\d.]*)\s*pcs\.?\]/i) ||
        name.match(/\bx\s*(\d+)\b/i) ||
        name.match(/\b(\d+)\s*x\b/i);
    if (!m) return 1;
    return parseInt(m[1].replace(/\./g, ''), 10);
}

/** Retorna true se o timestamp for de menos de 60 segundos atrás */
export function isNew(timestamp: string): boolean {
    return Date.now() - new Date(timestamp).getTime() < 60_000;
}

/** Formata timestamp como "HH:MM:SS" */
export function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

/** Formata timestamp como "DD/MM HH:MM" */
export function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/** Normaliza nome para busca (remove +N do início) */
export function normalizeItemName(name: string): string {
    return cleanItemName(name).replace(/^\+\d+\s*/, '').trim();
}
