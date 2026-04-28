import Image from 'next/image'

export default function Logo() {
    return (
        <div className="ui-logo-lockup">
            <Image src="/logo.svg" alt="Вайб" width={30} height={50} priority />
            <span className="ui-logo-text">
                Вайб
            </span>
        </div>
    )
}