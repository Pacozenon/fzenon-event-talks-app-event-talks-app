# BigQuery Release Notes Explorer

A highly aesthetic, responsive, and interactive dashboard built using Python Flask and plain HTML, CSS, and JavaScript. It fetches the official Google Cloud BigQuery Release Notes feed, normalizes daily updates into distinct categorized items, and enables real-time search, highlighting, card selection, and direct sharing to X (Twitter).

Live feed URL: `https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`

---

## 🚀 Key Features

* **Sleek Glassmorphic Design:** Tailored dark and light theme controls with a premium, glowing layout, backdrop filters, smooth transitions, and Outfit/Fira Code Google Fonts.
* **Granular Release Categorization:** Breaks down multi-section daily updates into discrete items, assigning them visual badges matching official BigQuery note categories:
  * 🟢 `Feature` (New releases & GA updates)
  * 🔵 `Change` (Modifications to existing behaviors)
  * 🔴 `Breaking` (Critical backward-compatibility alerts with pulsing indicators)
  * 🟡 `Issue` (Known problems & bugs)
  * 🟣 `Announcement` (General information & announcements)
* **Real-time Safe Search:** Highlights search terms dynamically in real-time. Uses a custom HTML-safe highlighting parser to avoid breaking link tags or nested code elements.
* **In-Memory Caching:** Implements a 10-minute cache TTL on the backend API to minimize latency and server load. Automatically falls back to cache if the live Google feed goes offline.
* **X (Twitter) Sharing:** Allows users to focus/select any release note card and click a dedicated "Tweet" button. The app strips HTML markup and formats a nicely preloaded draft within the 280-character limit.
* **Stats Overview:** Sidebar panels with active counters for each category. Clicking any stat pill instantly filters the dashboard.

---

## 🛠️ Tech Stack

* **Backend:** Python Flask 3.x
* **Frontend:** Plain Vanilla HTML5, CSS Grid/Flexbox, JavaScript (ES6)
* **Icons:** FontAwesome 6 (free CDN)
* **Fonts:** Outfit (headings & copy), Fira Code (monospaced logs/snippets)

---

## 📁 Project Structure

```text
├── app.py                  # Flask application entrypoint & Atom XML parser
├── requirements.txt        # Python dependency declarations
├── README.md               # Project documentation
├── .gitignore              # Files excluded from git tracking
├── templates/
│   └── index.html          # Core responsive shell (SPA)
└── static/
    ├── css/
    │   └── styles.css      # CSS styles (Variables, themes, responsive layout)
    └── js/
        └── main.js         # Client script (State management, search indexing, social sharing)
```

---

## ⚙️ Setup & Installation

### Prerequisites
* Python 3.8 or higher
* Git

### Step-by-Step Run Guide

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/Pacozenon/fzenon-event-talks-app-event-talks-app.git
   cd fzenon-event-talks-app-event-talks-app
   ```

2. **Set up a Virtual Environment:**
   ```bash
   python -m venv venv
   ```

3. **Activate the Environment:**
   * **Windows (PowerShell):**
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   * **macOS / Linux:**
     ```bash
     source venv/bin/activate
     ```

4. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Run the Server:**
   ```bash
   python app.py
   ```
   The application will boot and be accessible locally at **http://localhost:5000**.
