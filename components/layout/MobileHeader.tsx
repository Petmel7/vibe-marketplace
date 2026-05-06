import { CircleUser, Search } from 'lucide-react'
import HeaderIconButton from './HeaderIconButton'
import Logo from '../ui/Logo'

export default function MobileHeader({ onSearch }: { onSearch: () => void }) {
    return (
        <>
            <div className="flex flex-1 items-center gap-3">
                <Logo />
            </div>

            <nav className="flex items-center gap-5">
                <HeaderIconButton label="Пошук" onClick={onSearch}>
                    <Search size={24} color="#E8E9EA" />
                </HeaderIconButton>

                <HeaderIconButton label="Профіль користувача">
                    <CircleUser size={24} color="#E8E9EA" />
                </HeaderIconButton>
            </nav>
        </>
    )
}