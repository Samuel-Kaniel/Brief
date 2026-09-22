# App Store / Play Store checklist

`app.json` is configuration-ready for a first store binary. The steps below still need a person with Apple, Google, and Expo accounts. Do not invent an Expo project UUID, an Apple Team ID, or App Store Connect credentials, and do not commit secrets (keystores, `.p8` / `.p12` files, ASC API keys, Play service-account JSON, or `EXPO_TOKEN`).

## Already configured

| Field | Value |
| --- | --- |
| `expo.version` | `1.0.0` |
| `ios.bundleIdentifier` | `com.samuelkaniel.brief` |
| `android.package` | `com.samuelkaniel.brief` |
| `ios.buildNumber` | `"1"` (`CFBundleVersion`) |
| `android.versionCode` | `1` |
| `ios.config.usesNonExemptEncryption` | `false` |
| `ios.infoPlist.ITSAppUsesNonExemptEncryption` | `false` |
| `eas.json` `build.production` | channel `production` (unchanged) |
| `eas.json` `submit.production` | `{}` on purpose — see [Submit credentials](#7-submit-credentials) |
| `extra.privacyPolicyUrl` / `extra.supportUrl` | empty until real URLs exist |
| `extra.eas.projectId` | intentionally absent |

`eas.json` sets `cli.appVersionSource` to `local`, so EAS Build uses the version, build number, and version code in `app.json`. Bump `ios.buildNumber` (string) and `android.versionCode` (integer) for every binary you upload. Bump `expo.version` when the user-facing version changes. `runtimeVersion.policy` is `appVersion`, so a version bump also starts a new OTA runtime.

Encryption is standard HTTPS only (RSS and article pages). `false` tells Apple the app does not use non-exempt encryption, which skips the export-compliance prompt on upload. Confirm the same answer in App Store Connect.

## Notification permission strings

[Expo SDK 57 `expo-notifications`](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/) says iOS **does not require a usage description**. The permission dialog is the system prompt from `requestPermissionsAsync` in `src/services/notifications.ts`. The config plugin does not set `NSUserNotificationsUsageDescription`, and Apple does not require that key for local notifications, so it is not in `Info.plist`.

Do not set the plugin's `enableBackgroundRemoteNotifications` (that adds `UIBackgroundModes` → `remote-notification`). Brief schedules a daily digest on the device. There is no remote push server.

The plugin still adds the `aps-environment` entitlement (Expo's default; Xcode switches a release archive to production). Review notes should say the app does not send remote push.

## Manual steps

### 1. Accounts

- Enroll in the [Apple Developer Program](https://developer.apple.com/programs/) (paid membership). A free Apple ID cannot create an App Store record.
- Create a [Google Play Console](https://play.google.com/console) developer account if you are shipping Android.
- Use an Expo account you control for EAS Build (`npx eas-cli@latest login`).

### 2. Host the privacy policy and support page

App Store Connect requires a **Support URL**. A **privacy policy URL** is required on Play and is what you should submit on the App Store as well, because the app stores preferences and saved stories on device and fetches third-party RSS.

Host real public HTTPS pages, then paste the URLs into:

- `expo.extra.privacyPolicyUrl`
- `expo.extra.supportUrl`

and into App Store Connect / Play Console. Clear `extra.storeListingTodo` once both URLs are real.

Do not invent a domain or a placeholder page. The extra values stay empty strings until those pages exist.

Suggested facts for the privacy policy (match the app; do not claim analytics or accounts you have not added):

- No user account and no sign-in.
- Topic choices, digest time, saved stories, and skip state stay in on-device storage.
- Headlines come from public RSS feeds. The app also requests article pages when it needs an `og:image`.
- The daily digest is a **local** notification. No push token is sent to a Brief server.
- There is no Brief backend account to delete.

**Terms:** Apple's standard EULA is enough for this app. A custom terms URL is optional. Add one in App Store Connect only after you host it. Do not put a fake terms URL in `app.json`.

### 3. App Store Connect app record

1. Register the App ID `com.samuelkaniel.brief` (or let the first `eas build` register it).
2. Create the app in App Store Connect with that bundle ID.
3. On **App Information**, copy the numeric **Apple ID**. That value is `ascAppId`. It does not exist until this record exists — do not guess it, and do not guess `appleTeamId`.

`ios.supportsTablet` is `true`, so the listing needs iPhone **and** iPad screenshots.

### 4. Play Console app

Create the app with package name `com.samuelkaniel.brief`. The package cannot be changed after the first upload.

### 5. Link the Expo project

From the repo root, interactively:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
```

`eas init` writes `expo.extra.eas.projectId`. Commit that real UUID. Do not paste a made-up one. `eas update:configure` (OTA) is separate and still optional; see the README.

### 6. First production build

Signing credentials are created on this first interactive build and stored by EAS. They are not generated by `.eas/workflows/create-production-builds.yml`.

```bash
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest build --platform android --profile production
```

`npx eas-cli@latest build --platform all` is the same first credentials pass. After it succeeds, later workflow builds can reuse the credentials. Do not commit the Android keystore or the iOS distribution certificate.

### 7. Submit credentials

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

Leave `appleTeamId`, `appleId`, ASC API key paths, and the Play service-account path out of the repo.

Configure the ASC API key on your machine (not in git):

```bash
npx eas-cli@latest credentials --platform ios
```

Choose the production profile, then **App Store Connect → Manage your API Key → Set up your project to use an API Key**. Alternatively, keep an app-specific password in `EXPO_APPLE_APP_SPECIFIC_PASSWORD` outside the repo.

For Play, create a service-account JSON in Play Console and give it to `eas submit` via EAS credentials or a local path that is gitignored. Do not commit the JSON.

Submit after the binary exists:

```bash
npx eas-cli@latest submit --platform ios --profile production
npx eas-cli@latest submit --platform android --profile production
```

### 8. Listing metadata for review

- Screenshots for the required device sizes (include iPad).
- Age rating questionnaire.
- **App Privacy** nutrition labels. Accurate answers for the current app:
  - No account, no contact info collected by Brief.
  - Preferences and saved articles are stored on device.
  - The app contacts third-party publishers to load public RSS (and occasional article HTML for images).
  - Notifications are local. Do not declare a push-notification data type unless you add remote push later.
  - No tracking, unless you later add an SDK that tracks.
- **Review notes** (paste into App Review Information):

  > Brief is a news reader. It loads public RSS feeds. There is no account and no login. Saved stories and topic preferences stay on the device. The daily digest is a local notification scheduled on the device; there is no push backend. Notifications can be turned off in Settings.

- Export compliance: the app uses only standard exempt encryption (HTTPS). This matches `ITSAppUsesNonExemptEncryption` = false.

### 9. Play Data safety and content rating

- Complete the Data safety form (on-device storage, no account, RSS fetched from publishers) and the content-rating questionnaire.
- Paste the same privacy policy URL into the store listing.
- The daily notification uses a local daily trigger. If the merged manifest requests exact alarms (`SCHEDULE_EXACT_ALARM` / `USE_EXACT_ALARM`), complete Play's Alarms & reminders declaration before production release. `RECEIVE_BOOT_COMPLETED` and notification permission are added by `expo-notifications` so a scheduled digest can be restored after reboot and so Android 13 can prompt for notification permission.
