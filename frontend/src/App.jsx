import React, { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import './index.css';

function App() {
  const [file, setFile] = useState(null);
  const [reportText, setReportText] = useState("");
  const [logs, setLogs] = useState([
    { time: "00:00:00", msg: "System Ready. Awaiting input...", type: "log" }
  ]);
  const [summary, setSummary] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef(null);
  const terminalRef = useRef(null);
  const resultRef = useRef(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  // Scroll to results when summary is populated
  useEffect(() => {
    if (summary && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [summary]);

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const startGeneration = async () => {
    setIsGenerating(true);
    setLogs([]);
    setSummary("");

    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    formData.append('report_text', reportText);

    try {
      const response = await fetch('http://127.0.0.1:5000/stream_generate', {
        method: 'POST',
        body: formData
      });

      if (!response.body) throw new Error("No response body");
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            const timeStr = new Date().toLocaleTimeString('en-GB', { hour12: false });
            
            if (data.type === 'log' || data.type === 'error') {
              setLogs(prev => [...prev, { time: timeStr, msg: data.message, type: data.type }]);
            } else if (data.type === 'result') {
              setSummary(data.content);
            }
          } catch (e) {
            console.error("Parse error", e);
          }
        }
      }
    } catch (err) {
      setLogs(prev => [...prev, { time: "00:00:00", msg: `NETWORK ERROR: ${err.message}`, type: "error" }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyResult = () => {
    navigator.clipboard.writeText(summary).then(() => {
      alert('DATA COPIED TO CLIPBOARD');
    });
  };

  return (
    <>
      <aside className="sidebar">
        <div className="logo">
           MEDISUM_AI
        </div>
      </aside>

      <main className="main-content">
        <div className="panel">
          <div className="upload-container" onClick={() => fileInputRef.current.click()}>
            <div style={{color: 'var(--primary)', fontSize: '2rem', marginBottom: '0.5rem'}}>📁</div>
            <div>Initialise Upload Sequence</div>
            <div style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px'}}>PDF / TXT supported</div>
          </div>
          <input 
            type="file" 
            className="hidden-input" 
            accept=".pdf,.txt" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
          />

          <div style={{marginTop: '10px', color: 'var(--success)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', textAlign: 'center'}}>
            {file && `>> FILE_LOADED: ${file.name}`}
          </div>

          <textarea 
            placeholder="// OR PASTE RAW DATA STREAM HERE..." 
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
          />

          <button className="action-btn" onClick={startGeneration} disabled={isGenerating}>
            {isGenerating ? 'PROCESSING...' : 'EXECUTE SUMMARY PROTOCOL'}
          </button>
        </div>

        {(logs.length > 0 || isGenerating) && (
          <div className="terminal" ref={terminalRef}>
            {logs.map((log, index) => (
              <div key={index} className="log-line">
                <span className="log-time">[{log.time}]</span>
                <span className={log.type === 'error' ? 'log-error' : 'log-msg'}>{log.msg}</span>
              </div>
            ))}
          </div>
        )}

        {summary && (
          <div className="panel result-container" ref={resultRef}>
            <div className="result-header">
              <span className="result-title">:: SYNTHESIS COMPLETE ::</span>
              <button className="copy-btn" onClick={copyResult}>COPY DATA</button>
            </div>
            <div 
              className="markdown-output" 
              dangerouslySetInnerHTML={{ __html: marked.parse(summary) }} 
            />
          </div>
        )}
      </main>
    </>
  );
}

export default App;
