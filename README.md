# Medisum AI - Intelligent Medical Analysis

**Medisum AI** is a state-of-the-art, secure, and futuristic platform for summarizing Medical reports. Built with privacy in mind, it leverages a locally running Large Language Model (**Qwen2.5:3b**) via **Ollama**, ensuring no sensitive data leaves your infrastructure.

![Medisum AI](https://via.placeholder.com/800x400.png?text=Medisum+AI+-+Futuristic+Dashboard)

## 🚀 Key Features

- **🛡️ Secure & Local**: Uses local LLM (**Qwen2.5-3B**) via Ollama. No cloud dependencies, no API keys, and no login required.
- **⚡ Local Inference**: Fast responses using your machine's local hardware.
- **🎨 Futuristic UI**: A "Pitch Black" Cyber-aesthetic theme with neon glow effects, animations, and real-time terminal logs.
- **📄 Multi-Format Support**: Ingests PDF reports and raw text streams.
- **📝 Rich Summaries**: Generates beautifully formatted Markdown summaries with key insights highlighted.

---

## 🛠️ Prerequisites

1.  **Python 3.8+** installed on your system.
2.  **Ollama** installed on your machine.
    - [Download Ollama](https://ollama.com/download)
    - Pull the required model:
      ```bash
      ollama pull qwen2.5:3b
      ```

---

## 📥 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Medisum
```

### 2. Backend Setup (Flask API)
```bash
python -m venv .venv
.venv\Scripts\activate  # Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Frontend Setup (React/Vite)
Open a new terminal window:
```bash
cd Medisum/frontend
npm install
```



## 🚀 Running the Application

This project uses a decoupled architecture. You need to run both the backend and frontend concurrently.

### 1. Start the Python AI Backend
In your first terminal (with the virtual environment activated):
```bash
python app.py
```
*The backend API will run on http://127.0.0.1:5000*

### 2. Start the React Frontend
In a separate terminal:
```bash
cd Medisum/frontend
npm run dev
```

### 3. Access the Dashboard
Open your browser and navigate to the frontend URL provided by Vite (typically `http://localhost:5173`).

### 4. Monitor the System
The React web interface features a real-time terminal log. When you generate a summary, you will see the system connecting to your local Ollama node and processing the inference sequence.

---

## 👥 Contributors

Meet the talented individuals who built MediSum AI:

| Name | GitHub |
| :--- | :--- |
| **Rahul Dewasi** | [@rdxrahul12](https://github.com/rdxrahul12) |
| **Ankit Saini** | [@AnkitS24](https://github.com/AnkitS24) |
| **Tushar Verma** | [@Tusharvermaaa](https://github.com/Tusharvermaaa) |
| **Himanshu Maurya** | [@himanshumaurya2329](https://github.com/himanshumaurya2329) |

---

