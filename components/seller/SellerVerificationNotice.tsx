import SellerStatePanel from '@/components/seller/SellerStatePanel'
import type { SellerVerificationStatus } from '@/types/seller'

export default function SellerVerificationNotice({
  status,
  reason,
}: {
  status: SellerVerificationStatus | null | undefined
  reason?: string | null
}) {
  if (!status || status === 'VERIFIED') {
    return null
  }

  if (status === 'PENDING') {
    return (
      <SellerStatePanel
        title="Верифікація триває"
        description="Ваш акаунт продавця проходить перевірку. Ви можете підготувати дані товарів і налаштування магазину, поки активація маркетплейсом ще обмежена."
        status={status}
        actionHref="/seller/store"
        actionLabel="Перевірити готовність магазину"
      />
    )
  }

  if (status === 'REJECTED') {
    return (
      <SellerStatePanel
        title="Верифікацію продавця відхилено"
        description="Перегляньте зауваження модерації, оновіть інформацію про магазин і узгодьте наступний крок верифікації перед відновленням роботи."
        status={status}
        reason={reason}
        actionHref="/seller/store"
        actionLabel="Відкрити налаштування магазину"
      />
    )
  }

  return (
    <SellerStatePanel
      title="Акаунт продавця призупинено"
      description="Роботу магазину призупинено, доки модерація не зніме обмеження. Ви все ще можете переглядати дані дашборду та статус акаунта."
      status={status}
      reason={reason}
      actionHref="/seller/store"
      actionLabel="Переглянути статус магазину"
    />
  )
}
