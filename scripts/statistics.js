const dialog_score_distribution = document.querySelector("#dialogScoreDistribution");
const canvas_score_distribution = document.querySelector("#scoreDistributionDialogChart");
const btn_close_score_distribution = document.querySelector("#closeScoreDistributionDialog");

let update_wordcloud_timeout = null;
let scores_pie_chart_instance = null;
let score_distribution_dialog_chart_instance = null;




function calculate_streaks() {
    const dates = Array.from(
        new Set(
            current_data
                .filter(entry => (entry.scores.length > 0) && entry.date)
                .map(entry => entry.date)
        )
    ).map(dateStr => {
        const [year, month, day] = dateStr.split("-").map(Number);
        return new Date(Date.UTC(year, month - 1, day));
    }).sort((a, b) => a - b);

    let bestStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < dates.length; i++) {
        const previous_date = dates[i - 1];
        const current_date = dates[i];
        const diffDays = (current_date - previous_date) / (1000 * 60 * 60 * 24);

        currentStreak++;
        if (diffDays !== 1) {
            currentStreak = 1;
        }

        if (currentStreak > bestStreak) {
            bestStreak = currentStreak;
        }
    }

    return {
        bestStreak,
        currentStreak,
    };
}


function calculate_and_display_stats() {
    const allScores = current_data.flatMap(entry => entry.scores);
    const streaks = calculate_streaks();
    const moodCounts = {};
    averageScore = average(allScores);
    nbTotalDays = current_data.filter(entry => entry.scores.length > 0).length;

    allScores.forEach(score => {
        moodCounts[score] = (moodCounts[score] || 0) + 1;
    });

    stats_array = [
        { title: "Number of Pixels", value: `<p>${nbTotalDays}</p>` },
        { title: "Average score", value: `<p>${averageScore.toFixed(2)}</p>` },
        { title: "Streaks", value: `<p>Last: ${streaks.currentStreak} | Best: ${streaks.bestStreak}</p>` },
        { title: "Score distribution", value: `<canvas title="Click to enlarge" id="scoresPieChart" class="pie-chart" width="100" height="100"></canvas>` },
    ];

    stats_container.innerHTML = stats_array.map(({ title, value }, index) => `
    <div class="stat-card" id="statCard${index}">
    <h3>${title}</h3>
    ${value}
    </div>
    `).join("");

    setup_palette_settings();
    create_scores_pie_chart();
}


async function show_score_distribution_dialog() {
    const rawScores = current_data
        .flatMap(entry => entry.scores)
        .reduce((acc, score) => {
            acc[score] = (acc[score] || 0) + 1;
            return acc;
        }, {});

    const scoresCount = Object.keys(rawScores).map(Number);
    const values = scoresCount.map(score => rawScores[score] || 0);
    dialog_score_distribution.showModal();

    if (score_distribution_dialog_chart_instance) {
        score_distribution_dialog_chart_instance.destroy();
    }
    score_distribution_dialog_chart_instance = new Chart(canvas_score_distribution, {
        type: "bar",
        data: {
            labels: scoresCount,
            datasets: [{
                label: "Scores",
                data: values,
                backgroundColor: get_user_colors(rawScores),
                borderColor: "#000000",
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const value = context.parsed.y;
                            const data = context.chart.data.datasets[0].data;
                            const total = data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}


async function create_scores_pie_chart() {
    const rawScores = current_data
        .flatMap(entry => entry.scores)
        .reduce((acc, score) => {
            acc[score] = (acc[score] || 0) + 1;
            return acc;
        }, {});

    const scoresCount = Object.keys(rawScores).map(Number);
    const values = scoresCount.map(score => rawScores[score] || 0);

    if (scores_pie_chart_instance) { scores_pie_chart_instance.destroy(); }
    scores_pie_chart_instance = new Chart(document.querySelector("#scoresPieChart"), {
        type: "pie",
        data: {
            labels: scoresCount,
            datasets: [{
                label: "Scores",
                data: values,
                backgroundColor: get_user_colors(rawScores),
                borderColor: "#000000",
                borderWidth: 1
            }]
        },
        options: {
            responsive: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const value = context.parsed;
                            const data = context.chart.data.datasets[0].data;
                            const total = data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${percentage}%`;
                        }
                    }
                }
            },
            onClick: async (_, chartElement) => {
                show_score_distribution_dialog();
            }
        }
    });
}



function compute_tag_stats() {
    const tag_counts = {};
    const tag_scores = {};
    const tag_categories = {};
    tag_list_categories = new Set(["All"]);

    current_data.forEach(entry => {
        if (entry.scores.length === 0 || entry.tags.length === 0) { return; }
        const avgScore = average(entry.scores);

        entry.tags.forEach(tagCategory => {
            if (tagCategory.entries && tagCategory.entries.length > 0) {
                tag_list_categories.add(tagCategory.type);

                tagCategory.entries.forEach(tag => {
                    tag_counts[tag] = (tag_counts[tag] || 0) + 1;
                    tag_categories[tag] = tagCategory.type;

                    if (!tag_scores[tag]) {
                        tag_scores[tag] = { total: 0, count: 0 };
                    }
                    tag_scores[tag].total += avgScore;
                    tag_scores[tag].count += 1;
                });
            }
        });
    });

    tag_stats = {
        counts: tag_counts,
        scores: tag_scores,
        categories: tag_categories,
        totalPixels: nbTotalDays,
    };
    set_tags_selects();
    setup_tag_categories();
}


async function setup_tag_categories() {
    select_tag_category.innerHTML = "";
    tag_list_categories.forEach(category => {
        const tag_option = document.createElement("option");
        tag_option.value = category;
        tag_option.textContent = category;
        select_tag_category.appendChild(tag_option);
    })
    if (tag_list_categories.has(tagCategory)) {
        select_tag_category.value = tagCategory;
    }
    else {
        tagCategory = "All";
    }
}


function compute_weekdays_stats() {
    weekdays_stats = {};

    current_data.forEach(entry => {
        const avgScore = average(entry.scores);
        if (!avgScore) { return; }
        const date = new Date(entry.date);
        const dayIndex = date.getDay();

        if (!weekdays_stats[dayIndex]) {
            weekdays_stats[dayIndex] = { total: 0, count: 0 };
        }
        weekdays_stats[dayIndex].total += avgScore;
        weekdays_stats[dayIndex].count += 1;
    });
}


function compute_months_stats() {
    months_stats = {};

    current_data.forEach(entry => {
        const avgScore = average(entry.scores);
        if (!avgScore) { return; }
        const date = new Date(entry.date);
        const monthIndex = date.getMonth();

        if (!months_stats[monthIndex]) {
            months_stats[monthIndex] = { total: 0, count: 0 };
        }
        months_stats[monthIndex].total += avgScore;
        months_stats[monthIndex].count += 1;
    });
}


function get_word_frequency() {
    const words_data = {}; // { word: { count: X, scores: [n, n, ...] } }
    let searchTextLower = normalize_string(wordSearchText);
    let splitWordsFlag = false;
    let negativeFilterPattern = null;
    let positiveFilterPattern = null;

    // negative filter pattern: (!...)
    const negativeMatch = searchTextLower.match(/\(!([^)]+)\)/);
    if (negativeMatch) {
        const negativeText = negativeMatch[1];
        if (negativeText) {
            negativeFilterPattern = new RegExp(negativeText, "gi");
        }
        // remove the negative filter part from search text
        searchTextLower = searchTextLower.replace(/\(!([^)]+)\)/, "").trim();
    }

    // positive filter pattern: (+...)
    const positiveMatch = searchTextLower.match(/\(\+([^)]+)\)/);
    if (positiveMatch) {
        const positiveText = positiveMatch[1];
        if (positiveText) {
            positiveFilterPattern = new RegExp(positiveText, "gi");
        }
        // remove the positive filter part from search text
        searchTextLower = searchTextLower.replace(/\(\+([^)]+)\)/, "").trim();
    }

    // split words flag /
    if (searchTextLower && searchTextLower.endsWith("/")) {
        searchTextLower = searchTextLower.slice(0, -1).trim();
        splitWordsFlag = true;
    }

    // compute regex pattern if needed
    let searchPattern = null;
    if (wordRegexSearch && searchTextLower) {
        try {
            searchPattern = new RegExp(searchTextLower, "gi");
        }
        catch {
            searchPattern = null;
        }
    }
    else if (searchTextLower.includes("*") && searchTextLower.length > 1) {
        if (searchTextLower.includes("***")) {
            if (!searchTextLower.trim().startsWith("***")) { // avoid matching text if it's just ***
                const tripleStarRegex = /\*\*\*(?:\[[^\]]*\])*/; // detect ***[...][...]
                const stopExtractRegex = /\[([^\]]*)\]/g; // extract content inside []
                let tripleStarMatch = tripleStarRegex.exec(searchTextLower);

                if (tripleStarMatch) {
                    let stopConditions = ["$", "\\n"]; // stop to \n and end of string by default
                    stopExtractRegex.lastIndex = 0;

                    let inner;
                    while ((inner = stopExtractRegex.exec(tripleStarMatch[0])) !== null) {
                        const val = inner[1];
                        if (val) {
                            stopConditions.push(escape_regex(val));
                        }
                    }

                    const beforeText = escape_regex(searchTextLower.slice(0, tripleStarMatch.index).trim());
                    const pattern = `\\b${beforeText}\\b[ \\t]+(.*?)(?=[ \\t]*(?:${stopConditions.join("|")}))`;
                    searchPattern = new RegExp(pattern, "gi");
                }
            }
        }
        else {
            if (searchTextLower.includes("**")) { // avoid misspelling * with **
                searchTextLower = searchTextLower.replace(/\*\*/g, "*");
            }
            const pattern = searchTextLower
                .split("*")
                .map(escape_regex)
                .join("(\\w+)");
            searchPattern = new RegExp(pattern, "gi");
        }
    }

    const searchWords = searchTextLower
        .split(/\s+/)
        .map(word => normalize_string(word))
        .filter(word => word);

    current_data.forEach(entry => {
        const averageScore = average(entry.scores);
        if (averageScore < wordMinScore) { return; }

        const notesLower = normalize_string(entry.notes);
        if (!notesLower) { return; }

        // Skip this entry if it matches the negative filter
        if (negativeFilterPattern && negativeFilterPattern.test(notesLower)) {
            return;
        }

        // Skip this entry if it doesn't match the positive filter
        if (positiveFilterPattern && !positiveFilterPattern.test(notesLower)) {
            return;
        }

        // add the search term as a word if it matches the notes
        if (searchTextLower && !wordRegexSearch) {
            if (notesLower.includes(searchTextLower)) {
                if (!(searchTextLower in words_data)) {
                    words_data[searchTextLower] = { count: 0, scores: [] };
                }
                // count number of appearances and add the score
                if (wordCountUniqueDays) {
                    words_data[searchTextLower].count += 1;
                    words_data[searchTextLower].scores.push(average(entry.scores));
                }
                else {
                    const occurrences = notesLower.split(searchTextLower).length - 1;
                    words_data[searchTextLower].count += occurrences;
                    for (let i = 0; i < occurrences; i++) {
                        words_data[searchTextLower].scores.push(average(entry.scores));
                    }
                }
            }
            else if (!searchWords.some(sw => notesLower.includes(sw))) {
                return; // save time by skipping this entry if no search words match
            }
        }

        // filter words of the notes
        let matched_words = (wordRegexSearch && searchPattern)
            ? []
            : notesLower
                .replace(/[^\p{L}\p{N}\p{Extended_Pictographic}\u200D\uFE0F]+/gu, " ")
                .split(/\s+/)
                .filter(word =>
                    (word.replace(/[^a-zA-Z]/g, "").length >= 3 || /\p{Extended_Pictographic}/u.test(word)) && // word is at least 3 letters long or emoji
                    (!STOP_WORDS.has(word)) && // word is not a stop word
                    ((searchWords.length === 0) || (word !== searchTextLower)) && // word is not the search term (avoid duplicates)
                    (
                        (searchWords.length === 0) || // either no search words or
                        searchWords.some((sw, i) => {
                            if (i === searchWords.length - 1) { // last search word can be a prefix or exact match
                                return (word.startsWith(sw) || sw.startsWith(word));
                            }
                            else { // other search words must be exact matches
                                return (word === sw);
                            }
                        })
                    )
                );

        // if searchPattern is defined, find words that match the pattern
        if (searchPattern) {
            let match;
            let nbMatches = 0;
            searchPattern.lastIndex = 0;
            while ((match = searchPattern.exec(notesLower)) !== null) {
                nbMatches++;
                if (nbMatches > 100) { break; } // limit to 100 matches to avoid performance issues

                for (let i = 1; i < match.length; i++) {
                    let captured = match[i];
                    if (!captured) { continue; }

                    if (splitWordsFlag) {
                        captured = `${i}-${captured}`;
                    }

                    // split match for ***[] patterns
                    const words_captured = captured.split(/\s+/);
                    for (let k = 1; k <= words_captured.length; k++) {
                        const sub = words_captured.slice(0, k).join(" ").replace(/[.,]+/g, "").trim(); // remove , . and trim
                        if (!(sub in words_data)) {
                            words_data[sub] = { count: 0, scores: [] };
                        }
                        words_data[sub].count += 1;
                        words_data[sub].scores.push(averageScore);
                    }
                }
            }
        }

        if (wordCountUniqueDays) {
            matched_words = Array.from(new Set(matched_words));
        }

        // Add each word to the count
        matched_words.forEach(word => {
            if (!(word in words_data)) {
                words_data[word] = { count: 0, scores: [] };
            }
            words_data[word].count += 1;
            words_data[word].scores.push(averageScore);
        });

    });

    // convert to sorted array
    full_word_frequency = Object.entries(words_data)
        .map(([word, info]) => {
            const avg = info.scores.reduce((a, b) => a + b, 0) / info.scores.length;
            return { word, count: info.count, avg_score: avg };
        })
        .sort((a, b) => {
            if (wordOrderByScore) {
                const diff = b.avg_score - a.avg_score;
                return (diff !== 0) ? diff : b.count - a.count;
            }
            else {
                return b.count - a.count;
            }
        });
}


async function create_word_frequency_section() {
    let words_filtered = full_word_frequency
        .filter(word => (word.count >= wordNbMinCount))
        .slice(0, wordNbMaxWords);

    if (words_filtered.length > 0) {
        label_export_words.style.display = "block";
        btn_export_words.style.display = "flex";

        word_freq_container.innerHTML = `
            ${words_filtered.map(word => {
            let isWordSearched = false;
            if (wordSearchText) {
                isWordSearched = (normalize_string(word.word) === normalize_string(wordSearchText)) ||
                    wordSearchText.split(/\s+/)
                        .some(term => normalize_string(word.word) === (normalize_string(term)));
            }
            return `<div class="word-card ${isWordSearched ? "searched-word" : ""}">
                    <h4>${capitalize(word.word)}</h4>
                    <p title="Number of apearance">count: ${wordDisplayPercentage ? (100 * word.count / nbTotalDays).toFixed(1) + "%" : word.count}</p>
                    <p title="Average score">score: ${(word.avg_score).toFixed(2)}</p>
                    </div>`
        }
        ).join("")}`
    }
    else {
        word_freq_container.innerHTML = "<p>No word frequency data available. Try to change search words, or lower the minimum count.</p>";
        label_export_words.style.display = "none";
        btn_export_words.style.display = "none";
        return;
    }


    // Avoid updating the wordcloud too frequently
    if (update_wordcloud_timeout) {
        clearTimeout(update_wordcloud_timeout);
    }
    update_wordcloud_timeout = setTimeout(() => {
        update_wordcloud();
    }, 1000);
}


function download_word_list() {
    const lines_split = full_word_frequency
        .filter(word => (word.count >= wordNbMinCount))
        .map(word => {
            const displayCount = wordDisplayPercentage
                ? (100 * word.count / nbTotalDays).toFixed(2) + "%"
                : `${word.count}`;

            return [word.word, displayCount, word.avg_score.toFixed(2)];
        });

    const maxWordLength = Math.max(...lines_split.map(parts => parts[0].length));
    const maxCountLength = Math.max(...lines_split.map(parts => parts[1].length));
    const content = lines_split
        .map(line => {
            const word = line[0].padEnd(maxWordLength); // align columns
            const count = line[1].padStart(maxCountLength);
            const score = line[2];
            return `${word} | ${count} | ${score}`;
        })
        .join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "word_list.txt";
    link.click();
    URL.revokeObjectURL(url);
}


async function update_wordcloud() {
    const words = full_word_frequency
        .filter(word => word.count >= wordNbMinCount)
        .sort((a, b) => {
            if (wordOrderByScore) {
                return b.avg_score - a.avg_score;
            }
            else {
                return b.count - a.count;
            }
        })
        .slice(0, wordcloudNbMaxWords) // Max words to display in the wordcloud (global setting)
        .map(word => {
            if (wordOrderByScore) {
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
    if (!wordOrderByScore) {
        const minimumCount = words[words.length - 1][1];
        adjustedWords = words.map(([word, count]) => {
            const adjustedCount = Math.pow(count - minimumCount + 1, (3 / (wordcloudCompression + 2))) + 1;
            return [word, adjustedCount];
        });
    }


    WordCloud(wordcloud_canvas, {
        list: adjustedWords,
        gridSize: 3 * wordcloudSpacing, // gap between words
        weightFactor: wordcloudSize, // size of the words
        fontFamily: "Segoe UI",
        color: "random-dark",
        backgroundColor: png_settings.colors.empty,
        drawOutOfBound: false,
        shrinkToFit: true,
    });
}


async function download_wordcloud() {
    const canvas = wordcloud_canvas;
    const link = document.createElement("a");
    link.download = "wordcloud.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
}




btn_close_score_distribution.addEventListener("click", () => {
    if (score_distribution_dialog_chart_instance) { score_distribution_dialog_chart_instance.destroy(); }
    dialog_score_distribution.close();
});

dialog_score_distribution.addEventListener("click", (e) => {
    if (e.target === dialog_score_distribution) {
        if (score_distribution_dialog_chart_instance) { score_distribution_dialog_chart_instance.destroy(); }
        dialog_score_distribution.close();
    }
});