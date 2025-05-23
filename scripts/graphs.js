const tag_frequencies_container = document.querySelector("#tagFrequencyContainer");
const tag_scores_container = document.querySelector("#tagScoreContainer");

let mood_chart_instance = null;
let tags_frequency_chart_instance = null;
let tags_score_chart_instance = null;
const isMobile = window.innerWidth <= 600;



async function create_mood_chart(data, rollingAverage = 1, displayAverage = true, displayYears = true) {
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
                borderColor: primaryColor,
                tension: 0.1
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
                scales: {
                    y: {
                        beginAtZero: true,
                    }
                }
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
        tags_score_chart_instance = new Chart(document.getElementById("tagScoreChart"), {
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
                animation: !tags_score_chart_instance,
                maintainAspectRatio: !isMobile,
                scales: {
                    y: {
                        beginAtZero: true,
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