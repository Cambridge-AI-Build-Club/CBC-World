export const FORM_EMBED_URL = import.meta.env.VITE_FORM_EMBED_URL?.trim() || '';
export const FORM_LINK = import.meta.env.VITE_FORM_LINK?.trim() || FORM_EMBED_URL.replace(/[?&]embedded=true/, '');
