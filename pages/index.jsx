import { useState, useRef } from 'react';
import Head from 'next/head';

export default function Home() {
  const [url, setUrl] = useState('');
  const [context, setContext] = useState('');
  const [images, setImages] = useState([]);
  const [messages, setMessages] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Listo');
  const [activeTab, setActiveTab] = useState({});
  const chatRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollDown = () => setTimeout(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, 50);

  const addMsg = (role, html) => {
    setMessages(prev => [...prev, { role, html, id: Date.now() + Math.random() }]);
    scrollDown();
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImages(prev => [...prev, {
          name: file.name,
          preview: ev.target.result,
          data: ev.target.result.split(',')[1],
          type: file.type
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (i) => setImages(prev => prev.filter((_, idx) => idx !== i));

  const analyze = async () => {
    if (!url && images.length === 0) {
      alert('Introduce una URL o sube capturas de pantalla');
      return;
    }

    setLoading(true);
    setBlocks([]);
    setMessages([]);
    setStatus('Analizando...');

    addMsg('user', `🌐 <strong>${url || 'Capturas subidas'}</strong>${context ? `<br><small style="color:#6b6b80">${context}</small>` : ''}`);

    try {
      // Step 1: analyze web
      setStatus('Obteniendo contenido de la web...');
      addMsg('assistant', '<span class="dots"><span>●</span><span>●</span><span>●</span></span>');

      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, context, images })
      });

      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok) throw new Error(analyzeData.error);

      const { sections } = analyzeData;

      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          ...copy[copy.length - 1],
          html: `✅ Detectadas <strong>${sections.length} secciones</strong>:<br>${sections.map(s =>
            `<span class="tag tag-purple">${s.title.replace('Section - ', '')}</span>`
          ).join(' ')}<br><br>Generando bloques...`
        };
        return copy;
      });

      // Step 2: generate each block
      const generated = [];
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        setStatus(`Generando ${i + 1}/${sections.length}: ${section.slug}`);

        addMsg('assistant', `<span class="dots"><span>●</span><span>●</span><span>●</span></span> <small style="color:#6b6b80">${section.title}</small>`);

        const genRes = await fetch('/api/generate-block', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section })
        });

        const genData = await genRes.json();
        if (!genRes.ok) throw new Error(genData.error);

        const block = { section, acf_json: genData.acf_json, php: genData.php };
        generated.push(block);

        setMessages(prev => prev.slice(0, -1)); // remove loading msg
        setBlocks(prev => [...prev, block]);
        setActiveTab(prev => ({ ...prev, [i]: 'php' }));
        scrollDown();
      }

      setStatus(`✅ ${sections.length} bloques generados`);
      addMsg('assistant', `🎉 <strong>¡Listo!</strong> ${sections.length} bloques generados. Descarga cada uno por separado o todos de una vez.`);

    } catch (err) {
      addMsg('assistant', `❌ <strong>Error:</strong> ${err.message}`);
      setStatus('Error');
    }

    setLoading(false);
  };

  const downloadFile = (name, content, type) => {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
  };

  const downloadAll = () => {
    // Single combined ACF JSON with all field groups
    const combined = blocks.map(b => b.acf_json);
    downloadFile('acf-field-groups.json', JSON.stringify(combined, null, 2), 'application/json');
    // Individual PHP files
    blocks.forEach((block, i) => {
      setTimeout(() => {
        downloadFile(`${block.section.slug}.php`, block.php, 'text/plain');
      }, i * 200);
    });
  };

  return (
    <>
      <Head>
        <title>Web → ACF + PHP Agent</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="app">
        {/* HEADER */}
        <header>
          <div className="logo">🌐</div>
          <h1>Web → ACF + PHP <span>Agente</span></h1>
          <div className="status-badge">{status}</div>
        </header>

        <div className="layout">
          {/* SIDEBAR */}
          <aside className="sidebar">

            <div className="section">
              <h3>🌐 Web a analizar</h3>
              <label>URL</label>
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://ejemplo.com"
                onKeyDown={e => e.key === 'Enter' && !loading && analyze()}
              />
            </div>

            <div className="section">
              <h3>📷 Capturas (opcional)</h3>
              <div
                className={`upload-area ${images.length > 0 ? 'has-files' : ''}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFiles}
                  style={{ display: 'none' }}
                />
                <strong>📎 Arrastra o haz clic</strong>
                <p>PNG, JPG — capturas de secciones</p>
              </div>
              {images.length > 0 && (
                <div className="file-list">
                  {images.map((img, i) => (
                    <div key={i} className="file-pill">
                      <span>📷 {img.name}</span>
                      <button onClick={() => removeImage(i)}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="section">
              <h3>📝 Contexto</h3>
              <label>Describe el proyecto (opcional)</label>
              <textarea
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="Ej: SaaS B2B para energía solar, tono técnico..."
              />
            </div>

            <div className="section">
              <button className="btn btn-primary" onClick={analyze} disabled={loading}>
                {loading ? '⏳ Analizando...' : '⚡ Analizar y Generar Bloques'}
              </button>
            </div>

          </aside>

          {/* MAIN */}
          <main className="main">
            <div className="chat-area" ref={chatRef}>
              {messages.length === 0 && blocks.length === 0 && (
                <div className="empty-state">
                  <div className="icon">🧱</div>
                  <p>Introduce una URL y analiza la web</p>
                  <small>El agente detectará todas las secciones y generará el JSON de ACF y el bloque PHP para cada una, siguiendo tu arquitectura exacta.</small>
                </div>
              )}

              {messages.map(msg => (
                <div key={msg.id} className={`message ${msg.role}`}>
                  <div className="msg-role">{msg.role === 'assistant' ? '🤖 Agente' : '👤 Tú'}</div>
                  <div className="bubble" dangerouslySetInnerHTML={{ __html: msg.html }} />
                </div>
              ))}

              {blocks.map((block, i) => (
                <div key={i} className="block-card">
                  <div className="block-header">
                    <span className="block-name">🧱 {block.section.title}</span>
                    <div className="block-actions">
                      <button className="btn btn-sm btn-outline" onClick={() => downloadFile(`${block.section.slug}.php`, block.php, 'text/plain')}>⬇ PHP</button>
                      <button className="btn btn-sm btn-outline" onClick={() => downloadFile(`${block.section.slug}.json`, JSON.stringify(block.acf_json, null, 2), 'application/json')}>⬇ JSON</button>
                    </div>
                  </div>
                  <div className="tabs">
                    <button className={`tab ${activeTab[i] !== 'json' ? 'active' : ''}`} onClick={() => setActiveTab(prev => ({ ...prev, [i]: 'php' }))}>PHP</button>
                    <button className={`tab ${activeTab[i] === 'json' ? 'active' : ''}`} onClick={() => setActiveTab(prev => ({ ...prev, [i]: 'json' }))}>ACF JSON</button>
                  </div>
                  <pre className="code-block">
                    {activeTab[i] === 'json'
                      ? JSON.stringify(block.acf_json, null, 2)
                      : block.php}
                  </pre>
                </div>
              ))}
            </div>

            {blocks.length > 0 && (
              <div className="results-bar">
                <span className="tag tag-green">✅ {blocks.length} bloques generados</span>
                <button className="btn btn-sm btn-outline" onClick={downloadAll}>⬇ PHP + JSON único</button>
              </div>
            )}
          </main>
        </div>
      </div>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #0f0f11;
          --surface: #18181c;
          --surface2: #222228;
          --border: #2e2e38;
          --text: #e8e8f0;
          --muted: #6b6b80;
          --accent: #7c6fff;
          --accent2: #5ee7b7;
          --danger: #f05c5c;
        }

        body {
          font-family: -apple-system, 'Inter', system-ui, sans-serif;
          background: var(--bg);
          color: var(--text);
          height: 100vh;
          overflow: hidden;
        }

        .app { display: flex; flex-direction: column; height: 100vh; }

        header {
          display: flex; align-items: center; gap: 12px;
          padding: 13px 24px; border-bottom: 1px solid var(--border);
          background: var(--surface); flex-shrink: 0;
        }

        .logo {
          width: 32px; height: 32px; border-radius: 8px;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          display: flex; align-items: center; justify-content: center; font-size: 16px;
        }

        header h1 { font-size: 15px; font-weight: 600; }
        header h1 span { font-size: 12px; color: var(--muted); margin-left: 4px; font-weight: 400; }
        .status-badge { margin-left: auto; font-size: 12px; color: var(--muted); }

        .layout { display: grid; grid-template-columns: 320px 1fr; flex: 1; overflow: hidden; }

        .sidebar {
          border-right: 1px solid var(--border);
          background: var(--surface);
          overflow-y: auto; display: flex; flex-direction: column;
        }

        .section { padding: 16px 18px; border-bottom: 1px solid var(--border); }
        .section h3 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: var(--muted); margin-bottom: 10px; }

        label { display: block; font-size: 12px; color: var(--muted); margin-bottom: 4px; margin-top: 8px; }
        label:first-of-type { margin-top: 0; }

        .checkbox-label { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--text); cursor: pointer; }
        .checkbox-label input { accent-color: var(--accent); }

        input[type="text"], textarea {
          width: 100%; background: var(--surface2); border: 1px solid var(--border);
          border-radius: 6px; color: var(--text); font-size: 13px; padding: 8px 10px;
          outline: none; transition: border-color .15s; font-family: inherit;
        }
        input:focus, textarea:focus { border-color: var(--accent); }
        textarea { resize: vertical; min-height: 72px; }

        .upload-area {
          border: 1.5px dashed var(--border); border-radius: 8px;
          padding: 18px; text-align: center; cursor: pointer;
          transition: border-color .15s, background .15s;
        }
        .upload-area:hover { border-color: var(--accent); background: rgba(124,111,255,.04); }
        .upload-area.has-files { border-color: var(--accent2); }
        .upload-area strong { font-size: 13px; display: block; margin-bottom: 4px; }
        .upload-area p { font-size: 11px; color: var(--muted); }

        .file-list { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; }
        .file-pill { display: flex; align-items: center; justify-content: space-between; background: var(--surface2); border: 1px solid var(--border); border-radius: 5px; padding: 5px 8px; font-size: 12px; }
        .file-pill button { background: none; border: none; cursor: pointer; color: var(--muted); font-size: 15px; line-height: 1; }
        .file-pill button:hover { color: var(--danger); }

        .btn { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 14px; border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: opacity .15s; }
        .btn:hover { opacity: .85; }
        .btn:disabled { opacity: .4; cursor: not-allowed; }
        .btn-primary { background: var(--accent); color: #fff; width: 100%; }
        .btn-outline { background: transparent; color: var(--text); border: 1px solid var(--border); }
        .btn-sm { padding: 5px 11px; font-size: 12px; }

        .main { display: flex; flex-direction: column; overflow: hidden; }

        .chat-area { flex: 1; overflow-y: auto; padding: 24px 28px; display: flex; flex-direction: column; gap: 16px; }

        .empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--muted); text-align: center; padding: 40px; }
        .empty-state .icon { font-size: 36px; }
        .empty-state p { font-size: 14px; color: var(--text); }
        .empty-state small { font-size: 12px; line-height: 1.6; }

        .message { max-width: 860px; }
        .message.assistant { align-self: flex-start; width: 100%; }
        .message.user { align-self: flex-end; }
        .msg-role { font-size: 10px; color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 5px; }

        .bubble { padding: 11px 15px; border-radius: 10px; font-size: 14px; line-height: 1.6; }
        .assistant .bubble { background: var(--surface); border: 1px solid var(--border); }
        .user .bubble { background: #1e1a4a; border: 1px solid #3b3580; color: #c7c0ff; }

        .dots span { display: inline-block; width: 6px; height: 6px; background: var(--muted); border-radius: 50%; margin: 0 2px; animation: bounce .8s infinite; }
        .dots span:nth-child(2) { animation-delay: .15s; }
        .dots span:nth-child(3) { animation-delay: .3s; }
        @keyframes bounce { 0%,80%,100% { transform:translateY(0) } 40% { transform:translateY(-5px) } }

        .block-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
        .block-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid var(--border); background: #1c1c24; }
        .block-name { font-size: 13px; font-weight: 600; color: var(--accent2); }
        .block-actions { display: flex; gap: 6px; }

        .tabs { display: flex; border-bottom: 1px solid var(--border); background: #1a1a22; }
        .tab { padding: 7px 14px; font-size: 12px; font-weight: 500; cursor: pointer; color: var(--muted); border: none; background: transparent; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: color .15s; }
        .tab.active { color: var(--accent); border-bottom-color: var(--accent); }

        .code-block { background: #0d0d12; font-family: 'Fira Code', 'Cascadia Code', monospace; font-size: 12px; line-height: 1.7; padding: 14px 16px; overflow-x: auto; white-space: pre; color: #c9d1d9; max-height: 320px; overflow-y: auto; }

        .results-bar { display: flex; align-items: center; justify-content: space-between; padding: 10px 20px; border-top: 1px solid var(--border); background: var(--surface); flex-shrink: 0; }

        .tag { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .tag-green { background: #0d2e1a; color: var(--accent2); }
        .tag-purple { background: #1e1a4a; color: var(--accent); }
      `}</style>
    </>
  );
}
