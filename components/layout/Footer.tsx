import Image from "next/image";
import { FiFacebook, FiYoutube } from "react-icons/fi";
import { FaInstagram } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="w-full bg-[#1D2533]">
      {/* Main content */}
      <div className="px-6 py-8">
        {/* Mobile: stacked center | Desktop: 4-column row */}
        <div className="flex flex-col items-center gap-8 md:flex-row md:items-start md:justify-between md:gap-0">

          {/* Col 1: Logo */}
          <div className="flex items-center gap-3">
            <Image src="/logo.svg" alt="Вайб" width={30} height={50} />
            <span className="text-white font-bold text-xl leading-tight">Вайб</span>
          </div>

          {/* Col 2: Contact */}
          <div className="flex flex-col items-center gap-1 md:items-start">
            <p className="text-base leading-6 text-[#F4F4F5]">+380 969998283</p>
            <p className="text-sm leading-5 text-[#E8E9EA]">info@vibe.com</p>
          </div>

          {/* Col 3: Nav links — desktop only */}
          <nav aria-label="Footer navigation" className="hidden md:flex flex-col gap-1">
            <a href="#" className="text-sm leading-5 text-[#E8E9EA] hover:text-white transition-colors">
              Про нас
            </a>
            <a href="#" className="text-sm leading-5 text-[#E8E9EA] hover:text-white transition-colors">
              Блог
            </a>
          </nav>

          {/* Col 4: Social icons */}
          <div className="flex items-center gap-8 md:gap-4">
            <a
              href="https://facebook.com"
              aria-label="Facebook"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center p-3 rounded-full border-2 border-[#565C66] bg-[#333A47]"
            >
              <FiFacebook size={20} color="#E8E9EA" aria-hidden="true" />
            </a>
            <a
              href="https://instagram.com"
              aria-label="Instagram"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center p-3 rounded-full border-2 border-[#565C66] bg-[#333A47]"
            >
              <FaInstagram size={20} color="#E8E9EA" aria-hidden="true" />
            </a>
            <a
              href="https://youtube.com"
              aria-label="Youtube"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center p-3 rounded-full border-2 border-[#565C66] bg-[#333A47]"
            >
              <FiYoutube size={20} color="#E8E9EA" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom strip */}
      <div className="w-full bg-[#242C39] py-3 px-6">
        {/* Mobile: centered | Desktop: space-between */}
        <div className="flex flex-col items-center gap-1 md:flex-row md:justify-between md:gap-0">
          <p className="text-xs leading-4 text-[#A5A8AD]">
            © 2025 Вайб. Всі права захищені.
          </p>
          <p className="text-xs leading-4 text-[#A5A8AD]">
            Політика конфіденційності
          </p>
          <a href="#" className="hidden md:block text-xs leading-4 text-[#A5A8AD] hover:text-white transition-colors">
            Мобільна версія
          </a>
        </div>
      </div>
    </footer>
  );
}
