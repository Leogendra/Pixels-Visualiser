function minimum(tableau) {
    if (tableau.length === 0) return 0;
    return tableau.reduce((acc, val) => Math.min(acc, val), tableau[0]);
}


function maximum(tableau) {
    if (tableau.length === 0) return 0;
    return tableau.reduce((acc, val) => Math.max(acc, val), tableau[0]);
}


function average(tableau) {
    tableau = tableau.filter(val => val !== null && val !== undefined);
    if (tableau.length === 0) return null;
    const somme = tableau.reduce((acc, val) => acc + val, 0);
    return somme / tableau.length;
};


function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}


function normalize_string(str) {
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}


function normalize_date(input) {
    const date = new Date(input);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1);
    const dd = String(date.getDate());
    return `${yyyy}-${mm}-${dd}`;
}