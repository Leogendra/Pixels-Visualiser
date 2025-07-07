function minimum(array) {
    if (array.length === 0) return 0;
    return array.reduce((acc, val) => Math.min(acc, val), array[0]);
}


function maximum(array) {
    if (array.length === 0) return 0;
    return array.reduce((acc, val) => Math.max(acc, val), array[0]);
}


function average(array) {
    array = array.filter(val => val !== null && val !== undefined);
    if (array.length === 0) return null;
    const somme = array.reduce((acc, val) => acc + val, 0);
    return somme / array.length;
};


function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}


function normalize_string(str) {
    // Remove accents, convert to lowercase and trim whitespace
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}


function escape_regex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


//////////////// Dates ////////////////

function pixel_format_date(input) {
    const date = new Date(input);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1);
    const dd = String(date.getDate());
    return `${yyyy}-${mm}-${dd}`;
}


function normalize_date(input) {
    const date = new Date(input);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}


function get_week_key(date, startOfWeek = 1) {
    const d = new Date(date);
    const day = (d.getDay() - startOfWeek + 7) % 7;
    d.setDate(d.getDate() - day);
    return d.toISOString().split("T")[0];
}


function get_month_key(date) { 
    return `${date.getFullYear()}-${date.getMonth()}`; 
}


//////////////// Colors ////////////////

function hex_to_RGB(hex) {
    hex = hex.replace("#", "");
    if (hex.length === 3) {
        hex = hex.split("").map(c => c + c).join("");
    }
    const bigint = parseInt(hex, 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}


function interpolate_RGB(a, b, t) {
    return {
        r: Math.round(a.r + (b.r - a.r) * t),
        g: Math.round(a.g + (b.g - a.g) * t),
        b: Math.round(a.b + (b.b - a.b) * t)
    };
}


function RGB_to_hex({ r, g, b }) {
    return "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");
}


function get_contrasting_text_color(bgColor, less=false) {
  const hex = bgColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
  if (less) {
    return luminance > 186 ? "#808080" : "#d3d3d3";
  }
  return luminance > 186 ? "#000000" : "#ffffff";
}
