const settings_dialog = document.querySelector("#settingsDialog");
const btn_open_settings_dialog = document.querySelector("#openSettingsDialog");
const btn_reset_settings_dialog = document.querySelector("#resetSettingsDialog");
const btn_close_settings_dialog = document.querySelector("#saveSettingsDialog");
const btn_generate_png = document.querySelector("#btnGeneratePixelGrid");

const setting_color1 = document.getElementById("color1");
const setting_color2 = document.getElementById("color2");
const setting_color3 = document.getElementById("color3");
const setting_color4 = document.getElementById("color4");
const setting_color5 = document.getElementById("color5");
const setting_colorEmpty = document.getElementById("colorEmpty");

const setting_squareSize = document.getElementById("squareSizeInput");
const setting_showMonthLabels = document.getElementById("showMonthLabelsCheckbox");
const setting_showLegend = document.getElementById("showLegendCheckbox");
const setting_scoreType = document.getElementById("scoreTypeSelect");
const setting_startOfWeek = document.getElementById("startOfWeekSelect");
const setting_layout = document.getElementById("layoutSelect");




function getExportSettings() {
    return {
        colors: {
            1: setting_color1.value,
            2: setting_color2.value,
            3: setting_color3.value,
            4: setting_color4.value,
            5: setting_color5.value,
            empty: setting_colorEmpty.value
        },
        // showMonthLabels: setting_showMonthLabels.checked,
        // showLegend: setting_showLegend.checked,
        scoreType: setting_scoreType.value,
        startOfWeek: parseInt(setting_startOfWeek.value, 10),
        squareSize: parseInt(setting_squareSize.value, 10) || 20,
        layout: setting_layout.value
    };
}


function get_pixel_color(pixel, scoreType, colorMap) {
    if (!pixel || !Array.isArray(pixel.scores) || pixel.scores.length === 0) {
        return colorMap.empty;
    }

    let score;

    switch (scoreType) {
        case "avg":
            score = average(pixel.scores);
            break;
        case "max":
            score = maximum(pixel.scores);
            break;
        case "first":
        default:
            score = pixel.scores[0];
            break;
    }

    return colorMap[score] || colorMap.empty;
}



function generatePixelPNG(data) {
    const {
        squareSize,
        colors,
        scoreType,
        showMonthLabels,
        showLegend,
        startOfWeek,
        layout
    } = getExportSettings();

    // Créer une map date => pixel
    const pixelMap = new Map();
    for (const pixel of data) {
        const date = new Date(pixel.date);
        if (isNaN(date)) continue;
        const iso = date.toISOString().split("T")[0];
        pixelMap.set(iso, pixel);
    }

    // Obtenir plage de dates
    const dates = [...pixelMap.keys()].map(d => new Date(d));
    if (dates.length === 0) return;
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    // Alignement début
    const firstDate = new Date(minDate);
    const firstDow = firstDate.getDay();
    const offset = (firstDow - startOfWeek + 7) % 7;
    firstDate.setDate(firstDate.getDate() - offset);

    // Générer tous les jours
    const allDays = [];
    const current = new Date(firstDate);
    while (current <= maxDate) {
        allDays.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }

    // Layout dimensions
    const getMonthKey = d => `${d.getFullYear()}-${d.getMonth()}`;
    const monthGroups = new Map();
    const weekGroups = new Map();

    for (const d of allDays) {
        const dayKey = d.toISOString().split("T")[0];
        const weekKey = getWeekKey(d, startOfWeek);
        const monthKey = getMonthKey(d);

        if (!weekGroups.has(weekKey)) weekGroups.set(weekKey, []);
        weekGroups.get(weekKey).push(d);

        if (!monthGroups.has(monthKey)) monthGroups.set(monthKey, []);
        monthGroups.get(monthKey).push(d);
    }

    // Choisir groupe de lignes/colonnes selon layout
    let groups;
    let direction; // "row"/"col"
    switch (layout) {
        case "vertical-weeks":
            groups = [...weekGroups.values()];
            direction = "col";
            break;
        case "horizontal-weeks":
            groups = [...weekGroups.values()];
            direction = "row";
            break;
        case "vertical-months":
            groups = [...monthGroups.values()];
            direction = "col";
            break;
        case "horizontal-months":
            groups = [...monthGroups.values()];
            direction = "row";
            break;
    }

    // Dimensions du canvas
    const cols = direction === "col" ? groups.length : 7;
    const rows = direction === "row" ? groups.length : 7;

    const width = cols * squareSize;
    const height = rows * squareSize;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Peinture
    for (let i = 0; i < groups.length; i++) {
        const days = groups[i];
        for (const d of days) {
            const dayOfWeek = (d.getDay() - startOfWeek + 7) % 7;
            const x = direction === "col" ? i * squareSize : dayOfWeek * squareSize;
            const y = direction === "row" ? i * squareSize : dayOfWeek * squareSize;

            const key = d.toISOString().split("T")[0];
            const pixel = pixelMap.get(key);
            const color = get_pixel_color(pixel, scoreType, colors);

            ctx.fillStyle = color;
            ctx.fillRect(x, y, squareSize, squareSize);
        }
    }

    // Export PNG
    const link = document.createElement("a");
    link.download = "pixels.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
}

// Utilitaire : key de semaine (ISO-like)
function getWeekKey(date, startOfWeek = 1) {
    const d = new Date(date);
    const day = (d.getDay() - startOfWeek + 7) % 7;
    d.setDate(d.getDate() - day);
    return d.toISOString().split("T")[0];
}



function close_and_save_settings_dialog() {
    // TODO: Get selected settingss
    // save selected settingss
    settings_dialog.close();
}

btn_open_settings_dialog.addEventListener("click", () => {
    settings_dialog.showModal();

    settings_dialog.addEventListener('click', (e) => {
        const rect = e.target.getBoundingClientRect();

        const clickedInDialog = (
            rect.top <= e.clientY &&
            e.clientY <= rect.top + rect.height &&
            rect.left <= e.clientX &&
            e.clientX <= rect.left + rect.width
        );

        // if (clickedInDialog === false) { close_and_save_settings_dialog(); }
    });
});

btn_close_settings_dialog.addEventListener("click", () => {
    close_and_save_settings_dialog();
});

btn_generate_png.addEventListener("click", () => {
    generatePixelPNG(current_data);
});