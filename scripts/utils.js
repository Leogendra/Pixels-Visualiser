function minimum(tableau) {
    if (tableau.length === 0) return 0;
    return tableau.reduce((acc, val) => Math.min(acc, val), tableau[0]);
}


function maximum(tableau) {
    if (tableau.length === 0) return 0;
    return tableau.reduce((acc, val) => Math.max(acc, val), tableau[0]);
}


function average(tableau) {
    if (tableau.length === 0) return 0;
    const somme = tableau.reduce((acc, val) => acc + val, 0);
    return somme / tableau.length;
};


function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}