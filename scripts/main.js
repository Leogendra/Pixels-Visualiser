const rolling_slider = document.querySelector("#rollingSlider");
const rolling_slider_text_value = document.querySelector("#rollingValue");
const file_input = document.querySelector("#fileInput");

const content_container = document.querySelector("#content");
const stats_content_container = document.querySelector("#stats-content");
const data_error_container = document.querySelector(".no-data-error");
const range_pills = document.querySelectorAll(".pill");

const stats_container = document.querySelector("#statsContainer");
const tag_grid_charts = document.querySelector(".grid-charts");
const show_average_checkbox = document.querySelector("#showAverageCheckbox");
const show_years_checkbox = document.querySelector("#showYearsCheckbox");
const word_freq_container = document.querySelector("#wordFrequency");

const tag_frequency_checkbox = document.querySelector("#tagFrequencyCheckbox");
const nb_tags_inputs = document.querySelectorAll("#maxTagsInput");
const wordcloud_checkbox = document.querySelector("#wordCloudCheckbox");
const wordcloud_input = document.querySelector("#maxWordsInput");


// CSS variables
const primaryColor = getComputedStyle(document.documentElement).getPropertyValue("--primary-color").trim();
const secondaryColor = getComputedStyle(document.documentElement).getPropertyValue("--secondary-color").trim();


const DEV_MODE = true;
let initial_data = [];
let current_data = [];

// Mood chart
let averagingValue = 1;
let showAverage = false;
let showYears = false;

// Tags
let tagsPercentage = false;
let nbMaxTags = 10;

// Wordcloud
let full_word_frequency = [];
let wordcloudPercentage = false;
let nbMaxWords = 20;




function fill_empty_dates(data) {
    const dateSet = new Set(data.map(entry => normalize_date(entry.date)));

    const allDates = Array.from(dateSet).map(dateStr => new Date(dateStr));
    const minDate = new Date(Math.min(...allDates));
    const maxDate = new Date(Math.max(...allDates));
    console.log("minDate", minDate);
    console.log("maxDate", maxDate);

    let current = new Date(minDate);
    while (current <= maxDate) {
        const iso = normalize_date(current);
        if (!dateSet.has(iso)) {
            data.push({
                date: iso,
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


function filter_pixels(range) {
    const numberOfDays = range;
    current_data = initial_data.filter(entry => {
        const entryDate = new Date(entry.date);
        const today = new Date();
        const diffDays = Math.ceil(Math.abs(today - entryDate) / (1000 * 60 * 60 * 24));
        return diffDays <= numberOfDays;
    });

    if (current_data.length === 0) {
        data_error_container.style.display = "block";
        stats_content_container.style.display = "none";
    }
    else {
        fill_empty_dates(current_data);
        data_error_container.style.display = "none";
        stats_content_container.style.display = "block";

        calculate_and_display_stats(current_data);
        create_mood_chart(current_data, averagingValue, showAverage, showYears);
        create_tag_frequency_chart(current_data, tagsPercentage);
        create_tag_score_chart(current_data);
        create_word_frequency_section(current_data, nbMaxWords, wordcloudPercentage);
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
            alert("The file format is invalid. Please ensure the Pixel file contains an array of entries with date, scores, notes, and tags.");
            throw new Error("The file format is invalid. Please ensure the Pixel file contains an array of entries with date, scores, notes, and tags.");
        }

        initial_data = data;
        current_data = initial_data;

        content_container.style.display = "block";

        calculate_and_display_stats(data);

        // Graphics
        create_mood_chart(data, averagingValue, showAverage, showYears);
        create_tag_frequency_chart(data, tagsPercentage);
        create_tag_score_chart(data);
        create_word_frequency_section(data, nbMaxWords, wordcloudPercentage);

    }
    catch (error) {
        // alert(`Error: ${error.message}`);
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


// On doc loading
document.addEventListener("DOMContentLoaded", () => {
    // Auto load data
    if (DEV_MODE) {
        auto_load_data("../data/pixels.json");
    }

    // Add event listener to the file input
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
        rolling_slider_text_value.textContent = averagingValue;
        create_mood_chart(current_data, averagingValue, showAverage, showYears);
    });

    show_average_checkbox.addEventListener("change", (e) => {
        showAverage = e.target.checked;
        create_mood_chart(current_data, averagingValue, showAverage, showYears);
    });

    show_years_checkbox.addEventListener("change", (e) => {
        showYears = e.target.checked;
        create_mood_chart(current_data, averagingValue, showAverage, showYears);
    });

    // Tags percent checkbox
    tag_frequency_checkbox.addEventListener("change", (e) => {
        tagsPercentage = e.target.checked;
        create_tag_frequency_chart(current_data, tagsPercentage, nbMaxTags);
    });

    nb_tags_inputs.forEach(input => {
        input.addEventListener("input", (e) => {
            nbMaxTags = parseInt(e.target.value);
            if (nbMaxTags > 15) {
                tag_grid_charts.classList.add('grid-single-column');
            } 
            else {
                tag_grid_charts.classList.remove('grid-single-column');
            }
            nb_tags_inputs.forEach(input => {
                input.value = nbMaxTags;
            });
            create_tag_frequency_chart(current_data, tagsPercentage, nbMaxTags);
            create_tag_score_chart(current_data, nbMaxTags);
        });
    });

    // Wordcloud percent checkbox
    wordcloud_checkbox.addEventListener("change", (e) => {
        wordcloudPercentage = e.target.checked;
        create_word_frequency_section(current_data, nbMaxWords, wordcloudPercentage);
    });

    // Word cloud max words input
    wordcloud_input.addEventListener("input", (e) => {
        nbMaxWords = parseInt(e.target.value);
        create_word_frequency_section(current_data, nbMaxWords, wordcloudPercentage);
    });

});