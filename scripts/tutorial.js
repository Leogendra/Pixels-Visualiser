const start_tutorial_button = document.getElementById("startTutorialBtn");


const tutorial_steps = [
    {
        element_id: "#fileInputLabel",
        message: "Click here to choose your Pixels backup file, or drop it here.",
        skippable: false,
        backable: false,
    },
    {
        element_id: "#paletteContainer",
        message: "You can start by selecting a color palette for the visualisation.",
        backable: false,
    },
    {
        element_id: "#statCard3",
        message: "You can enlarge the pie chart by clicking it to see the distribution of your scores.",
    },
    {
        element_id: "#moodChart",
        message: "This chart shows how your daily score changes over time. Click on points to see the Pixels.",
    },
    {
        element_id: "#moodChartOptions",
        message: "You can adjust the chart settings here. Feel free to experiment!",
        boxPosition: "top"
    },
    {
        element_id: "#tagChartsContainer",
        message: "Here you can see how your tags are distributed across your entries. You can change some settings above.",
        skipMobile: true
    },
    {
        element_id: "#searchWordContainer",
        message: "Try searching for specific words in your entries using this input field.",
        boxPosition: "top"
    },
    {
        element_id: "#wordsOptionsContainer",
        message: "You can also adjust the number of displayed words here. More settings are available by clicking the \"Settings\" button.",
        boxPosition: "top"
    },
    {
        element_id: "#PixelGridOptions",
        message: "Finally, you can create and customize an image of your Pixels using these options.",
        boxPosition: "top"
    },
    {
        element_id: "#btnGeneratePixelGrid",
        message: "Ready? Click to generate your Pixel image!",
        boxPosition: "top",
        skippable: false,
        backable: false,
        clickToSkip: true
    }
];

let tutorialPadding = 20;
let tutorialCurrent = 0;
let tutorial_overlay = null;
let tutorial_highlight = null;
let tutorial_box = null;
let tutorial_active_target = null;




function create_tutorial_elements() {
    tutorial_overlay = document.createElement("div");
    tutorial_overlay.id = "tutorialOverlay";

    tutorial_highlight = document.createElement("div");
    tutorial_highlight.id = "tutorialHighlight";

    tutorial_box = document.createElement("div");
    tutorial_box.id = "tutorialBox";
    tutorial_box.innerHTML = `
    <p id="tutorialMessage"></p>
    <div id="tutorialControls">
        <button id="tutorialQuit" style="font-weight: bold;" class="button button-secondary">X</button>
        <button id="tutorialBack" class="button">Back</button>
        <button id="tutorialNext" class="button">➡️ Next</button>
    </div>
    `;

    tutorial_overlay.appendChild(tutorial_highlight);
    tutorial_overlay.appendChild(tutorial_box);
    document.body.appendChild(tutorial_overlay);

    document.getElementById("tutorialQuit").addEventListener("click", stop_tutorial);
    document.getElementById("tutorialNext").addEventListener("click", () => next_tutorial_step(back=false));
    document.getElementById("tutorialBack").addEventListener("click", () => next_tutorial_step(back=true));
}


function start_tutorial() {
    // remove anchor from URL to avoid conflicts
    history.replaceState(null, null, " "); 
    pendingAnchor = "";

    if (!tutorial_overlay) { create_tutorial_elements(); }
    tutorial_overlay.classList.add("active");
    tutorialCurrent = 0;
    show_tutorial_step();
}


function stop_tutorial() {
    if (!tutorial_overlay) { return; }
    if (tutorial_active_target) { 
        tutorial_active_target.classList.remove("tutorial-target"); 
        remove_waiting_effects();
    }
    tutorial_active_target = null;

    remove_tutorial_click_listeners();
    tutorial_overlay.remove();
    tutorial_overlay = null;
    tutorial_highlight = null;
    tutorial_box = null;
}


function tutorial_ending() {
    show_popup_message("Tutorial completed! You can now explore your data on your own.", "success");
    stop_tutorial();
}


function next_tutorial_step(back=false) {
    tutorialCurrent += back ? -1 : 1;
    if (tutorialCurrent >= tutorial_steps.length) {
        tutorial_ending();
    } 
    else {
        show_tutorial_step();
    }
}


function create_step_result_handler(step) {
    return function (e) {
        if (e.detail && e.detail.success && (e.detail.stepId === step.element_id)) {
            remove_tutorial_click_listeners();
            next_tutorial_step();
        }
    }
}


function click_skip_handler() {
    setTimeout(() => {
        next_tutorial_step();
    }, 250);
}


function apply_waiting_effects() {
    try {
        if (tutorial_active_target) {
            tutorial_active_target.classList.add("tutorial-waiting-target");
        }
        if (tutorial_overlay) {
            tutorial_overlay._removeWaiting = function () {
                if (tutorial_active_target) { 
                    tutorial_active_target.classList.remove("tutorial-waiting-target"); 
                }
            }
        }
    }
    catch (e) {
        console.error("Failed to apply tutorial waiting effects", e);
    }
}


function remove_waiting_effects() {
    if (tutorial_overlay && tutorial_overlay._removeWaiting) {
        tutorial_overlay._removeWaiting(); 
        tutorial_overlay._removeWaiting = null;
    }
}


function show_tutorial_step() {
    const step = tutorial_steps[tutorialCurrent];
    const isStepSkippable = step.skippable ?? true;
    const isStepBackable = step.backable ?? true;
    const stepBoxPosition = step.boxPosition ?? "bottom";
    const skipOnMobile = step.skipMobile ?? false;
    const clickToSkip = step.clickToSkip ?? false;

    const tutorial_element = document.querySelector(step.element_id);
    const messageElement = document.querySelector("#tutorialMessage");
    messageElement.textContent = step.message;

    if (!tutorial_element) {
        show_popup_message("An unexpected error occurred during the tutorial: element not found.", "error", 5000);
        stop_tutorial();
        return;
    }
    const tutorial_element_style = window.getComputedStyle(tutorial_element);
    if (tutorial_element_style.display === "none" || tutorial_element_style.visibility === "hidden" || tutorial_element_style.width === "0px" || tutorial_element_style.height === "0px") {
        next_tutorial_step();
        return;
    }
    if (skipOnMobile && isMobile) {
        next_tutorial_step();
        return;
    }

    if (tutorial_active_target) { 
        remove_waiting_effects();
        tutorial_active_target.classList.remove("tutorial-target"); 
    }
    
    remove_tutorial_click_listeners();
    tutorial_active_target = tutorial_element;
    tutorial_active_target.classList.add("tutorial-target");

    const rect = tutorial_element.getBoundingClientRect();

    tutorial_highlight.style.top = `${rect.top + window.scrollY - tutorialPadding}px`;
    tutorial_highlight.style.left = `${rect.left + window.scrollX - tutorialPadding}px`;
    tutorial_highlight.style.width = `${rect.width + tutorialPadding * 2}px`;
    tutorial_highlight.style.height = `${rect.height + tutorialPadding * 2}px`;

    const boxHeight = (tutorial_box && tutorial_box.offsetHeight) ? tutorial_box.offsetHeight : 140;
    let boxLeft = Math.max(12, rect.left + window.scrollX - tutorialPadding);
    let boxTop;

    const elementTop = rect.top + window.scrollY;
    const elementBottom = rect.bottom + window.scrollY;

    // viewport after the scroll
    const viewportHeight = window.innerHeight;
    const elementHeight = rect.height;
    const spaceBelowAfterScroll = (viewportHeight / 2) - (elementHeight / 2);
    const spaceAboveAfterScroll = spaceBelowAfterScroll;

    if (stepBoxPosition == "bottom") {
        boxTop = elementBottom + (1.5*tutorialPadding);

        // If there's not enough space below, place it above
        if (spaceBelowAfterScroll < (boxHeight + (1.5*tutorialPadding))) {
            boxTop = elementTop - (1.5*tutorialPadding) - boxHeight;
        }
    }
    else {
        boxTop = elementTop - (1.5*tutorialPadding) - boxHeight;

        if (spaceAboveAfterScroll < (boxHeight + (1.5*tutorialPadding))) {
            boxTop = elementBottom + (1.5*tutorialPadding);
        }
    }

    tutorial_box.dataset.position = stepBoxPosition;
    position_tutorial_box({ top: boxTop, left: boxLeft });
    tutorial_element.scrollIntoView({ behavior: "smooth", block: "center" });

    const next_button = document.getElementById("tutorialNext");

    if (isStepSkippable) {
        next_button.style.display = "flex";
    }
    else {
        document.getElementById("tutorialNext").style.display = "none";
        apply_waiting_effects();

        const step_result_handler = create_step_result_handler(step);
        document.addEventListener("tutorialStepResult", step_result_handler);

        tutorial_overlay._removeClick = function () { 
            document.removeEventListener("tutorialStepResult", step_result_handler); 
        }
    }

    if (clickToSkip) {
        apply_waiting_effects();
        
        tutorial_element.addEventListener("click", click_skip_handler, { once: true });
        tutorial_overlay._removeClick = function () {
            tutorial_element.removeEventListener("click", click_skip_handler);
        }
    }

    if (isStepBackable) {
        document.getElementById("tutorialBack").style.display = "flex";
    }
    else {
        document.getElementById("tutorialBack").style.display = "none";
    }
}


function remove_tutorial_click_listeners() {
    if (tutorial_overlay && tutorial_overlay._removeClick) {
        try {
            tutorial_overlay._removeClick();
        }
        catch (e) {
            console.error("Error removing tutorial click listeners:", e);
        }
        tutorial_overlay._removeClick = null;
    }
}


function position_tutorial_box(pos) {
    tutorial_box.style.top = `${pos.top}px`;
    tutorial_box.style.left = `${pos.left}px`;
}