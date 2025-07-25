const input_date = document.querySelector("#dateSearchInput");
const calendar_element = document.querySelector("#calendar");
const div_date_result = document.querySelector("#dateSearchResult");

const div_btn_pixel_nav = document.querySelector(".nav-buttons-card");
const btn_pixel_prev = document.querySelector("#btnPixelPrev");
const btn_pixel_next = document.querySelector("#btnPixelNext");

let calendar = null;




async function load_colored_score_SVG(score) {
    if (!score || (typeof score !== "number") || (score < 1) || (score > 5)) {
        return document.createElement("span");
    }
    const path = `assets/pixels/score_${score}.svg`;
    const res = await fetch(path);
    const text = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "image/svg+xml");
    const svg = doc.querySelector("svg");

    const color = png_settings.colors[score]

    svg.querySelectorAll("[fill='currentColor']").forEach(el => el.setAttribute("fill", color));
    return svg;
}


async function create_pixel_card(pixel) {
    const card = document.createElement("div");
    card.className = "pixel-card";
    
    const date = new Date(pixel.date);
    const formattedDate = date.toLocaleDateString(undefined, {
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
        div_date_result.innerHTML = card.outerHTML;
        calendar.gotoDate(dateStr);
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


async function display_floating_card(pixels_data, chartElement, pinCard = false) {
    if (hoverDelay) { return; }

    if (chartElement.length === 0) {
        container_floating_card.style.display = "none";
        container_floating_card.innerHTML = "";
        return;
    }

    const pixelIndex = chartElement[0].index;
    const pixel = pixels_data[pixelIndex];
    const card = await create_pixel_card(pixel);

    container_floating_card.innerHTML = "";
    container_floating_card.appendChild(card);
    container_floating_card.style.display = "block";
    isCardPinned = pinCard;
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
}


function shift_pixel_date(days) {
    const current_date = input_date.value;
    if (!current_date) return;
    const date = new Date(current_date);
    date.setDate(date.getDate() + days);
    show_pixel_card(normalize_date(date));
}




input_date.addEventListener("change", () => {
    const selected_date = normalize_date(input_date.value);
    const year = selected_date.split("-")[0];
    if (year.length !== 4) { return; }

    show_pixel_card(selected_date);
});


btn_pixel_prev.addEventListener("click", () => shift_pixel_date(-1));
btn_pixel_next.addEventListener("click", () => shift_pixel_date(+1));