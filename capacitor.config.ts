import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.sikomputer.app',
  appName: 'SiKomputer',
  webDir: 'dist-mobile',
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#0B0F17',
    allowMixedContent: true,
  },
}

export default config
