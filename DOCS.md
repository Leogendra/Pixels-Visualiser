# Pixels Visualiser - Simple Guide

This site helps you look at your Pixels app export in a simple, visual way. 
Everything runs in your web browser on your computer: nothing is sent anywhere.
<div align="center">
    <img src="assets/screenshots/overview.png" alt="Overview" />
</div>

- In this website, "score" means the value you gave to each day in the Pixels app (from very bad = 1 to very good = 5). If you used sub-pixels, the score of the Pixel is the average of all sub-pixels for that day (e.g., if you had two sub-pixels with scores 4 and 5, the score for that day is 4.5).

- The site saves your choices (date range, colors, stopwords and other settings) in your browser so they are restored next time.

## Lexique:

### **Pixel card**
- The pixel card displays the date, score icons, notes and tags you added for a specific Pixel.

<div align="center">
    <img src="assets/screenshots/pixel-card.png" alt="Pixel card" />
</div>


## **Getting started**

- On the home page, click the "Choose or drop a backup file" button, or drag your Pixels export file onto the page. To get this file, open the Pixels app on your device, go to Settings > "Export Pixels data", and save the export file to your phone or computer.

<div align="center">
    <img src="assets/screenshots/export.png" alt="Export backup" />
</div>

### **Choose the dates and palette**
- Use the buttons (for example: "Last month", "All time") to view data about a specific time period. You can also select "Custom" and pick exact start and end dates.
- You can customize the colors used for each score by clicking on the face icons. Click "Apply" to see the changes throughout the site.

<div align="center">
    <img src="assets/screenshots/palette.png" alt="Palette and colors" />
</div>


## **Time evolution**
This graph shows how your daily score change over time.
Options:
- Rolling average: smooth the line by showing the average score over a number of days.
  - It works by calculating the average score for each day and the days before it; for example, with a 7-day rolling average, the value shown on June 8 is the average score from June 2 to June 8.
- Show average: display a horizontal line for the average score in the selected period. Hover to see the exact value.
- Show years: add vertical lines to mark the start of each year.
- Show Pixel: if active, show a Pixel card when hovering or clicking a point. If disabled, the card is only shown when clicking a point.
- Option to display: 
  - Mood: the Pixel score
  - Number of words: how many words you wrote in your note that day
  - Number of tags: how many tags you added that day
  - Number of Pixels: how many (sub-)pixels you used that day

<div align="center">
    <img src="assets/screenshots/mood-chart.png" alt="Time evolution chart" />
</div>

## **Tags frequency and average score**
In this section, you can see which tags appear most often and what are the average scores for each tag. Hovering a tag in one chart highlights it in the other chart (Desktop only).
Options:
- Show percentage: display how often each tag appears as a percentage (instead of a count) of total days in the selected period.
- Number of tags: limit how many tags are shown in the chart.
- Tag categories: Limit tags to specific categories to have more focused results.

<div align="center">
    <img src="assets/screenshots/tags.png" alt="Tags summary" />
</div>

## **Weekdays and months average scores**
View average scores by day of the week or by month to spot patterns.
Options:
- First day of the week: Choose which day your week should start on and 
- Season color: Use different colors for each season in the month chart.

<div align="center">
    <img src="assets/screenshots/week-month.png" alt="Week and month charts" />
</div>


## **Most frequent words**

In this section, you can see which words appear most often in your notes and search for words or phrases.
Options:
- Minimum count (n): only show words that appear at least `n` times.
- Min score (x): only count words from Pixels that have at least `x` score (>=).
- Search words: find specific words or phrases in your notes.
  
[More settings]
Open the additional settings panel by clicking the "Settings" button.
- Show percentage: display how often each word appears as a percentage (instead of a count) of total days in the selected period. /!\ If you word is used twice a day, it counts as 2 occurrences, so you can have words with more than 100%.
- [TODO] Limit to one per day: only count a word once per day, even if it appears multiple times in the same note. The resulting percentage will then reflect the number of days the word appeared in, not the total number of occurrences.
- Order by score: sort words by average score instead of frequency.
- Number of words: limit how many words are shown in the list.
- Stopwords: you can choose a stopword language to add common words to ignore. You can remove stopwords from this list, or add your own custom stopwords. /!\ Remember that changing the stopword language will reset the "Default stopwords" list.
  
[Advanced settings] 
- Use `*` as a wildcard to match unknown words, like "ate with *" to find all words that come after "ate with".
- You can use multiple `*` in a search, for example "ate * with *" to find notes like "ate sandwich with Alice" or "ate pizza with Bob". 3 types of word cards are then shown:
  - Whole match: notes that exactly match the search (e.g., "ate pizza with Bob")
  - First word match: first word matched by a wildcard (e.g., "sandwich", "pizza", etc.)
  - Second word match: second word matched by a wildcard (e.g., "Alice", "Bob", etc.)
- Adding a `/` after your search (e.g., "ate * with */") will show which words have been matched with each wildcard (e.g. "1-Alice", "2-Pizza", etc.).
- Remember, searches always uses all the parameters above (number of words, min score, stopwords, etc.), if you don't see expected results, try changing those settings.

<div align="center">
    <img src="assets/screenshots/word-frequency.png" alt="Word frequency" />
</div>

## **Word cloud**
This section use the words from the "Most frequent words" section to create a word cloud image. A word with a higher frequency (or score if you have chosen to order by score) will appear larger in the cloud. You can download the word cloud as a PNG image by clicking the "Download" button.
Options:
- Word size: choose the size of the words in the cloud.
- Word spacing: adjust the spacing between words.
- Word compression: an higher compression will make different words have similar sizes, while a lower compression will make the size difference more pronounced.

<div align="center">
    <img src="assets/screenshots/wordcloud.png" alt="Word cloud" />
</div>


**Stopwords (ignore common words)**
- You can ignore common words such as "and" or "the" so they don't appear in the lists.
- Pick a language or add your own words to ignore.

<div align="center">
    <img src="assets/screenshots/stopwords.png" alt="Stopwords" />
</div>


**Create a Pixels-style image**
- Make a picture that looks like the Pixels app grid and save it to your computer as a PNG file.
- Choose colors, pixel size, and whether to show month labels or day numbers. You can also hide or compare days based on words or tags.

<div align="center">
    <img src="assets/screenshots/pixels-image.png" alt="Create pixels image" />
</div>


**Search and filtering rules**
- Most searches use simple words or phrases.
- Use `*` as a wildcard to match unknown words (advanced).
- There is an advanced option for pattern searches; only use it if you are familiar with search patterns.

<div align="center">
    <img src="assets/screenshots/search-syntax.png" alt="Search syntax" />
</div>

**Keyboard and accessibility helpers**
- Use Enter to confirm dialogs and use hover to see more information on charts.

<div align="center">
    <img src="assets/screenshots/shortcuts.png" alt="Shortcuts" />
</div>

**Troubleshooting tips**

- If nothing appears, make sure you loaded the correct Pixels export file from the Pixels app.
- If searches show no results, try widening the search or turning off ignored words.
- If the word cloud looks empty, increase how many words are shown.

You have questions or suggestions? Please open an issue on the [GitHub repository](https://github.com/Leogendra/Pixels-Visualiser/issues).