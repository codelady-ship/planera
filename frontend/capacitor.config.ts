import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Android and iOS shells (#64): the app is the production site loaded in a
 * native WebView, with the native bridge (local notifications, alarm) on
 * top. CAPACITOR_SERVER_URL points a build at a preview or local site.
 */
const config: CapacitorConfig = {
  appId: 'az.planera.app',
  appName: 'Planera',
  // Only the offline placeholder lives here; the real pages come from server.url.
  webDir: 'capacitor/www',
  server: {
    url: process.env.CAPACITOR_SERVER_URL ?? 'https://planera-az.vercel.app',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#f4f7fb',
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#f4f7fb',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_planera',
      iconColor: '#072968',
    },
  },
}

export default config
