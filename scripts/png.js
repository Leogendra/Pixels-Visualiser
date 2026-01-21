const div_pixel_export_container = document.querySelector("#pixelGridExportContainer");

const dialog_settings = document.querySelector("#dialogSettings");
const btn_open_dialog_settings = document.querySelector("#openImageSettingsDialog");
const btn_reset_palette_settings = document.querySelector("#resetPaletteSettings");
const btn_save_palette_settings = document.querySelector("#savePaletteSettings");
const btn_save_dialog_settings = document.querySelector("#saveDialogSettings");
const btn_generate_png = document.querySelector("#btnGeneratePixelGrid");
const btn_download_png = document.querySelector("#btnDownloadPixelGrid");
const div_result_png = document.querySelector("#pixelGridResults");
const result_png = document.querySelector(".pixel-png-img");
const filter_stats_display = document.querySelector("#filterStatsDisplay");

const setting_color1 = document.querySelector("#color1");
const setting_color2 = document.querySelector("#color2");
const setting_color3 = document.querySelector("#color3");
const setting_color4 = document.querySelector("#color4");
const setting_color5 = document.querySelector("#color5");
const setting_colorEmpty = document.querySelector("#colorEmpty");

const setting_showBorder = document.querySelector("#showBorderCheckbox");
const setting_showLegend = document.querySelector("#showLegendCheckbox");
const setting_showDays = document.querySelector("#showDaysCheckbox");
const setting_showFilter = document.querySelector("#showFilterSelect");

const setting_scoreType = document.querySelector("#scoreTypeSelect");
const setting_layout = document.querySelector("#layoutSelect");

// compare settings
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

let pixels_canvas;




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
        firstDayOfWeek: parseInt(weekday_frequency_select.value, 10) ?? 1,
        squareSize: 50,
        borderSize: 1,
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
    for (let i = 1; i <= 5; i++) {
        update_svg_color(i, settings.colors[i]);
    }
    setting_colorEmpty.value = settings.colors.empty;
    setting_showBorder.checked = settings.showBorder;
    setting_showLegend.checked = settings.showLegend;
    setting_showDays.checked = settings.showDays;
    setting_showFilter.value = settings.showFilter.toString();
    setting_scoreType.value = settings.scoreType;
    setting_layout.value = settings.layout;

    // first day of week
    weekday_frequency_select.value = settings.firstDayOfWeek.toString();

    set_filter_display();
}


async function update_svg_color(score, color) {
    const svg = document.querySelector(`#color${score}`).parentElement.querySelector("svg");
    if (svg) {
        svg.style.color = color;
        const bgColor = get_contrasting_text_color(color, highTreshold = 225);
        svg.style.setProperty('--backgroundColor', bgColor);
    }
    png_settings.colors[score] = color;
}


async function setup_palette_settings() {
    for (let score = 1; score <= 5; score++) {
        const cell = document.querySelector(`#color${score}`).parentElement;
        const input = document.getElementById(`color${score}`);

        input.classList.add("color-picker-overlay");

        let old_svg = cell.querySelector("svg");
        if (!old_svg) {
            const svg = await load_colored_score_SVG(score);
            input.addEventListener("input", () => {
                update_svg_color(score, input.value);
            });

            cell.appendChild(svg);
        }
    }
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
    all_tags.sort((a, b) => a.localeCompare(b, userLocale, { sensitivity: "base" }));
    if (!all_tags || all_tags.length === 0) {
        compareTagSelect1.innerHTML = "<option value=''>No tags available</option>";
        compareTagSelect2.innerHTML = "<option value=''>No tags available</option>";
        tag_options_container.style.display = "none";
        return;
    }
    tag_options_container.style.display = "block";
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


function calculate_keyword_stats(keyword, isTag = false, excludeKeyword = null, excludeTag = false) {
    let filteredData = [];
    if (isTag) {
        filteredData = current_data.filter(pixel => {
            if (!Array.isArray(pixel.scores) || pixel.scores.length === 0) { return false; }
            const target = normalize_string(keyword);
            return pixel.tags.some(tagObj =>
                tagObj.entries.some(tag => normalize_string(tag) === target)
            );
        });
    }
    else {
        filteredData = current_data.filter(pixel => {
            if (!Array.isArray(pixel.scores) || pixel.scores.length === 0) { return false; }
            const notes = normalize_string(pixel.notes || "");
            const target = compute_regex(parse_logical_string(keyword));
            return target.every(orGroup =>
                orGroup.some(regexTerm => regexTerm.test(notes))
            );
        });
    }

    // if exclude keyword provided, filter out matching entries
    if (excludeKeyword) {
        if (excludeTag) {
            filteredData = filteredData.filter(pixel => {
                const target = normalize_string(excludeKeyword);
                return !pixel.tags.some(tagObj =>
                    tagObj.entries.some(tag => normalize_string(tag) === target)
                );
            });
        }
        else {
            filteredData = filteredData.filter(pixel => {
                const notes = normalize_string(pixel.notes || "");
                const target = compute_regex(parse_logical_string(excludeKeyword));
                return !target.every(orGroup =>
                    orGroup.some(regexTerm => regexTerm.test(notes))
                );
            });
        }
    }

    const stats = { matchCount: filteredData.length, bestStreak: 0, averageScore: 0 };
    if (filteredData.length > 0) {
        const uniqueDates = Array.from(new Set(filteredData.map(entry => normalize_date(entry.date)))).sort();
        let bestStreak = 1;
        let currentStreak = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
            const prev = new Date(uniqueDates[i - 1]);
            const cur = new Date(uniqueDates[i]);
            const diffDays = (cur - prev) / (1000 * 60 * 60 * 24);
            if (diffDays === 1) {
                currentStreak += 1;
                bestStreak = Math.max(bestStreak, currentStreak);
            }
            else {
                currentStreak = 1;
            }
        }
        stats.bestStreak = bestStreak;
        
        // Calculate average score
        const allScores = filteredData.flatMap(pixel => pixel.scores || []);
        if (allScores.length > 0) {
            stats.averageScore = average(allScores);
        }
    }
    return stats;
};


async function generate_pixels_PNG() {
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

    data = get_compare_settings();

    // Check if filter fields are not empty
    const { showFilter, compareTag1, compareTag2, value1, value2 } = get_filter_value();
    const isCompareMode = (showFilter === 2) && value1 && value2;

    let stats_filter_1 = { matchCount: 0, bestStreak: 0 };
    let stats_filter_2 = { matchCount: 0, bestStreak: 0 };

    if (isCompareMode) {
        // compare mode
        stats_filter_1 = calculate_keyword_stats(value1, compareTag1);
        stats_filter_2 = calculate_keyword_stats(value2, compareTag2);
    }
    else if ((showFilter === 3) && value1 && value2) {
        // exclude mode
        stats_filter_1 = calculate_keyword_stats(value1, compareTag1, value2, compareTag2);
    }
    else if ((showFilter > 0) && value1) {
        stats_filter_1 = calculate_keyword_stats(value1, compareTag1);
    }
    else if ((showFilter === 2) && value2) {
        stats_filter_2 = calculate_keyword_stats(value2, compareTag2);
    }

    // choose layout and direction
    const direction = layout.includes("vertical") ? "col" : "row";
    const isWeek = layout.includes("weeks");
    const textColor = get_contrasting_text_color(colors.empty);
    const lightTextColor = get_contrasting_text_color(colors.empty, highTreshold = 186, less = true);

    // create a map of pixels by date
    const pixel_map = new Map();
    for (const pixel of data) {
        const normalizedDate = normalize_date(pixel.date);
        pixel_map.set(normalizedDate, pixel);
    }

    // obtain all dates from the pixel map
    const dates = [...pixel_map.keys()].map(d => new Date(d));
    if (dates.length === 0) {
        return;
    }
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    // align the first date to the start of the week defined by firstDayOfWeek
    const firstDate = new Date(minDate);
    if (isWeek) {
        const firstDay = firstDate.getDay();
        const offset = (firstDay - firstDayOfWeek + 7) % 7;
        firstDate.setDate(firstDate.getDate() - offset);
    }

    // generate all dates from the first date to the last date
    const allDays = [];
    const current = new Date(firstDate);
    while (current <= maxDate) {
        allDays.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }

    // get all the weeks and months numbers
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

    // dimensions of the grid
    const pixels_groups = isWeek ? [...weekGroups.values()] : [...monthGroups.values()];
    if (pixels_groups.length === 0) {
        return;
    }

    const maxGroupLength = maximum(pixels_groups.map(g => g.length));
    const cols = direction === "col" ? pixels_groups.length : maxGroupLength;
    const rows = direction === "row" ? pixels_groups.length : maxGroupLength;

    pixels_canvas = document.createElement("canvas");
    pixels_canvas.classList.add("free-canvas");

    const legendPadding = showLegend ? (squareSize * 1.3) : (squareSize * 0.3);
    const showPaletteLegend = showLegend && !isCompareMode;
    const paletteLegendHeight = showPaletteLegend ? (squareSize * 1.5) : 0; // space for color palette legend below
    const paletteItemSize = showPaletteLegend ? (squareSize * 0.8) : 0;
    const paletteItemSpacing = showPaletteLegend ? (squareSize * 0.3) : 0;
    const paletteTotalWidth = showPaletteLegend ? ((5 * paletteItemSize) + (4 * paletteItemSpacing)) : 0;
    const statsBottomPadding = showLegend ? (squareSize * 0.3) : 0;
    const filterStatsHeight = (value1 || value2) ? (squareSize * 0.9) : 0;

    const gridWidth = cols * squareSize + legendPadding + (squareSize * 0.3);
    const canvasWidth = Math.max(gridWidth, paletteTotalWidth + (legendPadding * 2));
    const gridOffsetX = (canvasWidth - gridWidth) / 2;

    pixels_canvas.width = canvasWidth; // ensure the palette fits horizontally with padding
    pixels_canvas.height = rows * squareSize + legendPadding + (squareSize * 0.3) + paletteLegendHeight + filterStatsHeight + statsBottomPadding;

    const ctx = pixels_canvas.getContext("2d");
    ctx.fillStyle = textColor;
    ctx.font = `${squareSize * 0.25}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = colors.empty;
    ctx.fillRect(0, 0, pixels_canvas.width, pixels_canvas.height);



    // draw the grid
    let lastYear = null;
    let lastMonth = null;
    let firstPixelDrawn = true;
    pixels_groups.forEach((days, i) => {
        days.forEach((d, j) => {
            const normalizedDate = normalize_date(d);
            const pixel = pixel_map.get(normalizedDate);

            const dayOfWeek = (d.getDay() - firstDayOfWeek + 7) % 7; // + 7 to handle negative values
            const color = get_pixel_color(pixel?.scores, colors, scoreType);

            // labels for legend
            const year = d.getFullYear();
            const month = d.getMonth();
            const monthLabel = d.toLocaleString(userLocale, { month: "short" }).replace(/\./g, "");

            // avoid drawing the first pixels if they are empty
            if (!firstPixelDrawn) {
                if (color === colors.empty) {
                    return; // "continue" for the foreach
                }
                else {
                    firstPixelDrawn = true;
                }
            }

            // calculate the position of the pixel
            let x, y;
            if (direction === "col") {
                x = i * squareSize;
                y = isWeek ? (dayOfWeek * squareSize) : (j * squareSize);
            }
            else {
                y = i * squareSize;
                x = isWeek ? (dayOfWeek * squareSize) : (j * squareSize);
            }

            x += legendPadding + gridOffsetX;
            y += legendPadding;


            // draw the legend labels for month and year
            if (showLegend && (j === (days.length - 1))) {

                ctx.font = `bold ${squareSize * 0.4}px sans-serif`;

                if (year !== lastYear) {
                    ctx.fillStyle = textColor;
                    const yearLabelX = direction === "col" ? (i * squareSize + legendPadding + gridOffsetX + squareSize / 2) : (legendPadding / 2 + gridOffsetX);
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
                    const monthLabelX = direction === "col" ? (i * squareSize + legendPadding + gridOffsetX + squareSize / 2) : (legendPadding / 2 + gridOffsetX);
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


            // draw a gradient if scores are available
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

            // draw the day number in the bottom right corner of the square
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
                ctx.fillText(dayNumber, centerX, centerY);
            }

        });
    });


    // write legend of weekdays or month days on the side/top
    if (showLegend) {
        ctx.fillStyle = lightTextColor;
        ctx.font = `bold ${squareSize * 0.4}px sans-serif`;
        if (isWeek) {
            const weekdays = 7;
            for (let i = 0; i < weekdays; i++) {
                const date = new Date(2024, 0, 7 + ((i + firstDayOfWeek) % 7));
                const label = date.toLocaleDateString(userLocale, { weekday: "short" }).replace(/\./g, "");
                if (direction === "row") {
                    ctx.fillText(label, i * squareSize + legendPadding + gridOffsetX + squareSize / 2, legendPadding / 2);
                }
                else {
                    ctx.fillText(label, legendPadding / 2 + gridOffsetX, i * squareSize + legendPadding + squareSize / 2);
                }
            }
        }
        else {
            const maxDays = 31;
            for (let i = 0; i < maxDays; i++) {
                const label = (i + 1).toString();
                if (direction === "row") {
                    ctx.fillText(label, i * squareSize + legendPadding + gridOffsetX + squareSize / 2, legendPadding / 2 + (squareSize * 0.2));
                }
                else {
                    ctx.fillText(label, legendPadding / 2 + gridOffsetX, i * squareSize + legendPadding + squareSize / 2);
                }
            }
        }

        // draw color palette legend below the grid with pixel icons
        if (showPaletteLegend) {
            const paletteStartX = (pixels_canvas.width - paletteTotalWidth) / 2;
            const paletteY = rows * squareSize + legendPadding + (squareSize * 0.3) + (paletteLegendHeight - paletteItemSize) / 2;

            // load all pixel icons and draw them with proper coloring
            const pixelPromises = [];
            for (let i = 1; i <= 5; i++) {
                pixelPromises.push(
                    new Promise((resolve) => {
                        const req = new XMLHttpRequest();
                        req.open("GET", `assets/pixels/score_${i}.svg`, true);
                        req.onload = () => {
                            const parser = new DOMParser();
                            const svgDoc = parser.parseFromString(req.responseText, "image/svg+xml");
                            const svg = svgDoc.querySelector("svg");

                            svg.style.color = colors[i];
                            const serializer = new XMLSerializer();
                            const svgString = serializer.serializeToString(svg);

                            const img = new Image();
                            const blob = new Blob([svgString], { type: "image/svg+xml" });
                            const url = URL.createObjectURL(blob);

                            img.onload = () => {
                                const x = paletteStartX + ((i - 1) * (paletteItemSize + paletteItemSpacing));
                                const y = paletteY;

                                ctx.drawImage(img, x, y, paletteItemSize, paletteItemSize);

                                URL.revokeObjectURL(url);
                                resolve();
                            };
                            img.onerror = () => {
                                URL.revokeObjectURL(url);
                                resolve();
                            };
                            img.src = url;
                        };
                        req.onerror = () => resolve();
                        req.send();
                    })
                );
            }

            // wait all palette icons before showing
            await Promise.all(pixelPromises);
        }

        // draw filter stats line when a filter is applied
        if (value1 || value2) {
            ctx.font = `bold ${squareSize * 0.32}px sans-serif`;
            ctx.textAlign = "left";
            const statsY = rows * squareSize + legendPadding + paletteLegendHeight + (filterStatsHeight / 2);

            if (isCompareMode) {
                const doubleSeparator = " | ";

                const word1Text = `${value1}, nb: ${stats_filter_1.matchCount}, streak: ${stats_filter_1.bestStreak}`;
                const word2Text = `${value2}, nb: ${stats_filter_2.matchCount}, streak: ${stats_filter_2.bestStreak}`;

                const word1Width = ctx.measureText(word1Text).width;
                const word2Width = ctx.measureText(word2Text).width;
                const doubleSepWidth = ctx.measureText(doubleSeparator).width;
                const totalWidth = word1Width + doubleSepWidth + word2Width;
                let currentX = pixels_canvas.width / 2 - totalWidth / 2;

                ctx.fillStyle = colors[5];
                ctx.fillText(word1Text, currentX, statsY);
                currentX += word1Width;

                ctx.fillStyle = lightTextColor;
                ctx.fillText(doubleSeparator, currentX, statsY);
                currentX += doubleSepWidth;

                ctx.fillStyle = colors[1];
                ctx.fillText(word2Text, currentX, statsY);
            }
            else {
                let keyword = value1 ? value1 : value2;
                let stats = value1 ? stats_filter_1 : stats_filter_2;

                const statsText = `Filter: ${keyword}, matches: ${stats.matchCount}, best streak: ${stats.bestStreak}`;
                ctx.fillStyle = lightTextColor;
                ctx.textAlign = "center";
                ctx.fillText(statsText, pixels_canvas.width / 2, statsY);
            }
        }
    }

    // mapping from click -> date
    const mapping = {
        firstDayOfWeek,
        squareSize,
        legendPadding,
        gridOffsetX,
        direction,
        isWeek,
        rows,
        cols,
        pixelMap: pixel_map
    };

    if (isWeek) {
        // day-indexed map per group for fast lookup (groupIndex -> [dayIndex -> dateStr|null])
        mapping.groupDayMap = pixels_groups.map(group => {
            const dayMap = new Array(7).fill(null);
            group.forEach(d => {
                const dayIndex = (d.getDay() - firstDayOfWeek + 7) % 7;
                dayMap[dayIndex] = normalize_date(d);
            });
            return dayMap;
        });
    }
    else {
        // normalized date strings per group in order
        mapping.groupIndexMap = pixels_groups.map(group => group.map(d => normalize_date(d)));
    }

    pixels_canvas._pixelMapping = mapping;
    pixels_canvas.style.cursor = "pointer";

    pixels_canvas.addEventListener("click", (evt) => {
        try {
            const rect = pixels_canvas.getBoundingClientRect();
            const scaleX = pixels_canvas.width / rect.width;
            const scaleY = pixels_canvas.height / rect.height;
            const clientX = evt.clientX;
            const clientY = evt.clientY;
            const x = (clientX - rect.left) * scaleX;
            const y = (clientY - rect.top) * scaleY;

            const relX = x - mapping.legendPadding - mapping.gridOffsetX;
            const relY = y - mapping.legendPadding;
            if (relX < 0 || relY < 0) { return; }

            let groupIndex, posIndex, clickedDateStr = null;

            if (mapping.direction === "col") {
                groupIndex = Math.floor(relX / mapping.squareSize);
                if (mapping.isWeek) {
                    const dayIdx = Math.floor(relY / mapping.squareSize);
                    if (groupIndex >= 0 && groupIndex < mapping.groupDayMap.length && dayIdx >= 0 && dayIdx < mapping.groupDayMap[groupIndex].length) {
                        clickedDateStr = mapping.groupDayMap[groupIndex][dayIdx];
                    }
                }
                else {
                    posIndex = Math.floor(relY / mapping.squareSize);
                    if (groupIndex >= 0 && groupIndex < mapping.groupIndexMap.length && posIndex >= 0 && posIndex < mapping.groupIndexMap[groupIndex].length) {
                        clickedDateStr = mapping.groupIndexMap[groupIndex][posIndex];
                    }
                }
            }
            else { // direction === "row"
                groupIndex = Math.floor(relY / mapping.squareSize);
                if (mapping.isWeek) {
                    const dayIdx = Math.floor(relX / mapping.squareSize);
                    if (groupIndex >= 0 && groupIndex < mapping.groupDayMap.length && dayIdx >= 0 && dayIdx < mapping.groupDayMap[groupIndex].length) {
                        clickedDateStr = mapping.groupDayMap[groupIndex][dayIdx];
                    }
                }
                else {
                    posIndex = Math.floor(relX / mapping.squareSize);
                    if (groupIndex >= 0 && groupIndex < mapping.groupIndexMap.length && posIndex >= 0 && posIndex < mapping.groupIndexMap[groupIndex].length) {
                        clickedDateStr = mapping.groupIndexMap[groupIndex][posIndex];
                    }
                }
            }

            if (clickedDateStr) {
                const pixel = mapping.pixelMap.get(clickedDateStr) || null;
                // if available, show the pixel card and scroll to it
                show_pixel_card(clickedDateStr, true);
            }
        }
        catch (e) {
            console.error("Error handling canvas click:", e);
        }
    });

    // append the actual canvas so it stays interactive (and usable for download)
    result_png.innerHTML = "";
    result_png.appendChild(pixels_canvas);

    // overlay canvas for hover highlight
    if (pixels_canvas._hoverOverlay) {
        pixels_canvas._hoverOverlay.remove();
        pixels_canvas._hoverOverlay = null;
    }
    const overlay = document.createElement("canvas");
    overlay.classList.add("free-canvas");
    overlay.width = pixels_canvas.width;
    overlay.height = pixels_canvas.height;
    overlay.style.position = "absolute";
    overlay.style.left = "0";
    overlay.style.top = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = 5;
    result_png.appendChild(overlay);
    const octx = overlay.getContext("2d");
    pixels_canvas._hoverOverlay = overlay;

    // hover effect
    let lastHover = { g: -1, p: -1 };
    pixels_canvas.addEventListener("mousemove", (evt) => {
        try {
            const rect = pixels_canvas.getBoundingClientRect();
            const scaleX = pixels_canvas.width / rect.width;
            const scaleY = pixels_canvas.height / rect.height;
            const x = (evt.clientX - rect.left) * scaleX;
            const y = (evt.clientY - rect.top) * scaleY;

            const relX = x - mapping.legendPadding - mapping.gridOffsetX;
            const relY = y - mapping.legendPadding;
            if (relX < 0 || relY < 0) {
                if (lastHover.g !== -1) {
                    octx.clearRect(0, 0, overlay.width, overlay.height);
                    lastHover = { g: -1, p: -1 };
                }
                return;
            }

            let groupIndex, posIndex, dayIdx = -1;
            if (mapping.direction === "col") {
                groupIndex = Math.floor(relX / mapping.squareSize);
                if (mapping.isWeek) {
                    dayIdx = Math.floor(relY / mapping.squareSize);
                }
                else {
                    posIndex = Math.floor(relY / mapping.squareSize);
                }
            }
            else {
                groupIndex = Math.floor(relY / mapping.squareSize);
                if (mapping.isWeek) {
                    dayIdx = Math.floor(relX / mapping.squareSize);
                }
                else {
                    posIndex = Math.floor(relX / mapping.squareSize);
                }
            }

            // avoid unnecessary redraws
            const hoverKey = `${groupIndex}:${dayIdx}:${posIndex}`;
            if (pixels_canvas._lastHoverKey === hoverKey) { return; }
            pixels_canvas._lastHoverKey = hoverKey;

            // determine the normalized date under cursor (if any)
            let hoveredDate = null;
            if (mapping.isWeek) {
                if (groupIndex >= 0 && groupIndex < mapping.groupDayMap.length && dayIdx >= 0 && dayIdx < 7) {
                    hoveredDate = mapping.groupDayMap[groupIndex][dayIdx];
                }
            }
            else {
                if (groupIndex >= 0 && groupIndex < mapping.groupIndexMap.length && posIndex >= 0 && posIndex < mapping.groupIndexMap[groupIndex].length) {
                    hoveredDate = mapping.groupIndexMap[groupIndex][posIndex];
                }
            }

            // compute rectangle for highlight
            let px, py;
            const baseX = mapping.legendPadding + mapping.gridOffsetX;
            const baseY = mapping.legendPadding;
            if (mapping.direction === "col") {
                px = baseX + (groupIndex * mapping.squareSize);
                py = baseY + (mapping.isWeek ? (dayIdx * mapping.squareSize) : (posIndex * mapping.squareSize));
            }
            else {
                py = baseY + (groupIndex * mapping.squareSize);
                px = baseX + (mapping.isWeek ? (dayIdx * mapping.squareSize) : (posIndex * mapping.squareSize));
            }

            octx.clearRect(0, 0, overlay.width, overlay.height);
            if (hoveredDate) {
                // subtle fill + contrasting stroke
                octx.fillStyle = "rgba(255, 255, 255, 0.12)";
                octx.fillRect(px + 1, py + 1, mapping.squareSize - 2, mapping.squareSize - 2);
                octx.strokeStyle = textColor || "#000";
                octx.lineWidth = Math.max(1, Math.round(mapping.squareSize * 0.06));
                octx.setLineDash([3, 3]);
                octx.strokeRect(px + 1.5, py + 1.5, mapping.squareSize - 3, mapping.squareSize - 3);
                octx.setLineDash([]);
            }
            else {
                // nothing hovered
                octx.clearRect(0, 0, overlay.width, overlay.height);
            }
        }
        catch (e) {
            // pass
        }
    });

    pixels_canvas.addEventListener("mouseleave", () => {
        if (pixels_canvas._hoverOverlay) {
            const oc = pixels_canvas._hoverOverlay.getContext("2d");
            oc.clearRect(0, 0, pixels_canvas._hoverOverlay.width, pixels_canvas._hoverOverlay.height);
            pixels_canvas._lastHoverKey = null;
        }
    });

    // display filter stats above the image if filters are applied
    if (value1 || value2) {

        const generate_stats_div_results = (value, nbMatches, bestStreak, averageScore) => {
            if (nbMatches === 0) {
                return `<div class="stat-item">
                    <strong>${value}</strong>- no matches found.
                </div>`;
            }
            else {
                return `<div class="stat-item">
                    <strong>${value}</strong>- ${(nbMatches > 1) ? "matches" : "match"}: ${nbMatches} (${((nbMatches / nbTotalDays) * 100).toFixed(2)}%), avg score: ${averageScore.toFixed(2)}, best streak: ${bestStreak}d
                </div>`;
            }
        };
        let statsHTML = "";

        if (isCompareMode) {
            statsHTML = generate_stats_div_results(value1, stats_filter_1.matchCount, stats_filter_1.bestStreak, stats_filter_1.averageScore) + generate_stats_div_results(value2, stats_filter_2.matchCount, stats_filter_2.bestStreak, stats_filter_2.averageScore);
        }
        else {
            let keyword = value1 ? value1 : value2;
            let stats = value1 ? stats_filter_1 : stats_filter_2;

            statsHTML = generate_stats_div_results(keyword, stats.matchCount, stats.bestStreak, stats.averageScore);
        }

        filter_stats_display.innerHTML = statsHTML;
        filter_stats_display.style.display = "block";
    }
    else {
        filter_stats_display.style.display = "none";
    }

    btn_download_png.style.display = "flex";
}


async function download_pixels_PNG() {
    if (!pixels_canvas) {
        alert("Please generate the pixel grid first.");
        return;
    }
    const link = document.createElement("a");
    link.download = "pixels.png";
    link.href = pixels_canvas.toDataURL("image/png");
    link.click();
}


function filter_pixels_by_keyword(keyword, isTag = false) {
    if (!keyword || (keyword.trim() === "") || (nbTotalDays === 0)) { return []; }
    const result = [];
    const firstDate = normalize_date(current_data[0].date);
    const lastDate = normalize_date(current_data[current_data.length - 1].date);
    result.push({ date: firstDate, scores: [] });
    result.push({ date: lastDate, scores: [] });

    const target = isTag ? normalize_string(keyword) : compute_regex(parse_logical_string(keyword));

    current_data.forEach(pixel => {
        const date = normalize_date(pixel.date);
        const scores = pixel.scores || [];
        if (scores.length === 0) { return; }
        const notes = normalize_string(pixel.notes || "");

        let hasMatch = false;
        if (isTag) {
            if (Array.isArray(pixel.tags)) {
                hasMatch = pixel.tags.some(tagObj =>
                    tagObj.entries.some(tag => normalize_string(tag) === target)
                );
            }
        }
        else {
            hasMatch = target.every(orGroup =>
                orGroup.some(regexTerm => regexTerm.test(notes))
            );
        }

        if (hasMatch) {
            result.push({ date, scores });
        }
    });

    return result;
}


function filter_pixels_by_two_keywords(keyword1, keyword2, isTag1 = false, isTag2 = false, exclude = false) {
    if (
        !keyword1 || keyword1.trim() === "" ||
        !keyword2 || keyword2.trim() === "" ||
        nbTotalDays === 0
    ) { return []; }
    const result = [];
    const firstDate = normalize_date(current_data[0].date);
    const lastDate = normalize_date(current_data[current_data.length - 1].date);
    result.push({ date: firstDate, scores: [] });
    result.push({ date: lastDate, scores: [] });

    const target1 = isTag1 ? normalize_string(keyword1) : compute_regex(parse_logical_string(keyword1));
    const target2 = isTag2 ? normalize_string(keyword2) : compute_regex(parse_logical_string(keyword2));

    current_data.forEach(pixel => {
        const date = normalize_date(pixel.date);
        const scores = pixel.scores || [];
        if (scores.length === 0) { return; }

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
            match1 = target1.every(orGroup =>
                orGroup.some(regexTerm => regexTerm.test(notes))
            );
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
            match2 = target2.every(orGroup =>
                orGroup.some(regexTerm => regexTerm.test(notes))
            );
        }

        if (exclude) {
            if (match1 && !match2) {
                result.push({ date, scores });
            }
        }
        else {
            if (match1 && match2) {
                result.push({ date, scores: [3] });
            }
            else if (match1) {
                result.push({ date, scores: [5] });
            }
            else if (match2) {
                result.push({ date, scores: [1] });
            }
        }
    });

    return result;
}


function get_filter_value() {
    const showFilter = parseInt(setting_showFilter.value, 10);
    const compareTag1 = compareSelect1.value === "tag";
    const compareTag2 = compareSelect2.value === "tag";
    const value1 = compareTag1 ? compareTagSelect1.value : compareWordInput1.value.trim();
    const value2 = compareTag2 ? compareTagSelect2.value : compareWordInput2.value.trim();
    return { showFilter, compareTag1, compareTag2, value1, value2 };
}


function get_compare_settings() {
    const { showFilter, compareTag1, compareTag2, value1, value2 } = get_filter_value();
    const isExcludeMode = (showFilter === 3);

    if ((showFilter > 1) && value1 && value2) {
        return filter_pixels_by_two_keywords(value1, value2, compareTag1, compareTag2, isExcludeMode);
    }
    else if ((showFilter > 0) && value1) {
        return filter_pixels_by_keyword(value1, compareTag1);
    }
    else if ((showFilter > 0) && value2) {
        return filter_pixels_by_keyword(value2, compareTag2);
    }
    else {
        return current_data;
    }
}


async function set_filter_display() {
    const filterState = setting_showFilter.value;
    hr_filter.style.display = (filterState === "0") ? "none" : "block";
    div_compareSearchOptions1.style.display = (filterState === "0") ? "none" : "flex";
    div_compareSearchOptions2.style.display = ((filterState === "0") || (filterState === "1")) ? "none" : "flex";
    label_compareSelect1.innerText = (filterState === "2") ? "Compare" : "Filter";
    label_compareSelect2.innerText = (filterState === "3") ? "Without" : "With";

    label_compareSelect1.style.color = (filterState === "2") ? png_settings.colors[5] : "black";
    label_compareSelect2.style.color = (filterState === "2") ? png_settings.colors[1] : "black";

    label_compareSelect2.style.textDecoration = (filterState === "3") ? "line-through" : "none";

    if (filterState === "1") {
        label_compareSelect1.title = "The pixels with this word/tag will be shown";
    }
    else if (filterState === "2") {
        label_compareSelect1.title = "The pixels with this word/tag will be shown in color 5";
        label_compareSelect2.title = "The pixels with this word/tag will be shown in color 1";
    }
    else if (filterState === "3") {
        label_compareSelect1.title = "The pixels with this word/tag but without the other will be shown";
        label_compareSelect2.title = "The pixels with this word/tag will be hidden from the image";
    }
}


function open_dialog_settings() {
    dialog_settings.showModal();
    dialog_settings.addEventListener("click", handle_click_dialog);
}


function close_dialog_settings(save = false) {
    dialog_settings.removeEventListener("click", handle_click_dialog);
    if (save) { png_settings = get_image_settings(); }
    set_image_settings(png_settings);
    create_scores_pie_chart();
    generate_pixels_PNG();
    update_wordcloud();
    setup_calendar_frame();
    store_settings();
    dialog_settings.close();
}


function handle_click_dialog(e) {
    if (e.target === dialog_settings) {
        close_dialog_settings(save = true); // when clicking outside: save settings
    }
}




btn_open_dialog_settings.addEventListener("click", () => {
    open_dialog_settings();
});

btn_reset_palette_settings.addEventListener("click", () => {
    png_settings.colors = { ...png_default_settings.colors };
    close_dialog_settings();
});

btn_save_palette_settings.addEventListener("click", () => {
    close_dialog_settings(save = true);
    show_popup_message("Palette settings saved", "success", 3000);
});

btn_save_dialog_settings.addEventListener("click", () => {
    close_dialog_settings(save = true);
});

btn_generate_png.addEventListener("click", () => {
    generate_pixels_PNG();
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

div_pixel_export_container.addEventListener("keydown", function (e) {
    if ((e.key === "Enter") && (!dialog_settings.open)) {
        e.preventDefault();
        btn_generate_png.click();
    }
});

dialog_settings.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        e.preventDefault();
        btn_save_palette_settings.click();
    }
});