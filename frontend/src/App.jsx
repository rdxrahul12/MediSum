import React, { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import './index.css';

function App() {
  const processMarkdown = (text) => {
    if (!text) return "";

    // Remove markdown block wrappers so Marked doesn't escape our custom HTML tokens
    let processedText = text.replace(/```[a-zA-Z]*\n?/g, '');
    // let processedText = text;

    // Timeline Visualizer Interceptor
    processedText = processedText.replace(
      /\*\*Timeline of Events:\*\*([\s\S]*?)(?=\n\*\*|$)/i,
      (match, content) => {
        // Extract bullet points matching '-' or '*'
        const items = content.split('\n').filter(line => line.trim().match(/^[-*]\s+/));
        if (items.length === 0) return match;

        let html = '<div class="timeline-container">';
        items.forEach((item, index) => {
          let itemText = item.replace(/^[-*]\s*/, '').trim();
          html += `<div class="timeline-item" style="animation-delay: ${index * 0.15}s">
            <div class="timeline-marker"></div>
            <div class="timeline-content">${itemText}</div>
          </div>`;
        });
        html += '</div>';

        return `\n\n<div class="timeline-wrapper">
          <h3 class="timeline-title">:: TIMELINE OF EVENTS ::</h3>
          ${html}
        </div>\n\n`;
      }
    );

    processedText = processedText.replace(/(?:\*\*Disclaimer:\*\*|\*Disclaimer:\*|Disclaimer:|Note: Disclaimer:)\s*([\s\S]*?)(?=\n\n|$)/gi, '\n\n<div class="disclaimer-alert"><strong>DISCLAIMER:</strong> $1</div>\n\n');

    // Map custom NER tokens to styled HTML spans
    processedText = processedText.replace(/\[\[MED\|(.*?)\]\]/gi, "<span class='ner-badge ner-med'>$1</span>");
    processedText = processedText.replace(/\[\[DIAG\|(.*?)\]\]/gi, "<span class='ner-badge ner-diag'>$1</span>");
    processedText = processedText.replace(/\[\[PROC\|(.*?)\]\]/gi, "<span class='ner-badge ner-proc'>$1</span>");

    return marked.parse(processedText);
  };

  const [file, setFile] = useState(null);
  const [reportText, setReportText] = useState("");
  const [logs, setLogs] = useState([
    { time: "00:00:00", msg: "System Ready. Awaiting input...", type: "log" }
  ]);
  const [summary, setSummary] = useState("");
  const [urgency, setUrgency] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTerm, setDialogTerm] = useState("");
  const [dialogContent, setDialogContent] = useState("");
  const [dialogLoading, setDialogLoading] = useState(false);
  const fileInputRef = useRef(null);
  const terminalRef = useRef(null);
  const resultRef = useRef(null);
  const chatScrollRef = useRef(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isChatting]);

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
    setUrgency(null);
    setChatMessages([]);

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
              if (data.urgency) setUrgency(data.urgency);
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

  const handleChatSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isChatting) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatting(true);

    try {
      const currentHistory = chatMessages.map(m => ({ role: m.role, content: m.content }));

      const response = await fetch('http://127.0.0.1:5000/stream_chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMsg, history: currentHistory })
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
            if (data.type === 'result') {
              setChatMessages(prev => [...prev, { role: 'ai', content: data.content }]);
            } else if (data.type === 'error') {
              setChatMessages(prev => [...prev, { role: 'ai', content: `[ERROR]: ${data.message}` }]);
            }
          } catch (e) {
            console.error("Parse error", e);
          }
        }
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'ai', content: `[NETWORK ERROR]: ${err.message}` }]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleMarkdownClick = (e) => {
    if (e.target.classList.contains('ner-badge')) {
      openDialog(e.target.innerText);
    }
  };

  const openDialog = async (term) => {
    setDialogOpen(true);
    setDialogTerm(term);
    setDialogContent("");
    setDialogLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:5000/explain_term', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term })
      });

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let explanation = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.type === 'result') {
              explanation = data.content;
              setDialogContent(explanation);
            } else if (data.type === 'error') {
              setDialogContent(`[ERROR]: ${data.message}`);
            }
          } catch (e) {
            console.error("Parse error", e);
          }
        }
      }
    } catch (err) {
      setDialogContent(`[NETWORK ERROR]: ${err.message}`);
    } finally {
      setDialogLoading(false);
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
            <div style={{ color: 'var(--primary)', fontSize: '2rem', marginBottom: '0.5rem' }}>📁</div>
            <div>Initialise Upload Sequence</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>PDF / TXT supported</div>
          </div>
          <input
            type="file"
            className="hidden-input"
            accept=".pdf,.txt"
            ref={fileInputRef}
            onChange={handleFileSelect}
          />

          <div style={{ marginTop: '10px', color: 'var(--success)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', textAlign: 'center' }}>
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
              {urgency && (
                <span className={`urgency-badge badge-${urgency.toLowerCase()}`}>
                  {urgency.toUpperCase()}
                </span>
              )}
              <button className="copy-btn" onClick={copyResult}>COPY DATA</button>
            </div>
            <div
              className="markdown-output"
              onClick={handleMarkdownClick}
              dangerouslySetInnerHTML={{ __html: processMarkdown(summary) }}
            />
          </div>
        )}

        {summary && (
          <div className="panel chat-container">
            <div className="result-header">
              <span className="result-title">:: MEDICAL CHAT INTERFACE ::</span>
            </div>
            <div className="chat-history" ref={chatScrollRef} style={{ height: '350px', overflowY: 'auto', marginBottom: '1rem', padding: '1rem', background: '#000', borderRadius: '0.5rem', border: '1px solid var(--border)', boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.5)' }}>
              {chatMessages.length === 0 && (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '3rem', fontFamily: 'var(--font-mono)' }}>
                  Ask questions about the diagnosed medical report.<br />Conversation context is retained.
                </div>
              )}
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`chat-message ${msg.role}`} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ background: msg.role === 'user' ? 'rgba(6, 182, 212, 0.1)' : 'transparent', border: msg.role === 'user' ? '1px solid var(--primary)' : 'none', padding: msg.role === 'user' ? '0.75rem 1rem' : '0', borderRadius: '0.5rem', maxWidth: '85%', color: msg.role === 'user' ? 'var(--primary)' : 'var(--text-main)', fontFamily: msg.role === 'user' ? 'var(--font-mono)' : 'var(--font-ui)' }}>
                    {msg.role === 'ai' ? (
                      <div className="markdown-output ai-chat-content" onClick={handleMarkdownClick} dangerouslySetInnerHTML={{ __html: processMarkdown(msg.content) }} />
                    ) : (
                      <div>{msg.content}</div>
                    )}
                  </div>
                </div>
              ))}
              {isChatting && (
                <div className="chat-message ai" style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Analyzing report context...</div>
                </div>
              )}
            </div>
            <form className="chat-input-area" onSubmit={handleChatSubmit} style={{ display: 'flex', gap: '1rem' }}>
              <input
                type="text"
                placeholder="Ask about symptoms, treatments, or disclaimers..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isChatting}
                style={{ flex: 1, padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}
              />
              <button className="action-btn" type="submit" disabled={isChatting || !chatInput.trim()} style={{ marginTop: 0, width: 'auto' }}>
                SEND
              </button>
            </form>
          </div>
        )}

        {dialogOpen && (
          <div className="modal-overlay" onClick={() => setDialogOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{dialogTerm} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'normal', fontFamily: 'var(--font-mono)' }}>:: LAYMAN'S TERMS ::</span></h3>
                <button className="close-btn" onClick={() => setDialogOpen(false)}>×</button>
              </div>
              <div className="modal-body">
                {dialogLoading ? (
                  <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Translating jargon...</div>
                ) : (
                  <div className="markdown-output" dangerouslySetInnerHTML={{ __html: marked.parse(dialogContent) }} />
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default App;
