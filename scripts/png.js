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
const setting_borderSize = document.querySelector("#borderSizeInput");
const setting_showBorder = document.querySelector("#showBorderCheckbox");
const setting_showLegend = document.querySelector("#showLegendCheckbox");
const setting_showDays = document.querySelector("#showDaysCheckbox");
const setting_showFilter = document.querySelector("#showFilterSelect");

const setting_scoreType = document.querySelector("#scoreTypeSelect");
const setting_layout = document.querySelector("#layoutSelect");

// Compare settings
const hr_filter = document.querySelector("#hr-filter");
const div_compareSearchOptions1 = document.querySelector("#compareSearchOptions1");
const label_compareSelect1 = document.querySelector("#labelCompareSelect1");
const compareSelect1 = document.querySelector("#compareSelect1");
const compareWordInput1 = document.querySelector("#compareWordInput1");
const compareTagSelect1 = document.querySelector("#compareTagSelect1");

const div_compareSearchOptions2 = document.querySelector("#compareSearchOptions2");
const label_compareSelect2 = document.querySelector("#labelCompareSelect2");
const compareSelect2 = document.querySelector("#compareSelect2");
const compareWordInput2 = document.querySelector("#compareWordInput2");
const compareTagSelect2 = document.querySelector("#compareTagSelect2");

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
        firstDayOfWeek: parseInt(weekday_frequency_select.value, 10),
        squareSize: parseInt(setting_squareSize.value, 10) || 20,
        borderSize: parseInt(setting_borderSize.value, 10) || 1,
        showBorder: setting_showBorder.checked,
        showLegend: setting_showLegend.checked,
        showDays: setting_showDays.checked,
        showFilter: setting_showFilter.value,
        scoreType: setting_scoreType.value,
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
    setting_squareSize.value = settings.squareSize.toString();
    setting_borderSize.value = settings.borderSize.toString();
    setting_showBorder.checked = settings.showBorder;
    setting_showLegend.checked = settings.showLegend;
    setting_showDays.checked = settings.showDays;
    setting_showFilter.value = settings.showFilter.toString();
    setting_scoreType.value = settings.scoreType;
    setting_layout.value = settings.layout;

    // First day of week
    weekday_frequency_select.value = settings.firstDayOfWeek.toString();

    set_filter_display();
}


function get_user_colors(scores_map = null) {
    const colors_array = [
        setting_color1.value,
        setting_color2.value,
        setting_color3.value,
        setting_color4.value,
        setting_color5.value,
        setting_colorEmpty.value
    ];
    if (scores_map) {
        return colors_array.filter((color, index) => {
            return (scores_map[index + 1] !== undefined);
        });
    }
    else {
        return colors_array;
    }
}


function get_pixel_color(scores, colors, scoreType) {

    if (!Array.isArray(scores) || scores.length === 0) {
        return colors.empty;
    }

    let score;
    if (scoreType == "max") {
        score = maximum(scores);
    }
    else if (scoreType == "min") {
        score = minimum(scores);
    }
    else if (scoreType == "first") {
        score = scores[0];
    }
    else if (scoreType == "last") {
        score = scores[scores.length - 1];
    }
    else if (scoreType == "rounded") {
        score = Math.round(average(scores));
    }
    else { // avg, gradient, etc
        score = average(scores);
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


async function set_tags_selects() {
    const all_tags = Object.keys(tag_stats.counts);
    all_tags.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    if (!all_tags || all_tags.length === 0) {
        compareTagSelect1.innerHTML = "<option value=''>No tags available</option>";
        compareTagSelect2.innerHTML = "<option value=''>No tags available</option>";
        return;
    }
    compareTagSelect1.innerHTML = "<option value=''>Select a tag</option>";
    compareTagSelect2.innerHTML = "<option value=''>Select a tag</option>";
    all_tags.forEach(tag => {
        const option1 = document.createElement("option");
        option1.value = tag;
        option1.textContent = tag;
        compareTagSelect1.appendChild(option1);
        const option2 = document.createElement("option");
        option2.value = tag;
        option2.textContent = tag;
        compareTagSelect2.appendChild(option2);
    });
    compareTagSelect1.value = "";
    compareTagSelect2.value = "";
}



async function generate_pixels_PNG(data) {
    const {
        colors,
        firstDayOfWeek,
        squareSize,
        borderSize,
        showBorder,
        showLegend,
        showDays,
        scoreType,
        layout
    } = get_image_settings();

    data = get_compare_settings(data);

    // Choose layout and direction
    const direction = layout.includes("vertical") ? "col" : "row";
    const isWeek = layout.includes("weeks");
    const textColor = get_contrasting_text_color(colors.empty);
    const lightTextColor = get_contrasting_text_color(colors.empty, less=true);

    // Create a map of pixels by date
    const pixel_map = new Map();
    for (const pixel of data) {
        const normalizedDate = normalize_date(pixel.date);
        pixel_map.set(normalizedDate, pixel);
    }

    // Obtain all dates from the pixel map
    const dates = [...pixel_map.keys()].map(d => new Date(d));
    if (dates.length === 0) { 
        return; 
    }
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
        return;
    }

    const maxGroupLength = maximum(pixels_groups.map(g => g.length));
    const cols = direction === "col" ? pixels_groups.length : maxGroupLength;
    const rows = direction === "row" ? pixels_groups.length : maxGroupLength;

    pixelsCanvas = document.createElement("canvas");

    const legendPadding = showLegend ? (squareSize * 1.3) : (squareSize * 0.3);
    pixelsCanvas.width = cols * squareSize + legendPadding + (squareSize * 0.3); // Add padding for style in the bottom/right
    pixelsCanvas.height = rows * squareSize + legendPadding + (squareSize * 0.3);

    const ctx = pixelsCanvas.getContext("2d");
    ctx.fillStyle = textColor;
    ctx.font = `${squareSize * 0.25}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = colors.empty;
    ctx.fillRect(0, 0, pixelsCanvas.width, pixelsCanvas.height);   

    
    
    // Draw the grid
    let lastYear = null;
    let lastMonth = null;
    let firstPixelDrawn = true;
    pixels_groups.forEach((days, i) => {
        days.forEach((d, j) => {
            const normalizedDate = normalize_date(d);
            const pixel = pixel_map.get(normalizedDate);

            const dayOfWeek = (d.getDay() - firstDayOfWeek + 7) % 7; // + 7 to handle negative values
            const color = get_pixel_color(pixel?.scores, colors, scoreType);

            // Labels for legend
            const year = d.getFullYear();
            const month = d.getMonth();
            const monthLabel = d.toLocaleString("default", { month: "short" });

            // Avoid drawing the first pixels if they are empty
            if (!firstPixelDrawn) {
                if (color === colors.empty) {
                    return; // "continue" for the foreach
                }
                else {
                    firstPixelDrawn = true;
                }
            }
            
            // Calculate the position of the pixel
            let x, y;
            if (direction === "col") {
                x = i * squareSize;
                y = isWeek ? (dayOfWeek * squareSize) : (j * squareSize);
            }
            else {
                y = i * squareSize;
                x = isWeek ? (dayOfWeek * squareSize) : (j * squareSize);
            }

            x += legendPadding;
            y += legendPadding;


            // Draw the legend labels for month and year
            if (showLegend && (j === (days.length - 1))) {
                
                ctx.font = `bold ${squareSize * 0.4}px sans-serif`;

                if (year !== lastYear) {
                    ctx.fillStyle = textColor;
                    const yearLabelX = direction === "col" ? (i * squareSize + legendPadding + squareSize / 2) : (legendPadding / 2);
                    const yearLabelY = direction === "col" ? (legendPadding / 2) : (i * squareSize + legendPadding + squareSize / 2);
                    
                    if (direction === "col") {
                        ctx.fillText(year, yearLabelX, yearLabelY - (squareSize * 0.1));
                    } 
                    else {
                        ctx.save();
                        ctx.translate(legendPadding / 2, yearLabelY - (squareSize * 0.05));
                        ctx.fillText(year, 0, 0);
                        ctx.restore();
                    }
                }
                if (month !== lastMonth) {
                    ctx.fillStyle = lightTextColor;
                    const monthLabelX = direction === "col" ? (i * squareSize + legendPadding + squareSize / 2) : (legendPadding / 2);
                    const monthLabelY = direction === "col" ? (legendPadding / 2) : (i * squareSize + legendPadding + squareSize / 2);

                    if (direction === "col") {
                        ctx.fillText(monthLabel, monthLabelX, legendPadding / 2 + (squareSize * 0.3));
                    } 
                    else {
                        ctx.save();
                        if (year !== lastYear) {
                            ctx.translate(legendPadding / 2, monthLabelY + (squareSize * 0.35));
                        }
                        else {
                            ctx.translate(legendPadding / 2, monthLabelY + (squareSize * 0.1));
                        }
                        ctx.fillText(monthLabel, 0, 0);
                        ctx.restore();
                    }
                    lastYear = year;
                    lastMonth = month;
                }
            }


            // Draw a gradient if scores are available
            if ((scoreType === "gradient") && pixel && pixel.scores && (pixel.scores.length > 1)) {
                const gradient = ctx.createLinearGradient(x, y, x + squareSize, y); // horizontal

                const scores = pixel.scores;
                const step = 1 / (scores.length - 1);

                scores.forEach((score, idx) => {
                    const color = get_pixel_color([score], colors, scoreType);
                    gradient.addColorStop(idx * step, color);
                });

                ctx.fillStyle = gradient;
            }
            else {
                ctx.fillStyle = color;
            }

            ctx.fillRect(x, y, squareSize, squareSize);

            if (showBorder && borderSize > 0) {
                ctx.strokeStyle = "black";
                ctx.lineWidth = borderSize;
                const borderX = x + (borderSize % 2 == 0 ? 0 : 0.5);
                const borderY = y + (borderSize % 2 == 0 ? 0 : 0.5);
                ctx.strokeRect(borderX, borderY, squareSize - 1, squareSize - 1);
            }

            /*
            // Draw the day number in the center of the square
            if (showDays) {
                const dayNumber = d.getDate().toString();
                ctx.fillStyle = "black";
                ctx.font = `bold ${squareSize * 0.25}px sans-serif`;
                ctx.textAlign = "center";
                const labelX = x + squareSize / 2;
                const labelY = y + squareSize / 2 + (squareSize * 0.1); 
                ctx.fillText(dayNumber, labelX, labelY);
            }
            */

            // Draw the day number in the bottom right corner of the square
            if (showDays) {
                const dayNumber = d.getDate().toString();

                const radius = squareSize * 0.15;
                const centerX = x + squareSize - radius - 2;
                const centerY = y + squareSize - radius - 2;

                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                ctx.fillStyle = colors.empty;
                ctx.fill();

                ctx.fillStyle = textColor;
                ctx.font = `bold ${radius * 1.2}px sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(dayNumber, centerX, centerY);
                ctx.textBaseline = "alphabetic"; // Reset baseline to default
            }

        });
    });


    // Write legend of weekdays or month days on the side/top
    if (showLegend) {
        ctx.fillStyle = lightTextColor;
        ctx.font = `bold ${squareSize * 0.4}px sans-serif`;
        if (isWeek) {
            const weekdays = 7;
            for (let i = 0; i < weekdays; i++) {
                const date = new Date(2024, 0, 7 + ((i + firstDayOfWeek) % 7));
                const label = date.toLocaleDateString("default", { weekday: "short" });
                if (direction === "row") {
                    ctx.fillText(label, i * squareSize + legendPadding + squareSize / 2, legendPadding / 2);
                } 
                else {
                    ctx.fillText(label, legendPadding / 2, i * squareSize + legendPadding + squareSize / 2);
                }
            }
        }
        else {
            const maxDays = 31;
            for (let i = 0; i < maxDays; i++) {
                const label = (i + 1).toString();
                if (direction === "row") {
                    ctx.fillText(label, i * squareSize + legendPadding + squareSize / 2, legendPadding / 2 + (squareSize * 0.2));
                } 
                else {
                    ctx.fillText(label, legendPadding / 2, i * squareSize + legendPadding + squareSize / 2);
                }
            }
        }
    }

    const img = document.createElement("img");
    img.src = pixelsCanvas.toDataURL("image/png");
    img.alt = "Pixels image";

    result_png.innerHTML = "";
    result_png.appendChild(img);

    if ((pixelsCanvas.height < 600) || (pixelsCanvas.width > pixelsCanvas.height * 3)) { // if image is landscape or small enough
        result_png.style.height = "fit-content";
    } 
    else {
        result_png.style.height = "600px"; // avoid overflow of the image
    }

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


function filter_pixels_by_keyword(data, keyword, isTag=false) {
    if (!keyword || (keyword.trim() === "") || (data.length === 0)) { return []; }
    const result = [];
    const firstDate = normalize_date(data[0].date);
    const lastDate = normalize_date(data[data.length - 1].date);
    result.push({ date: firstDate, scores: [] });
    result.push({ date: lastDate, scores: [] });
    
    const target = normalize_string(keyword);
    data.forEach(pixel => {
        const date = normalize_date(pixel.date);
        const scores = pixel.scores || [];
        const notes = normalize_string(pixel.notes || "");
        
        let hasMatch = false;
        if (isTag) {
            if (Array.isArray(pixel.tags)) {
                hasMatch = pixel.tags.some(tagObj =>
                    Array.isArray(tagObj.entries) &&
                    tagObj.entries.some(tag => normalize_string(tag) === target)
                );
            }
        }
        else {
            hasMatch = notes.includes(target);
        }

        if (hasMatch) {
            result.push({ date, scores });
        }
    });

    return result;
}


function filter_pixels_by_two_keywords(data, keyword1, keyword2, isTag1 = false, isTag2 = false) {
    if (
        !keyword1 || keyword1.trim() === "" ||
        !keyword2 || keyword2.trim() === "" ||
        data.length === 0
    ) { return []; }
    const result = [];
    const firstDate = normalize_date(data[0].date);
    const lastDate = normalize_date(data[data.length - 1].date);
    result.push({ date: firstDate, scores: [] });
    result.push({ date: lastDate, scores: [] });

    const target1 = normalize_string(keyword1);
    const target2 = normalize_string(keyword2);

    data.forEach(pixel => {
        const date = normalize_date(pixel.date);
        const scores = pixel.scores || [];

        let match1 = false;
        let match2 = false;

        if (isTag1) {
            if (Array.isArray(pixel.tags)) {
                match1 = pixel.tags.some(tagObj =>
                    Array.isArray(tagObj.entries) &&
                    tagObj.entries.some(tag => normalize_string(tag) === target1)
                );
            }
        } 
        else {
            const notes = normalize_string(pixel.notes || "");
            match1 = notes.includes(target1);
        }

        if (isTag2) {
            if (Array.isArray(pixel.tags)) {
                match2 = pixel.tags.some(tagObj =>
                    Array.isArray(tagObj.entries) &&
                    tagObj.entries.some(tag => normalize_string(tag) === target2)
                );
            }
        } 
        else {
            const notes = normalize_string(pixel.notes || "");
            match2 = notes.includes(target2);
        }

        if (match1 && match2) {
            result.push({ date, scores: [3] });
        } 
        else if (match1) {
            result.push({ date, scores: [5] });
        } 
        else if (match2) {
            result.push({ date, scores: [1] });
        }
    });

    return result;
}


function get_compare_settings(data) {
    const showFilter = parseInt(setting_showFilter.value, 10);
    const compareTag1 = compareSelect1.value === "tag";
    const compareTag2 = compareSelect2.value === "tag";
    const value1 = compareTag1 ? compareTagSelect1.value : compareWordInput1.value.trim();
    const value2 = compareTag2 ? compareTagSelect2.value : compareWordInput2.value.trim();
    if ((showFilter > 1) && value1 && value2) {
        return filter_pixels_by_two_keywords(data, value1, value2, compareTag1, compareTag2);
    }
    else if ((showFilter > 0) && value1) {
        return filter_pixels_by_keyword(data, value1, compareTag1);
    }
    else if ((showFilter > 0) && value2) {
        return filter_pixels_by_keyword(data, value2, compareTag2);
    }
    else {
        return data;
    }
}


async function set_filter_display() {
    const filterState = setting_showFilter.value;
    hr_filter.style.display = (filterState === "0") ? "none" : "block";
    div_compareSearchOptions1.style.display = (filterState === "0") ? "none" : "flex";
    div_compareSearchOptions2.style.display = ((filterState === "0") || (filterState === "1")) ? "none" : "flex";
    label_compareSelect1.innerText = (filterState === "2") ? "Compare" : "Filter";

    label_compareSelect1.style.color = (filterState === "2") ? png_settings.colors[5] : "black";
    label_compareSelect2.style.color = (filterState === "2") ? png_settings.colors[1] : "black";
}



function open_dialog_settings() {
    dialog_settings.showModal();
    dialog_settings.addEventListener('click', handle_click_dialog);
}


function close_dialog_settings(save = false) {
    dialog_settings.removeEventListener('click', handle_click_dialog);
    if (save) { png_settings = get_image_settings(); }
    set_image_settings(png_settings);
    store_settings();
    setup_calendar_frame();
    dialog_settings.close();
}


function handle_click_dialog(e) {
    if (e.target === dialog_settings) {
        close_dialog_settings(save=true); // When clicking outside: save settings
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
    close_dialog_settings(save=true);
});

btn_generate_png.addEventListener("click", () => {
    generate_pixels_PNG(current_data);
});

btn_download_png.addEventListener("click", () => {
    download_pixels_PNG();
});


setting_showFilter.addEventListener("change", () => {
    set_filter_display();
});


["1", "2"].forEach(id => {
    const select = document.querySelector(`#compareSelect${id}`);
    const inputWrapper = document.querySelector(`#compareWordInput${id}`);
    const tagWrapper = document.querySelector(`#compareTagSelect${id}`);

    select.addEventListener("change", () => {
        const isTag = select.value === "tag";
        inputWrapper.style.display = isTag ? "none" : "block";
        tagWrapper.style.display = isTag ? "block" : "none";
    });
});