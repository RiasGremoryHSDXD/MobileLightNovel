import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { checkForUpdates } from '../updates/UpdateManager';
import Constants from 'expo-constants';

export const BACKGROUND_UPDATE_TASK = 'BACKGROUND_UPDATE_TASK';

// Define the task logic
TaskManager.defineTask(BACKGROUND_UPDATE_TASK, async () => {
  try {
    console.log('[Background Fetch] Task triggered.');
    
    // We pass true to indicate it's a background fetch (limits checks to prevent timeout)
    const newChapters = await checkForUpdates(true);
    
    if (newChapters > 0) {
      console.log(`[Background Fetch] Found ${newChapters} new chapters.`);
      return BackgroundTask.BackgroundTaskResult.Success;
    } else {
      console.log('[Background Fetch] No new chapters.');
      return BackgroundTask.BackgroundTaskResult.Success;
    }
  } catch (error) {
    console.error("[Background Fetch] Task failed", error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

// Function to register the task on app startup
export async function registerBackgroundFetchAsync() {
  if (Constants.appOwnership === 'expo') {
    console.log("[Background Fetch] Running in Expo Go. Background tasks disabled to prevent warnings.");
    return;
  }
  
  try {
    await BackgroundTask.registerTaskAsync(BACKGROUND_UPDATE_TASK, {
      minimumInterval: 60 * 60 * 6, // 6 hours
    });
    console.log("[Background Fetch] Successfully registered.");
  } catch (err) {
    console.log("[Background Fetch] Failed to register. Warning suppressed.", err);
  }
}
