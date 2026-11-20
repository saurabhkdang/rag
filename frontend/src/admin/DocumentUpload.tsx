import { useRef, useState } from 'react'
import { getErrorMessage, uploadDocument } from '../api'

interface UploadStatus {
  name: string
  ok: boolean
  message: string
}

interface Props {
  systemId: string
  onUploaded: () => void // parent reloads the documents list
}

export default function DocumentUpload({ systemId, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState<UploadStatus[]>([])
  const inputRef = useRef<HTMLInputElement>(null) // direct access to the <input>

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return

    setUploading(true)
    setResults([])

    // One by one, so every file gets its own success/error message
    for (const file of Array.from(files)) {
      try {
        const result = await uploadDocument(systemId, file)
        const message = `${result.pages} page(s), ${result.characters.toLocaleString()} characters`
        setResults((list) => [...list, { name: file.name, ok: true, message }])
      } catch (err) {
        setResults((list) => [...list, { name: file.name, ok: false, message: getErrorMessage(err) }])
      }
    }

    setUploading(false)
    onUploaded()

    // Clear the input, so choosing the same file again still triggers onChange
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="mb-4">
      <label
        className={`flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-slate-300 bg-white px-4 py-6 text-center hover:border-slate-400 ${
          uploading ? 'pointer-events-none opacity-60' : ''
        }`}
      >
        <span className="text-sm font-medium text-slate-700">
          {uploading ? 'Uploading...' : 'Click to choose files'}
        </span>
        <span className="mt-1 text-xs text-slate-500">PDF, TXT or MD · max 20 MB each</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>

      {results.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {results.map((r) => (
            <li key={r.name} className={r.ok ? 'text-green-700' : 'text-red-600'}>
              {r.ok ? '✓' : '✗'} <span className="font-medium">{r.name}</span>: {r.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
