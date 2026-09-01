import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { CategoryId, FeedSource, UserPreferences } from '../types';
import { fetchArticlesForCategories } from './rss';
import { FEED_SOURCES } from '../data/feeds';

const DAILY_NOTIFICATION_ID = 'news-app-daily-digest';

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

export async function scheduleDailyDigest(prefs: UserPreferences): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_NOTIFICATION_ID).catch(() => {});

  if (!prefs.notificationsEnabled || prefs.categories.length === 0) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-digest', {
      name: 'Daily digest',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const body = await buildDigestBody(prefs.categories);

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
    },
  });
}

export async function cancelDailyDigest(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_NOTIFICATION_ID).catch(() => {});
}
