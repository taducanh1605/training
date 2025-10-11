/**
 * TRAINING APP SERVER
 * 
 * Webserver chuyên dụng cho ứng dụng Training
 * - Xác thực với API_BASE = 'https://pika-proxy.taducanhbkhn.workers.dev'
 * - Sử dụng oauth_utils.js để xử lý authentication
 * - Tích hợp với TrainingApp để xử lý dữ liệu training
 * - Chạy trên port 2445
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OAuthUtils = require('./oauth_utils.js');
const TrainingApp = require('./models/TrainingApp.js');

// Import fetch for Node.js
let fetch;
try {
  fetch = require('node-fetch');
} catch (e) {
  // Use built-in fetch in newer Node.js versions (18+)
  if (typeof globalThis.fetch !== 'undefined') {
    fetch = globalThis.fetch;
  } else {
    console.warn('fetch not available. Some features may not work.');
  }
}

// Khởi tạo Express app
const app = express();

// Cấu hình CORS để hỗ trợ frontend từ các domain khác
app.use(cors({
  origin: true, // Cho phép tất cả origin (có thể config cụ thể sau)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cookie']
}));

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Khởi tạo OAuth client với API_BASE
const API_BASE = 'https://pika-proxy.taducanhbkhn.workers.dev';
const oauthClient = new OAuthUtils(API_BASE, {
  defaultAppName: 'training-app',
  defaultAppDisplayName: 'Training Application',
  defaultAppDescription: 'Fitness and workout training application',
  timeout: 10000,
  headers: {
    'User-Agent': 'TrainingApp/1.0'
  }
});

// Khởi tạo Training App
const trainingApp = new TrainingApp();

// App Configuration
const APP_CONFIG = {
  name: 'training-app',
  displayName: 'Training Application',
  description: 'Fitness and workout training application',
  port: 2445
};

/**
 * HÀM ĐĂNG KÝ APP KHI KHỞI ĐỘNG
 */
async function registerApp() {
  try {
    console.log(`Registering app "${APP_CONFIG.name}" with OAuth server...`);
    
    const result = await oauthClient.registerApp({
      app_name: APP_CONFIG.name,
      app_display_name: APP_CONFIG.displayName,
      app_description: APP_CONFIG.description
    });

    if (result.success) {
      if (result.isNew) {
        console.log('App registered successfully as NEW app:');
      } else {
        console.log('App found in database:');
      }
      
      console.log('   ID:', result.app.id);
      console.log('   Name:', result.app.app_name);
      console.log('   Display Name:', result.app.app_display_name);
      console.log('   Message:', result.message);
      
      return result.app;
    } else {
      console.error('App registration failed:', result.message);
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error during app registration:', error.message);
    throw error;
  }
}

/**
 * MIDDLEWARE: Xác thực token
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        error: 'MISSING_TOKEN'
      });
    }

    // Verify token với OAuth server
    const verifyResult = await oauthClient.validateToken(token);
    
    if (!verifyResult.success) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error: 'INVALID_TOKEN',
        details: verifyResult.message
      });
    }

    // Lưu thông tin user vào request
    req.user = verifyResult.user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication service error',
      error: 'AUTH_SERVICE_ERROR'
    });
  }
}

/**
 * ROUTE: Health check
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    service: 'Training App Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: APP_CONFIG.port,
    api_base: API_BASE
  });
});

/**
 * ROUTE: Login với email/password
 */
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
        error: 'MISSING_CREDENTIALS'
      });
    }

    // Login qua OAuth API
    const result = await oauthClient.loginWithEmail({ email, password });

    if (result.success) {
      res.json({
        success: true,
        message: 'Login successful',
        token: result.token,
        user: result.user,
        expires_at: result.expires_at
      });
    } else {
      res.status(401).json({
        success: false,
        message: result.message || 'Login failed',
        error: 'LOGIN_FAILED'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: 'SERVER_ERROR'
    });
  }
});

/**
 * ROUTE: Đăng ký tài khoản mới
 */
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password and name are required',
        error: 'MISSING_FIELDS'
      });
    }

    // Đăng ký qua OAuth API
    const result = await oauthClient.registerUser({ email, password, name });

    if (result.success) {
      res.json({
        success: true,
        message: 'Registration successful',
        token: result.token,
        user: result.user,
        expires_at: result.expires_at
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Registration failed',
        error: 'REGISTER_FAILED'
      });
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: 'SERVER_ERROR'
    });
  }
});

/**
 * ROUTE: Verify token
 */
app.post('/auth/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required',
        error: 'MISSING_TOKEN'
      });
    }

    const result = await oauthClient.validateToken(token);

    if (result.success) {
      res.json({
        success: true,
        message: 'Token is valid',
        user: result.user,
        expires_at: result.expires_at
      });
    } else {
      res.status(401).json({
        success: false,
        message: result.message || 'Invalid token',
        error: 'INVALID_TOKEN'
      });
    }
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during token verification',
      error: 'SERVER_ERROR'
    });
  }
});

/**
 * ROUTE: Lấy thông tin user hiện tại
 */
app.get('/api/user/me', authenticateToken, async (req, res) => {
  try {
    // Lấy thông tin chi tiết từ TrainingApp
    const profileResult = await trainingApp.getUserProfile(req.user.id);
    
    if (profileResult.error) {
      return res.json({
        success: true,
        user: req.user,
        profile: null,
        metrics: null,
        message: 'Basic user information'
      });
    }

    res.json({
      success: true,
      user: req.user,
      profile: profileResult.profile,
      metrics: profileResult.metrics,
      message: 'Complete user information'
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting user information',
      error: 'SERVER_ERROR'
    });
  }
});

/**
 * ROUTE: Cập nhật thông tin user (giới tính, tuổi, chiều cao, cân nặng)
 */
app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { gender, weight, height, birthdate, exercises } = req.body;

    // Validation
    if (gender && !['male', 'female', 'other'].includes(gender)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gender (male, female, other)',
        error: 'INVALID_GENDER'
      });
    }

    if (weight && (typeof weight !== 'number' || weight <= 0 || weight > 300)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid weight (1-300 kg)',
        error: 'INVALID_WEIGHT'
      });
    }

    if (height && (typeof height !== 'number' || height <= 0 || height > 250)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid height (1-250 cm)',
        error: 'INVALID_HEIGHT'
      });
    }

    // Kiểm tra xem user đã có exercises trong DB chưa để tránh ghi đè
    let shouldIncludeExercises = false;
    if (exercises) {
      try {
        const existingWorkout = await trainingApp.getUserWorkout(req.user.id);
        
        if (existingWorkout.error || !existingWorkout.exercises) {
          // User chưa có workout data, có thể thêm exercises mới
          shouldIncludeExercises = true;
          console.log(`User ${req.user.id} has no existing workout data, will add new exercises`);
        } else {
          // User đã có workout data, không ghi đè
          console.log(`User ${req.user.id} already has workout data, skipping exercises update to prevent overwrite`);
        }
      } catch (error) {
        console.error('Error checking existing workout:', error);
        // Nếu có lỗi khi kiểm tra, an toàn hơn là không thêm exercises
        shouldIncludeExercises = false;
      }
    }

    // Cập nhật thông tin qua TrainingApp
    const updateData = {
      gender,
      weight,
      height, 
      birthdate
    };

    // Chỉ thêm exercises nếu user chưa có và được phép
    if (shouldIncludeExercises) {
      updateData.exercises = exercises;
    }

    const updateResult = await trainingApp.updateUserProfile(updateData, req.user);

    if (updateResult.error) {
      return res.status(400).json({
        success: false,
        message: updateResult.error,
        error: 'UPDATE_FAILED'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updateResult
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user profile',
      error: 'SERVER_ERROR'
    });
  }
});

/**
 * ROUTE: Lấy exercises của user hiện tại
 */
app.get('/api/user/exercises', authenticateToken, async (req, res) => {
  try {
    const workoutData = await trainingApp.getUserWorkout(req.user.id);
    
    if (workoutData.error) {
      return res.status(400).json({
        success: false,
        message: workoutData.error,
        error: 'GET_EXERCISES_FAILED'
      });
    }

    res.json({
      success: true,
      exercises: workoutData.exercises || null,
      message: 'Exercises retrieved successfully'
    });
  } catch (error) {
    console.error('Get user exercises error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting exercises',
      error: 'SERVER_ERROR'
    });
  }
});

/**
 * ROUTE: Cập nhật exercises của user
 */
app.put('/api/user/exercises', authenticateToken, async (req, res) => {
  try {
    const { exercises } = req.body;

    if (!exercises || typeof exercises !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Exercises data is required and must be an object',
        error: 'INVALID_EXERCISES'
      });
    }

    // Cập nhật exercises qua TrainingApp
    const updateResult = await trainingApp.updateUserWorkout(req.user.id, exercises);

    if (updateResult.error) {
      return res.status(400).json({
        success: false,
        message: updateResult.error,
        error: 'UPDATE_EXERCISES_FAILED'
      });
    }

    res.json({
      success: true,
      message: 'Exercises updated successfully',
      data: updateResult
    });
  } catch (error) {
    console.error('Update user exercises error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating exercises',
      error: 'SERVER_ERROR'
    });
  }
});

/**
 * ROUTE: Reset exercises về default (xóa custom exercises)
 */
app.delete('/api/user/exercises', authenticateToken, async (req, res) => {
  try {
    // Xóa custom exercises của user
    const deleteResult = await trainingApp.deleteUserWorkout(req.user.id);

    if (deleteResult.error) {
      return res.status(400).json({
        success: false,
        message: deleteResult.error,
        error: 'DELETE_EXERCISES_FAILED'
      });
    }

    res.json({
      success: true,
      message: 'Exercises reset to default successfully'
    });
  } catch (error) {
    console.error('Delete user exercises error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting exercises',
      error: 'SERVER_ERROR'
    });
  }
});

/**
 * ROUTE: Google OAuth URL
 */
app.get('/api/oauth/google/url', async (req, res) => {
  try {
    const response = await fetch(`${API_BASE}/api/oauth/google/url`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Google OAuth URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting Google OAuth URL',
      error: 'SERVER_ERROR'
    });
  }
});

/**
 * ROUTE: Facebook OAuth URL
 */
app.get('/api/oauth/facebook/url', async (req, res) => {
  try {
    const response = await fetch(`${API_BASE}/api/oauth/facebook/url`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Facebook OAuth URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting Facebook OAuth URL',
      error: 'SERVER_ERROR'
    });
  }
});

/**
 * ROUTE: Lấy dữ liệu tập luyện
 */
app.get('/api/training/exercises', authenticateToken, async (req, res) => {
  try {
    // Gọi TrainingApp để lấy dữ liệu workout (not exercise)
    const result = await trainingApp.handleRequest('/workout', 'GET', req.query, req.user);
    
    res.json({
      success: true,
      data: {
        user: {
          name: req.user.name || req.user.email,
          email: req.user.email
        },
        exercises: result.exercises || result
      },
      message: 'Training data'
    });
  } catch (error) {
    console.error('Get exercises error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting training data',
      error: 'SERVER_ERROR'
    });
  }
});

/**
 * ROUTE: API tổng quát cho Training App
 */
app.all('/api/training/:endpoint(*)', authenticateToken, async (req, res) => {
  try {
    const endpoint = '/' + req.params.endpoint;
    const method = req.method;
    const data = method === 'GET' ? req.query : req.body;

    // Gọi TrainingApp để xử lý request
    const result = await trainingApp.handleRequest(endpoint, method, data, req.user);
    
    if (result && result.error) {
      return res.status(404).json({
        success: false,
        message: result.error,
        error: 'ENDPOINT_NOT_FOUND',
        available_endpoints: result.availableEndpoints
      });
    }

    res.json({
      success: true,
      data: result,
      endpoint: endpoint,
      method: method
    });
  } catch (error) {
    console.error('Training API error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing training API',
      error: 'SERVER_ERROR'
    });
  }
});

/**
 * ROUTE: 404 handler
 */
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    error: 'NOT_FOUND',
    available_routes: [
      'GET /health',
      'POST /auth/login',
      'POST /auth/register', 
      'POST /auth/verify',
      'GET /api/user/me',
      'PUT /api/user/profile',
      'GET /api/oauth/google/url',
      'GET /api/oauth/facebook/url',
      'GET /api/training/exercises',
      'ALL /api/training/*'
    ]
  });
});

/**
 * Error handling middleware
 */
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: 'INTERNAL_SERVER_ERROR'
  });
});

/**
 * Start server
 */
const PORT = 2445;

async function startServer() {
  try {
    // Đăng ký app với OAuth server
    const appInfo = await registerApp();
    
    app.listen(PORT, () => {
      console.log(`Training App Server is running on port ${PORT}`);
      console.log(`App ID: ${appInfo.id}`);
      console.log(`API Base: ${API_BASE}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log('Available routes:');
      console.log('   POST /auth/login - Login');
      console.log('   POST /auth/register - Register');
      console.log('   POST /auth/verify - Verify token');
      console.log('   GET  /api/user/me - User information');
      console.log('   PUT  /api/user/profile - Update user profile');
      console.log('   GET  /api/user/exercises - Get user exercises');
      console.log('   PUT  /api/user/exercises - Update user exercises');
      console.log('   DELETE /api/user/exercises - Reset exercises to default');
      console.log('   GET  /api/oauth/google/url - Google OAuth URL');
      console.log('   GET  /api/oauth/facebook/url - Facebook OAuth URL');
      console.log('   GET  /api/training/exercises - Training data');
      console.log('   ALL  /api/training/* - General training API');
      console.log('');
      console.log('Server ready to accept requests!');
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;
