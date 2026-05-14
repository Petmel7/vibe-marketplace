export default function CartCheckbox({
    checked,
    onChange,
}: {
    checked: boolean
    onChange: (v: boolean) => void
}) {
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] border-2 border-brand transition-colors"
            style={{ background: checked ? '#9466FF' : 'transparent' }}
        >
            {checked && (
                <svg width="12" height="9" viewBox="0 0 12 9" fill="none" aria-hidden="true">
                    <path
                        d="M1 4L4.5 7.5L11 1"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            )}
        </button>
    )
}