function generateSlug(title) {
    if (!title) return '';
    return title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '') // strip non-alphanumeric except spaces/hyphens
        .replace(/[\s-]+/g, '-')      // collapse whitespace/hyphens to single hyphens
        .replace(/^-+|-+$/g, '');     // strip leading/trailing hyphens
}

module.exports = generateSlug;
