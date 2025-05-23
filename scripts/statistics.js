function calculate_mood_distribution(moodCounts) {
    const nbMoods = moodCounts.length;

    return Object.entries(moodCounts)
        .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])) // Sort by score in ascending order
        .map(([score, count]) => `${score} : ${count} (${(100 * count / nbMoods).toFixed(1)}%)`)
        .join(" | ");
}


function calculate_streaks(dateStrings) {
    const dates = [...new Set(dateStrings)]
        .map(dateStr => {
            const [year, month, day] = dateStr.split("-").map(Number);
            return new Date(Date.UTC(year, month - 1, day));
        })
        .sort((a, b) => a - b);

    let bestStreak = 1;
    let currentStreak = 1;
    let lastDate = dates[0];

    let latestStreak = 1;
    let currentLatestStreak = 1;
    let latestEndDate = dates[0];

    for (let i = 1; i < dates.length; i++) {
        const prev = dates[i - 1];
        const curr = dates[i];

        const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
            currentStreak++;
            currentLatestStreak++;
        }
        else {
            currentStreak = 1;
            if ((prev - lastDate) / (1000 * 60 * 60 * 24) === 1) {
                latestEndDate = prev;
                latestStreak = currentLatestStreak;
            }
            currentLatestStreak = 1;
        }

        if (currentStreak > bestStreak) {
            bestStreak = currentStreak;
        }

        // diffdays: 0.9583333333333334, 
        // prevDay: Tue Dec 31 2024 01:00:00 GMT+0100 (heure normale d’Europe centrale), 
        // currDay: Wed Jan 01 2025 00:00:00 GMT+0100 (heure normale d’Europe centrale)
    }

    // Check if the last date in the array is part of the latest streak
    if ((dates[dates.length - 1] - dates[dates.length - 2]) / (1000 * 60 * 60 * 24) === 1) {
        latestStreak = currentLatestStreak;
        latestEndDate = dates[dates.length - 1];
    }

    return {
        bestStreak,
        latestStreak,
        latestEndDate,
    };
}


function calculate_and_display_stats(data) {
    const allScores = data.flatMap(entry => entry.scores);
    const allDates = data.map(entry => entry.date);
    const streaks = calculate_streaks(allDates);
    const moodCounts = {};

    allScores.forEach(score => {
        moodCounts[score] = (moodCounts[score] || 0) + 1;
    });

    stats = [
        ["Number of Pixels", data.length],
        ["Average score", average(allScores).toFixed(2)],
        ["Streaks", `Best: ${streaks.bestStreak} | Latest: ${streaks.latestStreak}`],
    ];

    stats_container.innerHTML = stats.map(([title, value]) => `
        <div class="stat-card">
            <h3>${title}</h3>
            <p>${value}</p>
        </div>
    `).join("")
}



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