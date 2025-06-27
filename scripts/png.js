const dialog_settings = document.querySelector("#dialogSettings");
const btn_open_dialog_settings = document.querySelector("#openImageSettingsDialog");
const btn_reset_dialog_settings = document.querySelector("#resetSettingsDialog");
const btn_cancel_dialog_settings = document.querySelector("#cancelSettingsDialog");
const btn_save_dialog_settings = document.querySelector("#saveSettingsDialog");
const btn_generate_png = document.querySelector("#btnGeneratePixelGrid");
const btn_download_png = document.querySelector("#btnDownloadPixelGrid");
const div_result_png = document.querySelector("#pixelGridResults");
const result_png = document.querySelector(".pixel-png-img");

const setting_color1 = document.querySelector("#color1");
const setting_color2 = document.querySelector("#color2");
const setting_color3 = document.querySelector("#color3");
const setting_color4 = document.querySelector("#color4");
const setting_color5 = document.querySelector("#color5");
const setting_colorEmpty = document.querySelector("#colorEmpty");

const setting_squareSize = document.querySelector("#squareSizeInput");
const setting_showMonthLabels = document.querySelector("#showMonthLabelsCheckbox");
const setting_showLegend = document.querySelector("#showLegendCheckbox");
const setting_scoreType = document.querySelector("#scoreTypeSelect");
const setting_firstDayOfWeek = document.querySelector("#startOfWeekSelect");
const setting_layout = document.querySelector("#layoutSelect");

let pixelsCanvas;




function get_image_settings() {
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


function set_image_settings(settings) {
    setting_color1.value = settings.colors[1];
    setting_color2.value = settings.colors[2];
    setting_color3.value = settings.colors[3];
    setting_color4.value = settings.colors[4];
    setting_color5.value = settings.colors[5];
    setting_colorEmpty.value = settings.colors.empty;
    setting_scoreType.value = settings.scoreType;
    setting_firstDayOfWeek.value = settings.firstDayOfWeek.toString();
    setting_squareSize.value = settings.squareSize.toString();
    setting_layout.value = settings.layout;
}


function get_user_colors() {
    return [
        setting_color1.value,
        setting_color2.value,
        setting_color3.value,
        setting_color4.value,
        setting_color5.value,
        setting_colorEmpty.value
    ];
}


function get_pixel_color(pixel, colors, scoreType) {

    if (!pixel || !Array.isArray(pixel.scores) || pixel.scores.length === 0) {
        return colors.empty;
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

        const colorA = hex_to_RGB(colors[floor] || colors.empty);
        const colorB = hex_to_RGB(colors[ceil] || colors.empty);
        const blended = interpolate_RGB(colorA, colorB, t);
        return RGB_to_hex(blended);
    }

    return colors[score] || colors.empty;
}



function generate_pixels_PNG(data) {
    const {
        colors,
        layout,
        scoreType,
        squareSize,
        firstDayOfWeek,
    } = get_image_settings();

    // Choose layout and direction
    const direction = layout.includes("vertical") ? "col" : "row";
    const isWeek = layout.includes("weeks");

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
    if (isWeek) {
        const firstDay = firstDate.getDay();
        const offset = (firstDay - firstDayOfWeek + 7) % 7;
        firstDate.setDate(firstDate.getDate() - offset);
    }

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

    // Dimensions of the grid
    const pixels_groups = isWeek ? [...weekGroups.values()] : [...monthGroups.values()];
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
            const color = get_pixel_color(pixel, colors, scoreType);

            let x, y;
            if (direction === "col") {
                x = i * squareSize;
                y = isWeek ? (dayOfWeek * squareSize) : (j * squareSize);
            }
            else {
                y = i * squareSize;
                x = isWeek ? (dayOfWeek * squareSize) : (j * squareSize);
            }

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

    const img = document.createElement("img");
    img.src = pixelsCanvas.toDataURL("image/png");
    img.alt = "Pixels image";

    result_png.innerHTML = "";
    result_png.appendChild(img);
    if (direction === "row") { result_png.style.height = "600px"; }
    else { result_png.style.height = "auto"; }

    btn_download_png.style.display = "block";
}


async function download_pixels_PNG() {
    if (!pixelsCanvas) {
        alert("Please generate the pixel grid first.");
        return;
    }
    const link = document.createElement("a");
    link.download = "pixels.png";
    link.href = pixelsCanvas.toDataURL("image/png");
    link.click();
}


function open_dialog_settings() {
    dialog_settings.showModal();
    dialog_settings.addEventListener('click', handle_click_dialog);
}


function close_dialog_settings() {
    set_image_settings(png_settings);
    dialog_settings.close();
    dialog_settings.removeEventListener('click', handle_click_dialog);
}


function close_and_save_dialog_settings() {
    png_settings = get_image_settings();
    store_settings();
    dialog_settings.close();
    dialog_settings.removeEventListener('click', handle_click_dialog);
}


function handle_click_dialog(e) {
    if (e.target === dialog_settings) {
        close_dialog_settings();
    }
}




btn_open_dialog_settings.addEventListener("click", () => {
    open_dialog_settings();
});

btn_reset_dialog_settings.addEventListener("click", () => {
    set_image_settings(png_default_settings);
});

btn_cancel_dialog_settings.addEventListener("click", () => {
    close_dialog_settings();
});

btn_save_dialog_settings.addEventListener("click", () => {
    close_and_save_dialog_settings();
});

btn_generate_png.addEventListener("click", () => {
    generate_pixels_PNG(current_data);
});

btn_download_png.addEventListener("click", () => {
    download_pixels_PNG();
});