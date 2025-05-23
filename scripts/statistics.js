function calculate_streaks(dateStrings) {
    const dates = [...new Set(dateStrings)]
        .map(d => new Date(d))
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
    }

    // Vérify if the last date in the array is part of the latest streak
    if ((dates[dates.length - 1] - dates[dates.length - 2]) / (1000 * 60 * 60 * 24) === 1) {
        latestStreak = currentLatestStreak;
        latestEndDate = dates[dates.length - 1];
    }

    return {
        bestStreak,
        latestStreak
    };
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
        stats_container.innerHTML = "<p>No data available for the selected range</p>";
    }
    else {
        stats_container.innerHTML = "";
        calculate_and_display_stats(current_data);
        create_mood_chart(current_data, parseInt(rolling_slider.value));
        create_tag_frequency_chart(current_data, tagsPercentage);
        create_tag_score_chart(current_data);
        create_word_frequency_section(current_data, nbMaxWords, wordcloudPercentage);
    }
}


function calculate_and_display_stats(data) {
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

    stats = [
        ["Number of Pixels", data.length],
        ["Average score", average(allScores).toFixed(2)],
        [`Score distribution (${minimum(allScores)} to ${maximum(allScores)})`, moodDistribution]
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