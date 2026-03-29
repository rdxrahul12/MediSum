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

### 2. Set Up Virtual Environment
```bash
python -m venv .venv
.venv\Scripts\activate  # Mac/Linux: source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```



## 🚀 Running the Application

1.  **Start the App**:
    ```bash
    python app.py
    ```

2.  **Access the Dashboard**:
    Open your browser -> `http://127.0.0.1:5000`

3.  **Monitor the Terminal**:
    The web interface features a real-time terminal log. When you generate a summary, you will see the system connecting to your local Ollama node and processing the inference sequence.

