import { useRef, useState } from 'react'

export interface CardLoaderProps {
  error: string | null
  onLoad: (text: string) => void
}

export function CardLoader({ error, onLoad }: CardLoaderProps) {
  const [text, setText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    const contents = await file.text()
    setText(contents)
    onLoad(contents)
  }

  return (
    <section className="card-loader">
      <h2>Load your NMJL card</h2>
      <p>
        This app never bundles a card's actual patterns (they're copyrighted, purchased content). Upload or
        paste your own card JSON — see <code>docs/card-schema.md</code> in the repo for the format. Nothing you
        load here is sent anywhere; it stays in this browser tab.
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
        }}
      />
      <textarea
        rows={8}
        placeholder="...or paste card JSON here"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button type="button" onClick={() => onLoad(text)} disabled={text.trim().length === 0}>
        Load card
      </button>
      {error && <p className="card-loader-error">{error}</p>}
    </section>
  )
}
