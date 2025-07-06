let storeSettingsTimeout = false;




async function store_settings() {
    // Ensure all inputs are updated and avoid multiple rapid calls
    if (storeSettingsTimeout) {
        clearTimeout(storeSettingsTimeout);
    }

    storeSettingsTimeout = setTimeout(() => {
        const settings = {
            averagingValue,
            showAverage,
            showYears,

            tagsPercentage,
            nbMaxTags,

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

        setup_calendar_frame();
    }, 1000);

}


async function load_settings() {
    const saved = localStorage.getItem("pixelSettings");
    if (!saved) return;

    try {
        const settings = JSON.parse(saved);

        // Averaging value
        averagingValue = settings.averagingValue || averagingValue;
        rolling_slider.value = averagingValue;
        rolling_slider_text_value.textContent = averagingValue;

        // Show average
        showAverage = settings.showAverage || showAverage;
        show_average_checkbox.checked = showAverage;

        // Show years
        showYears = settings.showYears || showYears;
        show_years_checkbox.checked = showYears;

        // Time option
        timeOption = settings.timeOption || timeOption;
        select_time_option.value = timeOption;

        // Tags percentage
        tagsPercentage = settings.tagsPercentage || tagsPercentage;
        tag_frequency_checkbox.checked = tagsPercentage;

        // Max tags
        nbMaxTags = settings.nbMaxTags || nbMaxTags;
        nb_tags_inputs.forEach(input => input.value = nbMaxTags);

        // Season colors
        seasonColors = settings.seasonColors || seasonColors;
        season_colors_checkbox.checked = seasonColors;

        // Wordcloud percentage
        wordcloudPercentage = settings.wordcloudPercentage || wordcloudPercentage;
        words_percentage_checkbox.checked = wordcloudPercentage;

        // Wordcloud order count
        wordcloudOrderCount = settings.wordcloudOrderCount || wordcloudOrderCount;
        words_order_checkbox.checked = wordcloudOrderCount;

        // Max words
        nbMaxWords = settings.nbMaxWords || nbMaxWords;
        words_words_input.value = nbMaxWords;

        // Min count
        nbMinCount = settings.nbMinCount || nbMinCount;
        words_count_input.value = nbMinCount;

        // Min score
        minScore = settings.minScore || minScore;
        min_score_slider.value = 10 * minScore;
        min_score_slider_text_value.textContent = minScore.toFixed(1);

        // Stopwords settings
        stopwordsLanguage = settings.stopwordsLanguage || stopwordsLanguage;
        default_stopwords = new Set(settings.default_stopwords || await get_default_stopwords(stopwordsLanguage));
        custom_stopwords = new Set(settings.custom_stopwords || []);
        STOP_WORDS = new Set([...default_stopwords, ...custom_stopwords]);
        set_stopwords_settings();

        // Wordcloud size
        wordcloudSize = settings.wordcloudSize || wordcloudSize;
        wordcloud_size_input.value = wordcloudSize;

        // Wordcloud spacing
        wordcloudSpacing = settings.wordcloudSpacing || wordcloudSpacing;
        wordcloud_spacing_input.value = wordcloudSpacing;

        // PNG settings
        png_settings = settings.png_settings || png_default_settings;
        set_image_settings(png_settings);
    }
    catch (e) {
        console.error("Failed to load settings from localStorage", e);
    }
}
