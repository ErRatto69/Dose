/**
 * Normalizes text by stripping diacritics/accents (e.g., "Jägermeister" -> "jagermeister", "Caffè" -> "caffe")
 * and converting to lowercase for accent-insensitive search.
 */
export const normalizeSearchText = (text?: string | null): string => {
    if (!text) return '';
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
};

/**
 * Checks if any of the candidate fields match the search query (accent-insensitive).
 */
export const matchesSearchQuery = (
    query: string,
    ...fields: Array<string | null | undefined>
): boolean => {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return true;

    return fields.some((field) => normalizeSearchText(field).includes(normalizedQuery));
};