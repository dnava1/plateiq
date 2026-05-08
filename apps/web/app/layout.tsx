import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import { Geist_Mono, Manrope } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'
import { Providers } from './providers'
import { DeferredClientChrome } from '@/components/layout/DeferredClientChrome'

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  applicationName: 'PlateIQ',
  title: 'Strength Tracker | PlateIQ',
  description:
    'Track any strength program with analytics and AI insights. Supports 15+ programs including 5/3/1, Starting Strength, nSuns, and more.',
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PlateIQ',
  },
  icons: {
    icon: [
      {
        url: '/favicon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: '/favicon-light-16x16.png',
        media: '(prefers-color-scheme: light)',
        sizes: '16x16',
        type: 'image/png',
      },
      {
        url: '/favicon-32x32.png',
        media: '(prefers-color-scheme: dark)',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: '/favicon-16x16.png',
        media: '(prefers-color-scheme: dark)',
        sizes: '16x16',
        type: 'image/png',
      },
    ],
    shortcut: '/favicon.ico',
    apple: [
      {
        url: '/apple-touch-icon-light.png',
        media: '(prefers-color-scheme: light)',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        url: '/apple-touch-icon-dark.png',
        media: '(prefers-color-scheme: dark)',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        url: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafc' },
    { media: '(prefers-color-scheme: dark)', color: '#06070a' },
  ],
  colorScheme: 'dark light',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

type StoredThemePreference = 'dark' | 'light' | 'system'

function isStoredThemePreference(value: string | undefined): value is StoredThemePreference {
  return value === 'dark' || value === 'light' || value === 'system'
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const storedThemeCookie = cookieStore.get('plateiq-theme')?.value
  const storedThemePreference = isStoredThemePreference(storedThemeCookie)
    ? storedThemeCookie
    : 'system'
  const isVercelProduction = process.env.VERCEL_ENV === 'production'
  const renderDarkTheme = storedThemePreference === 'dark'
  const renderLightTheme = storedThemePreference === 'light'

  return (
    <html
      lang="en"
      className={`${manrope.variable} ${geistMono.variable} ${renderDarkTheme ? 'dark' : ''}`}
      suppressHydrationWarning
      style={{
        backgroundColor: renderDarkTheme ? '#06070a' : renderLightTheme ? '#fafafc' : undefined,
        colorScheme: renderDarkTheme ? 'dark' : renderLightTheme ? 'light' : undefined,
      }}
    >
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html {
                background: #fafafc;
              }

              @media (prefers-color-scheme: dark) {
                html {
                  background: #06070a;
                  color-scheme: dark;
                }
              }

              #plateiq-pwa-boot-splash {
                position: fixed;
                inset: 0;
                z-index: 2147483647;
                display: none;
                align-items: center;
                justify-content: center;
                background: #fafafc;
                opacity: 0;
                pointer-events: none;
                transition: opacity 180ms ease;
              }

              #plateiq-pwa-boot-splash .plateiq-pwa-boot-splash__mark {
                position: relative;
                width: 96px;
                height: 96px;
              }

              #plateiq-pwa-boot-splash .plateiq-pwa-boot-splash__mark img {
                position: absolute;
                inset: 0;
                margin: auto;
              }

              @media (prefers-color-scheme: dark) {
                #plateiq-pwa-boot-splash {
                  background: #06070a;
                }

                #plateiq-pwa-boot-splash .plateiq-pwa-boot-logo--light {
                  display: none;
                }

                #plateiq-pwa-boot-splash .plateiq-pwa-boot-logo--dark {
                  display: block;
                }
              }

              html.dark #plateiq-pwa-boot-splash {
                background: #06070a;
              }

              html[data-pwa-boot='active'] #plateiq-pwa-boot-splash,
              html[data-pwa-boot='done'] #plateiq-pwa-boot-splash {
                display: flex;
              }

              html[data-pwa-boot='active'] #plateiq-pwa-boot-splash {
                opacity: 1;
                pointer-events: auto;
              }

              html[data-pwa-boot='done'] #plateiq-pwa-boot-splash {
                opacity: 0;
              }

              #plateiq-pwa-boot-splash img {
                width: 88px;
                height: 88px;
                user-select: none;
                -webkit-user-drag: none;
              }

              #plateiq-pwa-boot-splash .plateiq-pwa-boot-logo--dark {
                display: none;
              }

              html.dark #plateiq-pwa-boot-splash .plateiq-pwa-boot-logo--light {
                display: none;
              }

              html.dark #plateiq-pwa-boot-splash .plateiq-pwa-boot-logo--dark {
                display: block;
              }

              @media (prefers-reduced-motion: reduce) {
                #plateiq-pwa-boot-splash {
                  transition: none;
                }
              }
            `,
          }}
        />
        <script
          id="plateiq-theme-init"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=JSON.parse(localStorage.getItem('plateiq-ui'));var t=s&&s.state&&s.state.theme?s.state.theme:'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';document.documentElement.style.backgroundColor=d?'#06070a':'#fafafc';}catch(e){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';document.documentElement.style.backgroundColor='#06070a';}})();`,
          }}
        />
        <script
          id="plateiq-pwa-boot-init"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var standalone=(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||window.navigator.standalone===true;if(!standalone){return;}var root=document.documentElement;root.setAttribute('data-pwa-boot','active');var dismiss=function(){if(root.getAttribute('data-pwa-boot')!=='active'){return;}root.setAttribute('data-pwa-boot','done');window.setTimeout(function(){if(root.getAttribute('data-pwa-boot')==='done'){root.removeAttribute('data-pwa-boot');}},220);};window.addEventListener('load',function(){window.requestAnimationFrame(dismiss);},{once:true});window.addEventListener('pageshow',function(){window.requestAnimationFrame(dismiss);},{once:true});}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <div id="plateiq-pwa-boot-splash" aria-hidden="true">
          <div className="plateiq-pwa-boot-splash__mark">
            {/* eslint-disable-next-line @next/next/no-img-element -- raw img paints sooner than next/image for the standalone boot splash */}
            <img
              className="plateiq-pwa-boot-logo--light"
              src="/icons/plateiq-mark-dark.svg"
              alt=""
              width="88"
              height="88"
              draggable="false"
              fetchPriority="high"
            />
            {/* eslint-disable-next-line @next/next/no-img-element -- raw img paints sooner than next/image for the standalone boot splash */}
            <img
              className="plateiq-pwa-boot-logo--dark"
              src="/icons/plateiq-mark-light.svg"
              alt=""
              width="88"
              height="88"
              draggable="false"
              fetchPriority="high"
            />
          </div>
        </div>
        <Providers>{children}</Providers>
        <DeferredClientChrome />
        {isVercelProduction ? (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        ) : null}
      </body>
    </html>
  )
}
