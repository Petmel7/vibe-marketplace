import Link from 'next/link'

interface SearchErrorStateProps {
  title?: string
  message?: string
  resetHref?: string
}

export default function SearchErrorState({
  title = 'Не вдалося завантажити результати',
  message = 'Спробуйте оновити сторінку або повернутися до каталогу трохи пізніше.',
  resetHref = '/catalog',
}: SearchErrorStateProps) {
  return (
    <main className="pb-24 pt-4 md:pb-12">
      <section className="rounded-[28px] border border-dashed border-panelBorder bg-panel p-8 text-center">
        <h1 className="ui-heading-page">{title}</h1>
        <p className="mt-3 ui-body-muted">{message}</p>
        <Link href={resetHref} className="mt-5 inline-flex ui-secondary-button h-11 px-5 text-sm">
          Перейти до каталогу
        </Link>
      </section>
    </main>
  )
}
