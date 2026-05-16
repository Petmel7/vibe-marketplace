type Option = {
  label: string
  value: string
}

export default function StatusFilter({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string
  label: string
  defaultValue?: string
  options: Option[]
}) {
  return (
    <label className="space-y-2 xl:w-56">
      <span className="block text-sm font-medium text-copy-strong">{label}</span>
      <select name={name} defaultValue={defaultValue ?? ''} className="ui-surface-input">
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
