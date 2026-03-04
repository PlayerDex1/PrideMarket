export function formatCurrency(price: number, currency = 'PC'): string {
    const curr = currency.toLowerCase();

    if (curr.includes('adena')) {
        return price.toLocaleString('pt-BR');
    }

    return price.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

export function formatCompactPrice(price: number, currency = 'PC'): string {
    const isAdena = currency.toLowerCase().includes('adena');

    if (price >= 1_000_000_000) {
        if (isAdena) return `${(price / 1_000_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}B`;
        return `${(price / 1_000_000_000).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}B`;
    }
    if (price >= 1_000_000) {
        if (isAdena) return `${(price / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`;
        return `${(price / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}M`;
    }
    if (price >= 1_000) {
        if (isAdena) return `${(price / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}K`;
        return `${(price / 1_000).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}K`;
    }

    return formatCurrency(price, currency);
}
