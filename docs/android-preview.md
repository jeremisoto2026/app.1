# JJXCAPITAL Android preview

JJXCAPITAL is a React web app. Capacitor provides the Android shell while keeping the web app and Firebase data model.

## Preview app identity

The Android Preview build is intentionally separate from the installed production app:

- Production package: `com.jjxcapital.app`
- Preview package: `com.jjxcapital.preview`
- Preview launcher name: `JJXCAPITAL Preview`

Do not change the production app's package, uninstall it, or install a Preview build with the production package.

## Requirements

- Node.js 22 or newer
- Yarn 1.22.22
- Android Studio with Android SDK API 24 or newer

## Firebase setup (required for native Google sign-in)

Use the dedicated Firebase Preview project, not the production Firebase project.

1. In Firebase Console, open the Preview project and add a separate Android app with package name `com.jjxcapital.preview`.
2. Enable Google under Authentication → Sign-in method.
3. Add the Android app's SHA-1 certificate fingerprint in Firebase project settings. For a local debug build, Android Studio/Gradle can show the debug signing report.
4. Download the configuration for the `com.jjxcapital.preview` Android app and place it at `android/app/google-services.json`. The existing JSON for `com.jjxcapital.app` is not valid for this Preview package. Keep the JSON out of Git.
5. For a Google Play release, add the Play App Signing SHA-1 as a separate fingerprint and download the refreshed configuration file.

Never connect real Binance or Bybit API credentials to Preview. Do not point an unreviewed mobile build at production data.

## Generate and open the Android project

From the repository root on branch `feat/android-capacitor-preview`:

```sh
yarn install
yarn build
npx cap add android
```

If the local `android/` directory already exists, do not run `npx cap add android` again. Instead, open `android/app/build.gradle` and set the `applicationId` inside `defaultConfig` to:

```gradle
applicationId "com.jjxcapital.preview"
```

This applicationId is essential: it allows Preview and Production to remain installed side by side. Do not change the production application's Gradle configuration.

In `android/variables.gradle`, add these entries inside the `ext { ... }` block, as required by the Firebase Authentication plugin:

```gradle
rgcfaIncludeGoogle = true
androidxCredentialsVersion = '1.3.0'
```

Place the matching Preview `google-services.json` at `android/app/google-services.json`, then run:

```sh
npx cap sync android
npx cap open android
```

Use Android Studio to build and install the debug APK on the test phone. Confirm the launcher label is `JJXCAPITAL Preview` and that the existing `JJXCAPITAL` production app remains installed. After web changes, run `yarn android:sync` before rebuilding.

## Current scope

This is a private Android preview scaffold. It does not publish to Google Play or change the production website. Before Play Store release, the Pro subscription flow needs a billing-policy review: Google Play generally requires Play Billing for digital app features and subscriptions.
