import Link from 'next/link'

export type DashboardSidebarNavItem = {
  href: string
  label: string
}

export default function DashboardSidebarNav({
  ariaLabel,
  items,
  isActive,
}: {
  ariaLabel: string
  items: readonly DashboardSidebarNavItem[]
  isActive: (item: DashboardSidebarNavItem) => boolean
}) {
  return (
    <nav aria-label={ariaLabel} className="ui-elevated-panel max-w-full p-3">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden lg:flex-col lg:overflow-visible">
        {items.map((item) => {
          const itemIsActive = isActive(item)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-medium transition-colors lg:whitespace-normal ${
                itemIsActive
                  ? 'bg-brand text-white'
                  : 'bg-panel text-copy-secondary hover:bg-panelAlt hover:text-copy-strong'
              }`}
              aria-current={itemIsActive ? 'page' : undefined}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
