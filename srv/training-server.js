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
    // Lấy thông tin chi tiết từ TrainingApp với auto-create profile
    const profileResult = await trainingApp.getUserProfile(req.user.id, req.user);
    
    if (profileResult.error) {
      // User has valid OAuth token but doesn't exist in training app
      return res.json({
        success: true,
        user: req.user,
        profile: null,
        metrics: null,
        needsRegistration: true,  // Add this flag
        message: 'User needs to complete registration in training app'
      });
    }

    const message = profileResult.isNewProfile ? 'New profile created' : 'Complete user information';

    // Include mentor_id in user info for sharing with others
    const userWithMentorId = {
      ...req.user,
      mentor_id: profileResult.profile ? profileResult.profile.mentor_id : null
    };

    res.json({
      success: true,
      user: userWithMentorId,
      profile: profileResult.profile,
      metrics: profileResult.metrics,
      needsRegistration: false,  // User exists in training app
      message: message
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

    if (birthdate && !/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid birthdate format (YYYY-MM-DD)',
        error: 'INVALID_BIRTHDATE'
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

    // Đảm bảo user đã có profile (tự động tạo nếu chưa có)
    const profileCheck = await trainingApp.getUserProfile(req.user.id, req.user);
    if (profileCheck.error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to get or create user profile',
        error: 'PROFILE_ERROR'
      });
    }

    // Cập nhật profile information
    let updateResults = [];

    if (gender || birthdate) {
      const profileData = {};
      if (gender) {
        profileData.gender = gender === 'male' ? 'm' : gender === 'female' ? 'f' : 'o';
      }
      if (birthdate) {
        profileData.birthdate = birthdate;
      }
      
      const profileResult = await trainingApp.updateUserProfile(req.user.id, profileData);
      updateResults.push(profileResult);
    }

    // Cập nhật metrics (height, weight)
    if (height || weight) {
      const metricsResult = await trainingApp.addUserMetrics(req.user.id, { height, weight });
      updateResults.push(metricsResult);
    }

    // Chỉ thêm exercises nếu user chưa có và được phép
    if (shouldIncludeExercises && exercises) {
      const exercisesResult = await trainingApp.updateUserProgram(req.user.id, { exercises });
      updateResults.push(exercisesResult);
    }

    // Check for any errors in updates
    const hasErrors = updateResults.some(result => result.error);
    if (hasErrors) {
      const errors = updateResults.filter(result => result.error).map(result => result.error);
      return res.status(400).json({
        success: false,
        message: 'Some updates failed: ' + errors.join(', '),
        error: 'UPDATE_FAILED'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updateResults,
      updated: {
        profile: (gender || birthdate) ? true : false,
        metrics: (height || weight) ? true : false,
        exercises: shouldIncludeExercises ? true : false,
        birthdate: birthdate ? true : false
      }
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
 * ROUTE: Generate mentor ID cho user (nếu chưa có)
 */
app.post('/api/user/generate-mentor-id', authenticateToken, async (req, res) => {
  try {
    const result = await trainingApp.generateMentorIdForUser(req.user.id);
    
    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error,
        error: 'GENERATE_MENTOR_ID_FAILED'
      });
    }

    res.json({
      success: true,
      mentor_id: result.mentor_id,
      message: result.message
    });
  } catch (error) {
    console.error('Generate mentor ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating mentor ID',
      error: 'SERVER_ERROR'
    });
  }
});

/**
 * ROUTE: Get user's prime status and mentor limits
 */
app.get('/api/user/prime-status', authenticateToken, async (req, res) => {
  try {
    const result = await trainingApp.getUserPrimeStatus(req.user.id);
    
    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error,
        error: 'GET_PRIME_STATUS_FAILED'
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Get prime status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting prime status',
      error: 'SERVER_ERROR'
    });
  }
});

/**
 * ROUTE: Add student to mentor (only mentor can do this)
 */
app.post('/api/mentor/add-student', authenticateToken, async (req, res) => {
  try {
    const { student_user_id } = req.body;

    if (!student_user_id || !Number.isInteger(student_user_id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid student_user_id is required',
        error: 'INVALID_STUDENT_ID'
      });
    }

    // Get mentor's mentor_id
    const profile = await trainingApp.getUserProfile(req.user.id);
    if (profile.error || !profile.profile?.mentor_id) {
      return res.status(400).json({
        success: false,
        message: 'User does not have mentor_id',
        error: 'NO_MENTOR_ID'
      });
    }

    const result = await trainingApp.addStudentToMentor(profile.profile.mentor_id, student_user_id);
    
    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error,
        error: 'ADD_STUDENT_FAILED'
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Add student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding student',
      error: 'SERVER_ERROR'
    });
  }
});

/**
 * ROUTE: Remove student from mentor
 */
app.delete('/api/mentor/remove-student/:student_user_id', authenticateToken, async (req, res) => {
  try {
    const studentUserId = parseInt(req.params.student_user_id);

    if (!studentUserId || !Number.isInteger(studentUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid student_user_id is required',
        error: 'INVALID_STUDENT_ID'
      });
    }

    // Get mentor's mentor_id
    const profile = await trainingApp.getUserProfile(req.user.id);
    if (profile.error || !profile.profile?.mentor_id) {
      return res.status(400).json({
        success: false,
        message: 'User does not have mentor_id',
        error: 'NO_MENTOR_ID'
      });
    }

    const result = await trainingApp.removeStudentFromMentor(profile.profile.mentor_id, studentUserId);
    
    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error,
        error: 'REMOVE_STUDENT_FAILED'
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Remove student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while removing student',
      error: 'SERVER_ERROR'
    });
  }
});

/**
 * ROUTE: Get mentor's students list
 */
app.get('/api/mentor/students', authenticateToken, async (req, res) => {
  try {
    // Get mentor's mentor_id
    const profile = await trainingApp.getUserProfile(req.user.id);
    
    if (profile.error || !profile.profile?.mentor_id) {
      return res.status(400).json({
        success: false,
        message: 'User does not have mentor_id',
        error: 'NO_MENTOR_ID'
      });
    }

    const result = await trainingApp.getStudentsByMentor(profile.profile.mentor_id);
    
    if (result.error) {
      return res.status(400).json({
        success: false,
        message: 'GET_STUDENTS_FAILED',
        error: 'GET_STUDENTS_FAILED'
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting students',
      error: 'SERVER_ERROR'
    });
  }
});

/**
 * ROUTE: Lấy exercises của student (chỉ dành cho mentor)
 */
app.get('/api/mentor/student-exercises/:student_user_id', authenticateToken, async (req, res) => {
  try {
    const studentUserId = parseInt(req.params.student_user_id);
    const mentorUserId = req.user.id;

    if (!studentUserId || isNaN(studentUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid student user ID is required',
        error: 'INVALID_STUDENT_ID'
      });
    }

    const workoutData = await trainingApp.getUserWorkout(studentUserId, mentorUserId);
    
    if (workoutData.error) {
      return res.status(403).json({
        success: false,
        message: workoutData.error,
        error: 'GET_STUDENT_EXERCISES_FAILED'
      });
    }

    res.json({
      success: true,
      exercises: workoutData.exercises || null,
      student_user_id: studentUserId,
      message: 'Student exercises retrieved successfully'
    });
  } catch (error) {
    console.error('Get student exercises error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting student exercises',
      error: 'SERVER_ERROR'
    });
  }
});

/**
 * ROUTE: Cập nhật exercises của student (chỉ dành cho mentor)
 */
app.put('/api/mentor/student-exercises/:student_user_id', authenticateToken, async (req, res) => {
  try {
    const studentUserId = parseInt(req.params.student_user_id);
    const mentorUserId = req.user.id;
    const { exercises } = req.body;

    if (!studentUserId || isNaN(studentUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid student user ID is required',
        error: 'INVALID_STUDENT_ID'
      });
    }

    if (!exercises || typeof exercises !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Exercises data is required and must be an object',
        error: 'INVALID_EXERCISES'
      });
    }

    // Cập nhật exercises qua TrainingApp với kiểm tra mentor permission
    const updateResult = await trainingApp.updateUserWorkout(studentUserId, exercises, mentorUserId);

    if (updateResult.error) {
      return res.status(403).json({
        success: false,
        message: updateResult.error,
        error: 'UPDATE_STUDENT_EXERCISES_FAILED'
      });
    }

    res.json({
      success: true,
      message: 'Student exercises updated successfully',
      student_user_id: studentUserId,
      data: updateResult
    });
  } catch (error) {
    console.error('Update student exercises error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating student exercises',
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
 * ROUTE: Get default exercises (reset to default)
 */
app.get('/api/user/exercises/default', authenticateToken, async (req, res) => {
  try {
    // Return default/empty exercises structure
    const defaultExercises = {
      "FullBodyMale": {},
      "FullBodyFemale": {},
      "FullBodyPers": {},
      "Calisthenic": {},
      "pika": {}
    };

    res.json({
      success: true,
      exercises: defaultExercises,
      message: 'Default exercises retrieved successfully'
    });
  } catch (error) {
    console.error('Get default exercises error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting default exercises',
      error: 'SERVER_ERROR'
    });
  }
});

/**
 * ROUTE: Reset user exercises to default
 */
app.delete('/api/user/exercises', authenticateToken, async (req, res) => {
  try {
    // Delete user's custom program to reset to default
    const deleteResult = await trainingApp.deleteUserProgram(req.user.id);
    
    if (deleteResult.error) {
      return res.status(400).json({
        success: false,
        message: deleteResult.error,
        error: 'DELETE_FAILED'
      });
    }

    res.json({
      success: true,
      message: 'User exercises reset to default successfully',
      data: deleteResult
    });
  } catch (error) {
    console.error('Reset user exercises error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while resetting exercises',
      error: 'SERVER_ERROR'
    });
  }
});

/**
 * ROUTE: Thêm lịch sử tập luyện
 */
app.post('/api/user/workout-history', authenticateToken, async (req, res) => {
  try {
    const { exercise_name, exercise_data, completed, duration } = req.body;

    if (!exercise_name) {
      return res.status(400).json({
        success: false,
        message: 'Exercise name is required',
        error: 'MISSING_EXERCISE_NAME'
      });
    }

    const result = await trainingApp.addWorkoutHistory(
      req.user.id, 
      exercise_name, 
      exercise_data, 
      completed, 
      duration
    );

    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error,
        error: 'ADD_HISTORY_FAILED'
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Add workout history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding workout history',
      error: 'SERVER_ERROR'
    });
  }
});

/**
 * ROUTE: Lấy lịch sử tập luyện
 */
app.get('/api/user/workout-history', authenticateToken, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;

    const result = await trainingApp.getUserWorkoutHistory(req.user.id, limit);

    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error,
        error: 'GET_HISTORY_FAILED'
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Get workout history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting workout history',
      error: 'SERVER_ERROR'
    });
  }
});

/**
 * ROUTE: Lấy workout templates
 */
app.get('/api/workout-templates', async (req, res) => {
  try {
    const gender = req.query.gender;

    const result = await trainingApp.getWorkoutTemplates(gender);

    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error,
        error: 'GET_TEMPLATES_FAILED'
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Get workout templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting workout templates',
      error: 'SERVER_ERROR'
    });
  }
});

/**
 * ROUTE: Thêm workout template mới
 */
app.post('/api/workout-templates', authenticateToken, async (req, res) => {
  try {
    const templateData = req.body;

    if (!templateData.name || !templateData.exercises) {
      return res.status(400).json({
        success: false,
        message: 'Template name and exercises are required',
        error: 'MISSING_TEMPLATE_DATA'
      });
    }

    const result = await trainingApp.addWorkoutTemplate(templateData);

    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error,
        error: 'ADD_TEMPLATE_FAILED'
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Add workout template error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding workout template',
      error: 'SERVER_ERROR'
    });
  }
});

/**
 * ROUTE: Kiểm tra database schema
 */
app.get('/api/admin/database-schema', async (req, res) => {
  try {
    const result = await trainingApp.checkDatabaseSchema();

    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error,
        error: 'CHECK_SCHEMA_FAILED'
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Check database schema error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking database schema',
      error: 'SERVER_ERROR'
    });
  }
});

/**
 * ROUTE: Migrate database schema (force recreation)
 */
app.post('/api/admin/migrate-schema', async (req, res) => {
  try {
    console.log('Manual schema migration requested');
    
    await trainingApp.checkAndMigrateSchema();
    
    res.json({
      success: true,
      message: 'Database schema migration completed successfully'
    });
  } catch (error) {
    console.error('Manual schema migration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during schema migration',
      error: 'MIGRATION_ERROR'
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
    // Lấy profile để có mentor_id
    const profileResult = await trainingApp.getUserProfile(req.user.id, req.user);
    
    // Gọi TrainingApp để lấy dữ liệu workout (not exercise)
    const result = await trainingApp.handleRequest('/workout', 'GET', req.query, req.user);
    
    // Include mentor_id trong user info
    const userWithMentorId = {
      name: req.user.name || req.user.email,
      email: req.user.email,
      mentor_id: profileResult.profile ? profileResult.profile.mentor_id : null
    };
    
    res.json({
      success: true,
      data: {
        user: userWithMentorId,
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
 * ROUTE: Add student by mentor code (mentor adds student using student's code)
 */
app.post('/api/mentor/add-student-by-code', authenticateToken, async (req, res) => {
  try {
    const mentorUserId = req.user.id;
    const { student_code } = req.body;
    
    if (!student_code) {
      return res.status(400).json({
        success: false,
        error: 'Student mentor code is required'
      });
    }

    // Get mentor's profile to get their mentor_id
    const mentorProfile = await trainingApp.getUserProfile(mentorUserId);
    if (mentorProfile.error || !mentorProfile.profile?.mentor_id) {
      return res.status(400).json({
        success: false,
        error: 'Mentor does not have mentor_id'
      });
    }

    // Find student by their mentor_code
    const studentProfile = await new Promise((resolve) => {
      if (!trainingApp || !trainingApp.db) {
        resolve({ error: 'Database not available' });
        return;
      }
      
      trainingApp.db.get(
        'SELECT user_id, user_name, user_email FROM profiles WHERE mentor_id = ?',
        [student_code],
        (err, result) => {
          if (err) resolve({ error: err.message });
          else resolve(result);
        }
      );
    });

    if (!studentProfile) {
      return res.status(404).json({
        success: false,
        error: 'Student not found with this mentor code'
      });
    }

    if (studentProfile.error) {
      return res.status(500).json({
        success: false,
        error: studentProfile.error
      });
    }

    // Cannot add yourself as student
    if (studentProfile.user_id === mentorUserId) {
      return res.status(400).json({
        success: false,
        error: 'You cannot add yourself as a student'
      });
    }

    // Add student to mentor using mentor's mentor_id (not user_id)
    const result = await trainingApp.addStudentToMentor(mentorProfile.profile.mentor_id, studentProfile.user_id);
    
    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
    res.json({
      success: true,
      data: result,
      student: {
        name: studentProfile.user_name,
        email: studentProfile.user_email
      },
      message: `Successfully added ${studentProfile.user_name} as student`
    });
  } catch (error) {
    console.error('Error adding student by code:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * ROUTE: Update student custom name
 */
app.put('/api/mentor/update-student-name/:studentId', authenticateToken, async (req, res) => {
  try {
    const mentorUserId = req.user.id;
    const studentUserId = parseInt(req.params.studentId);
    const { custom_name } = req.body;
    
    // Get mentor's mentor_id
    const mentorProfile = await trainingApp.getUserProfile(mentorUserId, req.user);
    if (mentorProfile.error || !mentorProfile.profile?.mentor_id) {
      return res.status(400).json({
        success: false,
        error: 'Mentor profile not found'
      });
    }

    const result = await trainingApp.updateStudentCustomName(
      mentorProfile.profile.mentor_id, 
      studentUserId, 
      custom_name
    );
    
    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
    res.json({
      success: true,
      message: 'Student name updated successfully'
    });
  } catch (error) {
    console.error('Error updating student name:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * ROUTE: Update training program cho target user (mentor permission required)
 */
app.post('/api/mentor/update-student-program/:studentId', authenticateToken, async (req, res) => {
  try {
    const editorUserId = req.user.id;
    const targetUserId = parseInt(req.params.studentId);
    const programData = req.body;
    
    const result = await trainingApp.updateUserProgramAsEditor(editorUserId, targetUserId, programData);
    
    if (result.error) {
      return res.status(400).json({ 
        success: false,
        error: result.error 
      });
    }
    
    res.json({
      success: true,
      data: result,
      message: 'Student program updated successfully'
    });
  } catch (error) {
    console.error('Error updating student training program:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
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
    console.log('🚀 Starting Training Server...');
    
    // Database đã được setup trong constructor của TrainingApp
    console.log('✓ Database ready');
    
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
      console.log('   POST /api/user/generate-mentor-id - Generate unique mentor ID');
      console.log('   GET  /api/user/exercises - Get user exercises');
      console.log('   PUT  /api/user/exercises - Update user exercises');
      console.log('   DELETE /api/user/exercises - Reset exercises to default');
      console.log('   POST /api/user/workout-history - Add workout history');
      console.log('   GET  /api/user/workout-history - Get workout history');
      console.log('   GET  /api/workout-templates - Get workout templates');
      console.log('   POST /api/workout-templates - Add workout template');
      console.log('   GET  /api/admin/database-schema - Check database schema');
      console.log('   POST /api/admin/migrate-schema - Migrate database schema');
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
