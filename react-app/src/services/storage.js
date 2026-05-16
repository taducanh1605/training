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
  SYNC_QUEUE: 'training.syncQueue'
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
  const [textMode, gen, level, program, time, count] = resumeStr.split('***');
  return { textMode, gen, level, program, time: parseInt(time) || 0, count: parseInt(count) || 0 };
}

export function buildResume(textMode, gen, level, program, time, count) {
  return [textMode, gen, level, program, time, count].join('***');
}
