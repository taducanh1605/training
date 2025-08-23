// get data from API with token
const API_BASE = 'https://pika-proxy.taducanhbkhn.workers.dev';

// Login Google
async function googleLogin() {
    // 1. get OAuth URL
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
}

// Login Facebook
async function facebookLogin() {
    const response = await fetch(`${API_BASE}/api/oauth/facebook/url`);
    const data = await response.json();
    
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
}

// Login with email/password
async function directLogin(email, password) {
    const response = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    if (data.success) {
        localStorage.setItem('authToken', data.token);
        return data.user;
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
    
    // Add body for POST requests
    if (method === 'POST' && data) {
        options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    let result = await response.json();
    
    return result;
}

// Logout
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('training.user_id');
    localStorage.removeItem('training.user_name');
    window.location.reload();
}