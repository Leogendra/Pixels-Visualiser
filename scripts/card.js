const show_calendar_checkbox = document.querySelector("#showCalendarCheckbox");
const input_date = document.querySelector("#dateSearchInput");
const input_date_label = document.querySelector("#dateSearchInputLabel");
const calendar_element = document.querySelector("#calendar");
const div_date_result = document.querySelector("#dateSearchResult");
const collapse_pixel_card_button = document.querySelector(".collapse-pixel-card-button");

const div_btn_pixel_nav = document.querySelector(".nav-buttons-card");
const btn_pixel_prev_day = document.querySelector("#btnPixelPrevDay");
const btn_pixel_next_day = document.querySelector("#btnPixelNextDay");
const btn_pixel_prev_year = document.querySelector("#btnPixelPrevYear");
const btn_pixel_next_year = document.querySelector("#btnPixelNextYear");

let calendar = null;




async function load_colored_score_SVG(score) {
    if (!Number.isInteger(score) || score < 1 || score > 5) return document.createElement("span");
    const res = await fetch(`assets/pixels/score_${score}.svg`);
    const text = await res.text();
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    const svg = doc.querySelector("svg");
    svg.style.color = png_settings.colors[score];
    return svg;
}


async function create_pixel_card(pixel) {
    const card = document.createElement("div");
    card.className = "pixel-card";

    const date = new Date(pixel.date);
    const formattedDate = date.toLocaleDateString(userLocale, {
        year: "numeric", month: "long", day: "numeric"
    });

    const title = document.createElement("h3");
    title.textContent = formattedDate;
    card.appendChild(title);

    if (pixel.scores?.length) {
        const meanScore = average(pixel.scores).toFixed(2);
        const div_scores = document.createElement("div");
        div_scores.className = "div-pixel-score-icons";

        for (const score of pixel.scores) {
            const svg = await load_colored_score_SVG(score);
            svg.classList.add("pixel-icon");

            const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
            title.textContent = `Score: ${score} (day: ${meanScore})`;
            svg.appendChild(title);

            div_scores.appendChild(svg);
        }

        card.appendChild(div_scores);
    }

    if (pixel.notes) {
        const div_notes = document.createElement("div");
        div_notes.className = "div-pixel-notes";
        div_notes.innerHTML += pixel.notes.replace(/\n/g, "<br>");
        card.appendChild(div_notes);
    }

    if (pixel.tags.length > 0) {
        const div_tags = document.createElement("div");
        div_tags.className = "div-pixel-tags";

        pixel.tags.forEach(category => {
            const div_tag_category = document.createElement("div");
            div_tag_category.className = "tag-category";

            const tag_title = document.createElement("div");
            tag_title.className = "tag-category-title";
            tag_title.textContent = category.type;

            const tags_container = document.createElement("div");
            tags_container.className = "tag-category-tags";

            category.entries.forEach(tag => {
                const tag_pill = document.createElement("span");
                tag_pill.className = "tag-pill";
                tag_pill.title = category.type;
                tag_pill.textContent = tag;
                tags_container.appendChild(tag_pill);
            })

            div_tag_category.appendChild(tag_title);
            div_tag_category.appendChild(tags_container);
            div_tags.appendChild(div_tag_category);
        });

        card.appendChild(div_tags);
    }

    if (getDynamicBorders) {
        const {
            colors,
            layout,
            scoreType,
            squareSize,
            firstDayOfWeek,
        } = get_image_settings();
        const pixelColor = get_pixel_color(pixel.scores, colors, scoreType);
        card.style.borderColor = pixelColor;
    }

    return card;
}


async function show_pixel_card(dateStr, scroll = false) {
    input_date.value = dateStr;
    div_btn_pixel_nav.style.display = "flex";

    const found = current_data.find(p => normalize_date(p.date) === dateStr);
    if (found) {
        const card = await create_pixel_card(found);
        div_date_result.innerHTML = "";
        div_date_result.appendChild(card);
        setup_card_resizeable_width(card);
        if (calendarMode) { calendar.gotoDate(dateStr); }
    }
    else {
        div_date_result.textContent = "No entry found for this date.";
    }

    if (scroll) {
        setTimeout(() => {
            div_date_result.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
    }
}


function setup_card_resizeable_width(card_element) {
    if (card_element._ro) { card_element._ro.disconnect(); }

    if (Number.isFinite(cardWidth) && cardWidth > 0) {
        card_element.style.setProperty("--pixel-card-width", `${cardWidth}px`);
    }
    else {
        card_element.style.removeProperty("--pixel-card-width");
    }

    const resize_observer = new ResizeObserver(() => {
        const card_width = Math.round(card_element.getBoundingClientRect().width);
        if (card_width < 300) { return; }
        cardWidth = card_width;
    });
    resize_observer.observe(card_element);
    card_element._ro = resize_observer;
}


async function display_floating_card(chartElement) {
    if (hoverDelay) { return; }
    
    if (!chartElement) {
        container_floating_card.style.display = "none";
        return;
    }
    else if (chartElement.length === 0) {
        return;
    }

    const pixelIndex = chartElement[0].index;
    const pixel = current_data[pixelIndex];
    const card = await create_pixel_card(pixel);

    container_floating_card.innerHTML = "";
    container_floating_card.appendChild(card);
    container_floating_card.style.display = "block";
    setup_card_resizeable_width(card);
}


async function setup_calendar_frame() {
    const { colors, scoreType } = get_image_settings();

    const events = current_data.map(pixel => {
        const date = normalize_date(pixel.date);
        const color = get_pixel_color(pixel.scores, colors, scoreType);

        return {
            title: "",
            start: date,
            display: "background",
            backgroundColor: color,
            borderColor: color
        };
    });

    calendar = new FullCalendar.Calendar(calendar_element, {
        initialView: "multiMonthYear",
        height: "auto",
        events: events,
        firstDay: png_settings.firstDayOfWeek,
        dateClick: function (info) {
            const clickedDate = info.dateStr;
            show_pixel_card(clickedDate);
        }
    });

    calendar.render();
    toggle_calendar_view();
}


async function toggle_calendar_view() {
    if (calendarMode) {
        input_date.style.display = "none";
        input_date_label.style.display = "none";
        calendar_element.style.display = "block";
    }
    else {
        input_date.style.display = "block";
        input_date_label.style.display = "block";
        calendar_element.style.display = "none";
    }
}

function shift_pixel_date(days) {
    const current_date = input_date.value;
    if (!current_date) { return; }
    if (days === 365 || days === -365) {
        const year = parseInt(current_date.split("-")[0], 10);
        const month = parseInt(current_date.split("-")[1], 10) - 1;
        const day = parseInt(current_date.split("-")[2], 10);
        const new_date = new Date(year + (days / 365), month, day);
        show_pixel_card(normalize_date(new_date));
        return;
    }
    else {
        const date = new Date(current_date);
        date.setDate(date.getDate() + days);
        show_pixel_card(normalize_date(date));
    }
}




input_date.addEventListener("change", () => {
    const selected_date = normalize_date(input_date.value);
    const year = selected_date.split("-")[0];
    if (year.length !== 4) { return; }

    show_pixel_card(selected_date);
});


btn_pixel_prev_year.addEventListener("click", () => shift_pixel_date(-365));
btn_pixel_prev_day.addEventListener("click", () => shift_pixel_date(-1));
btn_pixel_next_day.addEventListener("click", () => shift_pixel_date(+1));
btn_pixel_next_year.addEventListener("click", () => shift_pixel_date(+365));


show_calendar_checkbox.addEventListener("change", () => {
    calendarMode = show_calendar_checkbox.checked;
    toggle_calendar_view();
});