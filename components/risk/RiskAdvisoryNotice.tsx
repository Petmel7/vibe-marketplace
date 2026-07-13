export default function RiskAdvisoryNotice() {
  return (
    <section className="rounded-3xl border border-sky-400/20 bg-sky-400/10 px-5 py-5 text-sm text-copy-primary">
      <p className="font-semibold text-copy-strong">Оцінки ризику мають рекомендаційний характер</p>
      <p className="mt-2 text-copy-secondary">
        Ці сигнали допомагають пріоритизувати перевірку підозрілих користувачів і магазинів. Вони не запускають автоматичні санкції без окремого рішення адміністратора.
      </p>
    </section>
  )
}
