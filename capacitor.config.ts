import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.jjxcapital.app",
  appName: "JJXCAPITAL",
  webDir: "build",
  bundledWebRuntime: false,
  plugins: {
    FirebaseAuthentication: {
      providers: ["google.com"],
    },
  },
};

export default config;
