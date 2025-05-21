const rolling_slider = document.querySelector("#rollingSlider");
const file_input = document.querySelector("#fileInput");
const content_container = document.querySelector("#content");
const stats_container = document.querySelector("#statsContainer");
const word_freq_container = document.querySelector("#wordFrequency");

const DEV_MODE = true;
let current_data = [];
let mood_chart_instance = null;


function average(tableau) {
    if (tableau.length === 0) return 0;
    const somme = tableau.reduce((acc, val) => acc + val, 0);
    return somme / tableau.length;
};


function calculateStats(data) {
    const allScores = data.flatMap(entry => entry.scores);
    return {
        "Number of Pixels": data.length,
        "Average score": (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2),
    };
};


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


const stopWords = new Set([
    // French
    "le", "la", "les", "un", "une", "des", "du", "de", "dans", "et", "est", "au", "aux", "ce", "ces", "cette", "comme", "en", "sur", "par", "pour", "qui", "que", "quoi", "quand", "avec", "sans", "sous", "ainsi", "donc", "car", "mais", "plus", "moins", "très", "peu", "avant", "après", "chez", "entre", "cela", "celle", "celui", "ceux", "elles", "eux", "nous", "vous", "ils", "elle", "il", "je", "tu", "on",

    // English
    "the", "a", "an", "and", "or", "but", "if", "then", "this", "that", "these", "those", "on", "in", "at", "with", "without", "by", "for", "from", "to", "of", "about", "above", "below", "between", "after", "before", "under", "over", "which", "what", "who", "whom", "whose", "how", "when", "where", "why", "he", "she", "it", "we", "they", "you", "i"
]);




function get_word_frequency(data) {
    const words = data
        .filter(entry => entry.notes && entry.notes.trim() !== "")
        .flatMap(entry =>
            entry.notes.toLowerCase()
                .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
                .split(/\s+/)
        );

    const frequency = {};
    words.forEach(word => {
        if (word.length > 2 && !stopWords.has(word) && word.replace(/[^a-zA-Z]/g, "").length >= 3) {
            frequency[word] = (frequency[word] || 0) + 1;
        }
    });

    return Object.entries(frequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20);
};


function create_mood_chart(data, rollingAverage = 1) {
    const dates = data.map(entry => entry.date);
    const rawScores = data.map(entry => average(entry.scores));

    const scores = rawScores.map((_, i) => {
        const start = Math.max(0, i - rollingAverage + 1);
        return average(rawScores.slice(start, i + 1));
    });

    if (mood_chart_instance) {
        mood_chart_instance.destroy();
    }

    mood_chart_instance = new Chart(document.getElementById("moodChart"), {
        type: "line",
        data: {
            labels: dates,
            datasets: [{
                label: "Mood",
                data: scores,
                borderColor: "rgb(54, 162, 235)",
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            animation: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5
                }
            }
        }
    });
}



function create_tag_frequency_chart(data) {
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

    const sortedTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

    if (sortedTags.length > 0) {
        new Chart(document.getElementById("tagChart"), {
            type: "bar",
            data: {
                labels: sortedTags.map(([tag]) => tag),
                datasets: [{
                    label: "Frequency",
                    data: sortedTags.map(([, count]) => count),
                    backgroundColor: "rgba(255, 75, 75, 0.7)"
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


function create_tag_score_chart(data) {
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

        // Affichage du conteneur principal
        content_container.style.display = "block";

        // Statistiques
        const stats = calculateStats(data);
        stats_container.innerHTML = Object.entries(stats).map(([key, value]) => `
            <div class="stat-card">
                <h3>${key}</h3>
                <p>${value}</p>
            </div>
        `).join("");

        // Graphiques
        create_mood_chart(data);
        create_tag_frequency_chart(data);
        create_tag_score_chart(data);

        // Fréquence des mots
        const wordFreq = get_word_frequency(data);
        word_freq_container.innerHTML = wordFreq.length > 0 ? `
            <div class="container-word-frequency">
                ${wordFreq.map(([word, count]) => `
                    <div class="word-card">
                        <h4>${word}</h4>
                        <p>${count}</p>
                    </div>
                `).join("")}
            </div>
        ` : "<p>No word frequency data available</p>";

    } 
    catch (error) {
        alert(`Error: ${error.message}`);
    }
}


async function auto_load_data(filepath = "../data/backup.json") {
    try {
        const response = await fetch(filepath);
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
        auto_load_data();
    }

    // Add event listener to the file input
    file_input.addEventListener("change", async (event) => {
        const file = event.target.files[0];
        await handle_file_upload(file);
    });

    rolling_slider.addEventListener("input", (e) => {
        const value = parseInt(e.target.value);
        document.getElementById("rollingValue").textContent = value;
        create_mood_chart(current_data, value);
    });

});