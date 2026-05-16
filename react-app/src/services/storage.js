export const STORAGE_KEYS = {
  TOKEN: 'token',
  TEXT_MODE: 'training.textMode',
  USER_NAME: 'training.user_name',
  USER_EMAIL: 'training.user_email',
  MENTOR_CODE: 'training.mentor_code',
  RESUME: 'training.resume',
  DONE: 'training.done',
  SELECTED_LVL: 'training.selectedLvl',
  EDITED_EXERCISES: 'training.editedExercises',
  SYNC_QUEUE: 'training.syncQueue',
  // Set to '1' before page reload when user explicitly clears the workout
  // so restoreBestWorkoutState skips the DB/cache lookup after reload
  RESUME_CLEARED: 'training.resume.cleared'
};

export function getItem(key) {
  return localStorage.getItem(key);
}

export function setItem(key, value) {
  localStorage.setItem(key, value);
}

export function removeItem(key) {
  localStorage.removeItem(key);
}

export function parseResume(resumeStr) {
  if (!resumeStr) return null;
  const [textMode, gen, level, program, time, count, savedAt] = resumeStr.split('***');
  return {
    textMode, gen, level, program,
    time: parseInt(time) || 0,
    count: parseInt(count) || 0,
    // savedAt is a unix ms timestamp written when the resume string was last saved.
    // Old data without index[6] defaults to 0 so any new write always wins.
    savedAt: parseInt(savedAt) || 0
  };
}

// Append the current wall-clock timestamp as the last segment so that
// pickMostRecentWorkout can determine which save is truly the most recent,
// regardless of whether count went up (Next) or down (Back).
export function buildResume(textMode, gen, level, program, time, count, savedAt = Date.now()) {
  return [textMode, gen, level, program, time, count, savedAt].join('***');
}
