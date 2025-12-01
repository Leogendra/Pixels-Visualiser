const start_tutorial_button = document.getElementById("startTutorialBtn");


const tutorial_steps = [
    {
        element_id: "#fileInputLabel",
        message: "Click here to choose your Pixels backup file or drop it here.",
        skippable: false,
        backable: false,
        boxPosition: "bottom"
    },
    // {
    //     element_id: "#paletteContainer",
    //     message: "You can start by selecting a color palette for the visualisation.",
    //     backable: false,
    //     boxPosition: "bottom"
    // },
    {
        element_id: "#moodChart",
        message: "This chart shows how your daily score changes over time. Hover points to preview days.",
    },
    {
        element_id: "#moodChartOptions",
        message: "You can adjust some parameters for the chart here, feel free to experiment!",
        boxPosition: "top"
    },
    {
        element_id: "#tagChartsContainer",
        message: "Here you can how your tags are distributed in your entries. You can change some settings above.",
        skipMobile: true
    },
    {
        element_id: "#wordsOptionsContainer",
        message: "Try searching for specific words in your entries or adjusting the number of displayed words here. More settings are available by clicking the \"Settings\" button.",
    },
    {
        element_id: "#PixelGridOptions",
        message: "Finally, you can create and customize an Image of your Pixels using these options.",
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
        <button id="tutorialQuit" class="button button-secondary">Quit</button>
        <button id="tutorialBack" class="button">Back</button>
        <button id="tutorialNext" class="button">Next</button>
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
    if (!tutorial_overlay) { create_tutorial_elements(); }
    tutorial_overlay.classList.add("active");
    tutorialCurrent = 0;
    show_tutorial_step();
}


function stop_tutorial() {
    if (!tutorial_overlay) { return; }
    if (tutorial_active_target) { tutorial_active_target.classList.remove("tutorial-target"); }
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


function show_tutorial_step() {
    const step = tutorial_steps[tutorialCurrent];
    const isStepSkippable = step.skippable ?? true;
    const isStepBackable = step.backable ?? true;
    const stepBoxPosition = step.boxPosition ?? "bottom";
    const skipOnMobile = step.skipMobile ?? false;

    const tutorial_element = document.querySelector(step.element_id);
    const messageElement = document.querySelector("#tutorialMessage");

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

    if (tutorial_active_target) { tutorial_active_target.classList.remove("tutorial-target"); }
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
        boxTop = elementBottom + 1.5 * tutorialPadding;

        // If there's not enough space below, place it above
        if (spaceBelowAfterScroll < (boxHeight + 1.5 * tutorialPadding)) {
            boxTop = elementTop - tutorialPadding - boxHeight;
        }
    }
    else {
        console.log("Positioning tutorial box above");
        boxTop = elementTop - tutorialPadding - boxHeight;

        if (spaceAboveAfterScroll < (boxHeight + tutorialPadding)) {
            console.log("Not enough space above, placing tutorial box bellow");
            boxTop = elementBottom + 1.5 * tutorialPadding;
        }
    }

    tutorial_box.dataset.position = stepBoxPosition;
    position_tutorial_box({ top: boxTop, left: boxLeft });

    messageElement.textContent = step.message;
    tutorial_element.scrollIntoView({ behavior: "smooth", block: "center" });

    remove_tutorial_click_listeners();

    const next_button = document.getElementById("tutorialNext");

    if (isStepSkippable) {
        next_button.style.display = "flex";

        // click to skip handler
        // tutorial_element.addEventListener("click", click_skip_handler, { once: true });
        // tutorial_overlay._removeClick = function () {
        //     tutorial_element.removeEventListener("click", click_skip_handler);
        // }
    }
    else {
        document.getElementById("tutorialNext").style.display = "none";

        const step_result_handler = create_step_result_handler(step);
        document.addEventListener("tutorialStepResult", step_result_handler);

        tutorial_overlay._removeClick = function () { 
            document.removeEventListener("tutorialStepResult", step_result_handler); 
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




document.addEventListener("DOMContentLoaded", function () {
    start_tutorial_button.addEventListener("click", function () {
        start_tutorial();
    });

    window._tutorial = { start: start_tutorial, stop: stop_tutorial };
});


// add event listener to log mouse current position for debugging
document.addEventListener("mousemove", function (e) {
    // console.log(`Mouse position: (${e.clientX}, ${e.clientY})`);
});