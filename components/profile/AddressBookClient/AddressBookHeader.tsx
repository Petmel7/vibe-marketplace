export default function AddressBookHeader({
  onCreate,
}: {
  onCreate: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-copy-strong">Адреси доставки</h2>
        <p className="text-sm text-copy-muted">Керуйте адресами доставки для майбутніх замовлень.</p>
      </div>
      <div className="flex justify-center max-[500px]:justify-stretch">
        <button type="button" className="ui-primary-button w-fit max-[500px]:w-full" onClick={onCreate}>
          Додати адресу
        </button>
      </div>
    </div>
  )
}
