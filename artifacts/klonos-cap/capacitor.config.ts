import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.klonos.zerolag",
  appName: "ZeroLag",

  // Web assets come from ClonEngine's production build
  webDir: "../clonengine/dist",

  android: {
    buildOptions: {
      releaseType: "APK",
    },
  },

  plugins: {
    // KlonOS Corpus Callosum native plugin
    KlonosCallosum: {
      // Plugin config (picked up by Kotlin @CapacitorPlugin)
    },
  },

  server: {
    // In development, point to the running ClonEngine Vite dev server
    // so Hot Module Replacement works via `cap run android --livereload`
    url: process.env["CAPACITOR_LIVE_URL"] ?? undefined,
    cleartext: true,
    androidScheme: "https",
  },
};

export default config;
