async function store_settings() {
    const settings = {
        averagingValue,
        showAverage,
        showYears,

        tag_stats,
        tagsPercentage,
        nbMaxTags,

        firstDayOfWeek,
        weekdays_stats,

        seasonColors,
        months_stats,

        full_word_frequency,
        wordcloudPercentage,
        wordcloudOrderCount,
        nbMaxWords,
        nbMinCount,
        minScore,

        wordcloudSize,
        wordcloudSpacing,

        png_settings,
    };

    localStorage.setItem('pixelSettings', JSON.stringify(settings));
}


async function load_settings() {
    const saved = localStorage.getItem('pixelSettings');
    if (!saved) return;

    try {
        const settings = JSON.parse(saved);

        // Averaging value
        averagingValue = settings.averagingValue;
        rolling_slider.value = averagingValue;
        rolling_slider_text_value.textContent = averagingValue;

        // Show average
        showAverage = settings.showAverage;
        show_average_checkbox.checked = showAverage;

        // Show years
        showYears = settings.showYears;
        show_years_checkbox.checked = showYears;

        // Tag stats
        tag_stats = settings.tag_stats;

        // Tags percentage
        tagsPercentage = settings.tagsPercentage;
        tag_frequency_checkbox.checked = tagsPercentage;

        // Max tags
        nbMaxTags = settings.nbMaxTags;
        nb_tags_inputs.forEach(input => input.value = nbMaxTags);

        // First day of week
        firstDayOfWeek = settings.firstDayOfWeek;
        weekday_frequency_select.value = firstDayOfWeek;

        // Weekdays stats
        weekdays_stats = settings.weekdays_stats;

        // Season colors
        seasonColors = settings.seasonColors;
        season_colors_checkbox.checked = seasonColors;

        // Months stats
        months_stats = settings.months_stats;

        // Word frequency
        full_word_frequency = settings.full_word_frequency;

        // Wordcloud percentage
        wordcloudPercentage = settings.wordcloudPercentage;
        words_percentage_checkbox.checked = wordcloudPercentage;

        // Wordcloud order count
        wordcloudOrderCount = settings.wordcloudOrderCount;
        words_order_checkbox.checked = wordcloudOrderCount;

        // Max words
        nbMaxWords = settings.nbMaxWords;
        words_words_input.value = nbMaxWords;

        // Min count
        nbMinCount = settings.nbMinCount;
        words_count_input.value = nbMinCount;

        // Min score
        minScore = settings.minScore;
        min_score_slider.value = 10 * minScore;
        min_score_slider_text_value.textContent = minScore;

        // Wordcloud size
        wordcloudSize = settings.wordcloudSize;
        wordcloud_size_input.value = wordcloudSize;

        // Wordcloud spacing
        wordcloudSpacing = settings.wordcloudSpacing;
        wordcloud_spacing_input.value = wordcloudSpacing;

        // PNG settings
        png_settings = settings.png_settings;
        set_image_settings(settings.png_settings);
    }
    catch (e) {
        console.error("Failed to load settings from localStorage", e);
    }
}
