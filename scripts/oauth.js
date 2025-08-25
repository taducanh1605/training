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
        alert('Lỗi khi đăng nhập Google: ' + error.message);
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
        alert('Lỗi khi đăng nhập Facebook: ' + error.message);
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
    
    // Add body for POST requests
    if (method === 'POST' && data) {
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