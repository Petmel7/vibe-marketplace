import Image from "next/image";
import { Search, CircleUser, Menu, Heart, ListPlus, ShoppingCart } from "lucide-react";

export default function Header() {
  return (
    <>
      {/* Mobile header — hidden on md+ */}
      <header className="md:hidden w-full h-[72px] bg-[#1D2533] border-b border-white/10 flex items-center px-4">
        <div className="flex items-center gap-3 flex-1">
          <Image src="/logo.svg" alt="Вайб" width={30} height={50} priority />
          <span className="text-white font-bold text-xl leading-tight" style={{ width: "161px" }}>
            Вайб
          </span>
        </div>
        <nav aria-label="Utility navigation" className="flex items-center gap-5">
          <button aria-label="Пошук" className="flex items-center justify-center">
            <Search size={24} color="#E8E9EA" aria-hidden="true" />
          </button>
          <button aria-label="Профіль користувача" className="flex items-center justify-center">
            <CircleUser size={24} color="#E8E9EA" aria-hidden="true" />
          </button>
        </nav>
      </header>

      {/* Desktop header — hidden below md */}
      <header className="hidden md:flex w-full h-[72px] bg-[#1D2533] border-b border-white/10 items-center px-6 relative">
        {/* Left: Menu icon */}
        <div className="flex items-center gap-2">
          <button aria-label="Меню" className="flex items-center gap-2">
            <Menu size={24} color="#E8E9EA" aria-hidden="true" />
            <span className="text-[#E8E9EA] font-medium text-sm">Меню</span>
          </button>
        </div>

        {/* Center: Logo — absolutely centered */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
          <Image src="/logo.svg" alt="Вайб" width={30} height={50} priority />
          <span className="text-white font-bold text-xl leading-tight">Вайб</span>
        </div>

        {/* Right: utility icons */}
        <nav aria-label="Utility navigation" className="flex items-center gap-5 ml-auto">
          <button aria-label="Пошук" className="flex items-center justify-center">
            <Search size={24} color="#E8E9EA" aria-hidden="true" />
          </button>
          <button aria-label="Обране" className="flex items-center justify-center">
            <Heart size={24} color="#E8E9EA" aria-hidden="true" />
          </button>
          <button aria-label="Список бажань" className="flex items-center justify-center">
            <ListPlus size={24} color="#E8E9EA" aria-hidden="true" />
          </button>
          <button aria-label="Кошик" className="flex items-center justify-center">
            <ShoppingCart size={24} color="#E8E9EA" aria-hidden="true" />
          </button>
          <button aria-label="Профіль користувача" className="flex items-center justify-center">
            <CircleUser size={24} color="#E8E9EA" aria-hidden="true" />
          </button>
        </nav>
      </header>
    </>
  );
}
