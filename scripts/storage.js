let storeSettingsTimeout = false;




async function store_settings() {
    // Ensure all inputs are updated and avoid multiple rapid calls
    if (storeSettingsTimeout) {
        clearTimeout(storeSettingsTimeout);
    }

    storeSettingsTimeout = setTimeout(() => {
        const settings = {
            moodAveragingValue,
            moodShowAverage,
            moodShowYears,
            moodShowPixelCard,
            moodTimeOption,

            tagsPercentage,
            nbMaxTags,

            monthSeasonColors,

            wordDisplayPercentage,
            wordOrderByScore,
            wordNbMaxWords,
            wordNbMinCount,
            wordMinScore,

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

        moodAveragingValue = settings.moodAveragingValue || moodAveragingValue;
        rolling_slider.value = moodAveragingValue;
        rolling_slider_text_value.textContent = moodAveragingValue;

        moodShowAverage = settings.moodShowAverage || moodShowAverage;
        show_average_checkbox.checked = moodShowAverage;

        moodShowYears = settings.moodShowYears || moodShowYears;
        show_years_checkbox.checked = moodShowYears;

        moodShowPixelCard = (settings.moodShowPixelCard !== undefined) ? settings.moodShowPixelCard : moodShowPixelCard;
        show_pixel_checkbox.checked = moodShowPixelCard;

        moodTimeOption = settings.moodTimeOption || moodTimeOption;
        select_time_option.value = moodTimeOption;


        tagsPercentage = settings.tagsPercentage || tagsPercentage;
        tag_frequency_checkbox.checked = tagsPercentage;

        nbMaxTags = settings.nbMaxTags || nbMaxTags;
        input_nb_tags.value = nbMaxTags;


        monthSeasonColors = settings.monthSeasonColors || monthSeasonColors;
        season_colors_checkbox.checked = monthSeasonColors;


        wordDisplayPercentage = settings.wordDisplayPercentage || wordDisplayPercentage;
        words_percentage_checkbox.checked = wordDisplayPercentage;

        wordOrderByScore = settings.wordOrderByScore || wordOrderByScore;
        words_order_checkbox.checked = wordOrderByScore;

        wordNbMaxWords = settings.wordNbMaxWords || wordNbMaxWords;
        words_words_input.value = wordNbMaxWords;

        wordNbMinCount = settings.wordNbMinCount || wordNbMinCount;
        words_count_input.value = wordNbMinCount;

        wordMinScore = settings.wordMinScore || wordMinScore;
        min_score_slider.value = 10 * wordMinScore;
        min_score_slider_text_value.textContent = wordMinScore.toFixed(1);


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
