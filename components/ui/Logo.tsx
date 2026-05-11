import Image from 'next/image'
import Link from 'next/link'

export default function Logo() {
    return (
        <Link href="/">
            <div className="ui-logo-lockup">
                <Image src="/logo.svg" alt="Вайб" width={30} height={50} priority />
                <span className="ui-logo-text">
                    Вайб
                </span>
            </div>
        </Link>
    )
}