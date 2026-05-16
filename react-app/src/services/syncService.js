import { callAPI } from './api.js';

const SYNC_QUEUE_KEY = 'training.syncQueue';

export function addToSyncQueue(item) {
  try {
    const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
    queue.push({ ...item, timestamp: Date.now() });
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('[Sync] Could not add to sync queue:', e);
  }
}

export async function processSyncQueue() {
  const token = localStorage.getItem('token');
  if (!token) return;

  let queue = [];
  try {
    queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
  } catch (e) {
    return;
  }

  if (queue.length === 0) return;

  const remaining = [];
  for (const item of queue) {
    try {
      if (item.type === 'progress') {
        await callAPI('/api/user/workout-progress', 'POST', {
          exercise_id: item.exercise_id,
          exercise_name: item.exercise_name,
          progress_status: item.progress_status,
          workout_time: item.workout_time
        });
      } else if (item.type === 'complete') {
        await callAPI('/api/user/workout-progress/complete', 'PUT', {
          exercise_name: item.exercise_name
        });
      }
    } catch (e) {
      remaining.push(item);
    }
  }

  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remaining));
}
