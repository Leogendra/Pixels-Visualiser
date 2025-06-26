async function store_settings() {
    const settings = {
        averagingValue,
        showAverage,
        showYears,

        tagsPercentage,
        nbMaxTags,

        firstDayOfWeek,
        seasonColors,

        wordcloudPercentage,
        wordcloudOrderCount,
        nbMaxWords,
        nbMinCount,
        minScore,

        stopwordsLanguage,
        default_stopwords: Array.from(default_stopwords),
        custom_stopwords: Array.from(custom_stopwords),

        wordcloudSize,
        wordcloudSpacing,

        png_settings,
    };

    localStorage.setItem("pixelSettings", JSON.stringify(settings));
}


async function load_settings() {
    const saved = localStorage.getItem("pixelSettings");
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

        // Tags percentage
        tagsPercentage = settings.tagsPercentage;
        tag_frequency_checkbox.checked = tagsPercentage;

        // Max tags
        nbMaxTags = settings.nbMaxTags;
        nb_tags_inputs.forEach(input => input.value = nbMaxTags);

        // First day of week
        firstDayOfWeek = settings.firstDayOfWeek;
        weekday_frequency_select.value = firstDayOfWeek;

        // Season colors
        seasonColors = settings.seasonColors;
        season_colors_checkbox.checked = seasonColors;

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

        // Stopwords settings
        stopwordsLanguage = settings.stopwordsLanguage || "en";
        default_stopwords = new Set(settings.default_stopwords || []);
        custom_stopwords = new Set(settings.custom_stopwords || []);
        STOP_WORDS = new Set([...default_stopwords, ...custom_stopwords]);
        set_stopwords_settings();

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
