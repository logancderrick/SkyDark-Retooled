/** Vite `base` is `/skydark/`; files in `public/` are served at that root. */
const base = import.meta.env.BASE_URL.endsWith("/")
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

export const publicLogoUrl = `${base}logo.png`;
export const publicFaviconUrl = `${base}favicon.png`;

/** Calendar weather hero (`public/`). Encode spaces so URLs stay valid after route remounts and across bases. */
export const weatherCardBackgroundUrl = `${base}${encodeURIComponent("Weather Card Background 6.png")}`;
