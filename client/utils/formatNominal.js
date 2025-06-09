export function formatCurrencyShort(value) {
    const options = { minimumFractionDigits: 0, maximumFractionDigits: 2 };

    if (value >= 1_000_000_000_000) {
        return `Rp ${(value / 1_000_000_000_000).toLocaleString('id-ID', options)} triliun`;
    } else if (value >= 1_000_000_000) {
        return `Rp ${(value / 1_000_000_000).toLocaleString('id-ID', options)} miliar`;
    } else if (value >= 1_000_000) {
        return `Rp ${(value / 1_000_000).toLocaleString('id-ID', options)} juta`;
    } else if (value >= 1_000) {
        return `Rp ${(value / 1_000).toLocaleString('id-ID', options)} ribu`;
    } else {
        return `Rp ${value.toLocaleString('id-ID')}`;
    }
}