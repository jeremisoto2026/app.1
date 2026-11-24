# JJXCAPITAL Android preview

JJXCAPITAL is a React web app. Capacitor provides the Android shell while keeping the web app and Firebase data model.

## Requirements

- Node.js 22 or newer
- Yarn 1.22.22
- Android Studio with Android SDK API 24 or newer

## Firebase setup (required for native Google sign-in)

1. In Firebase Console, add an Android app to the same Firebase project used by the intended Preview environment. Use package name `com.jjxcapital.app`.
2. Enable Google under Authentication → Sign-in method.
3. Add the Android app's SHA-1 certificate fingerprint in Firebase project settings. For a local debug build, Android Studio/Gradle can show the debug signing report.
4. Download that app's `google-services.json` and place it at `android/app/google-services.json`. Keep it out of Git.
5. For a production release from Google Play, add the Play App Signing SHA-1 as a separate fingerprint and download the refreshed configuration file.

Use a dedicated Firebase Preview project for pre-release testing. Do not point an unreviewed mobile build at production data.

## Generate and open the Android project

From the repository root:

```sh
yarn install
yarn build
npx cap add android
```

In `android/variables.gradle`, add these entries inside the `ext { ... }` block, as required by the Firebase Authentication plugin:

```gradle
rgcfaIncludeGoogle = true
androidxCredentialsVersion = '1.3.0'
```

Then place `google-services.json` at `android/app/google-services.json`, and run:

```sh
npx cap sync android
npx cap open android
```

Use Android Studio to build and install the debug APK on a test phone. After web changes, run `yarn android:sync` before rebuilding.

## Current scope

This is a private Android preview scaffold. It does not publish to Google Play or change the production website. Before Play Store release, the Pro subscription flow needs a billing-policy review: Google Play generally requires Play Billing for digital app features and subscriptions.
