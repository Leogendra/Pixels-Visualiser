let update_wordcloud_timeout = null;
let scores_pie_chart_instance = null;




// Loader : NE PAS écraser les fill="currentColor"
async function load_score_SVG(score) {
  if (!Number.isInteger(score) || score < 1 || score > 5) return document.createElement("span");
  const res = await fetch(`assets/pixels/score_${score}.svg`);
  const text = await res.text();
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const svg = doc.querySelector("svg");
  return svg;
}


async function load_colored_score_SVG(score) {
  const svg = await load_score_SVG(score);
  svg.style.color = png_settings.colors[score];
  return svg;
}

async function setup_palette_settings() {
  const colors = get_image_settings().colors;
  const grid = document.createElement("div");
  grid.className = "palette-grid";
  palette_grid.innerHTML = "";

  for (let score = 1; score <= 5; score++) {
    const cell = document.createElement("div");
    cell.className = "color-cell";

    const svg = await load_score_SVG(score);
    svg.classList.add("color-icon");
    svg.style.color = colors[score];

    const input = document.createElement("input");
    input.type = "color";
    input.id = `color${score}`;
    input.value = colors[score];
    input.className = "color-picker-overlay";

    input.addEventListener("input", () => {
      svg.style.color = input.value;
      png_settings.colors[score] = input.value;
    });

    cell.appendChild(svg);
    cell.appendChild(input);
    grid.appendChild(cell);
  }

  palette_grid.appendChild(grid);
}




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
    })
    .sort((a, b) => a - b);

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

    allScores.forEach(score => {
        moodCounts[score] = (moodCounts[score] || 0) + 1;
    });

    stats_array = [
        {title: "Number of Pixels", value: `<p>${current_data.filter(entry => entry.scores.length > 0).length}</p>`},
        {title: "Average score", value: `<p>${average(allScores).toFixed(2)}</p>`},
        {title: "Streaks", value: `<p>Last: ${streaks.currentStreak} | Best: ${streaks.bestStreak}</p>`},
        {title: "Score distribution", value: "<canvas title='Update your colors in the \"Export Pixel image\" settings' id='scoresPieChart' class='pie-chart' width='100' height='100'></canvas>"},
    ];

    stats_container.innerHTML = stats_array.map(({title, value}) => `
    <div class="stat-card">
    <h3>${title}</h3>
    ${value}
    </div>
    `).join("");
    
    setup_palette_settings();
    create_scores_pie_chart();
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
        const avgScore = entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length;

        if (entry.tags && entry.tags.length > 0) {
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
        }
    });

    tag_stats = {
        counts: tag_counts,
        scores: tag_scores,
        categories: tag_categories,
        totalPixels: current_data.length
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
        const day = date.toLocaleString('en-US', { weekday: 'long' });

        if (!weekdays_stats[day]) {
            weekdays_stats[day] = { total: 0, count: 0 };
        }
        weekdays_stats[day].total += avgScore;
        weekdays_stats[day].count += 1;
    });
}


function compute_months_stats() {
    months_stats = {};

    current_data.forEach(entry => {
        const avgScore = average(entry.scores);
        if (!avgScore) { return; }
        const date = new Date(entry.date);
        const month = date.toLocaleString('en-US', { month: 'long' });
        if (!months_stats[month]) {
            months_stats[month] = { total: 0, count: 0 };
        }
        months_stats[month].total += avgScore;
        months_stats[month].count += 1;
    });
}


function get_word_frequency() {
    const words_data = {}; // { word: { count: X, scores: [n, n, ...] } }
    let searchTextLower = normalize_string(wordSearchText);
    let splitWordsFlag = false;
    if (searchTextLower && searchTextLower.endsWith("/")) {
        searchTextLower = searchTextLower.slice(0, -1).trim();
        splitWordsFlag = true;
    }
    const searchWords = searchTextLower
        .split(/\s+/)
        .map(word => normalize_string(word))
        .filter(word => word);

    let searchPattern = null;
    let stopConditions = [];
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
            const tripleStarRegex = /\*\*\*\s*(\[[^\]]*\]\s*)?/g; // detect ***[...][...]
            const stopExtractRegex = /\[([^\]]*)\]/g; // extract content inside []
            let tripleStarMatch = tripleStarRegex.exec(searchTextLower);

            if (tripleStarMatch) {
                stopConditions = ["\n"]; // add \n by default
                let inner;
                while ((inner = stopExtractRegex.exec(tripleStarMatch[0])) !== null) {
                    stopConditions.push(inner[1]);
                }
                const before = escape_regex(searchTextLower.slice(0, tripleStarMatch.index).trim());
                const pattern = `${before}\\s*(.*?)\\s*(?=${stopConditions.map(stopCond => escape_regex(stopCond)).join("|")})`;
                searchPattern = new RegExp(pattern, "gi");
            }
        }
        else {
            if (searchTextLower.includes("**")) {
                searchTextLower = searchTextLower.replace(/\*\*/g, "*");
            }
            const pattern = searchTextLower
                                .split("*")
                                .map(escape_regex)
                                .join("(\\w+)");
            searchPattern = new RegExp(pattern, "gi");
        }
    }

    current_data.forEach(entry => {
        const average_score = average(entry.scores);
        if (average_score < wordMinScore) { return; }

        const notesLower = normalize_string(entry.notes);
        if (!notesLower) { return; }

        // Add the search term as a word if it matches the notes
        if (searchTextLower && !wordRegexSearch) {
            if (notesLower.includes(searchTextLower)) {
                if (!(searchTextLower in words_data)) {
                    words_data[searchTextLower] = { count: 0, scores: [] };
                }
                // Count number of appearances and add the score
                words_data[searchTextLower].count += notesLower.split(searchTextLower).length - 1
                words_data[searchTextLower].scores.push(average(entry.scores));
            }
            else if (!searchWords.some(sw => notesLower.includes(sw))) {
                // Save time by skipping this entry if no search words match
                return;
            }
        }

        // Filter words of the notes
        let words = wordRegexSearch
            ? []
            : notesLower
            .replace(/[^\p{L}\p{N}\p{Extended_Pictographic}\u200D\uFE0F]+/gu, " ")
            .split(/\s+/)
            .filter(word =>
                (word.replace(/[^a-zA-Z]/g, "").length >= 3 || /\p{Extended_Pictographic}/u.test(word)) && // Word is at least 3 letters long or emoji
                (!STOP_WORDS.has(word)) && // Word is not a stop word
                ((searchWords.length === 0) || (word !== searchTextLower)) && // Word is not the search term (avoid duplicates)
                (
                    (searchWords.length === 0) || // Either no search words or
                    searchWords.some((sw, i) => {
                        if (i === searchWords.length - 1) { // Last search word can be a prefix or exact match
                            return (word.startsWith(sw) || sw.startsWith(word));
                        }
                        else { // Other search words must be exact matches
                            return (word === sw);
                        }
                    })
                )
            );

        // If searchPattern is defined, find words that match the pattern
        if (searchPattern) {
            let match;
            let nbMatches = 0;
            while ((match = searchPattern.exec(notesLower)) !== null) {
                nbMatches++;
                if (nbMatches > 100) { break; } // Limit to 100 matches to avoid performance issues
                if (match.length > 2) {
                    const fullMatchedText = match[0];
                    if (!(fullMatchedText in words_data)) {
                        words_data[fullMatchedText] = { count: 0, scores: [] };
                    }
                    words_data[fullMatchedText].count += 1;
                    words_data[fullMatchedText].scores.push(average_score);
                }

                // one or more words captured by the pattern (if multiple *)
                for (let i = 1; i < match.length; i++) {
                    let capturedWord = match[i];
                    if (!capturedWord) { continue; }
                    if (splitWordsFlag) {
                        capturedWord = `${i}-${capturedWord}`; // Prefix the index to the captured word
                    }

                    if (!(capturedWord in words_data)) {
                        words_data[capturedWord] = { count: 0, scores: [] };
                    }
                    words_data[capturedWord].count += 1;
                    words_data[capturedWord].scores.push(average_score);
                }
            }
        }


        // Add each word to the count
        words.forEach(word => {
            if (!(word in words_data)) {
                words_data[word] = { count: 0, scores: [] };
            }
            words_data[word].count += 1;
            words_data[word].scores.push(average_score);
        });
        
    });


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
                    <p title="Number of apearance">count: ${wordDisplayPercentage ? (100 * word.count / current_data.length).toFixed(1) + "%" : word.count}</p>
                    <p title="Average score">score: ${(word.avg_score).toFixed(2)}</p>
                    </div>`
            }
        ).join("")}`
    }
    else { word_freq_container.innerHTML = "<p>No word frequency data available. Try to change search words, or lower the minimum count.</p>"; }


    // Avoid updating the wordcloud too frequently
    if (update_wordcloud_timeout) {
        clearTimeout(update_wordcloud_timeout);
    }
    update_wordcloud_timeout = setTimeout(() => {
        update_wordcloud();
    }, 1000);
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
            const adjustedCount = Math.pow(count - minimumCount + 1, (3 / (wordcloudCompression+2))) + 1;
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
    const link = document.createElement('a');
    link.download = 'wordcloud.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}