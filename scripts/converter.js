const dialog_mood_maping = document.querySelector("#dialogMoodMapping");
const container_mood_maping = document.querySelector("#moodMappingContainer");
const btn_confirm_mood_maping = document.querySelector("#confirmMoodDialog");

// Daylio
const daylio_required_headers = ["full_date", "mood", "activities", "note"];
const daylio_base_mood_to_score_map = {
    "rad": 5,
    "good": 4,
    "meh": 3,
    "bad": 2,
    "awful": 1,
};

// Daily You
const daily_you_required_tables = ["entries"];
const daily_you_required_columns_entries = ["text", "mood", "time_create"];




function get_full_daylio_mood_map() {
    const base_maps = { ...daylio_base_mood_to_score_map };
    const stored = localStorage.getItem("daylio_custom_mood_map");
    const custom_maps = stored ? JSON.parse(stored) : {}
    return { ...base_maps, ...custom_maps };
}


async function show_mood_mapping_dialog(unknown_moods) {
    return new Promise((resolve) => {

        container_mood_maping.innerHTML = "";
        unknown_moods.forEach(mood => {
            const label = document.createElement("label");
            label.htmlFor = `mood_${mood}`;
            label.style.fontWeight = "500";
            label.textContent = mood;

            const select = document.createElement("select");
            select.id = `mood_${mood}`;
            select.className = "select mood-mapping-select";
            select.style.width = "100%";
            select.innerHTML = `
                <option value="">Select score</option>
                <option value="5">😄 - 5</option>
                <option value="4">😊 - 4</option>
                <option value="3">😐 - 3</option>
                <option value="2">😕 - 2</option>
                <option value="1">😢 - 1</option>
            `;

            container_mood_maping.appendChild(label);
            container_mood_maping.appendChild(select);
        });

        dialog_mood_maping.showModal();
    });
}


function wait_mood_mapping_result() {
    return new Promise((resolve) => {
        const onDone = (e) => cleanup(resolve, e.detail);
        const onClose = () => cleanup(resolve, null);

        function cleanup(cb, value) {
            dialog_mood_maping.removeEventListener("mood-mapping:done", onDone);
            dialog_mood_maping.removeEventListener("close", onClose);
            cb(value);
        }

        dialog_mood_maping.addEventListener("mood-mapping:done", onDone, { once: true });
        dialog_mood_maping.addEventListener("close", onClose, { once: true });
    });
}


async function load_daylio_export(file) {

    const csvText = await file.text();

    const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
    });

    if (parsed.errors.length) {
        throw new Error(parsed.errors[0].message);
    }

    const headers = parsed.meta.fields;
    if (!daylio_required_headers.every((header) => headers.includes(header))) {
        show_popup_message("Please drop a valid Daylio file", "error", 3000);
        throw new Error(
            `Invalid header\nExpected at least: ${daylio_required_headers.join(",")}\nReceived: ${headers.join(",")}`
        );
    }

    // collect all moods from the export
    const uniqueMoods = new Set(parsed.data.map(row => row.mood?.toLowerCase()).filter(Boolean));
    let full_mood_map = get_full_daylio_mood_map();
    const unknown_moods = Array.from(uniqueMoods).filter(mood => !full_mood_map[mood]);

    if (unknown_moods.length > 0) {
        show_mood_mapping_dialog(unknown_moods);
        const customMapping = await wait_mood_mapping_result();
        full_mood_map = { ...full_mood_map, ...customMapping };
        localStorage.setItem("daylio_custom_mood_map", JSON.stringify(full_mood_map));
    }

    const entries_by_date = {};
    parsed.data.forEach((row) => {
        const date = row.full_date;
        const time = row.time || "";
        const moodKey = row.mood?.toLowerCase();
        const moodScore = full_mood_map[moodKey];

        if (!moodScore) {
            throw new Error(`Unknown mood: ${row.mood}`);
        }

        if (!entries_by_date[date]) {
            entries_by_date[date] = [];
        }

        const tags = row.activities
            ? row.activities.split("|").map((s) => s.trim()).filter(tag => tag)
            : [];

        const note = row.note?.replace(/<br\s*\/?>/gi, "\n") ?? "";

        entries_by_date[date].push({
            time: time,
            score: moodScore,
            note: note,
            tags: tags,
        });
    });

    // merge entries for the same date
    return Object.entries(entries_by_date).map(([date, entries]) => {
        entries.sort((a, b) => {
            return a.time.localeCompare(b.time);
        });

        const scores_list = entries.map(e => e.score);

        const notes_with_text = entries.filter(e => e.note.trim());
        let mergedNote = "";
        if (notes_with_text.length > 0) {
            if (notes_with_text.length === 1) {
                mergedNote = notes_with_text[0].note;
            }
            else {
                mergedNote = notes_with_text
                    .map(entry => `${entry.time.replace(/:/g, "h")}: ${entry.note}`)
                    .join("\n");
            }

            mergedNote = mergedNote.replace(/\r/g, "")
                .replace(/[ \t]+\n/g, "\n")
                .replace(/\n{3,}/g, "\n\n")
                .trim();
        }

        const all_tags = new Set();
        entries.forEach(entry => entry.tags.forEach(tag => all_tags.add(tag)));
        const tags_list = all_tags.size > 0
            ? [{ type: "Tags", entries: Array.from(all_tags) }]
            : [];

        return {
            date: date,
            type: "Mood",
            scores: scores_list,
            notes: mergedNote,
            tags: tags_list,
        };
    });
}


async function unzip_find_daily_you_db(zipArrayBuffer) {
    const zip = await JSZip.loadAsync(zipArrayBuffer);

    // we look for an exact match first
    const exact = Object.values(zip.files).find(
        f => !f.dir && /(^|\/)daily_you\.db$/i.test(f.name)
    );

    const candidates = Object.values(zip.files)
        .filter(f => !f.dir && /\.(db|sqlite|sqlite3)$/i.test(f.name))
        .sort((a, b) => a.name.localeCompare(b.name));

    const dbFile = exact || candidates[0];
    if (!dbFile) { throw new Error(`No .db/.sqlite file found in the zip (expected "daily_you.db").`); }

    const bytes = await dbFile.async("uint8array");
    return { filename: dbFile.name, bytes };
}


async function load_daily_you_export(zipFile) {
    const SQL = await initSqlJs({
        locateFile: (file) => `https://sql.js.org/dist/${file}`,
    });

    const zipBuf = await zipFile.arrayBuffer();
    const { filename, bytes } = await unzip_find_daily_you_db(zipBuf);

    const db = new SQL.Database(bytes);
    const res = db.exec(`
        SELECT mood, text, time_create
        FROM entries
        ORDER BY time_create ASC;
    `);

    const pixels_data = [];
    if (res.length) {
        const { columns, values } = res[0];
        const idxMood = columns.indexOf("mood");
        const idxText = columns.indexOf("text");
        const idxTime = columns.indexOf("time_create");

        for (const row of values) {
            const score = row[idxMood] + 3; // from -2 to 2 --> 1 to 5
            if (!score) { continue; }

            const rawDate = row[idxTime];
            const date = rawDate ? normalize_date(rawDate) : null;

            pixels_data.push({
                date: date,
                type: "Mood",
                scores: [score],
                notes: row[idxText]?.replace(/<br\s*\/?>/gi, "\n") ?? "",
                tags: [],
            });
        }
    }

    db.close();
    return pixels_data;
}




btn_confirm_mood_maping.addEventListener("click", () => {
    let allMapped = true;
    const mapping = {};
    const mood_mapping_selects = container_mood_maping.querySelectorAll(".mood-mapping-select");

    mood_mapping_selects.forEach(select => {
        const moodId = select.id.replace("mood_", "");
        const score = select.value;

        if (!score) {
            allMapped = false;
            select.style.borderColor = "var(--secondary-color)";
        }
        else {
            mapping[moodId] = parseInt(score);
            select.style.borderColor = "";
        }
    });

    if (allMapped) {
        dialog_mood_maping.dispatchEvent(
            new CustomEvent("mood-mapping:done", { detail: mapping })
        );
        dialog_mood_maping.close();
    }
});