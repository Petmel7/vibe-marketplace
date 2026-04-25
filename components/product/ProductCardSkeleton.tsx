interface Props {
  count?: number
}

export default function ProductCardSkeleton({ count = 4 }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 min-[375px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="ui-product-card animate-pulse">
          <div className="ui-product-card-media">
            <div className="h-full w-full bg-panelAlt/60" />
          </div>
          <div className="flex flex-col gap-2 px-3 pb-3 pt-2">
            <div className="h-5 rounded bg-panelAlt/70" />
            <div className="h-3 w-2/3 rounded bg-panelAlt/60" />
            <div className="h-7 w-1/2 rounded bg-panelAlt/70" />
          </div>
        </div>
      ))}
    </div>
  )
}
