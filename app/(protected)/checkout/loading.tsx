import CheckoutShell from '@/components/checkout/CheckoutShell'

export default function CheckoutLoading() {
  return (
    <CheckoutShell>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <div className="space-y-6">
          <div className="ui-elevated-panel h-24 animate-pulse bg-panel/60" />
          <div className="ui-elevated-panel h-80 animate-pulse bg-panel/60" />
          <div className="ui-elevated-panel h-96 animate-pulse bg-panel/60" />
        </div>
        <div className="ui-elevated-panel h-72 animate-pulse bg-panel/60" />
      </div>
    </CheckoutShell>
  )
}
