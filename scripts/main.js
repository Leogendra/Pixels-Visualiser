const file_input = document.querySelector("#fileInput");
const privacy_notice = document.querySelector("#privacyNotice");

const content_container = document.querySelector("#content");
const stats_content_container = document.querySelector("#stats-content");
const data_error_container = document.querySelector(".no-data-error");
const range_pills = document.querySelectorAll(".pill");

const stats_container = document.querySelector("#statsContainer");
const rolling_slider = document.querySelector("#rollingSlider");
const rolling_slider_text_value = document.querySelector("#rollingValue");

const tag_grid_charts = document.querySelector(".grid-charts");
const show_average_checkbox = document.querySelector("#showAverageCheckbox");
const show_years_checkbox = document.querySelector("#showYearsCheckbox");
const tag_frequency_checkbox = document.querySelector("#tagFrequencyCheckbox");

const weekday_frequency_select = document.querySelector("#firstDayOfWeekSelect");

const season_colors_checkbox = document.querySelector("#seasonColorsCheckbox");

const word_freq_container = document.querySelector("#wordFrequency");
const nb_tags_inputs = document.querySelectorAll(".input-max-tag");
const wordcloud_percentage_checkbox = document.querySelector("#wordsPercentageCheckbox");
const wordcloud_order_checkbox = document.querySelector("#wordsOrderCheckbox");
const wordcloud_words_input = document.querySelector("#maxWordsInput");
const wordcloud_count_input = document.querySelector("#minCountInput");
const wordcloud_search_input = document.querySelector("#searchInput");


const DEV_MODE = true;
const DEV_FILE_PATH = "../data/pixels.json"
let initial_data = [];
let current_data = [];

// Mood chart
let averagingValue = 1;
let showAverage = false;
let showYears = false;

// Tags
let tag_stats = {};
let tagsPercentage = false;
let nbMaxTags = 10;

// Weekdays
let firstDayOfWeek = 1;
let weekdays_stats = {};

// Months
let seasonColors = false;
let months_stats = {};

// Wordcloud
let full_word_frequency = [];
let wordcloudPercentage = false;
let wordcloudOrderCount = false;
let nbMaxWords = 20;
let nbMinCount = 10;
let searchTerm = "";



function fill_empty_dates(data) {
    const datesStrSet = new Set(data.map(entry => pixel_format_date(entry.date)));
    const allDates = Array.from(datesStrSet).map(dateStr => new Date(dateStr));
    const minDate = new Date(Math.min(...allDates));
    const maxDate = new Date(Math.max(...allDates));

    let current = new Date(minDate);
    while (current <= maxDate) {
        const curentStrDate = pixel_format_date(current);
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

    data.sort((a, b) => new Date(pixel_format_date(a.date)) - new Date(pixel_format_date(b.date)));
    current_data = data;
}


function filter_pixels(numberOfDays) {
    const lastPixelDate = new Date(current_data[current_data.length - 1].date);
    current_data = initial_data.filter(entry => {
        const entryDate = new Date(entry.date);
        const diffDays = Math.round(Math.abs(lastPixelDate - entryDate) / (1000 * 60 * 60 * 24));
        return diffDays < numberOfDays;
    });

    if (current_data.length === 0) {
        data_error_container.style.display = "block";
        stats_content_container.style.display = "none";
    }
    else {
        data_error_container.style.display = "none";
        stats_content_container.style.display = "block";

        fill_empty_dates(current_data);
        compute_tag_stats(current_data);
        compute_weekdays_stats(current_data);
        compute_months_stats(current_data);
        get_word_frequency(current_data, wordcloudOrderCount, searchTerm);

        calculate_and_display_stats(current_data);
        create_mood_chart(current_data, averagingValue, showAverage, showYears);
        create_tag_frequency_chart(tagsPercentage, nbMaxTags);
        create_tag_score_chart(nbMaxTags);
        create_weekday_chart(firstDayOfWeek);
        create_month_chart(seasonColors);
        create_word_frequency_section(current_data, nbMaxWords, nbMinCount, wordcloudPercentage, searchTerm);
    }
}


async function handle_file_upload(file) {
    if (!file) return;

    try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!Array.isArray(data) || !data.every(entry =>
            entry.date &&
            Array.isArray(entry.scores) &&
            entry.scores.length > 0 &&
            typeof entry.notes === "string" &&
            Array.isArray(entry.tags)
        )) {
            const errorFormatTxt = "The file format is invalid. Please ensure the file is exported from the Teo Vogel's Pixels app.";
            alert(errorFormatTxt);
            throw new Error(errorFormatTxt);
        }

        else {
            initial_data = data;
            current_data = initial_data;

            content_container.style.display = "block";
            privacy_notice.style.display = "none";

            // Load saved settings
            await load_settings();

            // Stats
            calculate_and_display_stats(data);
            compute_tag_stats(current_data);
            compute_weekdays_stats(current_data);
            compute_months_stats(current_data);
            get_word_frequency(current_data, wordcloudOrderCount, searchTerm);

            // Graphics
            create_mood_chart(current_data, averagingValue, showAverage, showYears);
            create_tag_frequency_chart(tagsPercentage, nbMaxTags);
            create_tag_score_chart(nbMaxTags);
            create_weekday_chart(firstDayOfWeek);
            create_month_chart(seasonColors);
            create_word_frequency_section(current_data, nbMaxWords, nbMinCount, wordcloudPercentage, searchTerm);
        }
    }
    catch (error) {
        console.error(`Error: ${error.message}`);
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
    }
    catch (error) {
        console.error("auto_load_data Error:", error.message);
    }
}




document.addEventListener("DOMContentLoaded", () => {
    // Auto load data
    if (DEV_MODE) {
        auto_load_data(DEV_FILE_PATH);
        setTimeout(() => {
            window.scrollTo(0, document.body.scrollHeight - 10);
        }, 500);
    }

    file_input.addEventListener("change", async (event) => {
        const file = event.target.files[0];
        await handle_file_upload(file);
    });


    // Pills filter
    range_pills.forEach(pill => {
        pill.addEventListener("click", () => {
            document.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            const range = pill.dataset.range;
            filter_pixels(range);
        });
    });


    // Averaging slider
    rolling_slider.addEventListener("input", (e) => {
        averagingValue = parseInt(e.target.value);
        store_settings();
        rolling_slider_text_value.textContent = averagingValue;
        create_mood_chart(current_data, averagingValue, showAverage, showYears);
    });

    show_average_checkbox.addEventListener("change", (e) => {
        showAverage = e.target.checked;
        store_settings();
        create_mood_chart(current_data, averagingValue, showAverage, showYears);
    });

    show_years_checkbox.addEventListener("change", (e) => {
        showYears = e.target.checked;
        store_settings();
        create_mood_chart(current_data, averagingValue, showAverage, showYears);
    });


    // Tags
    tag_frequency_checkbox.addEventListener("change", (e) => {
        tagsPercentage = e.target.checked;
        store_settings();
        create_tag_frequency_chart(tagsPercentage, nbMaxTags);
    });

    nb_tags_inputs.forEach(input => {
        input.addEventListener("input", (e) => {
            nbMaxTags = parseInt(e.target.value);
            store_settings();
            nb_tags_inputs.forEach(input => {
                input.value = nbMaxTags;
            });
            create_tag_frequency_chart(tagsPercentage, nbMaxTags);
            create_tag_score_chart(nbMaxTags);
        });
    });


    // Weekdays
    weekday_frequency_select.addEventListener("change", (e) => {
        firstDayOfWeek = parseInt(e.target.value);
        store_settings();
        create_weekday_chart(firstDayOfWeek);
    });


    // Months
    season_colors_checkbox.addEventListener("change", (e) => {
        seasonColors = e.target.checked;
        store_settings();
        create_month_chart(seasonColors);
    });


    // Wordcloud
    wordcloud_percentage_checkbox.addEventListener("change", (e) => {
        wordcloudPercentage = e.target.checked;
        store_settings();
        create_word_frequency_section(current_data, nbMaxWords, nbMinCount, wordcloudPercentage, searchTerm);
    });

    wordcloud_order_checkbox.addEventListener("change", (e) => {
        wordcloudOrderCount = e.target.checked;
        store_settings();
        get_word_frequency(current_data, wordcloudOrderCount, searchTerm);
        create_word_frequency_section(current_data, nbMaxWords, nbMinCount, wordcloudPercentage, searchTerm);
    });

    wordcloud_words_input.addEventListener("input", (e) => {
        nbMaxWords = parseInt(e.target.value);
        store_settings();
        create_word_frequency_section(current_data, nbMaxWords, nbMinCount, wordcloudPercentage, searchTerm);
    });

    wordcloud_count_input.addEventListener("input", (e) => {
        nbMinCount = parseInt(e.target.value);
        store_settings();
        create_word_frequency_section(current_data, nbMaxWords, nbMinCount, wordcloudPercentage, searchTerm);
    });

    wordcloud_search_input.addEventListener("input", (e) => {
        searchTerm = e.target.value.toLowerCase();
        get_word_frequency(current_data, wordcloudOrderCount, searchTerm);
        create_word_frequency_section(current_data, nbMaxWords, nbMinCount, wordcloudPercentage, searchTerm);
    });


});