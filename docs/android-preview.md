# JJXCAPITAL Android preview

JJXCAPITAL is a React web app. Capacitor provides the Android shell while keeping the web app and Firebase data model.

## Preview app identity

The Android Preview build is intentionally separate from the installed production app:

- Production package: `com.jjxcapital.app`
- Preview package: `com.jjxcapital.preview`
- Preview launcher name: `JJXCAPITAL Preview`

Do not change the production app's package, uninstall it, or install a Preview build with the production package.

## Automated APK build on GitHub

The workflow `.github/workflows/android-preview-apk.yml` builds a Preview debug APK in GitHub Actions. It runs only for the `feat/android-capacitor-preview` branch (or when manually started from that branch); it does not build or publish Production.

The workflow generates the native `android/` project in the GitHub Actions runner from the checked-in Capacitor configuration. The generated project and APK are build outputs, not committed source files.

Before the first build, add a repository Actions secret:

1. Open the Firebase Preview project and register an Android app with package name `com.jjxcapital.preview`.
2. Download that app's `google-services.json`.
3. In GitHub, open Settings → Secrets and variables → Actions → New repository secret.
4. Name it exactly `FIREBASE_PREVIEW_GOOGLE_SERVICES_JSON`.
5. Paste the complete contents of the Preview `google-services.json` file as the secret value. Never commit this file or use the Production Firebase configuration.

After saving the secret, the next push affecting the Preview app or this workflow on `feat/android-capacitor-preview` starts the build automatically. Open Actions → JJXCAPITAL Preview APK, select the latest successful run, and download the artifact named `JJXCAPITAL-Preview-debug`. The APK is a debug build for testing, not a Play Store release.

## Firebase setup (required for native Google sign-in)

Use the dedicated Firebase Preview project, not the production Firebase project.

1. In Firebase Console, open the Preview project and add a separate Android app with package name `com.jjxcapital.preview`.
2. Enable Google under Authentication → Sign-in method.
3. Add the Android app's SHA-1 certificate fingerprint in Firebase project settings. For a local debug build, Android Studio/Gradle can show the debug signing report. For GitHub Actions debug signing, obtain the SHA-1 from the generated debug keystore/build environment before relying on native Google sign-in.
4. The workflow writes the secret to `android/app/google-services.json` during the build. The existing JSON for `com.jjxcapital.app` is not valid for this Preview package.
5. For a Google Play release, add the Play App Signing SHA-1 as a separate fingerprint and download the refreshed configuration file.

Never connect real Binance or Bybit API credentials to Preview. Do not point an unreviewed mobile build at production data.

## Generate and open the Android project locally

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

## Production separation

Production remains on `main` with package `com.jjxcapital.app`. This Preview workflow cannot run from `main`, does not sign a Production APK, does not deploy to Google Play, and does not merge PR #28. A separate protected Production workflow will be designed only after Preview has been built and tested.

## Current scope

This is an Android Preview build pipeline. Before Play Store release, the Pro subscription flow needs a billing-policy review: Google Play generally requires Play Billing for digital app features and subscriptions.
