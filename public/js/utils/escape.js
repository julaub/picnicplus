// HTML-escape untrusted strings before interpolating them into innerHTML.
// Applies to anything user-supplied (names, dates) or third-party
// (OSM tags, Nominatim results). Trusted locale strings don't need it.
export const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
