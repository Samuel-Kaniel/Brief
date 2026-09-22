# App Store checklist

This release targets the **iOS App Store** only: App Store Connect, TestFlight, and App Review.

`android.package` is `com.samuelkaniel.brief` so the Expo config has the same id on both platforms. There is no Play Console app, Data safety form, or Play submit step in this checklist.

Do not invent an Expo project UUID, an Apple Team ID, or App Store Connect credentials. Do not commit secrets (`.p8` / `.p12` files, ASC API keys, or `EXPO_TOKEN`).

## Already configured

| Field | Value |
| --- | --- |
| `expo.version` | `1.0.0` |
| `ios.bundleIdentifier` | `com.samuelkaniel.brief` |
| `ios.buildNumber` | `"1"` (`CFBundleVersion`) |
| `ios.config.usesNonExemptEncryption` | `false` |
| `ios.infoPlist.ITSAppUsesNonExemptEncryption` | `false` |
| `android.package` | `com.samuelkaniel.brief` (Expo consistency; not a Play release) |
| `eas.json` `build.production` | channel `production` (unchanged) |
| `eas.json` `submit.production` | `{}` on purpose — see [Submit to TestFlight](#5-submit-to-testflight) |
| `extra.privacyPolicyUrl` / `extra.supportUrl` | empty until real URLs exist |
| `extra.eas.projectId` | intentionally absent |

`eas.json` sets `cli.appVersionSource` to `local`, so EAS Build uses `expo.version` and `ios.buildNumber` from `app.json`. Bump `ios.buildNumber` (string) for every binary you upload. Bump `expo.version` when the user-facing version changes. `runtimeVersion.policy` is `appVersion`, so a version bump also starts a new OTA runtime.

Encryption is standard HTTPS only (RSS and article pages). `false` writes `ITSAppUsesNonExemptEncryption` and tells Apple the app does not use non-exempt encryption. Confirm that same answer on the build in App Store Connect.

## Notification plist

[Expo SDK 57 `expo-notifications`](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/) says iOS does not require a usage-description string. The permission dialog is the system prompt from `requestPermissionsAsync` in `src/services/notifications.ts`. The config plugin does not set `NSUserNotificationsUsageDescription`, and Apple does not require that key for local notifications, so it is not in `Info.plist`.

Leave `enableBackgroundRemoteNotifications` unset. That flag adds `UIBackgroundModes` → `remote-notification`. Brief schedules a daily digest on the device and has no remote push server.

The plugin still adds the `aps-environment` entitlement (Expo's default; Xcode switches a release archive to production). Say in the review notes that the app does not send remote push.

## Manual steps

### 1. Accounts

- Enroll in the [Apple Developer Program](https://developer.apple.com/programs/) (paid membership). A free Apple ID cannot create an App Store Connect record.
- Use an Expo account you control (`npx eas-cli@latest login`).

### 2. Host the privacy policy and support page

App Store Connect requires a **Support URL**. Host a **privacy policy** as well: the app stores preferences and saved stories on device and fetches third-party RSS, and App Privacy asks you to describe that.

Host real public HTTPS pages, then paste the URLs into:

- `expo.extra.privacyPolicyUrl`
- `expo.extra.supportUrl`
- App Store Connect → the app → App Information (privacy policy) and the version's Support URL

Clear `extra.storeListingTodo` once both URLs are real. Leave the extra values as empty strings until those pages exist. Do not invent a domain.

Facts the policy should match (do not claim analytics or accounts the app does not have):

- No user account and no sign-in.
- Topic choices, digest time, saved stories, and skip state stay in on-device storage.
- Headlines come from public RSS feeds. The app also requests article pages when it needs an `og:image`.
- The daily digest is a local notification. No push token is sent to a Brief server.
- There is no Brief backend account to delete.

**Terms:** Apple's standard EULA is enough. Add a custom terms URL in App Store Connect only after you host one. Do not put a fake terms URL in `app.json`.

### 3. App Store Connect app record

1. Register the App ID `com.samuelkaniel.brief` (or let the first `eas build` register it).
2. In App Store Connect, create the iOS app with that bundle ID.
3. On **App Information**, copy the numeric **Apple ID**. That value is `ascAppId`. It does not exist until this record exists. Do not guess it, and do not guess `appleTeamId`.

`ios.supportsTablet` is `true`, so the version needs iPhone and iPad screenshots.

### 4. Link Expo and build the iOS binary

From the repo root:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --platform ios --profile production
```

`eas init` writes `expo.extra.eas.projectId`. Commit that real UUID. Do not paste a made-up one.

The first iOS build is interactive: EAS creates the distribution certificate and provisioning profile and stores them on Expo's servers. `.eas/workflows/create-production-builds.yml` does not generate those credentials. Do not commit the certificate or the profile.

`eas update:configure` (OTA) is separate and still optional; see the README.

### 5. Submit to TestFlight

`submit.production` stays `{}` until App Store Connect has issued an app id. After step 3, the only store id that belongs in git is that numeric id:

```json
{
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "<Apple ID from App Store Connect → App Information>"
      }
    }
  }
}
```

Leave `appleTeamId`, `appleId`, and ASC API key paths out of the repo.

Configure the ASC API key on your machine (not in git):

```bash
npx eas-cli@latest credentials --platform ios
```

Choose the production profile, then **App Store Connect → Manage your API Key → Set up your project to use an API Key**. Alternatively, keep an app-specific password in `EXPO_APPLE_APP_SPECIFIC_PASSWORD` outside the repo.

Upload the finished binary:

```bash
npx eas-cli@latest submit --platform ios --profile production
```

Processing usually finishes in 10–15 minutes. The build then shows under **TestFlight**. Export compliance should already be answered by `ITSAppUsesNonExemptEncryption` = false; if App Store Connect still asks, answer that the app uses only standard HTTPS encryption.

Internal TestFlight can use that build without App Review. External TestFlight groups and the App Store release both go through review.

### 6. App Review

Fill in the version in App Store Connect, attach the TestFlight build, and complete:

- Screenshots for the required iPhone sizes and for iPad.
- Age rating questionnaire.
- **App Privacy** nutrition labels. For the current app:
  - No account and no contact info collected by Brief.
  - Preferences and saved articles stay on device.
  - The app contacts third-party publishers to load public RSS (and occasional article HTML for images).
  - Notifications are local. Declare a push-notification data type only if you add remote push later.
  - No tracking, unless you later add an SDK that tracks.
- **Review notes** (App Review Information):

  > Brief is a news reader. It loads public RSS feeds. There is no account and no login. Saved stories and topic preferences stay on the device. The daily digest is a local notification scheduled on the device; there is no push backend. Notifications can be turned off in Settings.

- Export compliance: standard exempt encryption (HTTPS), matching `ITSAppUsesNonExemptEncryption` = false.
- Support URL and privacy policy URL from step 2.

Submit the version for review when that metadata is complete. TestFlight processing alone does not send the app to the App Store.
