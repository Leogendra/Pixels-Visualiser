const daylio_required_headers = [
    "full_date",
    "mood",
    "activities",
    "note",
];

const daylio_mood_to_score_map = {
    "rad": 5,
    "good": 4,
    "meh": 3,
    "bad": 2,
    "awful": 1,
};




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
    if ( !daylio_required_headers.every((header) => headers.includes(header)) ) {
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
