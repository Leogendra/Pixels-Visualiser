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

        png_settings
    };

    localStorage.setItem('pixelSettings', JSON.stringify(settings));
}


async function load_settings() {
    const saved = localStorage.getItem('pixelSettings');
    if (!saved) return;

    try {
        const settings = JSON.parse(saved);

        averagingValue = settings.averagingValue ?? averagingValue;
        showAverage = settings.showAverage ?? showAverage;
        showYears = settings.showYears ?? showYears;

        tag_stats = settings.tag_stats ?? tag_stats;
        tagsPercentage = settings.tagsPercentage ?? tagsPercentage;
        nbMaxTags = settings.nbMaxTags ?? nbMaxTags;

        firstDayOfWeek = settings.firstDayOfWeek ?? firstDayOfWeek;
        weekdays_stats = settings.weekdays_stats ?? weekdays_stats;

        seasonColors = settings.seasonColors ?? seasonColors;
        months_stats = settings.months_stats ?? months_stats;

        full_word_frequency = settings.full_word_frequency ?? full_word_frequency;
        wordcloudPercentage = settings.wordcloudPercentage ?? wordcloudPercentage;
        wordcloudOrderCount = settings.wordcloudOrderCount ?? wordcloudOrderCount;
        nbMaxWords = settings.nbMaxWords ?? nbMaxWords;
        nbMinCount = settings.nbMinCount ?? nbMinCount;

        // update fields
        if (rolling_slider) rolling_slider.value = averagingValue;
        if (rolling_slider_text_value) rolling_slider_text_value.textContent = averagingValue;

        if (show_average_checkbox) show_average_checkbox.checked = showAverage;
        if (show_years_checkbox) show_years_checkbox.checked = showYears;

        if (tag_frequency_checkbox) tag_frequency_checkbox.checked = tagsPercentage;
        nb_tags_inputs.forEach(input => input.value = nbMaxTags);

        if (weekday_frequency_select) weekday_frequency_select.value = firstDayOfWeek;

        if (season_colors_checkbox) season_colors_checkbox.checked = seasonColors;

        if (wordcloud_percentage_checkbox) wordcloud_percentage_checkbox.checked = wordcloudPercentage;
        if (wordcloud_order_checkbox) wordcloud_order_checkbox.checked = wordcloudOrderCount;
        if (wordcloud_words_input) wordcloud_words_input.value = nbMaxWords;
        if (wordcloud_count_input) wordcloud_count_input.value = nbMinCount;
        if (png_settings) {
            png_settings = settings.png_settings;
            set_image_settings(settings.png_settings);
        }
    }
    catch (e) {
        console.error("Failed to load settings from localStorage", e);
    }
}
