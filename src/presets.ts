/**
 * A small curated set of 4-color "popular palette" style starting points
 * for a theme editor UI's quick-palette generator, in the spirit of
 * sites like Color Hunt. These are original combinations, not scraped or
 * reproduced from any specific external source.
 */

export interface PresetPalette {
  id: string;
  name: string;
  colors: [string, string, string, string];
}

export const PRESET_PALETTES: PresetPalette[] = [
  { id: "sunset", name: "Sunset", colors: ["#0b132b", "#1c2541", "#ff6b6b", "#f9f5eb"] },
  { id: "ocean-mist", name: "Ocean Mist", colors: ["#03045e", "#0077b6", "#90e0ef", "#caf0f8"] },
  { id: "forest", name: "Forest", colors: ["#1b3a2f", "#2f6b4f", "#a3c9a8", "#f4f1de"] },
  { id: "berry", name: "Berry", colors: ["#2b0f3a", "#7b2d8b", "#e05797", "#fff0f5"] },
  { id: "citrus", name: "Citrus", colors: ["#1a1a1a", "#ff9f1c", "#ffd166", "#fef9ef"] },
  { id: "midnight", name: "Midnight", colors: ["#0d1321", "#1d2d44", "#3e5c76", "#f0ebd8"] },
  { id: "desert", name: "Desert", colors: ["#43291f", "#c97b3d", "#e8c07d", "#f7ecdd"] },
  { id: "mint", name: "Mint", colors: ["#0f2419", "#2d6a4f", "#95d5b2", "#f1faee"] },
  { id: "rosewater", name: "Rosewater", colors: ["#3d2b3d", "#a4508b", "#f5c1c8", "#fff5f2"] },
  { id: "slate", name: "Slate & Coral", colors: ["#1e293b", "#475569", "#fb7185", "#f8fafc"] },
  { id: "amber-dusk", name: "Amber Dusk", colors: ["#241623", "#8c2f39", "#e8871e", "#fdf6e3"] },
  { id: "lagoon", name: "Lagoon", colors: ["#012a2d", "#0e7c7b", "#17bebb", "#eef7f6"] },
  { id: "plum", name: "Plum", colors: ["#22092c", "#872341", "#be3144", "#f2f2f2"] },
  { id: "meadow", name: "Meadow", colors: ["#1a2e1a", "#4c7a3f", "#c8e6a0", "#fbfbef"] },
  { id: "charcoal-gold", name: "Charcoal & Gold", colors: ["#1c1c1c", "#3a3a3a", "#d4af37", "#f5f0e6"] },
  { id: "lavender-fields", name: "Lavender Fields", colors: ["#231942", "#5e548e", "#be95c4", "#f8f4ff"] },
  { id: "arctic", name: "Arctic", colors: ["#12232e", "#1f4959", "#79b8c9", "#eef6f8"] },
  { id: "neon-nights", name: "Neon Nights", colors: ["#0d0221", "#190061", "#ff2079", "#00f6ff"] },
];
