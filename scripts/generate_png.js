const dialog_settings = document.querySelector("#settingsDialog");
const btn_open_dialog_settings = document.querySelector("#openSettingsDialog");
const btn_reset_dialog_settings = document.querySelector("#resetSettingsDialog");
const btn_save_dialog_settings = document.querySelector("#saveSettingsDialog");
const btn_generate_png = document.querySelector("#btnGeneratePixelGrid");
const btn_download_png = document.querySelector("#btnDownloadPixelGrid");
const div_result_png = document.querySelector("#pixelGridResults");
const result_png = document.querySelector(".pixel-png-img");

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

let pixelsCanvas;




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
    let direction = layout.includes("vertical") ? "col" : "row";
    const isWeek = layout.includes("weeks");
    const pixels_groups = isWeek ? [...weekGroups.values()] : [...monthGroups.values()];

    // Dimensions of the grid
    if (pixels_groups.length === 0) {
        console.warn("No groups found for the selected layout.");
        return;
    }

    const maxGroupLength = maximum(pixels_groups.map(g => g.length));
    const cols = direction === "col" ? pixels_groups.length : maxGroupLength;
    const rows = direction === "row" ? pixels_groups.length : maxGroupLength;

    pixelsCanvas = document.createElement("canvas");
    pixelsCanvas.width = cols * squareSize;
    pixelsCanvas.height = rows * squareSize;
    const ctx = pixelsCanvas.getContext("2d");

    // Draw the grid
    let firstPixelDrawn = false;
    for (let i = 0; i < pixels_groups.length; i++) {
        const days = pixels_groups[i];
        for (let j = 0; j < days.length; j++) {
            const d = days[j];
            const dayOfWeek = (d.getDay() - firstDayOfWeek + 7) % 7; // + 7 to handle negative values
            const normalizedDate = normalize_date(d);
            const pixel = pixel_map.get(normalizedDate);
            const color = get_pixel_color(pixel, scoreType, colors);

            let x, y;
            if (direction === "col") {
                x = i * squareSize;
                y = isWeek ? (dayOfWeek * squareSize) : (j * squareSize);
            } 
            else {
                y = i * squareSize;
                x = isWeek ? (dayOfWeek * squareSize) : (j * squareSize);
            }

            if (!firstPixelDrawn) { // TODO: add option to entirely fill the grid with empty pixels (AKA background color)
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

    result_png.innerHTML = "";
    const img = document.createElement("img");
    img.src = pixelsCanvas.toDataURL("image/png");
    img.alt = "Pixels image";
    if (direction === "row") { result_png.style.height = "600px"; }
    else { result_png.style.height = "auto"; }
    result_png.appendChild(img);

    btn_download_png.style.display = "block";
}



function close_and_save_dialog_settings() {
    // TODO: Get selected settingss
    // save selected settingss
    dialog_settings.close();
    console.log("Settings saved.");
}

btn_open_dialog_settings.addEventListener("click", () => {
    dialog_settings.showModal();

    dialog_settings.addEventListener('click', (e) => {
        const rect = e.target.getBoundingClientRect();

        const clickedInDialog = (
            rect.top <= e.clientY &&
            e.clientY <= rect.top + rect.height &&
            rect.left <= e.clientX &&
            e.clientX <= rect.left + rect.width
        );

        // if (clickedInDialog === false) { close_and_save_dialog_settings(); }
    });
});

btn_save_dialog_settings.addEventListener("click", () => {
    console.log("Saving settings...");
    close_and_save_dialog_settings();
});

btn_generate_png.addEventListener("click", () => {
    generate_pixels_PNG(current_data);
});

btn_download_png.addEventListener("click", () => {
    if (!pixelsCanvas) {
        alert("Please generate the pixel grid first.");
        return;
    }
    const link = document.createElement("a");
    link.download = "pixels.png";
    link.href = pixelsCanvas.toDataURL("image/png");
    link.click();
});