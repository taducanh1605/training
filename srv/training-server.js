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
    service: 'Training App Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
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
        message: 'Email và password là bắt buộc',
        error: 'MISSING_CREDENTIALS'
      });
    }

    // Login qua OAuth API
    const result = await oauthClient.loginWithEmail({ email, password });

    if (result.success) {
      res.json({
        success: true,
        message: 'Đăng nhập thành công',
        token: result.token,
        user: result.user,
        expires_at: result.expires_at
      });
    } else {
      res.status(401).json({
        success: false,
        message: result.message || 'Đăng nhập thất bại',
        error: 'LOGIN_FAILED'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi đăng nhập',
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
        message: 'Email, password và name là bắt buộc',
        error: 'MISSING_FIELDS'
      });
    }

    // Đăng ký qua OAuth API
    const result = await oauthClient.registerUser({ email, password, name });

    if (result.success) {
      res.json({
        success: true,
        message: 'Đăng ký thành công',
        token: result.token,
        user: result.user,
        expires_at: result.expires_at
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Đăng ký thất bại',
        error: 'REGISTER_FAILED'
      });
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi đăng ký',
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
        message: 'Token là bắt buộc',
        error: 'MISSING_TOKEN'
      });
    }

    const result = await oauthClient.validateToken(token);

    if (result.success) {
      res.json({
        success: true,
        message: 'Token hợp lệ',
        user: result.user,
        expires_at: result.expires_at
      });
    } else {
      res.status(401).json({
        success: false,
        message: result.message || 'Token không hợp lệ',
        error: 'INVALID_TOKEN'
      });
    }
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xác thực token',
      error: 'SERVER_ERROR'
    });
  }
});

/**
 * ROUTE: Lấy thông tin user hiện tại
 */
app.get('/api/user/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user,
      message: 'Thông tin user'
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thông tin user',
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
      message: 'Lỗi khi lấy Google OAuth URL',
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
      message: 'Lỗi khi lấy Facebook OAuth URL',
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
      message: 'Dữ liệu tập luyện'
    });
  } catch (error) {
    console.error('Get exercises error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy dữ liệu tập luyện',
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
      message: 'Lỗi server khi xử lý API training',
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
    message: 'API endpoint không tồn tại',
    error: 'NOT_FOUND',
    available_routes: [
      'GET /health',
      'POST /auth/login',
      'POST /auth/register', 
      'POST /auth/verify',
      'GET /api/user/me',
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
    message: 'Lỗi server không xác định',
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
      console.log('   POST /auth/login - Đăng nhập');
      console.log('   POST /auth/register - Đăng ký');
      console.log('   POST /auth/verify - Xác thực token');
      console.log('   GET  /api/user/me - Thông tin user');
      console.log('   GET  /api/oauth/google/url - Google OAuth URL');
      console.log('   GET  /api/oauth/facebook/url - Facebook OAuth URL');
      console.log('   GET  /api/training/exercises - Dữ liệu tập luyện');
      console.log('   ALL  /api/training/* - API tổng quát');
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
