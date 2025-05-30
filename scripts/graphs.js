const tag_frequencies_container = document.querySelector("#tagFrequencyContainer");
const tag_scores_container = document.querySelector("#tagScoreContainer");

const canvas_mood = document.querySelector("#moodChart");
const canvas_tag_frequency = document.getElementById("tagChart");
const canvas_tag_score = document.getElementById("tagScoreChart");
const weekdays_score = document.getElementById("weekdaysChart");

let mood_chart_instance = null;
let tags_frequency_chart_instance = null;
let tags_score_chart_instance = null;
let week_score_chart_instance = null;
const isMobile = window.innerWidth <= 600;




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



async function create_mood_chart(data, rollingAverage = 1, displayAverage = true, displayYears = true) {
    data = fill_missing_dates(data);
    const dates = data.map(entry => entry.date);
    const annotations = {};
    if (displayAverage) {
        annotations["mean"] = {
            type: "line",
            mode: "horizontal",
            scaleID: "y",
            value: average(data.map(entry => average(entry.scores))),
            borderColor: "#ff4444",
            borderWidth: 2,
        }
    }

    if (displayYears) {
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

    const rawScores = data.map(entry => average(entry.scores));
    const averagedScores = rawScores.map((scores, i) => {
        // Update the function to handle null values
        if (scores === null) return null;
        const windowStart = Math.max(0, i - rollingAverage + 1);
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
                    min: 1,
                    max: 5
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


async function create_tag_frequency_chart(data, isPercentage = false, maxTags = 10) {
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
        .slice(0, maxTags);


    if (sortedTags.length > 0) {
        if (tags_frequency_chart_instance) {
            tags_frequency_chart_instance.destroy();
        }
        tag_frequencies_container.style.display = "block";
        canvas_tag_frequency.style.height = `${maximum([150, sortedTags.length * 15])}px`;
        tags_frequency_chart_instance = new Chart(document.getElementById("tagChart"), {
            type: "bar",
            data: {
                labels: sortedTags.map(([tag]) => tag),
                datasets: [{
                    label: isPercentage ? "Tag frequency (%)" : "Tag frequency",
                    data: sortedTags.map(([, count]) => isPercentage ? (100 * count / nbPixels).toFixed(2) : count),
                    backgroundColor: "#ff4b4b"
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


async function create_tag_score_chart(data, maxTags = 10) {
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
        .slice(0, maxTags);

    if (averages.length > 0) {
        if (tags_score_chart_instance) {
            tags_score_chart_instance.destroy();
        }
        tag_scores_container.style.display = "block";
        canvas_tag_score.style.height = `${maximum([150, averages.length * 15])}px`;
        tags_score_chart_instance = new Chart(canvas_tag_score, {
            type: "bar",
            data: {
                labels: averages.map(([tag, _]) => tag),
                datasets: [{
                    label: "Average score",
                    data: averages.map(([_, avg]) => avg.toFixed(2)),
                    backgroundColor: "#0DBF6C",
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


async function create_weekday_chart(data, firstDayOfWeek) {
    const day_scores = {};
    data.forEach(entry => {
        const avgScore = average(entry.scores);
        const date = new Date(entry.date);
        const day = date.toLocaleString('en-US', { weekday: 'long' });
        if (!day_scores[day]) {
            day_scores[day] = { total: 0, count: 0 };
        }
        day_scores[day].total += avgScore;
        day_scores[day].count += 1;
    });

    let daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    daysOfWeek = daysOfWeek.slice(firstDayOfWeek).concat(daysOfWeek.slice(0, firstDayOfWeek));

    const week_days = Object.entries(day_scores)
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
                label: "Average score",
                data: week_days.map(([_, avg]) => avg.toFixed(2)),
                backgroundColor: "#0D6AC3",
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