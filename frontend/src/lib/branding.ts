/** Vite `base` is `/skydark/`; files in `public/` are served at that root. */
const base = import.meta.env.BASE_URL.endsWith("/")
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

export const publicLogoUrl = `${base}logo.png`;
export const publicFaviconUrl = `${base}favicon.png`;
