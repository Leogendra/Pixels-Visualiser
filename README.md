# Pixels Visualiser

Pixels Visualiser is a lightweight, client-side web app built with vanilla JavaScript, HTML, and CSS. It allows users to load a JSON file from [Pixels app](https://teovogel.me/pixels/) by Teo Vogel, and explore their emotional data through various statistics and charts. You can access the app at [https://pixels-visualiser.gatienh.fr/](https://pixels-visualiser.gatienh.fr/).

## Features

- Interactive line chart of mood evolution over time
- Rolling average control for smoothing data
- Word frequency section based on user notes (with % toggle)
- Tag analysis
- Responsive layout for desktop and mobile

## JSON Data Format

If you use a different app, you can still use this visualiser by converting your data to the expected format. The app expects a JSON array of entries, each shaped like this:

```json
[
    {
        "date": "2025-1-1",
        "type": "Mood",
        "scores": [
            2,
            5,
        ],
        "notes": "I feel great today!",
        "tags": [
            {
                "type": "Emotions",
                "entries": [
                    "happy",
                    "excited"
                ]
            },
            // other tags
        ]
    }
]
```

* `date`: ISO date string (`YYYY-MM-DD`)
* `scores`: array of numbers between 1–5
* `notes`: free-text user note
* `tags`: array of objects, each with a `type` and `entries` array


## Technologies

* Vanilla HTML, JS, CSS
* [Chart.js](https://www.chartjs.org/)