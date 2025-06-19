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
            scoreWrapper.appendChild(svg);
        }

        card.appendChild(scoreWrapper);
    }

    if (pixel.notes) {
        const notes = document.createElement("div");
        notes.className = "div-pixel-notes";
        // notes.innerHTML = "<strong>Notes:</strong><br>";
        notes.innerHTML += pixel.notes.replace(/\n/g, "<br>");
        card.appendChild(notes);
    }

    if (pixel.tags.length > 0) {
        const tags = document.createElement("div");
        tags.className = "div-pixel-tags";
        
        const tagStrings = pixel.tags.flatMap(tag => {
            return tag.entries.map(entry => `<span class="tag-pill" title="${tag.type}">${entry}</span>`);
        });
        
        // tags.innerHTML = "<strong>Tags:</strong>";
        tags.innerHTML += tagStrings.join("");
        card.appendChild(tags);
    }

    return card;
}
