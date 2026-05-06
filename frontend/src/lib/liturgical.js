/* Liturgical color helpers */
export const liturgicalDot = (color) => {
  const map = {
    green: "bg-liturgical-green",
    violet: "bg-liturgical-violet",
    white: "bg-liturgical-white",
    red: "bg-liturgical-red",
    rose: "bg-liturgical-rose",
  };
  return map[color] || "bg-muted";
};

export const liturgicalBorder = (color) => {
  const map = {
    green: "border-liturgical-green",
    violet: "border-liturgical-violet",
    white: "border-liturgical-white",
    red: "border-liturgical-red",
    rose: "border-liturgical-rose",
  };
  return map[color] || "border-border";
};

export const liturgicalText = (color) => {
  const map = {
    green: "text-liturgical-green",
    violet: "text-liturgical-violet",
    white: "text-liturgical-white",
    red: "text-liturgical-red",
    rose: "text-liturgical-rose",
  };
  return map[color] || "text-foreground";
};

export const memberTileClass = (color) => {
  const map = {
    green: "bg-liturgical-green/15 text-liturgical-green",
    violet: "bg-liturgical-violet/15 text-liturgical-violet",
    white: "bg-liturgical-white/15 text-liturgical-white",
    red: "bg-liturgical-red/15 text-liturgical-red",
    rose: "bg-liturgical-rose/15 text-liturgical-rose",
    slate: "bg-secondary text-foreground",
  };
  return map[color] || "bg-secondary text-foreground";
};

export const initials = (name) => {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
};

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];
export const toRoman = (n) => (n >= 0 && n < ROMAN.length ? ROMAN[n] : String(n));

export const formatCivilDate = (d) => {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};
