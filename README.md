# MIRA – Medical Intelligence & Risk Assessment

A health prediction web application built with **Python (Flask)**, **SQLite**, and **Claude AI API** for AI-powered blood test analysis.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.10+ · Flask · Flask-SQLAlchemy |
| Database | SQLite (via SQLAlchemy ORM) |
| AI/ML | Anthropic Claude API (health risk prediction) |
| Frontend | HTML5 · CSS3 · Vanilla JavaScript |

---

## Features

- ✅ **CRUD** – Create, Read, Update, Delete patient records
- 🤖 **AI Analysis** – Claude API generates health risk remarks from blood test values
- 🔍 **Live Search** – Filter patients by name or email instantly
- ✅ **Input Validation** – Email format, past DOB, numeric blood values
- 💾 **Persistent Storage** – SQLite database
- 🎨 **Responsive UI** – Clean dark-themed medical interface

---

## Setup & Run

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/mira-health-predict.git
cd mira-health-predict
```

### 2. Create a virtual environment
```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Set your Anthropic API key
```bash
# Linux / macOS
export ANTHROPIC_API_KEY=your_api_key_here

# Windows (Command Prompt)
set ANTHROPIC_API_KEY=your_api_key_here
```

> **Note:** If no API key is set, the app falls back to a rule-based health assessment.  
> Get a free API key at [console.anthropic.com](https://console.anthropic.com)

### 5. Run the application
```bash
python app.py
```

Open your browser and go to: **http://localhost:5000**

---

## Project Structure

```
health-predict/
├── app.py                  # Flask backend + REST API + AI integration
├── requirements.txt        # Python dependencies
├── README.md
├── templates/
│   └── index.html          # Main frontend page
└── static/
    ├── css/
    │   └── style.css       # Styling
    └── js/
        └── app.js          # Frontend CRUD logic
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/patients` | Get all patient records |
| GET | `/api/patients/:id` | Get a single patient |
| POST | `/api/patients` | Create patient + AI analysis |
| PUT | `/api/patients/:id` | Update patient + re-analyse |
| DELETE | `/api/patients/:id` | Delete patient record |

---

## Blood Test Reference Ranges

| Parameter | Normal Range |
|---|---|
| Glucose | 70 – 99 mg/dL (fasting) |
| Haemoglobin | 12 – 17.5 g/dL |
| Cholesterol | < 200 mg/dL (desirable) |

---

## Screenshots

> Add screenshots of your running application here.

---

## Author

**Golda** – Electronics & Communication Engineering → Full Stack Developer  
Built as part of Junior AI/ML Developer assessment for MIRA platform.