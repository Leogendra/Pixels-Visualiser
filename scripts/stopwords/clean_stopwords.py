import unicodedata




def remove_accents(text):
    return "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    )


def process_file(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        words = f.read().splitlines()

    cleaned = set(
        remove_accents(word.strip().lower())
        for word in words
        if len(word.strip()) > 2
    )

    removed_words = set(word for word in words if word.strip() and (word.strip().lower() not in cleaned))
    print(f"Number of removed words: {len(removed_words)}")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write("\n".join(sorted(cleaned)))




if __name__ == "__main__":
    process_file("it.txt")
