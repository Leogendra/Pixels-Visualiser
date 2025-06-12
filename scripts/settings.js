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
const setting_firstDayOfWeek = document.getElementById("startOfWeekSelect");
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
        scoreType: setting_scoreType.value,
        firstDayOfWeek: parseInt(setting_firstDayOfWeek.value, 10),
        squareSize: parseInt(setting_squareSize.value, 10) || 20,
        layout: setting_layout.value
    };
}


function get_pixel_color(pixel, scoreType, colorMap) {
    if (!pixel || !Array.isArray(pixel.scores) || pixel.scores.length === 0) {
        return colorMap.empty;
    }

    let score;

    if (scoreType == "avg") {
        score = average(pixel.scores);
    }
    else if (scoreType == "max") {
        score = maximum(pixel.scores);
    }
    else if (scoreType == "first") {
        score = pixel.scores[0];
    }

    if (!Number.isInteger(score)) {
        const floor = Math.floor(score);
        const ceil = Math.ceil(score);
        const t = score - floor;

        const colorA = hex_to_RGB(colorMap[floor] || colorMap.empty);
        const colorB = hex_to_RGB(colorMap[ceil] || colorMap.empty);
        const blended = interpolate_RGB(colorA, colorB, t);
        return RGB_to_hex(blended);
    }

    return colorMap[score] || colorMap.empty;
}



function generate_pixels_PNG(data) {
    const {
        squareSize,
        colors,
        scoreType,
        firstDayOfWeek,
        layout
    } = getExportSettings();

    // Create a map of pixels by date
    const pixel_map = new Map();
    for (const pixel of data) {
        const normalizedDate = normalize_date(pixel.date);
        pixel_map.set(normalizedDate, pixel);
    }

    // Obtain all dates from the pixel map
    const dates = [...pixel_map.keys()].map(d => new Date(d));
    if (dates.length === 0) return;
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    // Align the first date to the start of the week defined by firstDayOfWeek
    const firstDate = new Date(minDate);
    const firstDay = firstDate.getDay();
    const offset = (firstDay - firstDayOfWeek + 7) % 7;
    firstDate.setDate(firstDate.getDate() - offset);

    // Generate all dates from the first date to the last date
    const allDays = [];
    const current = new Date(firstDate);
    while (current <= maxDate) {
        allDays.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }

    // Get all the weeks and months numbers
    const monthGroups = new Map();
    const weekGroups = new Map();
    for (const d of allDays) {
        const weekKey = get_week_key(d, firstDayOfWeek);
        const monthKey = get_month_key(d);

        if (!weekGroups.has(weekKey)) { weekGroups.set(weekKey, []); }
        weekGroups.get(weekKey).push(d);

        if (!monthGroups.has(monthKey)) { monthGroups.set(monthKey, []); }
        monthGroups.get(monthKey).push(d);
    }

    // Choose layout and direction
    groups = [...monthGroups.values()];
    let direction = "row";

    if (layout.includes("vertical")) {
        direction = "col";
    }
    if (layout.includes("weeks")) {
        groups = [...weekGroups.values()];
    }

    // Dimensions of the grid
    const cols = direction === "col" ? groups.length : 7;
    const rows = direction === "row" ? groups.length : 7;

    const width = cols * squareSize;
    const height = rows * squareSize;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Draw the grid
    let firstPixelDrawn = false;
    for (let i = 0; i < groups.length; i++) {
        const days = groups[i];
        for (const d of days) {
            const dayOfWeek = (d.getDay() - firstDayOfWeek + 7) % 7;
            const x = direction === "col" ? i * squareSize : dayOfWeek * squareSize;
            const y = direction === "row" ? i * squareSize : dayOfWeek * squareSize;

            const key = d.toISOString().split("T")[0];
            const pixel = pixel_map.get(key);
            let color = get_pixel_color(pixel, scoreType, colors);
            if (!firstPixelDrawn) {
                if (color === colors.empty) {
                    continue; 
                }
                else {
                    firstPixelDrawn = true;
                }
            }
            ctx.fillStyle = color;
            ctx.fillRect(x, y, squareSize, squareSize);
        }
    }

    // display png in a new window
    const pngWindow = window.open("", "_blank");
    if (pngWindow) {
        // Avoid document.write() which is deprecated
        const doc = pngWindow.document;
        const html = doc.createElement("html");
        const head = doc.createElement("head");
        const body = doc.createElement("body");
        const title = doc.createElement("title");
        title.textContent = "Pixels PNG";
        head.appendChild(title);
        const img = doc.createElement("img");
        img.src = canvas.toDataURL("image/png");
        img.alt = "Pixels PNG";
        img.style.maxWidth = "100%";
        img.style.height = "auto";
        body.appendChild(img);
        html.appendChild(head);
        html.appendChild(body);
        doc.replaceChild(html, doc.documentElement);
    }
    else {
        // Export PNG
        const link = document.createElement("a");
        link.download = "pixels.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
    }

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
    generate_pixels_PNG(current_data);
});