import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNav from '@/components/layout/BottomNav'
import AuthSessionProvider from '@/components/auth/AuthSessionProvider'
import WishlistAuthBridge from '@/components/wishlist/WishlistAuthBridge'
import { getCurrentUser } from '@/lib/session/getSession'
import { VisitorProvider } from '@/components/providers/VisitorProvider'
import WebSiteJsonLd from '@/components/seo/WebSiteJsonLd'
import { getCachedGlobalSeo, getCachedWebsiteJsonLd } from '@/app/_lib/seo.data'
import { buildHomeMetadata, getSeoBaseUrl } from '@/lib/seo/metadata'
import './globals.css'

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getCachedGlobalSeo()
  const metadata = buildHomeMetadata(seo)

  return {
    ...metadata,
    metadataBase: new URL(getSeoBaseUrl()),
    applicationName: 'Marketplace',
    openGraph: {
      ...metadata.openGraph,
      siteName: 'Marketplace',
    },
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const currentUser = await getCurrentUser()
  const websiteJsonLd = await getCachedWebsiteJsonLd()

  return (
    <html
      lang="uk"
      className="h-full antialiased"
    >
      <body
        suppressHydrationWarning
        className="min-h-screen bg-canvas"
      >
        <WebSiteJsonLd data={websiteJsonLd} />
        <AuthSessionProvider initialUser={currentUser}>
          <VisitorProvider />
          <WishlistAuthBridge />

          <div className="flex min-h-screen flex-col">
            <Header />

            {/* pb-20 reserves space for BottomNav */}
            <main className="ui-container flex-1">
              {children}
            </main>

            <Footer />
            <BottomNav />

            <Toaster
              position="bottom-center"
              toastOptions={{
                style: {
                  background: '#2A323F',
                  color: '#E8E9EA',
                  border: '1px solid rgba(255,255,255,0.1)',
                },
              }}
            />
          </div>
        </AuthSessionProvider>
      </body>
    </html>
  )
}
