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
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


function parse_logical_string(expr) {
    /*
        Parses a logical expression string into a CNF (Conjunctive Normal Form) array
        Supports parentheses and logical operators: || (OR), && (AND)
        && operator has higher precedence than ||
        Example: "a || b && c" <=> "a || (b && c)" becomes [["a", "b"], ["a", "c"]] in CNF, meaning "(a OR b) AND (a OR c)"
    */
    const regex = /\(|\)|\|\||&&|[^()&|]+/g;
    const tokens = expr.match(regex).map(token => normalize_string(token)).filter(Boolean);
    console.log(`Tokens: ${tokens}`);

    let index = 0;
    function parse_expression() {
        let left = parse_and();
        while (tokens[index] === "||") {
            index++;
            const right = parse_and();
            left = { type: "OR", left, right };
        }
        return left;
    }

    function parse_and() {
        let left = parse_term();
        while (tokens[index] === "&&") {
            index++;
            const right = parse_term();
            left = { type: "AND", left, right };
        }
        return left;
    }

    function parse_term() {
        const token = tokens[index++];
        if (token === "(") {
            const expr = parse_expression();
            if (tokens[index++] !== ")") throw new Error("Mismatched parenthesis");
            return expr;
        }
        return { type: "TERM", value: token };
    }
    const ast = parse_expression();
    console.log(`Parsed AST: ${JSON.stringify(ast)}`);

    function convert_to_CNF(node) {
        if (node.type === "TERM") return node;

        if (node.type === "AND") {
            return {
                type: "AND",
                left: convert_to_CNF(node.left),
                right: convert_to_CNF(node.right)
            };
        }

        if (node.type === "OR") {
            const left = convert_to_CNF(node.left);
            const right = convert_to_CNF(node.right);

            if (left.type === "AND") {
                return {
                    type: "AND",
                    left: convert_to_CNF({ type: "OR", left: left.left, right }),
                    right: convert_to_CNF({ type: "OR", left: left.right, right })
                };
            }

            if (right.type === "AND") {
                return {
                    type: "AND",
                    left: convert_to_CNF({ type: "OR", left, right: right.left }),
                    right: convert_to_CNF({ type: "OR", left, right: right.right })
                };
            }

            return { type: "OR", left, right };
        }
    }

    const cnf_ast = convert_to_CNF(ast);

    function flatten_to_array(node) {
        if (node.type === "TERM") {
            return [[node.value]]; 
        }

        if (node.type === "OR") {
            const left = flatten_to_array(node.left);
            const right = flatten_to_array(node.right);
            return [[...left.flat(), ...right.flat()]];
        }

        if (node.type === "AND") {
            const left = flatten_to_array(node.left);
            const right = flatten_to_array(node.right);
            return [...left, ...right];
        }

        return [];
    }

    return flatten_to_array(cnf_ast);
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
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
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


function get_contrasting_text_color(bgColor, less = false) {
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
