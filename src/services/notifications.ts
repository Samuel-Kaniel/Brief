import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { CategoryId, FeedSource, UserPreferences } from '../types';
import { fetchArticlesForCategories } from './rss';
import { FEED_SOURCES } from '../data/feeds';

const DAILY_NOTIFICATION_ID = 'news-app-daily-digest';
const DAILY_CHANNEL_ID = 'daily-digest';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;

  const request = await Notifications.requestPermissionsAsync();
  return request.granted;
}

async function buildDigestBody(categories: CategoryId[]): Promise<string> {
  try {
    const { articles } = await fetchArticlesForCategories(FEED_SOURCES as FeedSource[], categories);
    const headlines = articles.slice(0, 2).map((a) => a.title);
    if (headlines.length === 0) return 'Your personalized news digest is ready.';
    return headlines.join('  •  ');
  } catch {
    return 'Your personalized news digest is ready.';
  }
}

let lastDigestBody: string | null = null;
let lastDigestCategoriesKey = '';
let scheduleEpoch = 0;

function categoriesKey(categories: CategoryId[]): string {
  return [...categories].sort().join(',');
}

export async function scheduleDailyDigest(
  prefs: UserPreferences,
  options: { refreshBody?: boolean } = {}
): Promise<void> {
  const epoch = ++scheduleEpoch;

  await Notifications.cancelScheduledNotificationAsync(DAILY_NOTIFICATION_ID).catch(() => {});

  if (!prefs.notificationsEnabled || prefs.categories.length === 0) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;
  if (epoch !== scheduleEpoch) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(DAILY_CHANNEL_ID, {
      name: 'Daily digest',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const key = categoriesKey(prefs.categories);
  const shouldRefreshBody =
    options.refreshBody === true || lastDigestBody == null || lastDigestCategoriesKey !== key;

  const body =
    shouldRefreshBody || lastDigestBody == null
      ? await buildDigestBody(prefs.categories)
      : lastDigestBody;
  if (epoch !== scheduleEpoch) return;
  lastDigestBody = body;
  lastDigestCategoriesKey = key;

  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_NOTIFICATION_ID,
    content: {
      title: 'Your daily news digest',
      body,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: prefs.notificationHour,
      minute: prefs.notificationMinute,
      ...(Platform.OS === 'android' ? { channelId: DAILY_CHANNEL_ID } : {}),
    },
  });
}

export async function cancelDailyDigest(): Promise<void> {
  scheduleEpoch += 1;
  lastDigestBody = null;
  lastDigestCategoriesKey = '';
  await Notifications.cancelScheduledNotificationAsync(DAILY_NOTIFICATION_ID).catch(() => {});
}
