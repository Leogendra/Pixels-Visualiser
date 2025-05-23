const rolling_slider = document.querySelector("#rollingSlider");
const file_input = document.querySelector("#fileInput");

const content_container = document.querySelector("#content");
const range_pills = document.querySelectorAll(".pill");
const stats_container = document.querySelector("#statsContainer");
const word_freq_container = document.querySelector("#wordFrequency");

const tag_frequency_checkbox = document.querySelector("#tagFrequencyCheckbox");
const wordcloud_checkbox = document.querySelector("#wordCloudCheckbox");
const wordcloud_input = document.querySelector("#maxWordsInput");


// CSS variables
const primaryColor = getComputedStyle(document.documentElement).getPropertyValue("--primary-color").trim();
const secondaryColor = getComputedStyle(document.documentElement).getPropertyValue("--secondary-color").trim();


const DEV_MODE = true;
let initial_data = [];
let current_data = [];

// Tags
let tagsPercentage = false;

// Wordcloud
let full_word_frequency = [];
let wordcloudPercentage = false;
let nbMaxWords = 20;




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
        create_mood_chart(data);
        create_tag_frequency_chart(data, tagsPercentage);
        create_tag_score_chart(data);
        create_word_frequency_section(data, nbMaxWords, wordcloudPercentage);

    }
    catch (error) {
        alert(`Error: ${error.message}`);
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
        auto_load_data("../data/backup.json");
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
        const value = parseInt(e.target.value);
        document.getElementById("rollingValue").textContent = value;
        create_mood_chart(current_data, value);
    });

    // Tags percent checkbox
    tag_frequency_checkbox.addEventListener("change", (e) => {
        tagsPercentage = e.target.checked;
        create_tag_frequency_chart(current_data, tagsPercentage);
    });

    // Wordcloud percent checkbox
    wordcloud_checkbox.addEventListener("change", (e) => {
        wordcloudPercentage = e.target.checked;
        create_word_frequency_section(current_data, nbMaxWords, wordcloudPercentage);
    });

    // Word cloud max words input
    wordcloud_input.addEventListener("input", (e) => {
        try {
            const value = parseInt(e.target.value);
            if (value > 0) {
                nbMaxWords = value;
                create_word_frequency_section(current_data, nbMaxWords, wordcloudPercentage);
            }
        }
        catch (error) {
            console.error("Error parsing max words input:", error);
            alert("Please enter a valid number for max words.");
        }
    });

});