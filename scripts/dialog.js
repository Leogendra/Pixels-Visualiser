const settings_dialog = document.querySelector("#settingsDialog");
const btn_open_settings_dialog = document.querySelector("#openSettingsDialog");
const btn_reset_settings_dialog = document.querySelector("#resetSettingsDialog");
const btn_close_settings_dialog = document.querySelector("#saveSettingsDialog");


function close_and_save_settings_dialog() {
    // TODO: Get selected settingss
    // save selected settingss
    settings_dialog.close();
}

btn_open_settings_dialog.addEventListener("click", () => {
    settings_dialog.showModal();

    settings_dialog.addEventListener('click', (e) => {
        const rect = e.target.getBoundingClientRect();

        const clickedInDialog = (
            rect.top <= e.clientY &&
            e.clientY <= rect.top + rect.height &&
            rect.left <= e.clientX &&
            e.clientX <= rect.left + rect.width
        );

        if (clickedInDialog === false) { close_and_save_settings_dialog(); }
    });
});

btn_close_settings_dialog.addEventListener("click", () => {
    close_and_save_settings_dialog();
});