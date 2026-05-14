import { PageContainer } from "../layout/PageContainer"

export default function WishlistSkeleton() {
    return (
        <PageContainer className='animate-pulse space-y-4'>
            <div className="h-5 w-36 rounded bg-panel" />
            <div className="h-8 w-52 rounded bg-panel" />
            {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3 py-4 border-b border-panelBorder">
                    <div className="w-33 h-33 rounded-xl bg-panel shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-5 w-3/4 rounded bg-panel" />
                        <div className="h-4 w-1/3 rounded bg-panel" />
                    </div>
                </div>
            ))}
        </PageContainer>
    )
}