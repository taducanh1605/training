/**
 * Test API for Training Server - Updated for new workout structure
 */

const API_BASE = 'http://localhost:2445';

// Test health endpoint
async function testHealth() {
    try {
        console.log('\n=== Testing Health Endpoint ===');
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();
        console.log('Health response:', data);
        return true;
    } catch (error) {
        console.error('Health check failed:', error.message);
        return false;
    }
}

// Test mock login (tạo token giả để test)
async function testMockLogin() {
    try {
        console.log('\n=== Testing Mock Login ===');
        // Sử dụng mock token để test (trong thực tế sẽ cần OAuth)
        const mockToken = 'mock_token_for_testing';
        console.log('Using mock token for testing');
        return mockToken;
    } catch (error) {
        console.error('Mock login error:', error.message);
        return null;
    }
}

// Test get profile
async function testGetProfile(token) {
    try {
        console.log('\n=== Testing Get Profile ===');
        const response = await fetch(`${API_BASE}/api/training/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        console.log('Profile response:', data);
    } catch (error) {
        console.error('Get profile error:', error.message);
    }
}

// Test save workout with new structure
async function testSaveWorkout(token) {
    try {
        console.log('\n=== Testing Save Workout (New Structure) ===');
        const sampleWorkout = {
            "week1": {
                "day1": [
                    {"name": "Push-ups", "sets": 3, "reps": 10},
                    {"name": "Squats", "sets": 3, "reps": 15}
                ],
                "day2": [
                    {"name": "Pull-ups", "sets": 3, "reps": 5},
                    {"name": "Lunges", "sets": 3, "reps": 12}
                ]
            },
            "week2": {
                "day1": [
                    {"name": "Push-ups", "sets": 4, "reps": 12},
                    {"name": "Squats", "sets": 4, "reps": 18}
                ]
            }
        };

        const response = await fetch(`${API_BASE}/api/training/workout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                exercises: sampleWorkout
            })
        });

        const data = await response.json();
        console.log('Save workout response:', data);
    } catch (error) {
        console.error('Save workout error:', error.message);
    }
}

// Test get workout data 
async function testGetWorkout(token) {
    try {
        console.log('\n=== Testing Get Workout ===');
        const response = await fetch(`${API_BASE}/api/training/workout`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        console.log('Get workout response:', data);
        
        // Kiểm tra xem có exercises field không
        if (data.exercises) {
            console.log('✓ Exercises field found in response');
        } else {
            console.log('❌ Exercises field not found');
        }
    } catch (error) {
        console.error('Get workout error:', error.message);
    }
}

// Test get workouts list
async function testGetWorkouts(token) {
    try {
        console.log('\n=== Testing Get Workouts List ===');
        const response = await fetch(`${API_BASE}/api/training/workouts`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        console.log('Get workouts response:', data);
    } catch (error) {
        console.error('Get workouts error:', error.message);
    }
}

// Main test function
async function runTests() {
    console.log('=== Starting Training Server API Tests (New Structure) ===');
    console.log('Testing new workout structure: user_id + exercises (TEXT/JSON)');
    
    // Test server availability
    const serverOk = await testHealth();
    if (!serverOk) {
        console.error('❌ Server not available - stopping tests');
        return;
    }

    // Get mock token (in real scenario, use OAuth)
    const token = await testMockLogin();
    if (!token) {
        console.error('❌ Cannot get token - stopping tests');
        return;
    }

    // Test workout operations with new structure
    await testSaveWorkout(token);
    await testGetWorkout(token);
    await testGetWorkouts(token);
    await testGetProfile(token);
    
    console.log('\n=== Tests completed ===');
    console.log('Note: These tests use mock authentication.');
    console.log('In production, proper OAuth tokens are required.');
}

// Run tests
runTests().catch(console.error);
