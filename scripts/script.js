// Utility functions
const calculateStats = (data) => {
    const allScores = data.flatMap(entry => entry.scores);
    return {
        'Number of Pixels': data.length,
        'Average score': (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2),
    };
};

const getAllTags = (data) => {
    const tags = {};
    data.forEach(entry => {
        if (entry.tags && entry.tags.length > 0) {
            entry.tags.forEach(tagGroup => {
                if (!tags[tagGroup.type]) {
                    tags[tagGroup.type] = new Set();
                }
                tagGroup.entries.forEach(tag => tags[tagGroup.type].add(tag));
            });
        }
    });
    return tags;
};


const stopWords = new Set([
    // French
    "le", "la", "les", "un", "une", "des", "du", "de", "dans", "et", "est", "au", "aux", "ce", "ces", "cette", "comme", "en", "sur", "par", "pour", "qui", "que", "quoi", "quand", "avec", "sans", "sous", "ainsi", "donc", "car", "mais", "plus", "moins", "très", "peu", "avant", "après", "chez", "entre", "cela", "celle", "celui", "ceux", "elles", "eux", "nous", "vous", "ils", "elle", "il", "je", "tu", "on",
    
    // English
    "the", "a", "an", "and", "or", "but", "if", "then", "this", "that", "these", "those", "on", "in", "at", "with", "without", "by", "for", "from", "to", "of", "about", "above", "below", "between", "after", "before", "under", "over", "which", "what", "who", "whom", "whose", "how", "when", "where", "why", "he", "she", "it", "we", "they", "you", "i"
]);

const getWordFrequency = (data) => {
    const words = data
        .filter(entry => entry.notes && entry.notes.trim() !== '')
        .flatMap(entry => 
            entry.notes.toLowerCase()
                .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
                .split(/\s+/)
    );

    const frequency = {};
    words.forEach(word => {
        if (word.length > 2 && !stopWords.has(word) && word.replace(/[^a-zA-Z]/g, '').length >= 3) {
            frequency[word] = (frequency[word] || 0) + 1;
        }
    });

    return Object.entries(frequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20);
};

// Chart creation functions
const createMoodChart = (data) => {
    // Déterminer le nombre maximum de scores dans les entrées
    const maxScores = Math.max(...data.map(entry => entry.scores.length));
    const dates = data.map(entry => entry.date);

    // Créer un tableau de scores pour chaque position
    const scores = Array.from({ length: maxScores }, (_, index) => 
        data.map(entry => entry.scores[index] || null)
    );

    const colors = [
        'rgb(255, 99, 132)',
        'rgb(75, 192, 192)',
        'rgb(153, 102, 255)',
        'rgb(255, 159, 64)',
        'rgb(54, 162, 235)'
    ];

    new Chart(document.getElementById('moodChart'), {
        type: 'line',
        data: {
            labels: dates,
            datasets: scores.map((score, index) => ({
                label: `Score ${index + 1}`,
                data: score,
                borderColor: colors[index % colors.length],
                tension: 0.1
            }))
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5
                }
            }
        }
    });
};

const createTagFrequencyChart = (data) => {
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

    const sortedTags = Object.entries(tagCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);

    if (sortedTags.length > 0) {
        new Chart(document.getElementById('tagChart'), {
            type: 'bar',
            data: {
                labels: sortedTags.map(([tag]) => tag),
                datasets: [{
                    label: 'Frequency',
                    data: sortedTags.map(([,count]) => count),
                    backgroundColor: 'rgba(255, 75, 75, 0.7)'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                    }
                }
            }
        });
    } else {
        document.getElementById('tagChart').parentElement.innerHTML = '<p>No tag data available</p>';
    }
};

const createTagScoreChart = (data) => {
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
        .map(([tag, {total, count}]) => ([tag, total/count]))
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);

    if (averages.length > 0) {
        new Chart(document.getElementById('tagScoreChart'), {
            type: 'bar',
            data: {
                labels: averages.map(([tag]) => tag),
                datasets: [{
                    label: 'Average score',
                    data: averages.map(([,avg]) => avg.toFixed(2)),
                    backgroundColor: 'rgba(75, 192, 192, 0.7)'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 5
                    }
                }
            }
        });
    } else {
        document.getElementById('tagScoreChart').parentElement.innerHTML = '<p>No score data per tag available</p>';
    }
};

// Main functionality
document.getElementById('fileInput').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Validate data structure
            if (!Array.isArray(data) || !data.every(entry => 
                entry.date && 
                Array.isArray(entry.scores) && 
                entry.scores.length > 0 &&
                typeof entry.notes === 'string' &&
                Array.isArray(entry.tags)
            )) {
                throw new Error('The JSON file format is not valid. Ensure it contains a list of Pixels.');
            }

            // Show content container
            document.getElementById('content').style.display = 'block';

            // Calculate and display stats
            const stats = calculateStats(data);
            const statsContainer = document.getElementById('statsContainer');
            statsContainer.innerHTML = Object.entries(stats)
                .map(([key, value]) => `
                    <div class="stat-card">
                        <h3>${key}</h3>
                        <p>${value}</p>
                    </div>
                `).join('');

            // Create charts
            createMoodChart(data);
            createTagFrequencyChart(data);
            createTagScoreChart(data);

            // Display word frequency
            const wordFreq = getWordFrequency(data);
            const wordFreqContainer = document.getElementById('wordFrequency');
            if (wordFreq.length > 0) {
                wordFreqContainer.innerHTML = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem;">
                        ${wordFreq.map(([word, count]) => `
                            <div class="stat-card">
                                <h4>${word}</h4>
                                <p>${count}</p>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                wordFreqContainer.innerHTML = '<p>No word frequency data available</p>';
            }

        } catch (error) {
            alert(`Erreur: ${error.message}`);
        }
    }
});