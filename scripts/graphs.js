const tag_frequencies_container = document.querySelector("#tagFrequencyContainer");
const tag_scores_container = document.querySelector("#tagScoreContainer");

const canvas_mood = document.querySelector("#moodChart");
const canvas_tag_frequency = document.querySelector("#tagChart");
const canvas_tag_score = document.querySelector("#tagScoreChart");
const weekdays_score = document.querySelector("#weekdaysChart");
const months_score = document.querySelector("#monthChart");

// CSS variables
const primaryColor = getComputedStyle(document.documentElement).getPropertyValue("--primary-color").trim();
const secondaryColor = getComputedStyle(document.documentElement).getPropertyValue("--secondary-color").trim();
const tertiaryColor = getComputedStyle(document.documentElement).getPropertyValue("--tertiary-color").trim();

let mood_chart_instance = null;
let tags_frequency_chart_instance = null;
let tags_score_chart_instance = null;
let week_score_chart_instance = null;
let month_score_chart_instance = null;

let hoverDelay = false;


let typeAverage = 2;
let lockMoodGraph = false;
function change_average_type(value) {
    typeAverage = value;
    create_mood_chart();
}


async function create_mood_chart() {
    const dates = current_data.map(entry => entry.date);

    let rawScores;
    let minValue;
    let maxValue;
    if (moodTimeOption === "mood") { // average score
        rawScores = current_data.map(entry => average(entry.scores));
        minValue = 1;
        maxValue = 5;
    }
    else if (moodTimeOption === "words") { // number of words
        rawScores = current_data.map(entry => {
            if (!entry || !entry.notes || (entry.scores.length === 0)) { return null; }
            return entry.notes.split(/\s+/).length;
        });
        minValue = maximum(rawScores);
        maxValue = minimum(rawScores);
    }
    else if (moodTimeOption === "tags") { // number of tags
        rawScores = current_data.map(entry => {
            if (!entry || !entry.tags || (entry.scores.length === 0)) { return null; }
            return entry.tags.reduce((count, tag) => {
                if (!Array.isArray(tag.entries)) return count;
                return count + tag.entries.length;
            }, 0);
        });
        minValue = maximum(rawScores);
        maxValue = minimum(rawScores);
    }
    else if (moodTimeOption === "scores") { // number of pixels
        rawScores = current_data.map(entry => {
            if (!entry || !entry.scores || (entry.scores.length === 0)) { return null; }
            return entry.scores.length;
        });
        minValue = maximum(rawScores);
        maxValue = minimum(rawScores);
    }

    // add average line
    const annotations = {};
    if (moodShowAverage) {
        annotations["average"] = {
            type: "line",
            mode: "horizontal",
            scaleID: "y",
            value: averageScore,
            borderColor: secondaryColor,
            borderWidth: 2,
            label: {
                enabled: false,
                content: `Average: ${averageScore.toFixed(2)}`,
                position: "top",
                backgroundColor: "rgba(0,0,0,0.6)",
                font: {
                    size: 10,
                    weight: "bold"
                }
            },
            enter(ctx) {
                ctx.element.options.label.enabled = true;
                ctx.chart.draw();
            },
            leave(ctx) {
                ctx.element.options.label.enabled = false;
                ctx.chart.draw();
            }
        }
    }

    // add year lines
    if (moodShowYears) {
        dates.forEach(dateStr => {
            const [year, month, day] = dateStr.split("-").map(Number);
            if (month === 1 && day === 1) {
                annotations[`startOfYear-${year}`] = {
                    type: "line",
                    mode: "vertical",
                    scaleID: "x",
                    value: dateStr,
                    borderColor: "#aaaaff",
                    borderWidth: 2,
                    label: {
                        enabled: true,
                        content: `${year}`,
                        position: "top",
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        font: {
                            size: 10,
                            weight: "bold"
                        }
                    },
                    enter(ctx) {
                        ctx.element.options.label.enabled = false;
                        ctx.chart.draw();
                    },
                    leave(ctx) {
                        ctx.element.options.label.enabled = true;
                        ctx.chart.draw();
                    }
                };
            }
        });
    }

    // weighted moving average centered on each day
    const half = Math.floor(moodAveragingValue / 2);
    const halfOddCorrection = ((moodAveragingValue % 2) === 1) ? 1 : 0;

    const averagedScores = rawScores.map((value, i) => {
        if (value == null) { return null; }

        const start = Math.max(0, i - (half + halfOddCorrection));
        const end = Math.min(rawScores.length - 1, i + half);

        let weightedSum = 0;
        let weightTotal = 0;

        for (let j = start; j <= end; j++) {
            const distance = Math.abs(j - i);
            const weight = half + halfOddCorrection + 1 - distance;

            const score = rawScores[j];
            if (score != null) {
                weightedSum += score * weight;
                weightTotal += weight;
            }
        }

        return weightTotal > 0 ? weightedSum / weightTotal : null;
    });


    if (mood_chart_instance) { mood_chart_instance.destroy(); }
    mood_chart_instance = new Chart(canvas_mood, {
        type: "line",
        data: {
            labels: dates,
            datasets: [{
                label: "Mood",
                data: averagedScores,
                borderColor: primaryColor,
                tension: 0.1,
                spanGaps: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: !isMobile,
            animation: !mood_chart_instance,
            scales: {
                y: {
                    beginAtZero: true,
                    min: minValue,
                    max: maxValue
                }
            },
            onClick: async (_, chartElement) => {
                display_floating_card(chartElement);

                hoverDelay = true;
                setTimeout(() => { hoverDelay = false }, 2000);
            },
            onHover: async function (_, chartElement) {
                if (moodShowPixelCard) {
                    display_floating_card(chartElement);
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                annotation: {
                    annotations: annotations
                }
            },
        }
    });
}


async function create_tag_frequency_chart() {
    const tagCounts = tag_stats.counts;
    const nbPixels = tag_stats.totalPixels;
    const sortedTags = Object.entries(tagCounts)
        .filter(tag => (tagCategory === "All") || (tagCategory === tag_stats.categories[tag[0]]))
        .sort(([, a], [, b]) => b - a)
        .slice(0, nbMaxTags);

    if (sortedTags.length > 0) {
        if (tags_frequency_chart_instance) {
            detach_chart_hover(tags_frequency_chart_instance);
            tags_frequency_chart_instance.destroy();
        }

        tag_frequencies_container.style.display = "block";
        canvas_tag_frequency.height = `${maximum([150, 15 * sortedTags.length])}`;

        tags_frequency_chart_instance = new Chart(canvas_tag_frequency, {
            type: "bar",
            data: {
                labels: sortedTags.map(([tag]) => tag),
                datasets: [{
                    label: tagsPercentage ? "Tag frequency (%)" : "Tag frequency",
                    data: sortedTags.map(([, count]) => tagsPercentage ? (100 * count / nbPixels).toFixed(2) : count),
                    backgroundColor: secondaryColor
                }]
            },
            options: {
                responsive: true,
                animation: !tags_frequency_chart_instance,
                maintainAspectRatio: !isMobile,
                indexAxis: "y",
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
    else {
        tag_frequencies_container.style.display = "none";
    }
};


async function create_tag_score_chart() {
    const tagScores = tag_stats.scores;
    const averages = Object.entries(tagScores)
        .filter(tag => (tagCategory === "All") || (tagCategory === tag_stats.categories[tag[0]]))
        .map(([tag, { total, count }]) => ([tag, total / count]))
        .sort(([, a], [, b]) => b - a)
        .slice(0, nbMaxTags);

    if (averages.length > 0) {

        // add average line
        const annotations = {};
        if (moodShowAverage) {
            annotations["average"] = {
                type: "line",
                mode: "vertical",
                scaleID: "x",
                value: averageScore,
                borderColor: primaryColor,
                borderWidth: 1,
                label: {
                    enabled: false,
                    content: `Average: ${averageScore.toFixed(2)}`,
                    position: "top",
                    backgroundColor: "rgba(0,0,0,0.6)",
                    font: {
                        size: 10,
                        weight: "bold"
                    }
                },
                enter(ctx) {
                    ctx.element.options.label.enabled = true;
                    ctx.chart.draw();
                },
                leave(ctx) {
                    ctx.element.options.label.enabled = false;
                    ctx.chart.draw();
                }
            }
        }


        if (tags_score_chart_instance) {
            detach_chart_hover(tags_score_chart_instance);
            tags_score_chart_instance.destroy();
        }

        tag_scores_container.style.display = "block";
        canvas_tag_score.height = `${maximum([150, 15 * averages.length])}`;

        tags_score_chart_instance = new Chart(canvas_tag_score, {
            type: "bar",
            data: {
                labels: averages.map(([tag, _]) => tag),
                datasets: [{
                    label: "Average score",
                    data: averages.map(([_, avg]) => avg.toFixed(2)),
                    backgroundColor: tertiaryColor,
                }]
            },
            options: {
                responsive: true,
                animation: !tags_score_chart_instance,
                maintainAspectRatio: !isMobile,
                indexAxis: "y",
                scales: {
                    x: {
                        max: 5,
                        min: 1
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    annotation: {
                        annotations: annotations
                    }
                }
            }
        });
    }
    else {
        tag_scores_container.style.display = "none";
    }
};


function sync_tag_hover(sourceChart, targetChart) {
    function remove_tooltip_target() {
        targetChart.setActiveElements([]);
        targetChart.tooltip.setActiveElements([], {});
        targetChart.draw();
    }

    function set_tooltip_target(e) {
        // check if sourceChart still exists
        if (!sourceChart?.canvas) {
            return;
        }
        const tooltipActive = sourceChart.tooltip.getActiveElements();
        const activePoints = sourceChart.getElementsAtEventForMode(e, "index", { intersect: false, axis: "y" }, false);
        if ((tooltipActive.length === 0) || (activePoints.length === 0)) {
            remove_tooltip_target();
            return;
        }

        const index = activePoints[0].index;
        const label = sourceChart.data.labels[index];
        const targetIndex = targetChart.data.labels.indexOf(label);
        if (targetIndex === -1) { return; }

        const canvasRect = targetChart.canvas.getBoundingClientRect();
        const sourceRect = sourceChart.canvas.getBoundingClientRect();
        const relativeY = e.clientY - sourceRect.top;
        const centerX = canvasRect.left + canvasRect.width / 2;

        targetChart.setActiveElements([{ datasetIndex: 0, index: targetIndex }]);
        targetChart.tooltip.setActiveElements(
            [{ datasetIndex: 0, index: targetIndex }],
            { x: centerX, y: canvasRect.top + relativeY }
        );
        targetChart.update();
    }

    sourceChart.canvas.addEventListener("mousemove", set_tooltip_target);
    sourceChart.canvas.addEventListener("mouseleave", remove_tooltip_target);

    // Add hover handlers to the source chart
    sourceChart._hoverHandlers = {
        mousemove: set_tooltip_target,
        mouseleave: remove_tooltip_target
    };
}


function detach_chart_hover(chartInstance) {
    const handlers = chartInstance._hoverHandlers;
    if (handlers) {
        chartInstance.canvas.removeEventListener("mousemove", handlers.mousemove);
        chartInstance.canvas.removeEventListener("mouseleave", handlers.mouseleave);
        delete chartInstance._hoverHandlers;
    }
}


async function sync_tag_charts_hover() {
    if (tags_frequency_chart_instance && tags_score_chart_instance) {
        sync_tag_hover(tags_frequency_chart_instance, tags_score_chart_instance);
        sync_tag_hover(tags_score_chart_instance, tags_frequency_chart_instance);
    }
}


async function create_weekday_chart() {
    const firstDayOfWeek = png_settings.firstDayOfWeek

    const ordered_day_indices = Array.from({ length: 7 }, (_, i) => (firstDayOfWeek + i) % 7);

    const baseSunday = new Date(2025, 11, 7); // Sunday
    const days_labels = ordered_day_indices.map(idx => {
        const day = new Date(baseSunday);
        day.setDate(baseSunday.getDate() + idx);
        return day.toLocaleString(userLocale, { weekday: "long" });
    });

    const data = ordered_day_indices.map(idx => {
        const stat = weekdays_stats[idx];
        if (!stat) { return null; }
        return (stat.total / stat.count).toFixed(2);
    });

    const annotations = {};
    if (moodShowAverage) {
        annotations["average"] = {
            type: "line",
            mode: "horizontal",
            scaleID: "y",
            value: averageScore,
            borderColor: primaryColor,
            borderWidth: 2,
            label: {
                enabled: false,
                content: `Average: ${averageScore.toFixed(2)}`,
                position: "top",
                backgroundColor: "rgba(0,0,0,0.6)",
                font: {
                    size: 10,
                    weight: "bold"
                }
            },
            enter(ctx) {
                ctx.element.options.label.enabled = true;
                ctx.chart.draw();
            },
            leave(ctx) {
                ctx.element.options.label.enabled = false;
                ctx.chart.draw();
            }
        }
    }

    if (week_score_chart_instance) {
        week_score_chart_instance.destroy();
    }
    week_score_chart_instance = new Chart(weekdays_score, {
        type: "bar",
        data: {
            labels: days_labels,
            datasets: [{
                label: "Weekdays",
                data: data,
                backgroundColor: tertiaryColor,
            }]
        },
        options: {
            responsive: true,
            animation: !week_score_chart_instance,
            maintainAspectRatio: !isMobile,
            scales: {
                y: {
                    max: 5,
                    min: 1
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                annotation: {
                    annotations: annotations
                }
            }
        }
    });
};


async function create_month_chart() {
    const seasons_colors = {
        "winter": "#66ccff",
        "spring": "#66ff99",
        "summer": "#eeee44",
        "autumn": "#db5800"
    }

    const month_seasons = {
        0: "winter",
        1: "winter",
        2: "spring",
        3: "spring",
        4: "spring",
        5: "summer",
        6: "summer",
        7: "summer",
        8: "autumn",
        9: "autumn",
        10: "autumn",
        11: "winter",
    };

    const month_labels = Array.from({ length: 12 }, (_, monthIndex) => {
        const day = new Date(2025, monthIndex, 1);
        return day.toLocaleString(userLocale, { month: "long" });
    });
    const all_month_indices = Array.from({ length: 12 }, (_, i) => i);

    const month_data = all_month_indices
        .map(idx => ({
            index: idx,
            label: month_labels[idx],
            avg: months_stats[idx] ? (months_stats[idx].total / months_stats[idx].count).toFixed(2) : 0
        }));

    const annotations = {};
    if (moodShowAverage) {
        annotations["average"] = {
            type: "line",
            mode: "horizontal",
            scaleID: "y",
            value: averageScore,
            borderColor: primaryColor,
            borderWidth: 2,
            label: {
                enabled: false,
                content: `Average: ${averageScore.toFixed(2)}`,
                position: "top",
                backgroundColor: "rgba(0,0,0,0.6)",
                font: {
                    size: 10,
                    weight: "bold"
                }
            },
            enter(ctx) {
                ctx.element.options.label.enabled = true;
                ctx.chart.draw();
            },
            leave(ctx) {
                ctx.element.options.label.enabled = false;
                ctx.chart.draw();
            }
        }
    }

    if (month_score_chart_instance) {
        month_score_chart_instance.destroy();
    }
    month_score_chart_instance = new Chart(months_score, {
        type: "bar",
        data: {
            labels: month_labels,
            datasets: [{
                label: "Months",
                data: month_data.map(({ avg }) => avg),
                backgroundColor: monthSeasonColors ? month_data.map(({ index }) => seasons_colors[month_seasons[index]]) : secondaryColor,
            },
            ]
        },
        options: {
            responsive: true,
            animation: !month_score_chart_instance,
            maintainAspectRatio: !isMobile,
            scales: {
                y: {
                    max: 5,
                    min: 1
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                annotation: {
                    annotations: annotations
                }
            }
        }
    });
}