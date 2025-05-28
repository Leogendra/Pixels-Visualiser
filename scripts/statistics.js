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


function get_word_frequency(data, sortByMood) {
    const wordData = {}; // { word: { count: X, scores: [n, n, ...] } }

    data.forEach(entry => {
        if (!entry.notes || entry.notes.trim() === "") { return; }

        const words = entry.notes.toLowerCase()
            .replace(/[.,\/#!$%\^&\*;:{}="+\-_`~()]/g, " ")
            .split(/\s+/)
            .filter(word => word.replace(/[^a-zA-Z]/g, "").length >= 3 && !stop_words.has(word));

        words.forEach(word => {
            if (!(word in wordData)) {
                wordData[word] = { count: 0, scores: [] };
            }
            wordData[word].count += 1;
            // wordData[word].scores.push(...(entry.scores));
            wordData[word].scores.push(average(entry.scores));
        });
    });

    console.log("Word frequency data:");

    full_word_frequency = Object.entries(wordData)
        .map(([word, info]) => {
            const avg = info.scores.reduce((a, b) => a + b, 0) / info.scores.length;
            return { word, count: info.count, avg_score: avg };
        })
        .sort((a, b) => {
            if (sortByMood) {
                const diff = b.avg_score - a.avg_score;
                return diff !== 0 ? diff : b.count - a.count;
            }
            else {
                return b.count - a.count;
            }
        });

}


async function create_word_frequency_section(data, maxWords, minCount, inPercentage) {

    let words_filtered = full_word_frequency
                        .filter(word => (word.count >= minCount))
                        .slice(0, maxWords);

    word_freq_container.innerHTML = words_filtered.length > 0 ? `
            ${words_filtered.map(word => {
                return `<div class="word-card">
                            <h4>${capitalize(word.word)}</h4>
                            <p>${inPercentage ? (100 * word.count / data.length).toFixed(1) + "%" : word.count}</p>
                            <p>${(word.avg_score).toFixed(2)}</p>
                        </div>`
                }).join("")}
        ` : "<p>No word frequency data available</p>";
}