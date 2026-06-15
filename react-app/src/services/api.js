const API_BASE = 'https://pika-proxy.taducanhbkhn.workers.dev/port/32445';

export { API_BASE };

export async function callAPI(endpoint, method = 'GET', data = null) {
  const token = localStorage.getItem('token');
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  if ((method === 'POST' || method === 'PUT') && data) {
    options.body = JSON.stringify(data);
  }
  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || `HTTP ${response.status}: ${response.statusText}`);
  }
  return result;
}

export async function googleLogin() {
  const response = await fetch(`${API_BASE}/api/oauth/google/url`);
  const data = await response.json();
  window.open(data.authUrl, 'google_oauth', 'width=500,height=600');
  return new Promise((resolve) => {
    const handler = (event) => {
      if (event.data && event.data.type === 'oauth_success') {
        localStorage.setItem('token', event.data.token);
        window.removeEventListener('message', handler);
        resolve(event.data.token);
      }
    };
    window.addEventListener('message', handler);
  });
}

export async function directLogin(email, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (data.success) {
    localStorage.setItem('token', data.token);
    return data.user;
  }
  throw new Error(data.message || 'Login failed');
}

export async function registerUser(email, password, name) {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name })
  });
  const data = await response.json();
  if (data.success) {
    localStorage.setItem('token', data.token);
    return data.user;
  }
  throw new Error(data.message || 'Registration failed');
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('training.token');
  localStorage.removeItem('training.user_name');
  localStorage.removeItem('training.user_email');
  localStorage.removeItem('training.mentor_code');
  if (localStorage.getItem('training.selectedLvl')?.[0] === 'p') {
    localStorage.removeItem('training.selectedLvl');
  }
  if (localStorage.getItem('training.resume')?.[0] === 'p') {
    localStorage.removeItem('training.resume');
  }
}

export async function getUserProfile() {
  return callAPI('/api/user/me', 'GET');
}

export async function updateUserProfile(profileData) {
  return callAPI('/api/user/profile', 'PUT', profileData);
}

export async function getTrainingExercises() {
  return callAPI('/api/training/exercises', 'GET');
}

export async function saveWorkoutProgress(payload) {
  return callAPI('/api/user/workout-progress', 'POST', payload);
}

export async function completeWorkout(exercise_name) {
  return callAPI('/api/user/workout-progress/complete', 'PUT', { exercise_name });
}

export async function getCurrentWorkout() {
  return callAPI('/api/user/workout-progress/current', 'GET');
}

export async function getMentorStudents() {
  return callAPI('/api/mentor/students', 'GET');
}

export async function addMentorStudent(student_code) {
  return callAPI('/api/mentor/students', 'POST', { student_code });
}

export async function removeMentorStudent(studentId) {
  return callAPI(`/api/mentor/students/${studentId}`, 'DELETE');
}

export async function getStudentExercises(studentId) {
  return callAPI(`/api/mentor/students/${studentId}/exercises`, 'GET');
}

export async function updateStudentExercises(studentId, exerciseData) {
  return callAPI(`/api/mentor/students/${studentId}/exercises`, 'PUT', exerciseData);
}

export async function getUserExercises() {
  return callAPI('/api/user/exercises', 'GET');
}
