import React, { useEffect, useMemo, useState } from 'react'

const TAMIL_QUOTES = [
  { text: 'தமிழ் மொழி வரலாறாக மட்டும் அல்ல, வருங்காலமாகவும் உள்ளது.', author: 'சுப்பிரமணிய பாரதி' },
  { text: 'ஒளிரும் ஓலை எழுத்தில் தமிழரின் ஆன்மா ஒலிக்கிறது.', author: 'உரைமொழி கூறுபவர்' },
  { text: 'பனை ஓலை போல நெகிழும் தமிழ், மண்ணின் மணத்தை சுமக்கும்.', author: 'முன்னோர் சொல்' },
  { text: 'தமிழின் எழுத்துகள் - இசை, மணம், உணர்வு அனைத்தையும் ஏந்தும்.', author: 'அறிவொளி' },
]

const ACCEPT = '.jpg,.jpeg,.png,.webp,.bmp,.pdf,.docx,.txt'
const ACCEPT_LABEL = ACCEPT.replace(/\./g, '').toUpperCase()

export default function App () {
  const [file, setFile] = useState(null)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('தயார்')
  const [quoteIndex, setQuoteIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % TAMIL_QUOTES.length)
    }, 5000)
    return () => clearInterval(id)
  }, [])

  const activeQuote = useMemo(() => TAMIL_QUOTES[quoteIndex], [quoteIndex])

  const setSelectedFile = (incomingFile) => {
    if (!incomingFile) return
    setFile(incomingFile)
    setError('')
    setResult('')
    setStatus('கோப்பு தயாராக உள்ளது')
  }

  const handleFileInput = (event) => {
    const selected = event.target.files?.[0]
    setSelectedFile(selected)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    const dropped = event.dataTransfer.files?.[0]
    setSelectedFile(dropped)
  }

  const handleDragOver = (event) => {
    event.preventDefault()
  }

  const formatBytes = (bytes = 0) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    const k = 1024
    const sizes = ['KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  const copyResult = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result)
      setStatus('உரை நகலெடுக்கப்பட்டது')
      setTimeout(() => setStatus('தயார்'), 2000)
    } catch (err) {
      setError(err.message)
    }
  }

  const upload = async (event) => {
    event.preventDefault()
    if (!file) {
      setError('ஒரு கோப்பைப் பதிவேற்றவும்.')
      return
    }

    setLoading(true)
    setError('')
    setResult('')
    setStatus('கணினி எழுத்துகளை பொறுக்கிறது...')

    try {
      const body = new FormData()
      body.append('file', file)

      const res = await fetch('/api/extract', {
        method: 'POST',
        body,
      })

      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Extraction failed')
      setResult(payload.text || '')
      setStatus('Tamil text ready!')
    } catch (err) {
      setError(err.message)
      setStatus('பிழை ஏற்பட்டது')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <div className="cosmos cosmos-one" />
      <div className="cosmos cosmos-two" />
      <div className="grid-overlay" />

      <main className="layout">
        <section className="hero-panel">
          <p className="eyebrow">தமிழ் ஓலைச்சுவடி • Digital Palm Leaf</p>
          <h1 className="headline">
            <span>3D Tamil Memory Portal</span>
            <span className="headline-quote">“{activeQuote.text}”</span>
          </h1>
          <p className="subtext">பாரம்பரிய ஓலைச்சுவடிகளைப் போல, எந்த வகை கோப்பிலிருந்தும் தமிழ் எழுத்துகளை உயிர்ப்பிக்கவும்.</p>

          <div className="quote-cube">
            <div className="quote-cube__inner">
              <p className="quote-cube__text">“{activeQuote.text}”</p>
              <p className="quote-cube__author">— {activeQuote.author}</p>
            </div>
          </div>

          <ul className="hero-meta">
            <li>
              <span className="hero-meta__label">கோப்பு வகைகள்</span>
              <span className="hero-meta__value">PDF • DOCX • TXT • Images</span>
            </li>
            <li>
              <span className="hero-meta__label">அடிப்படை</span>
              <span className="hero-meta__value">Gemini Flash • OCR + LLM</span>
            </li>
            <li>
              <span className="hero-meta__label">மொழி</span>
              <span className="hero-meta__value">தமிழ் (கையெழுத்து + அச்சு)</span>
            </li>
          </ul>
        </section>

        <section className="upload-card">
          <form onSubmit={upload} className="upload-form">
            <div
              className="upload-portal"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input
                id="file-input"
                className="sr-only"
                type="file"
                accept={ACCEPT}
                onChange={handleFileInput}
              />
              <label htmlFor="file-input" className="upload-label">
                <span className="spark" />
                <p className="upload-title">Tamil Document Portal</p>
                <p className="upload-description">
                  PDF, Word, TXT, படங்கள், கையெழுத்து ஓலைகளை இங்கே இழுத்து விடவும் அல்லது கிளிக் செய்யவும்.
                </p>
                <p className="upload-meta">அனுமதிக்கப்பட்டவை: {ACCEPT_LABEL}</p>
                <div className="cta">கோப்பை தேர்வு செய்க</div>
              </label>
              {file && (
                <div className="file-chip">
                  <div>
                    <p className="file-chip__name">{file.name}</p>
                    <p className="file-chip__size">{formatBytes(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    className="clear-button"
                    onClick={() => setFile(null)}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div className="actions">
              <button className="btn-primary" disabled={loading}>
                {loading ? 'Tamil glyphs spinning...' : 'Extract Tamil Text'}
              </button>
              <p className="status-text">{status}</p>
            </div>

            {error && <p className="error-text">⚠️ {error}</p>}
          </form>
        </section>

        {Boolean(result) && (
          <section className="result-panel">
            <div className="panel-header">
              <div>
                <p className="panel-eyebrow">பரிமாறப்பட்ட ஒலி</p>
                <h2 className="panel-title">பெறப்பட்ட தமிழ் உரை</h2>
              </div>
              <button className="btn-ghost" type="button" onClick={copyResult}>
                Copy
              </button>
            </div>
            <pre className="result-body">{result}</pre>
          </section>
        )}
      </main>
    </div>
  )
}

