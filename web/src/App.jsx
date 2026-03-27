import { useState } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

function App() {
  const [note, setNote] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setResult(null)

    if (!note.trim()) {
      setError('Clinical note is required.')
      return
    }

    const payload = {
      note: { raw: note.trim() },
    }

    try {
      setIsLoading(true)
      const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/v1/summaries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        const message = data?.error?.message || `Request failed with status ${response.status}`
        throw new Error(message)
      }

      setResult(data)
    } catch (requestError) {
      setError(requestError.message || 'Unexpected error while requesting summary.')
    } finally {
      setIsLoading(false)
    }
  }

  function renderSoapPlan(planItems) {
    if (!Array.isArray(planItems) || planItems.length === 0) {
      return <p className="empty">No plan items returned.</p>
    }

    return (
      <ul>
        {planItems.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    )
  }

  function handleVoiceInput() {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in your browser.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true // Stay on longer to catch all speech
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    let hasReceivedSpeech = false

    recognition.onstart = () => {
      setIsListening(true)
      setError('')
      hasReceivedSpeech = false
      console.log('[Voice] Recognition started')
    }

    recognition.onresult = (event) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript + ' '
      }
      transcript = transcript.trim()
      
      if (transcript) {
        hasReceivedSpeech = true
        console.log('[Voice] Transcript:', transcript)
        setNote((prevNote) => prevNote + (prevNote ? ' ' : '') + transcript)
      }
    }

    recognition.onerror = (event) => {
      let errorMsg = event.error
      console.log('[Voice] Error:', errorMsg)

      // Only show error if we didn't receive any speech
      if (!hasReceivedSpeech && errorMsg === 'no-speech') {
        setError('No speech detected. Try speaking louder or closer to the microphone.')
      } else {
        const errorMap = {
          'no-speech': 'No speech detected. Try again.',
          'network': 'Network error. Check your internet connection.',
          'not-allowed': 'Microphone access denied. Check browser permissions.',
          'audio-capture': 'No microphone found. Check your device.',
        }
        setError(errorMap[errorMsg] || `Voice input error: ${errorMsg}`)
      }
      
      setIsListening(false)
    }

    recognition.onend = () => {
      console.log('[Voice] Recognition ended')
      setIsListening(false)
    }

    recognition.start()
  }

  return (
    <main className="app-shell">
      <header>
        <p className="eyebrow">Clinical Document Summarization</p>
        <h1>Simple Clinical Summarizer</h1>
        <p className="subtitle">
          Type, paste, or use voice input to add your text, then click 'Summarize'.
        </p>
      </header>

      <section className="panel">
        <form onSubmit={handleSubmit}>
          <label>
            Raw Note
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Paste the complete raw clinical note here..."
              rows={10}
              wrap="soft"
            />
          </label>

          <div className="button-group">
            <button type="submit" disabled={isLoading || isListening}>
              {isLoading ? 'Summarizing...' : 'Summarize'}
            </button>
            <button
              type="button"
              onClick={handleVoiceInput}
              disabled={isLoading || isListening}
              className="voice-btn"
              title="Click to record voice input"
            >
              {isListening ? '🎙️ Listening...' : '🎙️ Voice Input'}
            </button>
          </div>
        </form>

        {error && <p className="error">{error}</p>}
      </section>

      {result && (
        <section className="panel results">
          <h2>Summary Output</h2>
          <p className="meta">
            Request ID: {result.requestId || 'n/a'} | Tenant: {result.tenantId || 'n/a'} | Latency:{' '}
            {result.metadata?.latencyMs ?? 'n/a'} ms
          </p>

          <div className="result-grid">
            <article>
              <h3>SOAP Summary</h3>
              {result.outputs?.soapClinicalSummary ? (
                <>
                  <p>
                    <strong>Subjective:</strong> {result.outputs.soapClinicalSummary.subjective}
                  </p>
                  <p>
                    <strong>Objective:</strong> {result.outputs.soapClinicalSummary.objective}
                  </p>
                  <p>
                    <strong>Assessment:</strong> {result.outputs.soapClinicalSummary.assessment}
                  </p>
                  <div>
                    <strong>Plan:</strong>
                    {renderSoapPlan(result.outputs.soapClinicalSummary.plan)}
                  </div>
                </>
              ) : (
                <p className="empty">SOAP output disabled or unavailable.</p>
              )}
            </article>

            <article>
              <h3>Plain Language Summary</h3>
              {result.outputs?.plainLanguageSummary ? (
                <p>{result.outputs.plainLanguageSummary}</p>
              ) : (
                <p className="empty">Plain language output disabled or unavailable.</p>
              )}
            </article>
          </div>

        </section>
      )}
    </main>
  )
}

export default App
