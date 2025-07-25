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
            showPixelCard,
            timeOption,

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
            wordcloudCompression,

            png_settings,
        };

        localStorage.setItem("pixelSettings", JSON.stringify(settings));
    }, 1000);

}


async function load_settings() {
    const saved = localStorage.getItem("pixelSettings");
    if (!saved) return;

    try {
        const settings = JSON.parse(saved);

        averagingValue = settings.averagingValue || averagingValue;
        rolling_slider.value = averagingValue;
        rolling_slider_text_value.textContent = averagingValue;

        showAverage = settings.showAverage || showAverage;
        show_average_checkbox.checked = showAverage;

        showYears = settings.showYears || showYears;
        show_years_checkbox.checked = showYears;

        showPixelCard = (settings.showPixelCard !== undefined) ? settings.showPixelCard : showPixelCard;
        show_pixel_checkbox.checked = showPixelCard;

        timeOption = settings.timeOption || timeOption;
        select_time_option.value = timeOption;


        tagsPercentage = settings.tagsPercentage || tagsPercentage;
        tag_frequency_checkbox.checked = tagsPercentage;

        nbMaxTags = settings.nbMaxTags || nbMaxTags;
        inputs_nb_tags.forEach(input => input.value = nbMaxTags);


        seasonColors = settings.seasonColors || seasonColors;
        season_colors_checkbox.checked = seasonColors;


        wordcloudPercentage = settings.wordcloudPercentage || wordcloudPercentage;
        words_percentage_checkbox.checked = wordcloudPercentage;

        wordcloudOrderCount = settings.wordcloudOrderCount || wordcloudOrderCount;
        words_order_checkbox.checked = wordcloudOrderCount;

        nbMaxWords = settings.nbMaxWords || nbMaxWords;
        words_words_input.value = nbMaxWords;

        nbMinCount = settings.nbMinCount || nbMinCount;
        words_count_input.value = nbMinCount;

        minScore = settings.minScore || minScore;
        min_score_slider.value = 10 * minScore;
        min_score_slider_text_value.textContent = minScore.toFixed(1);


        wordcloudSize = settings.wordcloudSize || wordcloudSize;
        wordcloud_size_input.value = wordcloudSize;

        wordcloudSpacing = settings.wordcloudSpacing || wordcloudSpacing;
        wordcloud_spacing_input.value = wordcloudSpacing;

        wordcloudCompression = settings.wordcloudCompression || wordcloudCompression;
        wordcloud_compression_input.value = wordcloudCompression;

        stopwordsLanguage = settings.stopwordsLanguage || stopwordsLanguage;
        default_stopwords = new Set(settings.default_stopwords || await get_default_stopwords(stopwordsLanguage));
        custom_stopwords = new Set(settings.custom_stopwords || []);
        STOP_WORDS = new Set([...default_stopwords, ...custom_stopwords]);
        set_stopwords_settings();

        png_settings = settings.png_settings || png_default_settings;
        set_image_settings(png_settings);
    }
    catch (e) {
        console.error("Failed to load settings from localStorage", e);
    }
}
