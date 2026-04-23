import Image from 'next/image'
import { Button } from "@/components/ui/Button";

interface StateAction {
  label: string
  href: string
}

export interface StateViewProps {
  title: string
  subtitle?: string
  description?: string
  imageSrc: string
  primaryAction: StateAction
  secondaryAction?: StateAction
}

export const COMMON_ACTIONS = {
  primaryAction: {
    label: 'Продовжити покупки',
    href: '/catalog',
  },
  secondaryAction: {
    label: 'Перейти на головну',
    href: '/',
  },
} as const;

export function createState(
  config: Omit<StateViewProps, 'primaryAction' | 'secondaryAction'>
): StateViewProps {
  return {
    ...config,
    ...COMMON_ACTIONS,
  };
}

export const CART_EMPTY_STATE = createState({
  title: 'Ой ... Здається тут ще пусто ...',
  subtitle: 'Ваша корзина пуста',
  description: 'Щоб здійснити покупку перейдіть до каталогу...',
  imageSrc: '/uploads/cart.png',
});

export const WISHLIST_EMPTY_STATE = createState({
  title: 'Ой ... Здається тут ще пусто ...',
  subtitle: 'В обраному нічого немає',
  description: 'Ми впевнені, що в нашому каталогу знайдете...',
  imageSrc: '/uploads/heart.png',
});

export const NOT_FOUND_STATE = createState({
  title: 'Упс ... Здається хтось вкрав сторінку!',
  subtitle: 'Наша таємна служба вже веде розслідування',
  description: 'Найближчим часом сторінку буде знайдено',
  imageSrc: '/uploads/ufo.png',
});

export const ORDER_SUCCESS_STATE = createState({
  title: 'Дякуємо! Ваше замовлення успішно оформлено',
  subtitle: 'Ми вже почали його опрацьовувати',
  description: 'Слідкуйте за оновленнями статусу у своєму профілі',
  imageSrc: '/uploads/bag.png',
});

export default function StateView({
  title,
  subtitle,
  description,
  imageSrc,
  primaryAction,
  secondaryAction,
}: StateViewProps) {
  return (
    <main className="ui-page-shell flex min-h-screen items-center justify-center py-6 md:py-10">
      <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 md:gap-8 lg:flex-row lg:items-center lg:gap-16">

        {/* TITLE (top on mobile) */}
        <h1 className="text-center text-[24px] leading-8 font-bold text-copy-strong lg:hidden">
          {title}
        </h1>

        {/* IMAGE */}
        <div className="flex w-full justify-center lg:flex-1">
          <Image
            src={imageSrc}
            alt={title}
            width={432}
            height={432}
            className="h-auto w-full max-w-[min(100%,22rem)] md:max-w-[min(100%,26rem)] lg:max-w-lg"
            priority
          />
        </div>

        {/* CONTENT */}
        <div className="flex w-full max-w-lg flex-col items-center gap-4 text-center md:gap-5 lg:max-w-md lg:items-start lg:text-left">

          {/* TITLE (desktop) */}
          <h1 className="hidden text-[24px] leading-8 font-bold text-copy-strong lg:block">
            {title}
          </h1>

          {subtitle && (
            <p className="text-[16px] leading-5 font-bold text-copy-primary">
              {subtitle}
            </p>
          )}

          {description && (
            <p className="text-[14px] leading-5 text-copy-primary">
              {description}
            </p>
          )}

          {/* BUTTONS */}
          <div className="flex w-full flex-col gap-2 md:flex-row">
            <Button href={primaryAction.href} fullWidth>
              {primaryAction.label}
            </Button>

            {secondaryAction && (
              <Button href={secondaryAction.href} variant="secondary" fullWidth>
                {secondaryAction.label}
              </Button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
