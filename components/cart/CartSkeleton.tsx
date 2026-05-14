import { PageContainer } from '@/components/layout/PageContainer'

export default function CartSkeleton() {
    return (
        <PageContainer className="animate-pulse">
            <div className="h-5 w-36 rounded bg-panel" />
            <div className="h-8 w-52 rounded bg-panel" />
            {[0, 1].map((i) => (
                <div key={i} className="flex gap-3 border-b border-panelBorder py-4">
                    <div className="h-33 w-33 rounded-xl bg-panel" />
                    <div className="flex-1 space-y-2">
                        <div className="h-5 w-3/4 rounded bg-panel" />
                        <div className="h-4 w-1/2 rounded bg-panel" />
                        <div className="h-8 w-29 rounded-2xl bg-panel" />
                    </div>
                </div>
            ))}
        </PageContainer>
    )
}