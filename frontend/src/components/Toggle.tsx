interface Props {
  checked: boolean
  onChange: (value: boolean) => void
  label: string // for screen readers
  disabled?: boolean
}

// An on/off switch. role="switch" tells screen readers what it is.
export default function Toggle({ checked, onChange, label, disabled = false }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? 'bg-slate-900' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}