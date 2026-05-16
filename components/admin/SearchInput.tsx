export default function SearchInput({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string
  label: string
  defaultValue?: string
  placeholder: string
}) {
  return (
    <label className="min-w-0 flex-1 space-y-2">
      <span className="block text-sm font-medium text-copy-strong">{label}</span>
      <input
        type="search"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="ui-surface-input"
      />
    </label>
  )
}
