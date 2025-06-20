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


function compute_tag_stats(data) {
    const tagCounts = {};
    const tagScores = {};

    data.forEach(entry => {
        const avgScore = entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length;

        if (entry.tags && entry.tags.length > 0) {
            entry.tags.forEach(tagGroup => {
                if (tagGroup.entries && tagGroup.entries.length > 0) {
                    tagGroup.entries.forEach(tag => {
                        tagCounts[tag] = (tagCounts[tag] || 0) + 1;

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

    tag_stats = {
        counts: tagCounts,
        scores: tagScores,
        totalPixels: data.length
    };
}


function compute_weekdays_stats(data) {
    weekdays_stats = {};

    data.forEach(entry => {
        const avgScore = average(entry.scores);
        const date = new Date(entry.date);
        const day = date.toLocaleString('en-US', { weekday: 'long' });

        if (!weekdays_stats[day]) {
            weekdays_stats[day] = { total: 0, count: 0 };
        }
        weekdays_stats[day].total += avgScore;
        weekdays_stats[day].count += 1;
    });
}


function compute_months_stats(data) {
    months_stats = {};

    data.forEach(entry => {
        const avgScore = average(entry.scores);
        const date = new Date(entry.date);
        const month = date.toLocaleString('en-US', { month: 'long' });
        if (!months_stats[month]) {
            months_stats[month] = { total: 0, count: 0 };
        }
        months_stats[month].total += avgScore;
        months_stats[month].count += 1;
    });
}


function get_word_frequency(data, orderByMood, searchText) {
    const wordData = {}; // { word: { count: X, scores: [n, n, ...] } }
    const searchTextLower = normalize_string(searchText);
    const searchWords = searchTextLower.split(/\s+/).map(word => normalize_string(word)).filter(word => word);

    data.forEach(entry => {
        const notesLower = normalize_string(entry.notes);
        if (!notesLower) { return; }

        // Add the search term as a word if it matches the notes
        if (searchTextLower) {
            if (notesLower.includes(searchTextLower)) {
                if (!(searchTextLower in wordData)) {
                    wordData[searchTextLower] = { count: 0, scores: [] };
                }
                // Count number of appearances and add the score
                wordData[searchTextLower].count += notesLower.split(searchTextLower).length - 1
                wordData[searchTextLower].scores.push(average(entry.scores));
            }
            else if (!searchWords.some(sw => notesLower.includes(sw))) {
                return;
            }
        }

        // Filter words of the notes
        const words = notesLower
            .replace(/[.,\/#!$%\^&\*;:{}="+_`~()]/g, " ")
            .replace(/-/g, " ")
            .split(/\s+/)
            .filter(word =>
                (word.replace(/[^a-zA-Z]/g, "").length >= 3) && // Word is at least 3 letters long
                (!STOP_WORDS.has(word)) && // Word is not a stop word
                (searchTextLower !== word) && // Word is not the search term (already counted above)
                (
                    (searchWords.length === 0) || // Either no search words or
                    searchWords.some(sw => (word.includes(sw) || sw.includes(word))) // Word matches any of the search words
                )
            );

        // Add each word to the count
        const normalizedWords = words.map(word => normalize_string(word));
        normalizedWords.forEach(word => {
            if (!(word in wordData)) {
                wordData[word] = { count: 0, scores: [] };
            }
            wordData[word].count += 1;
            wordData[word].scores.push(average(entry.scores));
        });
    });

    full_word_frequency = Object.entries(wordData)
        .map(([word, info]) => {
            const avg = info.scores.reduce((a, b) => a + b, 0) / info.scores.length;
            return { word, count: info.count, avg_score: avg };
        })
        .sort((a, b) => {
            if (orderByMood) {
                const diff = b.avg_score - a.avg_score;
                return (diff !== 0) ? diff : b.count - a.count;
            }
            else {
                return b.count - a.count;
            }
        });
}


async function create_word_frequency_section(data, maxWords, minCount, inPercentage, searchText) {
    let words_filtered = full_word_frequency
        .filter(word => (word.count >= minCount))
        .slice(0, maxWords);

    if (words_filtered.length > 0) {
        word_freq_container.innerHTML = `
            ${words_filtered.map(word => {
                let isWordSearched = false;
                if (searchText) {
                    const normalizedSearchText = normalize_string(searchText);
                    isWordSearched = (normalize_string(word.word) === normalizedSearchText) ||
                    searchText.split(/\s+/)
                    .some(term => normalize_string(word.word) === (normalize_string(term)));
                }
                return `<div class="word-card ${isWordSearched ? "searched-word" : ""}">
                <h4>${capitalize(word.word)}</h4>
                <p title="Number of apearance">${inPercentage ? (100 * word.count / data.length).toFixed(1) + "%" : word.count}</p>
                <p title="Average score">${(word.avg_score).toFixed(2)}</p>
                </div>`
            }
        ).join("")}`
    }
    else { word_freq_container.innerHTML = "<p>No word frequency data available</p>"; }

    update_wordcloud(minCount, inPercentage);
}


async function update_wordcloud(minCount) {
    // TODO: Take order by score into account
    // TODO: Make parameters for gridsize, backgound color and weight factor
    const words = full_word_frequency
        .filter(word => word.count >= minCount)
        .sort((a, b) => { 
            if (wordcloudOrderCount) { // Global variable
                return b.avg_score - a.avg_score;
            }
            else {
                return b.count - a.count;
            }
        })
        .slice(0, 100) // Max words to display in the wordcloud
        .map(word => {
            if (wordcloudOrderCount) {
                return [word.word, 10 * word.avg_score - 25];
            }
            else {
                return [word.word, word.count];
            }
        });

    if (words.length === 0) {
        wordcloud_container.style.display = "none";
        return;
    }

    let adjustedWords = words;
    if (!wordcloudOrderCount) {
        const minimumCount = words[words.length - 1][1];
        adjustedWords = words.map(([word, count]) => {
            const adjustedCount = Math.sqrt(count - minimumCount + 1) + 1;
            return [word, adjustedCount];
        });
    }

    wordcloud_container.style.display = "flex";
    WordCloud(wordcloud_canvas, {
        list: adjustedWords,
        gridSize: 5,
        weightFactor: 4,
        fontFamily: 'Segoe UI',
        color: 'random-dark',
        backgroundColor: '#f0f2f6'
    });

    set_padding_to_wordcloud();
}


async function download_wordcloud() {
    const canvas = wordcloud_canvas;
    const link = document.createElement('a');
    link.download = 'wordcloud.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}


async function set_padding_to_wordcloud() {
    const padding = 20;
    wordcloud_canvas.width = 1000 + padding * 2;
    wordcloud_canvas.height = 400 + padding * 2;

    const ctx = wordcloud_canvas.getContext("2d");
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transformation
    ctx.fillStyle = "#f0f2f6";
    ctx.fillRect(0, 0, wordcloud_canvas.width, wordcloud_canvas.height);
    ctx.restore();
    ctx.translate(padding, padding);
}