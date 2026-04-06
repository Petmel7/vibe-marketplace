import Image from "next/image";
import { Search, CircleUser } from "lucide-react";

export default function Header() {
  return (
    <header className="w-full h-[72px] bg-[#1D2533] border-b border-white/10 flex items-center px-4">
      {/* Logo and brand name */}
      <div className="flex items-center gap-3 flex-1">
        <Image
          src="/logo.svg"
          alt="Вайб"
          width={30}
          height={50}
          priority
        />
        <span
          className="text-white font-bold text-xl leading-tight"
          style={{ width: "161px" }}
        >
          Вайб
        </span>
      </div>

      {/* Right-side icons */}
      <nav aria-label="Utility navigation" className="flex items-center gap-5">
        <button aria-label="Пошук" className="flex items-center justify-center">
          <Search size={24} color="#E8E9EA" aria-hidden="true" />
        </button>
        <button
          aria-label="Профіль користувача"
          className="flex items-center justify-center"
        >
          <CircleUser size={24} color="#E8E9EA" aria-hidden="true" />
        </button>
      </nav>
    </header>
  );
}
