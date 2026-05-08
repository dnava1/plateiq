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
              html,
              body {
                min-height: 100%;
                background: #fafafc;
              }

              @media (prefers-color-scheme: dark) {
                html,
                body {
                  background: #06070a;
                  color-scheme: dark;
                }
              }

              #plateiq-pwa-boot-splash {
                position: fixed;
                inset: 0;
                z-index: 2147483647;
                box-sizing: border-box;
                display: none;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                min-height: 100svh;
                min-height: 100dvh;
                padding: 2rem 1rem;
                background: #fafafc;
                opacity: 0;
                pointer-events: none;
                transition: opacity 180ms ease;
              }

              #plateiq-pwa-boot-splash *,
              #plateiq-pwa-boot-splash *::before,
              #plateiq-pwa-boot-splash *::after {
                box-sizing: border-box;
              }

              #plateiq-pwa-boot-splash .plateiq-pwa-boot-card {
                width: min(100%, 36rem);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1.25rem;
                padding: 2rem 1.5rem;
                border: 1px solid rgba(209, 213, 219, 0.7);
                border-radius: 28px;
                background: rgba(255, 255, 255, 0.88);
                color: #303038;
                text-align: center;
                box-shadow: 0 18px 48px -24px rgba(15, 23, 42, 0.18), 0 8px 20px -12px rgba(15, 23, 42, 0.1);
                backdrop-filter: blur(24px);
              }

              #plateiq-pwa-boot-splash .plateiq-pwa-boot-mark-frame {
                position: relative;
                display: grid;
                width: 7rem;
                height: 7rem;
                place-items: center;
                overflow: hidden;
                border: 1px solid rgba(209, 213, 219, 0.7);
                border-radius: 36px;
                background: rgba(250, 250, 252, 0.8);
                box-shadow: 0 28px 80px -40px rgba(15, 23, 42, 0.45);
              }

              #plateiq-pwa-boot-splash .plateiq-pwa-boot-mark-glow {
                position: absolute;
                inset: 0.75rem;
                border-radius: 28px;
                background: rgba(245, 132, 35, 0.08);
                filter: blur(28px);
              }

              #plateiq-pwa-boot-splash .plateiq-pwa-boot-mark-sheen {
                position: absolute;
                inset: 1rem;
                border: 1px solid rgba(255, 255, 255, 0.65);
                border-radius: 28px;
                background: linear-gradient(180deg, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.45), rgba(255, 255, 255, 0.1));
              }

              #plateiq-pwa-boot-splash .plateiq-pwa-boot-splash__mark {
                position: relative;
                width: 5rem;
                height: 5rem;
              }

              #plateiq-pwa-boot-splash .plateiq-pwa-boot-splash__mark img {
                position: absolute;
                inset: 0;
                margin: auto;
              }

              #plateiq-pwa-boot-splash .plateiq-pwa-boot-title-stack {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.5rem;
              }

              #plateiq-pwa-boot-splash .plateiq-pwa-boot-title {
                margin: 0;
                font-family: var(--font-manrope), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                font-size: 1.875rem;
                font-weight: 600;
                line-height: 1.15;
                letter-spacing: 0;
              }

              #plateiq-pwa-boot-splash .plateiq-pwa-boot-spinner-slot {
                display: grid;
                height: 1.5rem;
                place-items: center;
                opacity: 0;
                transition: opacity 180ms ease;
              }

              html[data-pwa-boot-slow='true'] #plateiq-pwa-boot-splash .plateiq-pwa-boot-spinner-slot {
                opacity: 1;
              }

              #plateiq-pwa-boot-splash .plateiq-pwa-boot-spinner {
                width: 1.25rem;
                height: 1.25rem;
                border: 2px solid rgba(82, 82, 91, 0.24);
                border-top-color: rgba(82, 82, 91, 0.82);
                border-radius: 999px;
                animation: plateiq-pwa-boot-spin 2.2s linear infinite;
              }

              @media (prefers-color-scheme: dark) {
                #plateiq-pwa-boot-splash {
                  background: #06070a;
                }

                #plateiq-pwa-boot-splash .plateiq-pwa-boot-card {
                  border-color: rgba(255, 255, 255, 0.09);
                  background: rgba(19, 20, 24, 0.86);
                  color: #f5f5f7;
                  box-shadow: 0 20px 52px -24px rgba(0, 0, 0, 0.4), 0 8px 22px -12px rgba(0, 0, 0, 0.24);
                }

                #plateiq-pwa-boot-splash .plateiq-pwa-boot-mark-frame {
                  border-color: rgba(255, 255, 255, 0.1);
                  background: rgba(19, 20, 24, 0.8);
                  box-shadow: 0 28px 80px -40px rgba(0, 0, 0, 0.85);
                }

                #plateiq-pwa-boot-splash .plateiq-pwa-boot-mark-glow {
                  background: rgba(245, 132, 35, 0.12);
                }

                #plateiq-pwa-boot-splash .plateiq-pwa-boot-mark-sheen {
                  border-color: rgba(255, 255, 255, 0.1);
                  background: linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05), transparent);
                }

                #plateiq-pwa-boot-splash .plateiq-pwa-boot-spinner {
                  border-color: rgba(212, 212, 216, 0.24);
                  border-top-color: rgba(212, 212, 216, 0.86);
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
                width: 5rem;
                height: 5rem;
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
                #plateiq-pwa-boot-splash,
                #plateiq-pwa-boot-splash .plateiq-pwa-boot-spinner-slot {
                  transition: none;
                }

                #plateiq-pwa-boot-splash .plateiq-pwa-boot-spinner {
                  animation: none;
                }
              }

              @media (display-mode: standalone) {
                #plateiq-pwa-boot-splash {
                  min-height: 100lvh;
                }
              }

              @media (min-width: 640px) {
                #plateiq-pwa-boot-splash .plateiq-pwa-boot-card {
                  padding: 2.5rem 2rem;
                }

                #plateiq-pwa-boot-splash .plateiq-pwa-boot-title {
                  font-size: 2.15rem;
                }
              }

              @keyframes plateiq-pwa-boot-spin {
                to {
                  transform: rotate(360deg);
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
            __html: `(function(){try{var standalone=(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||window.navigator.standalone===true;if(!standalone){return;}var root=document.documentElement;root.setAttribute('data-pwa-boot','active');var slowTimer=window.setTimeout(function(){if(root.getAttribute('data-pwa-boot')==='active'){root.setAttribute('data-pwa-boot-slow','true');}},2000);var dismiss=function(){if(root.getAttribute('data-pwa-boot')!=='active'){return;}window.clearTimeout(slowTimer);root.removeAttribute('data-pwa-boot-slow');root.setAttribute('data-pwa-boot','done');window.setTimeout(function(){if(root.getAttribute('data-pwa-boot')==='done'){root.removeAttribute('data-pwa-boot');}},220);};window.addEventListener('load',function(){window.requestAnimationFrame(dismiss);},{once:true});window.addEventListener('pageshow',function(){window.requestAnimationFrame(dismiss);},{once:true});}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <div id="plateiq-pwa-boot-splash" aria-hidden="true">
          <div className="plateiq-pwa-boot-card">
            <div className="plateiq-pwa-boot-mark-frame">
              <div className="plateiq-pwa-boot-mark-glow" />
              <div className="plateiq-pwa-boot-mark-sheen" />
              <div className="plateiq-pwa-boot-splash__mark">
                {/* eslint-disable-next-line @next/next/no-img-element -- raw img paints sooner than next/image for the standalone boot splash */}
                <img
                  className="plateiq-pwa-boot-logo--light"
                  src="/icons/plateiq-mark-light.svg"
                  alt=""
                  width="80"
                  height="80"
                  decoding="sync"
                  draggable="false"
                  fetchPriority="high"
                />
                {/* eslint-disable-next-line @next/next/no-img-element -- raw img paints sooner than next/image for the standalone boot splash */}
                <img
                  className="plateiq-pwa-boot-logo--dark"
                  src="/icons/plateiq-mark-dark.svg"
                  alt=""
                  width="80"
                  height="80"
                  decoding="sync"
                  draggable="false"
                  fetchPriority="high"
                />
              </div>
            </div>
            <div className="plateiq-pwa-boot-title-stack">
              <p className="plateiq-pwa-boot-title">PlateIQ</p>
              <div className="plateiq-pwa-boot-spinner-slot">
                <div className="plateiq-pwa-boot-spinner" />
              </div>
            </div>
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
