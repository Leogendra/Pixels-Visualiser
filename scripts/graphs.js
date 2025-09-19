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

let isCardPinned = false;
let hoverDelay = false;




function fill_missing_dates(data) {
    function format_date(date) {
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    }

    if (!Array.isArray(data) || data.length === 0) return [];

    data.sort((a, b) => {
        const [y1, m1, d1] = a.date.split('-').map(Number);
        const [y2, m2, d2] = b.date.split('-').map(Number);
        return new Date(y1, m1 - 1, d1) - new Date(y2, m2 - 1, d2);
    });

    const result = [];

    for (let i = 0; i < data.length - 1; i++) {
        const current = data[i];
        current.date = format_date(new Date(current.date));
        const next = data[i + 1];
        result.push(current);

        const [y1, m1, d1] = current.date.split('-').map(Number);
        const [y2, m2, d2] = next.date.split('-').map(Number);
        let pointer = new Date(y1, m1 - 1, d1);
        const target = new Date(y2, m2 - 1, d2);

        pointer.setDate(pointer.getDate() + 1);
        while (pointer < target) {
            result.push({ date: format_date(pointer), scores: [] });
            pointer.setDate(pointer.getDate() + 1);
        }
    }

    result.push(data[data.length - 1]);
    return result;
}



async function create_mood_chart() {
    data = fill_missing_dates(current_data);
    const dates = data.map(entry => entry.date);

    let rawScores;
    let minValue;
    let maxValue;
    if (moodTimeOption === "mood") {
        rawScores = data.map(entry => average(entry.scores));
        minValue = 1;
        maxValue = 5;
    }
    else if (moodTimeOption === "words") { // number of words
       rawScores = data.map(entry => {
            if (!entry || !entry.notes || (entry.scores.length === 0)) { return null; }
            return entry.notes.split(/\s+/).length;
        });
        minValue = maximum(rawScores);
        maxValue = minimum(rawScores);
    }
    else if (moodTimeOption === "tags") { // number of tags
        rawScores = data.map(entry => {
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
        rawScores = data.map(entry => {
            if (!entry || !entry.scores || (entry.scores.length === 0)) { return null; }
            return entry.scores.length;
        });
        minValue = maximum(rawScores);
        maxValue = minimum(rawScores);
    }

    const annotations = {};
    if (moodShowAverage) {
        annotations["mean"] = {
            type: "line",
            mode: "horizontal",
            scaleID: "y",
            value: average(rawScores.filter(score => (score !== null))),
            borderColor: "#ff4444",
            borderWidth: 2,
            label: {
                enabled: false,
                content: `Mean: ${average(rawScores.filter(score => (score !== null))).toFixed(2)}`,
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

    const averagedScores = rawScores.map((scores, i) => {
        if (scores == null) { return null; }
        const windowStart = Math.max(0, i - moodAveragingValue + 1);
        let sum = 0;
        let count = 0;
        for (let j = windowStart; j <= i; j++) {
            const v = rawScores[j];
            if (v !== null) {
                sum += v;
                count++;
            }
        }
        return count > 0 ? sum / count : null;
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
            onClick: async (event, chartElement) => {
                // Legacy function to scroll to Pixel card
                /*
                const points = mood_chart_instance.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
                if (points.length > 0) {
                    const pointIndex = points[0].index;
                    const labelText = mood_chart_instance.data.labels[pointIndex];
                    const dateText = normalize_date(labelText);

                    show_pixel_card(dateText, scroll=true);
                }
                */
                display_floating_card(data, chartElement, pinCard=true);

                hoverDelay = true;
                setTimeout(() => {hoverDelay = false}, 1000);
            },
            onHover: async function (event, chartElement) {
                if (!moodShowPixelCard) { return; }
                display_floating_card(data, chartElement);
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
    let daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    daysOfWeek = daysOfWeek.slice(firstDayOfWeek).concat(daysOfWeek.slice(0, firstDayOfWeek));

    const week_days = Object.entries(weekdays_stats)
        .map(([day, { total, count }]) => ([day, total / count]))
        .sort((a, b) => {
            return daysOfWeek.indexOf(a[0]) - daysOfWeek.indexOf(b[0]);
        });

    if (week_score_chart_instance) {
        week_score_chart_instance.destroy();
    }
    week_score_chart_instance = new Chart(weekdays_score, {
        type: "bar",
        data: {
            labels: week_days.map(([day, _]) => day),
            datasets: [{
                label: "Weekdays",
                data: week_days.map(([_, avg]) => avg.toFixed(2)),
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
        "January": "winter",
        "February": "winter",
        "March": "spring",
        "April": "spring",
        "May": "spring",
        "June": "summer",
        "July": "summer",
        "August": "summer",
        "September": "autumn",
        "October": "autumn",
        "November": "autumn",
        "December": "winter",
    };

    const month_data = Object.keys(month_seasons)
        .filter(month => months_stats[month])
        .map(month => [
            month,
            months_stats[month].total / months_stats[month].count
        ]);

    if (month_score_chart_instance) {
        month_score_chart_instance.destroy();
    }
    month_score_chart_instance = new Chart(months_score, {
        type: "bar",
        data: {
            labels: month_data.map(([month, _]) => month),
            datasets: [{
                label: "Months",
                data: month_data.map(([_, avg]) => avg.toFixed(2)),
                backgroundColor: monthSeasonColors ? month_data.map(([month, _]) => seasons_colors[month_seasons[month]]) : secondaryColor,
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
            }
        }
    });
}




    canvas_mood.addEventListener("mousemove", async (e) => {
        if (isCardPinned || hoverDelay) { return; }
        const x = e.clientX + window.scrollX;
        const y = e.clientY + window.scrollY;
        const margin = -10;
        
        container_floating_card.style.top = `${y + margin}px`;
        if (2*x > window.innerWidth) {
            container_floating_card.style.right = `${window.innerWidth - x + margin}px`;
            container_floating_card.style.left = "auto";
        }
        else {
            container_floating_card.style.left = `${x + margin}px`;
            container_floating_card.style.right = "auto";
        }
    });


container_floating_card.addEventListener("mouseleave", () => {
    if (!hoverDelay) {
        container_floating_card.style.display = "none";
        container_floating_card.innerHTML = "";
    }
});