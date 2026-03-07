export function formatCurrency(price: number, currency = 'PC'): string {
    return price.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

export function formatCompactPrice(price: number, currency = 'PC'): string {
    if (price >= 1_000_000_000) {
        return `${(price / 1_000_000_000).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}B`;
    }
    if (price >= 1_000_000) {
        return `${(price / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}M`;
    }
    if (price >= 1_000) {
        return `${(price / 1_000).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}K`;
    }

    return formatCurrency(price, currency);
}
