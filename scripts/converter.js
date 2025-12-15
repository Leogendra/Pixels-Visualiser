const daylio_required_headers = ["full_date", "mood", "activities", "note"];
const daylio_mood_to_score_map = {
    "rad": 5,
    "good": 4,
    "meh": 3,
    "bad": 2,
    "awful": 1,
};
const daily_you_required_tables = ["entries"];
const daily_you_required_columns_entries = ["text", "mood", "time_create"];



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

    return parsed.data.map((row) => {
        const moodKey = row.mood?.toLowerCase();
        const moodScore = daylio_mood_to_score_map[moodKey];

        if (!moodScore) {
            throw new Error(`Unknown mood: ${row.mood}`);
        }

        const tags = row.activities
            ? [
                {
                    type: "Tags",
                    entries: row.activities.split("|").map((s) => s.trim()).filter(tag => tag),
                },
            ]
            : [];

        return {
            date: row.full_date,
            type: "Mood",
            scores: [moodScore],
            notes: row.note?.replace(/<br\s*\/?>/gi, "\n") ?? "",
            tags: tags,
        };
    });
}


async function unzip_find_daily_you_db(zipArrayBuffer) {
    const zip = await JSZip.loadAsync(zipArrayBuffer);

    // on privilégie explicitement daily_you.db
    const exact = Object.values(zip.files).find(
        f => !f.dir && /(^|\/)daily_you\.db$/i.test(f.name)
    );

    const candidates = Object.values(zip.files)
        .filter(f => !f.dir && /\.(db|sqlite|sqlite3)$/i.test(f.name))
        .sort((a, b) => a.name.localeCompare(b.name));

    const dbFile = exact || candidates[0];
    if (!dbFile) throw new Error('Aucun fichier .db/.sqlite trouvé dans le zip (attendu "daily_you.db").');

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
