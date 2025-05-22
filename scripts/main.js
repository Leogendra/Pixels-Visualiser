const rolling_slider = document.querySelector("#rollingSlider");
const file_input = document.querySelector("#fileInput");
const content_container = document.querySelector("#content");
const stats_container = document.querySelector("#statsContainer");
const word_freq_container = document.querySelector("#wordFrequency");

const wordcloud_checkbox = document.querySelector("#wordCloudCheckbox");
const wordcloud_input = document.querySelector("#maxWordsInput");

const tag_frequency_checkbox = document.querySelector("#tagFrequencyCheckbox");

// CSS variables
const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
const secondaryColor = getComputedStyle(document.documentElement).getPropertyValue('--secondary-color').trim();


const DEV_MODE = false;
let current_data = [];
let mood_chart_instance = null;

// Tags
let tags_frequency_chart_instance = null;
let tagsPercentage = false;

// Wordcloud
let full_word_frequency = [];
let wordcloudPercentage = false;
let nbMaxWords = 20;



function average(tableau) {
    if (tableau.length === 0) return 0;
    const somme = tableau.reduce((acc, val) => acc + val, 0);
    return somme / tableau.length;
};

function minimum(tableau) {
    if (tableau.length === 0) return 0;
    return tableau.reduce((acc, val) => Math.min(acc, val), tableau[0]);
}
function maximum(tableau) {
    if (tableau.length === 0) return 0;
    return tableau.reduce((acc, val) => Math.max(acc, val), tableau[0]);
}


function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}


function calculate_stats(data) {
    const allScores = data.flatMap(entry => entry.scores);
    const moodCounts = {};

    allScores.forEach(score => {
        moodCounts[score] = (moodCounts[score] || 0) + 1;
    });

    const total = allScores.length;
    const moodDistribution = Object.entries(moodCounts)
        .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])) // Sort by score in ascending order
        .map(([_, count]) => `${(100 * count / total).toFixed(1)}%`)
        .join(" | ");

    return [
        ["Number of Pixels", data.length],
        ["Average score", average(allScores).toFixed(2)],
        [`Score distribution (${minimum(allScores)} to ${maximum(allScores)})`, moodDistribution]
    ];
}



function getAllTags(data) {
    const tags = {};
    data.forEach(entry => {
        if (entry.tags && entry.tags.length > 0) {
            entry.tags.forEach(tagGroup => {
                if (!tags[tagGroup.type]) {
                    tags[tagGroup.type] = new Set();
                }
                tagGroup.entries.forEach(tag => tags[tagGroup.type].add(tag));
            });
        }
    });
    return tags;
};




function get_word_frequency(data) {
    const words = data
        .filter(entry => entry.notes && entry.notes.trim() !== "")
        .flatMap(entry =>
            entry.notes.toLowerCase()
                .replace(/[.,\/#!$%\^&\*;:{}=\"\+\-_`~()]/g, " ")
                .split(/\s+/)
        );

    const frequency = {};
    words.forEach(word => {
        if (!stop_words.has(word) && word.replace(/[^a-zA-Z]/g, "").length >= 3) {
            frequency[word] = (frequency[word] || 0) + 1;
        }
    });

    full_word_frequency = Object.entries(frequency)
        .sort(([, a], [, b]) => b - a)
};


async function create_mood_chart(data, rollingAverage = 1) {
    const dates = data.map(entry => entry.date);
    const rawScores = data.map(entry => average(entry.scores));

    const scores = rawScores.map((_, i) => {
        const start = Math.max(0, i - rollingAverage + 1);
        return average(rawScores.slice(start, i + 1));
    });

    if (mood_chart_instance) {
        mood_chart_instance.destroy();
    }

    const isMobile = window.innerWidth <= 600;
    mood_chart_instance = new Chart(document.getElementById("moodChart"), {
        type: "line",
        data: {
            labels: dates,
            datasets: [{
                label: "Mood",
                data: scores,
                borderColor: primaryColor,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: !isMobile,
            animation: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    min: 1,
                    max: 5
                }
            }
        }
    });
}



async function create_tag_frequency_chart(data, isPercentage=false) {
    const tagCounts = {};
    data.forEach(entry => {
        if (entry.tags && entry.tags.length > 0) {
            entry.tags.forEach(tagGroup => {
                if (tagGroup.entries && tagGroup.entries.length > 0) {
                    tagGroup.entries.forEach(tag => {
                        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                    });
                }
            });
        }
    });
    const nbPixels = data.length;

    const sortedTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

        
    if (sortedTags.length > 0) {
        if (tags_frequency_chart_instance) {
            tags_frequency_chart_instance.destroy();
        }
        tags_frequency_chart_instance = new Chart(document.getElementById("tagChart"), {
            type: "bar",
            data: {
                labels: sortedTags.map(([tag]) => tag),
                datasets: [{
                    label: isPercentage ? "Tag frequency (%)" : "Tag frequency",
                    data: sortedTags.map(([, count]) => isPercentage ? (100*count/nbPixels).toFixed(2) : count),
                    backgroundColor: "#ff4b4b"
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                    }
                }
            }
        });
    } else {
        document.getElementById("tagChart").parentElement.innerHTML = "<p>No tag data available</p>";
    }
};


async function create_tag_score_chart(data) {
    const tagScores = {};
    data.forEach(entry => {
        const avgScore = entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length;
        if (entry.tags && entry.tags.length > 0) {
            entry.tags.forEach(tagGroup => {
                if (tagGroup.entries && tagGroup.entries.length > 0) {
                    tagGroup.entries.forEach(tag => {
                        if (!tagScores[tag]) {
                            tagScores[tag] = { total: 0, count: 0 };
                        }
                        tagScores[tag].total += avgScore;
                        tagScores[tag].count += 1;
                    });
                }
            });
        }
    });

    const averages = Object.entries(tagScores)
        .map(([tag, { total, count }]) => ([tag, total / count]))
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

    if (averages.length > 0) {
        new Chart(document.getElementById("tagScoreChart"), {
            type: "bar",
            data: {
                labels: averages.map(([tag]) => tag),
                datasets: [{
                    label: "Average score",
                    data: averages.map(([, avg]) => avg.toFixed(2)),
                    backgroundColor: "rgba(75, 192, 192, 0.7)"
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 5
                    }
                }
            }
        });
    }
    else {
        document.getElementById("tagScoreChart").parentElement.innerHTML = "<p>No score data per tag available</p>";
    }
};


async function create_word_frequency_section(data, maxWords, inPercentage = false) {
    if (full_word_frequency.length === 0) {
        get_word_frequency(data);
    }
    const wordFreq = full_word_frequency.slice(0, maxWords);
    const nbPixels = data.length;
    word_freq_container.innerHTML = wordFreq.length > 0 ? `
            <div class="container-word-frequency">
                ${wordFreq.map(([word, count]) => `
                    <div class="word-card">
                        <h4>${capitalize(word)}</h4>
                        <p>${inPercentage ? (100 * count / nbPixels).toFixed(1) + "%" : count}</p>
                    </div>
                `).join("")}
            </div>
        ` : "<p>No word frequency data available</p>";
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

        current_data = data;

        content_container.style.display = "block";

        const stats = calculate_stats(data);
        stats_container.innerHTML = stats.map(([title, value]) => `
            <div class="stat-card">
                <h3>${title}</h3>
                <p>${value}</p>
            </div>
        `).join("");

        // Graphiques
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
        auto_load_data("../data/backup_an.json");
    }

    // Add event listener to the file input
    file_input.addEventListener("change", async (event) => {
        const file = event.target.files[0];
        await handle_file_upload(file);
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