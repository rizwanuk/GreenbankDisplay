// src/utils/fontMap.js
// Convert a sheet token (e.g., "Amiri" or "font-arabic") into a CSS font-family string.

export function toFontFamilyString(token, isArabic = false) {
  if (!token) return isArabic ? "'Amiri', serif" : "'Poppins', sans-serif";

  // t = basic lowercase; c = compact (no spaces/dashes/underscores)
  const t = String(token).trim().toLowerCase();
  const c = t.replace(/[\s\-_]+/g, "");

  const eq = (...keys) => keys.some(k => k === t || k === c);

  // Arabic options
  if (eq("amiri", "font-arabic", "fontamiri"))               return "'Amiri', serif";
  if (eq("cairo", "font-cairo", "fontcairo"))                return "'Cairo', sans-serif";
  if (eq("tajawal", "font-tajawal", "fonttajawal"))          return "'Tajawal', sans-serif";
  if (eq("readexpro", "readex", "readex-pro", "font-readexpro", "fontreadexpro"))
    return "'Readex Pro', sans-serif";
  if (eq("lalezar", "font-lalezar", "fontlalezar"))          return "'Lalezar', cursive";

  // Latin options
  if (eq("poppins", "font-poppins", "fontpoppins"))          return "'Poppins', sans-serif";
  if (eq("inter", "font-inter", "fontinter"))                return "'Inter', sans-serif";
  if (eq("rubik", "font-rubik", "fontrubik"))                return "'Rubik', sans-serif";

  // Safe defaults
  return isArabic ? "'Amiri', serif" : "'Poppins', sans-serif";
}

// Convenience: build the inline style object for a component wrapper.
export function toFontVars(themeSection) {
  return {
    "--font-eng": toFontFamilyString(themeSection?.fontEng, false),
    "--font-ar":  toFontFamilyString(themeSection?.fontAra, true),
  };
}
