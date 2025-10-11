// get data from API with token
const API_BASE = 'https://pika-proxy.taducanhbkhn.workers.dev/port/52445';

// Login Google
async function googleLogin() {
    try {
        // 1. get OAuth URL from local server (proxy)
        const response = await fetch(`${API_BASE}/api/oauth/google/url`);
        const data = await response.json();
        
        // 2. Open popup
        const popup = window.open(data.authUrl, 'google_oauth', 'width=500,height=600');
        
        // 3. Listen for token
        window.addEventListener('message', (event) => {
            if (event.data.type === 'oauth_success') {
                localStorage.setItem('authToken', event.data.token);

                // refresh page after login with small delay
                setTimeout(() => {
                    window.location.reload();
                }, 100);
            }
        });
    } catch (error) {
        console.error('Google login error:', error);
        alert('Google login error: ' + error.message);
    }
}

// Login Facebook
async function facebookLogin() {
    try {
        // 1. get OAuth URL from local server (proxy)
        const response = await fetch(`${API_BASE}/api/oauth/facebook/url`);
        const data = await response.json();
        
        // 2. Open popup
        const popup = window.open(data.authUrl, 'facebook_oauth', 'width=500,height=600');
        
        // 3. Listen for token
        window.addEventListener('message', (event) => {
            if (event.data.type === 'oauth_success') {
                localStorage.setItem('authToken', event.data.token);
                
                // refresh page after login with small delay
                setTimeout(() => {
                    window.location.reload();
                }, 100);
            }
        });
    } catch (error) {
        console.error('Facebook login error:', error);
        alert('Facebook login error: ' + error.message);
    }
}

// Login with email/password
async function directLogin(email, password) {
    const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    if (data.success) {
        localStorage.setItem('authToken', data.token);
        
        // refresh page after login with small delay
        setTimeout(() => {
            window.location.reload();
        }, 100);
        
        return data.user;
    } else {
        throw new Error(data.message || 'Login failed');
    }
}

// Register new user
async function registerUser(email, password, name) {
    const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
    });
    
    const data = await response.json();
    if (data.success) {
        localStorage.setItem('authToken', data.token);
        
        // refresh page after registration with small delay
        setTimeout(() => {
            window.location.reload();
        }, 100);
        
        return data.user;
    } else {
        throw new Error(data.message || 'Registration failed');
    }
}

async function callAPI(endpoint, method = 'GET', data = null) {
    const token = localStorage.getItem('authToken');
    
    const options = {
        method: method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    
    // Add body for POST/PUT requests
    if ((method === 'POST' || method === 'PUT') && data) {
        options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    let result = await response.json();
    
    // Handle error responses
    if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return result;
}

// Get user profile information
async function getUserProfile() {
    try {
        const result = await callAPI('/api/user/me', 'GET');
        return result;
    } catch (error) {
        console.error('Get user profile error:', error);
        throw error;
    }
}

// Update user profile information
async function updateUserProfile(profileData) {
    try {
        const result = await callAPI('/api/user/profile', 'PUT', profileData);
        return result;
    } catch (error) {
        console.error('Update user profile error:', error);
        throw error;
    }
}

// Logout
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('training.user_name');
    localStorage.removeItem('training.user_email');
    if (localStorage.getItem('training.selectedLvl')?.[0] == 'p') {
        localStorage.removeItem('training.selectedLvl');
    }
    if (localStorage.getItem('training.resume')?.[0] == 'p') {
        localStorage.removeItem('training.resume');
    }
    window.location.reload();
}

// Get user profile information
async function getUserProfile() {
    try {
        const result = await callAPI('/api/user/me');
        return result;
    } catch (error) {
        console.error('Error getting user profile:', error);
        throw error;
    }
}

// Update user profile information
async function updateUserProfile(profileData) {
    try {
        const result = await callAPI('/api/user/profile', 'PUT', profileData);
        return result;
    } catch (error) {
        console.error('Error updating user profile:', error);
        throw error;
    }
}

// Check if user profile is complete and show form if needed
async function checkAndShowProfileForm() {
    const token = localStorage.getItem('authToken');
    const userName = localStorage.getItem('training.user_name');
    
    if (!token || !userName) {
        console.log('User not logged in, hiding profile form');
        hideProfileForm();
        return;
    }
    
    try {
        console.log('Checking user profile completeness...');
        const profileResult = await getUserProfile();
        
        // Check if profile information is complete
        const profile = profileResult.profile;
        if (!profile || !profile.gender || !profile.weight || !profile.height || !profile.birthdate) {
            console.log('Profile information incomplete, showing form');
            showProfileForm();
        } else {
            console.log('Profile information complete');
            hideProfileForm();
        }
    } catch (error) {
        console.error('Error checking user profile:', error);
        hideProfileForm(); // Hide form on error
    }
}

// Show profile form
function showProfileForm() {
    const profileFormContainer = document.getElementById('profile-form-container');
    
    if (profileFormContainer) {
        profileFormContainer.style.display = 'block';
    }
    
    // Hide row3 and row4 elements when showing profile form
    const row3Elements = document.querySelectorAll('.row3');
    row3Elements.forEach(el => el.style.display = 'none');
    
    const row4Elements = document.querySelectorAll('[class*="row4"]');
    row4Elements.forEach(el => el.style.display = 'none');
}

// Hide profile form
function hideProfileForm() {
    const profileFormContainer = document.getElementById('profile-form-container');
    
    if (profileFormContainer) {
        profileFormContainer.style.display = 'none';
    }
    
    // Show row3 and row4 elements when hiding profile form
    const row3Elements = document.querySelectorAll('.row3');
    row3Elements.forEach(el => el.style.display = '');
    
    const row4Elements = document.querySelectorAll('[class*="row4"]');
    row4Elements.forEach(el => el.style.display = '');
}

// Submit profile form
async function submitProfileForm() {
    try {
        const formData = {
            gender: document.getElementById('profile_gender').value,
            weight: parseFloat(document.getElementById('profile_weight').value),
            height: parseFloat(document.getElementById('profile_height').value),
            birthdate: document.getElementById('profile_birthdate').value
        };
        
        // Validate form data
        if (!formData.gender || !formData.weight || !formData.height || !formData.birthdate) {
            alert('Please fill in all required fields');
            return;
        }
        
        if (formData.weight <= 0 || formData.weight > 300) {
            alert('Weight must be between 1 and 300 kg');
            return;
        }
        
        if (formData.height <= 0 || formData.height > 250) {
            alert('Height must be between 1 and 250 cm');
            return;
        }
        
        // Add workout data based on gender
        try {
            let workoutData = null;
            
            // Determine which workout data to use based on gender
            if (formData.gender === 'female') {
                // Load female workout data
                const response = await fetch('./FullBodyFemale.json');
                workoutData = await response.json();
            } else {
                // For 'male' or 'other', use male workout data as default
                const response = await fetch('./FullBodyMale.json');
                workoutData = await response.json();
            }
            
            if (workoutData) {
                formData.exercises = workoutData;
                console.log('Added workout data for gender:', formData.gender);
            }
        } catch (error) {
            console.warn('Could not load workout data, continuing without it:', error);
        }
        
        console.log('Submitting profile data:', formData);
        const result = await updateUserProfile(formData);
        
        if (result.success) {
            hideProfileForm();
            console.log('Profile update successful');
            
            // Show success message and refresh page to update user data
            alert('Profile updated successfully! The page will refresh to load your personalized workout plan.');
            
            // Clear any cached data and refresh the page
            setTimeout(() => {
                // Clear relevant localStorage cache if any
                localStorage.removeItem('training.selectedLvl');
                localStorage.removeItem('training.resume');
                
                // Refresh the page to reload all user data and workout programs
                window.location.reload(true); // Force reload from server
            }, 500);
        } else {
            alert('Error updating profile: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error submitting profile:', error);
        alert('Error updating profile: ' + error.message);
    }
}