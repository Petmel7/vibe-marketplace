import Image from "next/image";
import { FiFacebook, FiYoutube } from "react-icons/fi";
import { FaInstagram } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="w-full bg-canvas">
      <div className="px-6 py-8">
        <div className="flex flex-col items-center gap-8 md:flex-row md:items-start md:justify-between md:gap-0">
          <div className="ui-logo-lockup">
            <Image src="/logo.svg" alt="Вайб" width={30} height={50} />
            <span className="ui-logo-text">Вайб</span>
          </div>

          <div className="flex flex-col items-center gap-1 md:items-start">
            <p className="text-base leading-6 text-[#F4F4F5]">+380 969998283</p>
            <p className="text-sm leading-5 text-copy-primary">info@vibe.com</p>
          </div>

          <nav aria-label="Footer navigation" className="hidden md:flex flex-col gap-1">
            <a href="#" className="ui-link-muted">
              Про нас
            </a>
            <a href="#" className="ui-link-muted">
              Блог
            </a>
          </nav>

          <div className="flex items-center gap-8 md:gap-4">
            <a href="https://facebook.com" aria-label="Facebook" target="_blank" rel="noopener noreferrer" className="ui-social-link">
              <FiFacebook size={20} color="#E8E9EA" aria-hidden="true" />
            </a>
            <a href="https://instagram.com" aria-label="Instagram" target="_blank" rel="noopener noreferrer" className="ui-social-link">
              <FaInstagram size={20} color="#E8E9EA" aria-hidden="true" />
            </a>
            <a href="https://youtube.com" aria-label="Youtube" target="_blank" rel="noopener noreferrer" className="ui-social-link">
              <FiYoutube size={20} color="#E8E9EA" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      <div className="w-full bg-panelMuted px-6 py-3">
        <div className="flex flex-col items-center gap-1 md:flex-row md:justify-between md:gap-0">
          <p className="text-xs leading-4 text-copy-muted">
            © 2025 Вайб. Всі права захищені.
          </p>
          <p className="text-xs leading-4 text-copy-muted">
            Політика конфіденційності
          </p>
          <a href="#" className="hidden text-xs leading-4 text-copy-muted transition-colors hover:text-copy-strong md:block">
            Мобільна версія
          </a>
        </div>
      </div>
    </footer>
  );
}
