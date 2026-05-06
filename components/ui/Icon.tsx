'use client'

import clsx from 'clsx'

type IconProps = {
    src?: string | null
    size?: number
    className?: string
}

export default function Icon({
    src,
    size = 20,
    className,
}: IconProps) {
    const url = src && src.trim() !== '' ? src : '/placeholder.png'

    return (
        <span
            className={clsx('inline-block shrink-0 bg-current', className)}
            style={{
                width: size,
                height: size,
                WebkitMaskImage: `url(${url})`,
                maskImage: `url(${url})`,
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskSize: 'contain',
                maskSize: 'contain',
                WebkitMaskPosition: 'center',
                maskPosition: 'center',
            }}
        />
    )
}