export default function EmailTemplatePreviewFrame({
  title,
  description,
  html,
}: {
  title: string
  description: string
  html: string
}) {
  return (
    <article className="ui-elevated-panel overflow-hidden">
      <div className="border-b border-panelBorder px-5 py-5 sm:px-6">
        <h2 className="text-lg font-semibold text-copy-strong">{title}</h2>
        <p className="mt-2 text-sm text-copy-secondary">{description}</p>
      </div>
      <div className="bg-panel p-3 sm:p-4">
        <iframe
          title={`${title} email preview`}
          srcDoc={html}
          className="h-[540px] w-full rounded-2xl border border-panelBorder bg-white"
        />
      </div>
    </article>
  )
}
