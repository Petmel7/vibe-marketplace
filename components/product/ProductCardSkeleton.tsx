interface Props {
  count?: number
}

export default function ProductCardSkeleton({ count = 4 }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 min-[375px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex h-full flex-col overflow-hidden rounded-2xl border border-panelBorder bg-panel shadow-sm animate-pulse"
        >
          <div className="aspect-[4/4.6] border-b border-panelBorder bg-panelAlt/60" />
          <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
            <div className="space-y-2">
              <div className="h-3 w-24 rounded bg-panelAlt/60" />
              <div className="h-6 w-5/6 rounded bg-panelAlt/70" />
              <div className="h-5 w-2/3 rounded bg-panelAlt/60" />
            </div>
            <div className="mt-auto space-y-4">
              <div className="h-8 w-1/2 rounded bg-panelAlt/70" />
              <div className="h-11 rounded-2xl bg-panelAlt/70" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
