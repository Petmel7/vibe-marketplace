import Link from "next/link";
import clsx from "clsx";

type ButtonProps = {
    href: string;
    children: React.ReactNode;
    variant?: "primary" | "secondary";
    size?: "sm" | "md" | "lg";
    fullWidth?: boolean;
    className?: string;
};

export function Button({
    href,
    children,
    variant = "primary",
    size = "md",
    fullWidth,
    className,
}: ButtonProps) {
    return (
        <Link
            href={href}
            className={clsx(
                "ui-btn",
                `ui-btn-${variant}`,
                `ui-btn-${size}`,
                fullWidth && "w-full",
                className
            )}
        >
            {children}
        </Link>
    );
}