const body = document.querySelector("body");
const file_input = document.querySelector("#fileInput");
const drag_and_drop_zone = document.querySelector("#dragAndDropZone");
const div_intro_content = document.querySelector("#introContent");
const persist_pixels_checkbox = document.querySelector("#persistPixelsCheckbox");

const content_container = document.querySelector("#content");
const section_titles = document.querySelectorAll(".section-title");
const stats_content_container = document.querySelector("#stats-content");
const data_error_container = document.querySelector(".no-data-error");
const range_pills = document.querySelectorAll(".pill");
const div_date_range_filter = document.querySelector("#dateRangeFilter");
const start_date_filter = document.querySelector("#startDateFilterInput");
const end_date_filter = document.querySelector("#endDateFilterInput");

const stats_container = document.querySelector("#statsContainer");
const rolling_slider = document.querySelector("#rollingSlider");
const rolling_slider_text_value = document.querySelector("#rollingValue");
const show_average_checkbox = document.querySelector("#showAverageCheckbox");
const show_years_checkbox = document.querySelector("#showYearsCheckbox");
const show_pixel_card_checkbox = document.querySelector("#showPixelCardCheckbox");
const select_time_option = document.querySelector("#timeOptionSelect");
const container_floating_card = document.querySelector("#hoverCardContainer");

const tag_options_container = document.querySelector("#tagOptionsContainer");
const input_nb_tags = document.querySelector("#maxTagsInput");
const select_tag_category = document.querySelector("#selectTagCategory");
const tag_frequency_checkbox = document.querySelector("#tagFrequencyCheckbox");

const weekday_frequency_select = document.querySelector("#firstDayOfWeekSelect");
const season_colors_checkbox = document.querySelector("#seasonColorsCheckbox");

const word_freq_container = document.querySelector("#wordFrequency");
const words_percentage_checkbox = document.querySelector("#wordsPercentageCheckbox");
const words_order_checkbox = document.querySelector("#wordsOrderCheckbox");
const words_unique_days_checkbox = document.querySelector("#wordsUniqueDaysCheckbox");
const words_regex_checkbox = document.querySelector("#wordsRegexCheckbox");
const words_words_input = document.querySelector("#maxWordsInput");
const words_count_input = document.querySelector("#minCountInput");
const min_score_slider = document.querySelector("#minScoreSlider");
const min_score_slider_text_value = document.querySelector("#minScoreValue");
const words_search_input = document.querySelector("#searchInput");
const words_search_label = document.querySelector("#labelSearchInput");

const words_dialog_settings = document.querySelector("#dialogWordsSettings");
const btn_open_words_dialog_settings = document.querySelector("#openWordsSettingsDialog");
const btn_save_words_dialog_settings = document.querySelector("#saveWordsSettingsDialog");
const btn_export_words = document.querySelector("#exportWordsBtn");
const label_export_words = document.querySelector("#exportWordsLabel");

const wordcloud_container = document.querySelector("#wordcloudContainer");
const wordcloud_canvas = document.querySelector("#wordcloudCanvas");
const wordcloud_size_input = document.querySelector("#wordcloudSize");
const wordcloud_spacing_input = document.querySelector("#wordcloudSpacing");
const wordcloud_compression_input = document.querySelector("#wordcloudCompression");
const btn_download_wordcloud = document.querySelector("#btnDownloadWordcloud");


const DEV_MODE = false;
const DEV_FILE_PATH = "../data/pixels.json"
const SCROLL_TO = 1000;
const isMobile = window.innerWidth <= 800;

// App state variables
let savePixelData = false;
let pendingAnchor = window.location.hash || "";
let userLocale = "default";
let initial_data = [];
let current_data = [];
let last_start_date = null;
let last_end_date = null;

// Mood chart
let moodAveragingValue = 1;
let moodShowAverage = false;
let moodShowYears = false;
let moodTimeOption = "scores";
let moodShowPixelCard = true;
let cardWidth = 500;
let averageScore = 0;
let nbTotalDays = 0;

// Tags
let tag_stats = {};
let tagsPercentage = false;
let nbMaxTags = 10;
let tag_list_categories = new Set(["All"]);
let tagCategory = "All";

// Weekdays
let weekdays_stats = {};
// Months
let months_stats = {};
let monthSeasonColors = false;

// Words
let full_word_frequency = [];
let wordDisplayPercentage = false;
let wordOrderByScore = false;
let wordCountUniqueDays = false;
let wordRegexSearch = false;
let wordNbMaxWords = 30;
let wordNbMinCount = 10;
let wordMinScore = 1.0;
let wordSearchText = "";
// Wordcloud
let wordcloudSize = 4;
let wordcloudSpacing = 2;
let wordcloudCompression = 4;
let wordcloudNbMaxWords = 150; // not editable

// PNG
const png_default_settings = {
    colors: {
        1: "#e22230",
        2: "#e28422",
        3: "#fbee45",
        4: "#a0e865",
        5: "#039d07",
        empty: "#f0f2f6"
    },
    firstDayOfWeek: 1,
    squareSize: 50,
    borderSize: 1,
    showBorder: true,
    showLegend: false,
    showDays: false,
    showFilter: 0,
    scoreType: "gradient",
    layout: "vertical-months"
};
let png_settings = png_default_settings;

// Card
let calendarMode = false;
let getDynamicBorders = true; // not editable




function show_popup_message(message, type = "info", duration = 10000) {
    const popup = document.createElement("div");
    popup.className = "popup-message";
    const timerBar = document.createElement("div");
    timerBar.className = "popup-timer";
    if (type === "error") {
        popup.classList.add("error");
        timerBar.classList.add("error");
    }
    else if (type === "success") {
        popup.classList.add("success");
        timerBar.classList.add("success");
    }
    popup.textContent = message;
    popup.appendChild(timerBar);
    popup.style.setProperty("--duration", `${duration}ms`);
    document.body.appendChild(popup);

    setTimeout(() => popup.classList.add("visible"), 10);
    setTimeout(() => timerBar.classList.add("anim"), 50);
    setTimeout(() => {
        popup.classList.remove("visible");
        setTimeout(() => popup.remove(), 2000);
    }, duration);
}


function fill_missing_dates(data) {
    const datesStrSet = new Set(data.map(entry => normalize_date(entry.date)));
    const allDates = Array.from(datesStrSet).map(dateStr => new Date(dateStr));
    const minDate = new Date(Math.min(...allDates));
    const maxDate = new Date(Math.max(...allDates));

    let current = new Date(minDate);
    while (current <= maxDate) {
        const curentStrDate = normalize_date(current);
        if (!datesStrSet.has(curentStrDate)) {
            data.push({
                date: curentStrDate,
                scores: [],
                notes: "",
                tags: []
            });
        }
        current.setDate(current.getDate() + 1);
    }

    data.sort((a, b) => new Date(normalize_date(a.date)) - new Date(normalize_date(b.date)));
    current_data = data;
}


async function update_stats_and_graphics() {
    div_intro_content.style.display = "none";
    content_container.style.display = "block";

    if (current_data.length === 0) {
        data_error_container.style.display = "block";
        stats_content_container.style.display = "none";
    }
    else {
        data_error_container.style.display = "none";
        stats_content_container.style.display = "block";

        fill_missing_dates(current_data);

        await Promise.all([
            calculate_and_display_stats(),
            compute_tag_stats(),
            compute_weekdays_stats(),
            compute_months_stats(),
            get_word_frequency(),

            // Graphics
            create_mood_chart(),
            create_tag_frequency_chart(),
            create_tag_score_chart(),
            create_weekday_chart(),
            create_month_chart(),
            create_word_frequency_section(),
            setup_calendar_frame(),
        ]);

        sync_tag_charts_hover();
    }
}


async function filter_pixels(numberOfDays) {
    if (!Array.isArray(initial_data) || initial_data.length === 0) { return; }

    const firstPixelDate = new Date(initial_data[0].date);
    const lastPixelDate = new Date(initial_data[initial_data.length - 1].date);
    if (!is_date_valid(firstPixelDate) || !is_date_valid(lastPixelDate)) { return; }

    let startDate, endDate;
    if (numberOfDays == 0) {
        startDate = new Date(start_date_filter.value + " 00:00:00");
        endDate = new Date(end_date_filter.value + " 00:00:00");

        if (!is_date_valid(startDate) || !is_date_valid(endDate) ||
            startDate.getFullYear() < 2015 || endDate.getFullYear() < 2015 ||
            startDate.getFullYear() > 2100 || endDate.getFullYear() > 2100) {
            return;
        }

        if (startDate > endDate) {
            show_popup_message("Start date cannot be after end date.", "error");
            return;
        }

        startDate = startDate < firstPixelDate ? firstPixelDate : startDate;
        endDate = endDate > lastPixelDate ? lastPixelDate : endDate;
    }
    else {
        endDate = new Date(lastPixelDate);
        startDate = new Date(lastPixelDate);
        startDate.setDate(startDate.getDate() - numberOfDays + 1);
    }


    if (last_start_date && last_end_date &&
        (startDate.getTime() === last_start_date.getTime()) &&
        (endDate.getTime() === last_end_date.getTime())) {
        return;
    }

    last_start_date = new Date(startDate);
    last_end_date = new Date(endDate);

    current_data = initial_data.filter(entry => {
        const entryDate = new Date(entry.date);
        if (!is_date_valid(entryDate)) { return false; }

        return (numberOfDays === 0)
            ? ((entryDate >= startDate) && (entryDate <= endDate))
            : (entryDate >= startDate);
    });

    update_stats_and_graphics();
}


async function handle_file_upload(file) {
    if (!file) return;

    let data;

    if (file.type === "application/json" || file.name.endsWith(".json")) {
        try {
            const text = await file.text();
            data = JSON.parse(text);
        }
        catch (error) {
            show_popup_message("Make sure to import a valid .json file.", "error", 5000);
            return;
        }
    }
    else if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        try {
            data = await load_daylio_export(file);
        }
        catch (error) {
            show_popup_message("Make sure to import a valid .csv file.", "error", 5000);
            return;
        }
    }
    else if (file.name.endsWith(".zip")) {
        try {
            data = await load_daily_you_export(file);
        }
        catch (error) {
            show_popup_message("Make sure to import a valid .zip file.", "error", 5000);
            return;
        }
    }

    try {
        if (!Array.isArray(data) || !data.every(entry =>
            entry.date &&
            Array.isArray(entry.scores) &&
            entry.scores.length > 0 &&
            typeof entry.notes === "string" &&
            Array.isArray(entry.tags)
        )) {
            const errorFormatTxt = "The file format is invalid. Please ensure the file is exported from the Teo Vogel's Pixels app.";
            show_popup_message(errorFormatTxt, "error");
            throw new Error(errorFormatTxt);
        }

        else {
            data.sort((a, b) => new Date(a.date) - new Date(b.date));
            initial_data = data;
            current_data = initial_data;

            await load_settings();
            await update_stats_and_graphics();
            scroll_to_anchor_if_available();
            document.dispatchEvent(new CustomEvent("tutorialStepResult", { detail: { success: true, stepId: "#fileInputLabel" } }));

            // Save Pixels data if persistence is enabled
            if (savePixelData) {
                save_pixels_data(data);
            }
        }
    }
    catch (error) {
        console.error(`Error in handle file upload: ${error.message}`);
    }
}


async function auto_load_data(filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error("File not found or invalid response");
        const data = await response.json();

        const file = new Blob([JSON.stringify(data)], { type: "application/json" });
        file.text = async () => JSON.stringify(data);

        await handle_file_upload(file);
        show_popup_message(`[DEV_MODE] Auto loading of ${DEV_FILE_PATH.split("/").pop()}`, "info", 2000);
    }
    catch (error) {
        console.error("auto_load_data Error:", error.message);
        show_popup_message(`[DEV_MODE] Failed to load ${DEV_FILE_PATH.split("/").pop()}`, "error", 5000);
    }
}


// Dialog words settings
function open_words_dialog_settings() {
    words_dialog_settings.showModal();
    words_dialog_settings.addEventListener("click", handle_click_words_dialog);
}


function close_words_dialog_settings() {
    words_dialog_settings.close();
    words_dialog_settings.removeEventListener("click", handle_click_words_dialog);
}


function scroll_to_anchor_if_available() {
    const hash = (pendingAnchor || window.location.hash || "").trim();
    if (!hash) { return; }

    const id = decodeURIComponent(hash.replace(/^#/, ""));
    if (!id) { return; }

    const target = document.getElementById(id);
    if (!target) { return; }

    target.scrollIntoView({ behavior: "smooth", block: "start" });
    pendingAnchor = "";
}


function handle_click_words_dialog(e) {
    if (e.target === words_dialog_settings) {
        close_words_dialog_settings();
    }
}




document.addEventListener("DOMContentLoaded", () => {

    // auto load data
    if (DEV_MODE) {
        auto_load_data(DEV_FILE_PATH);
        setTimeout(() => {
            window.scrollTo(0, SCROLL_TO);
        }, 500);
    }
    else {
        const stored_pixel_data = load_pixels_data();

        // auto load saved Pixels data if enabled
        if (stored_pixel_data) {
            persist_pixels_checkbox.checked = stored_pixel_data.length > 0;
            savePixelData = true;
            initial_data = stored_pixel_data;
            current_data = initial_data;
            load_settings();
            update_stats_and_graphics();
            scroll_to_anchor_if_available();
            show_popup_message("Loaded saved Pixels data.", "info", 3000);
        }
    }

    window.addEventListener("hashchange", () => {
        pendingAnchor = window.location.hash || "";
        const contentVisible = (content_container.style.display !== "none") && (stats_content_container.style.display !== "none");
        if (contentVisible) {
            scroll_to_anchor_if_available();
        }
    });

    // If mobile, change the placeholder text of the search input
    if (isMobile) {
        words_search_input.placeholder = 'e.g. "good day"';
    }

    // Persist Pixels checkbox toggle
    persist_pixels_checkbox.addEventListener("change", (e) => {
        savePixelData = e.target.checked;
        if (e.target.checked) {
            // enable persistence: save current data
            if (initial_data && initial_data.length > 0) {
                save_pixels_data(initial_data);
            }
        }
        else {
            delete_pixels_data();
        }
    });

    file_input.addEventListener("change", async (event) => {
        const file = event.target.files[0];
        await handle_file_upload(file);
    });

    body.addEventListener("dragover", (e) => {
        e.preventDefault();
        drag_and_drop_zone.classList.add("dragover");
    });

    body.addEventListener("dragleave", () => {
        drag_and_drop_zone.classList.remove("dragover");
    });

    body.addEventListener("drop", (e) => {
        e.preventDefault();
        drag_and_drop_zone.classList.remove("dragover");

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type === "application/json" || file.name.endsWith(".json") ||
                file.type === "text/csv" || file.name.endsWith(".csv")) {
                handle_file_upload(file);
            }
            else {
                if (e.target === drag_and_drop_zone || drag_and_drop_zone.contains(e.target)) {
                    show_popup_message("Please drop a .json file", "error", 3000);
                }
            }
        }
    });


    // section titles to copy URL with anchor
    section_titles.forEach(title => {
        title.title = "Click to copy link to this section";
        title.addEventListener("click", () => {
            const sectionId = title.id;
            const url = `${window.location.origin}${window.location.pathname}#${sectionId}`;

            navigator.clipboard.writeText(url).then(() => {
                show_popup_message("Link copied to clipboard!", "info", 2000);
            })
                .catch(err => {
                    console.error("Failed to copy URL:", err);
                    show_popup_message("Failed to copy link", "error", 2000);
                });
        });
    });


    // Tutorial
    start_tutorial_button.addEventListener("click", function () {
        start_tutorial();
    });


    // Pills filter
    range_pills.forEach(pill => {
        pill.addEventListener("click", () => {
            range_pills.forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            const range = pill.dataset.range;
            if (range > 0) {
                div_date_range_filter.classList.remove("date-range-open");
                filter_pixels(range);
            }
            else {
                div_date_range_filter.classList.add("date-range-open");
                setTimeout(() => { filter_pixels(0) }, 300); // delay to let the animation finish
            }
        });
    });

    start_date_filter.addEventListener("change", () => {
        filter_pixels(0);
    });

    end_date_filter.addEventListener("change", () => {
        filter_pixels(0);
    });


    // Averaging slider
    rolling_slider.addEventListener("input", (e) => {
        moodAveragingValue = parseInt(e.target.value);
        rolling_slider_text_value.textContent = moodAveragingValue;
        create_mood_chart();
    });

    show_average_checkbox.addEventListener("change", (e) => {
        moodShowAverage = e.target.checked;
        // add average on all charts
        create_mood_chart();
        create_tag_frequency_chart();
        create_tag_score_chart();
        sync_tag_charts_hover();
        create_month_chart();
        create_weekday_chart();
    });

    show_years_checkbox.addEventListener("change", (e) => {
        moodShowYears = e.target.checked;
        create_mood_chart();
    });

    show_pixel_card_checkbox.addEventListener("change", (e) => {
        moodShowPixelCard = e.target.checked;
        display_floating_card();
    });

    select_time_option.addEventListener("change", (e) => {
        moodTimeOption = e.target.value;
        create_mood_chart();
    });


    // Tags
    tag_frequency_checkbox.addEventListener("change", (e) => {
        tagsPercentage = e.target.checked;
        create_tag_frequency_chart();
        sync_tag_charts_hover();
    });

    input_nb_tags.addEventListener("input", (e) => {
        nbMaxTags = parseInt(e.target.value);
        create_tag_frequency_chart();
        create_tag_score_chart();
        sync_tag_charts_hover();
    });

    select_tag_category.addEventListener("input", (e) => {
        tagCategory = e.target.value;
        create_tag_frequency_chart();
        create_tag_score_chart();
        sync_tag_charts_hover();
    });


    // Weekdays
    weekday_frequency_select.addEventListener("change", (e) => {
        png_settings.firstDayOfWeek = parseInt(e.target.value);
        create_weekday_chart();
    });


    // Months
    season_colors_checkbox.addEventListener("change", (e) => {
        monthSeasonColors = e.target.checked;
        create_month_chart();
    });


    // Word search
    words_percentage_checkbox.addEventListener("change", (e) => {
        wordDisplayPercentage = e.target.checked;
        create_word_frequency_section();
    });

    words_order_checkbox.addEventListener("change", (e) => {
        wordOrderByScore = e.target.checked;
        get_word_frequency();
        create_word_frequency_section();
    });

    words_unique_days_checkbox.addEventListener("change", (e) => {
        wordCountUniqueDays = e.target.checked;
        get_word_frequency();
        create_word_frequency_section();
    });

    words_regex_checkbox.addEventListener("change", (e) => {
        wordRegexSearch = e.target.checked;
        words_search_label.textContent = wordRegexSearch ? "Search regex" : "Search words";
        words_search_input.placeholder = wordRegexSearch ? 'e.g. "ate with (\\w+)"' : 'e.g. "good day"';
        get_word_frequency();
        create_word_frequency_section();
    });

    words_words_input.addEventListener("input", (e) => {
        wordNbMaxWords = parseInt(e.target.value);
        create_word_frequency_section();
    });

    words_count_input.addEventListener("input", (e) => {
        wordNbMinCount = parseInt(e.target.value);
        create_word_frequency_section();
    });

    min_score_slider.addEventListener("input", (e) => {
        wordMinScore = parseInt(e.target.value) / 10;
        min_score_slider_text_value.textContent = wordMinScore.toFixed(1);
        get_word_frequency();
        create_word_frequency_section();
    });

    words_search_input.addEventListener("input", (e) => {
        wordSearchText = e.target.value.toLowerCase();
        get_word_frequency();
        create_word_frequency_section();
    });

    words_dialog_settings.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            btn_save_words_dialog_settings.click();
        }
    });

    // Wordcloud
    btn_open_words_dialog_settings.addEventListener("click", () => {
        open_words_dialog_settings();
    });

    btn_save_words_dialog_settings.addEventListener("click", () => {
        close_words_dialog_settings();
    });

    wordcloud_size_input.addEventListener("input", (e) => {
        wordcloudSize = parseInt(e.target.value);
        update_wordcloud();
    });

    wordcloud_spacing_input.addEventListener("input", (e) => {
        wordcloudSpacing = parseInt(e.target.value);
        update_wordcloud();
    });

    wordcloud_compression_input.addEventListener("input", (e) => {
        wordcloudCompression = parseInt(e.target.value);
        update_wordcloud();
    });

    btn_download_wordcloud.addEventListener("click", () => {
        download_wordcloud();
    });

    btn_export_words.addEventListener("click", () => {
        download_word_list();
    });


    // Export PNG
    setting_scoreType.addEventListener("change", (e) => {
        png_settings = get_image_settings();
        generate_pixels_PNG();
    });

    setting_layout.addEventListener("input", (e) => {
        png_settings = get_image_settings();
        generate_pixels_PNG();
    });


    // Save settings when a field is changed
    const inputs = Array.from(document.querySelectorAll("input, select"));

    inputs.forEach(input => {
        if ((input.type === "file") || (input.type === "color")) { return; }
        input.addEventListener("input", store_settings);
    });
});