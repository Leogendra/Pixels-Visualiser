const input_date = document.querySelector("#dateSearchInput");
const calendar_element = document.querySelector("#calendar");
const div_date_result = document.querySelector("#dateSearchResult");

let calendar;




async function load_colored_SVG(score) {
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
    const getDynamicBorders = true; // TODO: add this parameter
    const card = document.createElement("div");
    card.className = "pixel-card";

    const date = new Date(pixel.date);
    const formattedDate = date.toLocaleDateString(undefined, {
        year: "numeric", month: "long", day: "numeric"
    });

    const title = document.createElement("h3");
    title.textContent = formattedDate;
    card.appendChild(title);

    if (pixel.scores.length > 0) {
        const scoreWrapper = document.createElement("div");
        scoreWrapper.className = "div-pixel-score-icons";

        for (const score of pixel.scores) {
            const svg = await load_colored_SVG(score);
            svg.classList.add("pixel-icon");

            const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
            title.textContent = `Score: ${score}`;
            svg.appendChild(title);

            scoreWrapper.appendChild(svg);
        }

        card.appendChild(scoreWrapper);
    }

    if (pixel.notes) {
        const notes = document.createElement("div");
        notes.className = "div-pixel-notes";
        notes.innerHTML += pixel.notes.replace(/\n/g, "<br>");
        card.appendChild(notes);
    }

    if (pixel.tags.length > 0) {
        const tags = document.createElement("div");
        tags.className = "div-pixel-tags";

        const tagStrings = pixel.tags.flatMap(tag => {
            return tag.entries.map(entry => `<span class="tag-pill" title="${tag.type}">${entry}</span>`);
        });

        tags.innerHTML += tagStrings.join("");
        card.appendChild(tags);
    }

    if (getDynamicBorders) {
        const {
            colors,
            layout,
            scoreType,
            squareSize,
            firstDayOfWeek,
        } = get_image_settings();
        const pixelColor = get_pixel_color(pixel, colors, scoreType);
        card.style.borderColor = pixelColor;
    }

    return card;
}


async function get_pixel_by_date(date) {
    const found = current_data.find(p => normalize_date(p.date) === date);

    if (found) {
        const card = await create_pixel_card(found);
        div_date_result.innerHTML = card.outerHTML;
    }
    else {
        div_date_result.textContent = "No entry found for this date.";
    }
}

async function setup_date_calendar() {
    const pixels_dates = current_data.map(p => normalize_date(p.date));
    const tagColors = {};
    const { colors, scoreType } = get_image_settings();

    for (const pixel of current_data) {
        const date = normalize_date(pixel.date);
        tagColors[date] = get_pixel_color(pixel, colors, scoreType);
    }

    const events = pixels_dates.map(date => ({
        title: "",
        start: date,
        display: "background",
        backgroundColor: tagColors[date],
        borderColor: tagColors[date]
    }));

    calendar = new FullCalendar.Calendar(calendar_element, {
        initialView: "multiMonthYear",
        height: "auto",
        events: events,
        dateClick: function (info) {
            const clickedDate = info.dateStr;
            input_date.value = clickedDate;
            input_date.dispatchEvent(new Event("change", { bubbles: true }));
        }
    });

    calendar.render();
}






input_date.addEventListener("change", () => {
    const selected_date = normalize_date(input_date.value);
    const [year, month, day] = selected_date.split("-");
    if (year.length !== 4) { return; }

    calendar.gotoDate(selected_date);
    get_pixel_by_date(selected_date);
});