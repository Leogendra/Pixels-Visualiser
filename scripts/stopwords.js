const stopwords_dialog_settings = document.querySelector("#dialogStopwordsSettings");
const btn_open_stopwords_dialog_settings = document.querySelector("#openStopwordsSettingsDialog");
const btn_save_stopwords_dialog_settings = document.querySelector("#saveStopwordsSettingsDialog");

const words_stopwords_language_select = document.querySelector("#stopwordsLanguageSelect");
const default_stopwords_textarea = document.querySelector("#defaultStopwordsTextarea");
const custom_stopwords_textarea = document.querySelector("#customStopwordsTextarea");

let stopwordsLanguage = "en";
let default_stopwords = new Set([]);
let custom_stopwords = new Set([]);
let STOP_WORDS = new Set([]);




async function set_stopwords_settings() {
    words_stopwords_language_select.value = stopwordsLanguage;
    if (default_stopwords.size === 0) {
        get_and_set_default_stopwords(stopwordsLanguage);
    } 
    else {
        set_default_stopwords(default_stopwords);
    }
    set_custom_stopwords(custom_stopwords);
}


async function get_stopwords_settings() {
    stopwordsLanguage = words_stopwords_language_select.value;
    custom_stopwords = new Set(custom_stopwords_textarea.value
                                                        .split(/\s+/)
                                                        .map(word => normalize_string(word))
                                                        .filter(word => word !== ""));
    default_stopwords = new Set(default_stopwords_textarea.value
                                                          .split(/\s+/)
                                                          .map(word => normalize_string(word))
                                                          .filter(word => word !== ""));
    STOP_WORDS = new Set([...default_stopwords, ...custom_stopwords]);
    get_word_frequency(current_data, wordcloudOrderCount, minScore, searchTerm);
    create_word_frequency_section(current_data, nbMaxWords, nbMinCount, wordcloudPercentage, searchTerm);
}


async function get_default_stopwords(language) {
    if (language === "none") {
        return new Set();
    }
    stopwords_path = `scripts/stopwords/${language}.txt`;
    try {
        return await fetch(stopwords_path)
            .then(response => response.text())
            .then(text => {
                const language_stopwords = new Set(text.split(/\s+/)
                                                      .map(word => normalize_string(word))
                                                      .filter(word => word !== "")
                                                      .sort());
                return language_stopwords;
            });
    }
    catch (error) {
        console.error("Error loading default stopwords:", error);
    }
}


async function set_default_stopwords(language_stopwords) {
    default_stopwords_textarea.value = Array.from(language_stopwords).join("\n");
}


async function get_and_set_default_stopwords(language) {
    const language_stopwords = await get_default_stopwords(language);
    set_default_stopwords(language_stopwords);
}


async function set_custom_stopwords(user_stopwords) {
    custom_stopwords_textarea.value = Array.from(user_stopwords).join("\n");
}




// Dialog stopwords settings
function open_stopwords_dialog_settings() {
    close_words_dialog_settings();
    stopwords_dialog_settings.showModal();
    stopwords_dialog_settings.addEventListener('click', handle_click_stopwords_dialog);
}


function close_stopwords_dialog_settings() {
    get_stopwords_settings();
    store_settings();
    stopwords_dialog_settings.close();
    stopwords_dialog_settings.removeEventListener('click', handle_click_stopwords_dialog);
}


function handle_click_stopwords_dialog(e) {
    if (e.target === stopwords_dialog_settings) {
        close_stopwords_dialog_settings();
    }
}




// Event listeners
btn_open_stopwords_dialog_settings.addEventListener("click", () => {
    open_stopwords_dialog_settings();
});

btn_save_stopwords_dialog_settings.addEventListener("click", () => {
    close_stopwords_dialog_settings();
});

words_stopwords_language_select.addEventListener("change", (e) => {
    get_and_set_default_stopwords(e.target.value);
});