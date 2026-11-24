import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.jjxcapital.preview",
  appName: "JJXCAPITAL Preview",
  webDir: "build",
  bundledWebRuntime: false,
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    FirebaseAuthentication: {
      providers: ["google.com"],
    },
  },
};

export default config;
