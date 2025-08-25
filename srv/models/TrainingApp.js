const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Gộp BaseApp và TrainingApp thành một file duy nhất
class TrainingApp {
  constructor() {
    this.appName = 'training';
    this.dbPath = this.initializeDatabase();
    this.db = new sqlite3.Database(this.dbPath);
    this.setupDatabase();
  }

  // Khởi tạo database cho app - cập nhật để lưu ở ./db thay vì ./db/apps
  initializeDatabase() {
    const dbDir = path.join(__dirname, '..', 'db');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    const dbPath = path.join(dbDir, `${this.appName}.db3`);
    console.log(`Database path for ${this.appName}: ${dbPath}`);
    return dbPath;
  }

  // Setup database schema với 3 bảng riêng biệt
  setupDatabase() {
    this.db.serialize(() => {
      // Bảng profiles - thông tin user từ server
      this.db.run(`CREATE TABLE IF NOT EXISTS profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        user_email TEXT NOT NULL,
        user_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Bảng metrics - thông tin cá nhân của user
      this.db.run(`CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        gender TEXT DEFAULT 'o',
        weight REAL,
        height REAL,
        birthdate TEXT,
        activity_level TEXT DEFAULT 'moderate',
        fitness_goal TEXT DEFAULT 'maintain',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES profiles (user_id) ON DELETE CASCADE
      )`);

      // Bảng workouts - nội dung bài tập dạng Text (JSON)
      this.db.run(`CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        exercises TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES profiles (user_id) ON DELETE CASCADE
      )`);

      // Index cho performance
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_metrics_user_id ON metrics(user_id)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id)`);
    });

    console.log('Training database schema initialized');
  }

  // === DATABASE UTILITY METHODS ===
  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async all(sql, params = []) {
    return this.query(sql, params);
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // === USER PROFILE METHODS ===
  async ensureUserProfile(user) {
    const existing = await this.get('SELECT id FROM profiles WHERE user_id = ?', [user.id]);

    if (!existing) {
      console.log(`Creating user profile for user ${user.id}`);
      await this.run(
        'INSERT INTO profiles (user_id, user_email, user_name) VALUES (?, ?, ?)',
        [user.id, user.email, user.name]
      );
      
      // Tạo metrics mặc định cho user mới
      await this.run(
        'INSERT INTO metrics (user_id, gender, activity_level, fitness_goal) VALUES (?, ?, ?, ?)',
        [user.id, 'o', 'moderate', 'maintain']
      );
    } else {
      // Update user info if changed
      await this.run(
        'UPDATE profiles SET user_email = ?, user_name = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [user.email, user.name, user.id]
      );
    }
  }

  // Get user profile với thông tin từ cả 3 bảng
  async getUserProfile(userId = null, email = null) {
    try {
      // Lấy thông tin từ bảng profiles
      const profile = await this.get('SELECT * FROM profiles WHERE user_id = ? OR user_email = ?', [userId, email]);
      
      if (!profile) {
        return { error: 'User profile not found' };
      }

      // Lấy thông tin metrics
      const metrics = await this.get('SELECT * FROM metrics WHERE user_id = ?', [profile.user_id]);
      
      // Lấy danh sách workouts
      const workouts = await this.all('SELECT * FROM workouts WHERE user_id = ? ORDER BY created_at DESC', [profile.user_id]);

      return {
        success: true,
        profile: profile,
        metrics: metrics || {},
        workouts: workouts || [],
        message: 'User profile retrieved successfully'
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      return { error: 'Failed to get user profile' };
    }
  }

  // Update user profile với cấu trúc bảng mới
  async updateUserProfile(data, user) {
    try {
      // Update thông tin profile cơ bản
      if (data.name || data.email) {
        const profileFields = [];
        const profileValues = [];

        if (data.name) {
          profileFields.push('user_name = ?');
          profileValues.push(data.name);
        }

        if (data.email) {
          profileFields.push('user_email = ?');
          profileValues.push(data.email);
        }

        if (profileFields.length > 0) {
          profileFields.push('updated_at = CURRENT_TIMESTAMP');
          profileValues.push(user.id);

          const profileSql = `UPDATE profiles SET ${profileFields.join(', ')} WHERE user_id = ?`;
          await this.run(profileSql, profileValues);
        }
      }

      // Update thông tin metrics (chiều cao, cân nặng, giới tính...)
      const metricsFields = [];
      const metricsValues = [];

      if (data.gender) {
        metricsFields.push('gender = ?');
        metricsValues.push(data.gender);
      }

      if (data.weight !== undefined) {
        metricsFields.push('weight = ?');
        metricsValues.push(data.weight);
      }

      if (data.height !== undefined) {
        metricsFields.push('height = ?');
        metricsValues.push(data.height);
      }

      if (data.birthdate !== undefined) {
        metricsFields.push('birthdate = ?');
        metricsValues.push(data.birthdate);
      }

      if (data.activity_level) {
        metricsFields.push('activity_level = ?');
        metricsValues.push(data.activity_level);
      }

      if (data.fitness_goal) {
        metricsFields.push('fitness_goal = ?');
        metricsValues.push(data.fitness_goal);
      }

      if (metricsFields.length > 0) {
        metricsFields.push('updated_at = CURRENT_TIMESTAMP');
        metricsValues.push(user.id);

        const metricsSql = `UPDATE metrics SET ${metricsFields.join(', ')} WHERE user_id = ?`;
        await this.run(metricsSql, metricsValues);
      }

      // Nếu không có field nào để update
      if (metricsFields.length === 1 && (!data.name && !data.email)) {  // chỉ có updated_at
        return { error: 'No fields to update' };
      }

      return {
        success: true,
        message: 'User profile updated successfully'
      };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return { error: 'Failed to update user profile' };
    }
  }

  // === WORKOUT MANAGEMENT METHODS ===
  // Lưu workout data vào database
  async saveUserWorkout(userId, exercisesData) {
    try {
      const exercisesJson = typeof exercisesData === 'string' ? exercisesData : JSON.stringify(exercisesData);
      
      // Xóa workout cũ của user (chỉ giữ 1 bài tập mới nhất)
      await this.run('DELETE FROM workouts WHERE user_id = ?', [userId]);

      const result = await this.run(
        'INSERT INTO workouts (user_id, exercises) VALUES (?, ?)',
        [userId, exercisesJson]
      );

      return {
        success: true,
        workout_id: result.lastID,
        message: 'Workout saved successfully'
      };
    } catch (error) {
      console.error('Error saving workout:', error);
      return { error: 'Failed to save workout' };
    }
  }

  // Lấy workout data từ database
  async getUserWorkout(userId) {
    try {
      const workout = await this.get('SELECT * FROM workouts WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [userId]);
      
      if (!workout) {
        return { error: 'No workout found for user' };
      }

      // Parse JSON data và đặt vào exercises field
      const exercises = JSON.parse(workout.exercises);

      return {
        success: true,
        exercises: exercises,
        message: 'Workout retrieved successfully'
      };
    } catch (error) {
      console.error('Error getting workout:', error);
      return { error: 'Failed to get workout' };
    }
  }

  // === EXERCISES MANAGEMENT METHODS ===
  // Load user-specific data từ database hoặc fallback về file
  async getUserTrainingData(userId, gender = 'o') {
    try {
      console.log(`getUserTrainingData called for userId: ${userId}, gender: ${gender}`);
      
      // 1. Kiểm tra database trước
      console.log('Checking database for user workout...');
      const dbResult = await this.getUserWorkout(userId);
      
      if (dbResult.success) {
        console.log(`Loading training data from database for user ${userId}`);
        return dbResult.exercises;
      }

      // 2. Fallback về user-specific file (nếu có)
      const userFilePath = path.join(__dirname, '..', '..', 'user_data', `${userId}.json`);
      console.log(`Checking user-specific file: ${userFilePath}`);
      if (fs.existsSync(userFilePath)) {
        console.log(`Loading training data from user file for user ${userId}`);
        const userData = fs.readFileSync(userFilePath, 'utf8');
        return JSON.parse(userData);
      }

      // 3. Fallback về default Calisthenic data
      console.log(`Loading default Calisthenic data for user ${userId} (gender: ${gender})`);
      const defaultFilePath = path.join(__dirname, '..', '..', 'Calisthenic.json');
      console.log(`Checking default file: ${defaultFilePath}`);
      if (fs.existsSync(defaultFilePath)) {
        console.log('Default file found, loading...');
        const defaultData = fs.readFileSync(defaultFilePath, 'utf8');
        return JSON.parse(defaultData);
      }

      console.log('No training data found anywhere');
      throw new Error('No training data found');
    } catch (error) {
      console.error('Error loading training data:', error);
      throw error;
    }
  }

  // === MAIN REQUEST HANDLER ===
  async handleRequest(endpoint, method, data, user) {
    // console.log(`Training app handling: ${method} ${endpoint}`);
    
    try {
      // Đảm bảo user profile tồn tại
      await this.ensureUserProfile(user);

      switch (endpoint) {
        case '/profile':
          if (method === 'GET') {
            return await this.getUserProfile(user.id);
          } else if (method === 'PUT') {
            return await this.updateUserProfile(data, user);
          }
          break;

        case '/workout':
          if (method === 'GET') {
            const trainingData = await this.getUserTrainingData(user.id, data?.gender);
            return { success: true, exercises: trainingData };
          } else if (method === 'POST') {
            return await this.saveUserWorkout(user.id, data.exercises);
          }
          break;

        case '/workouts':
          if (method === 'GET') {
            return await this.getUserWorkout(user.id);
          }
          break;

        default:
          return { error: 'Endpoint not found' };
      }
    } catch (error) {
      console.error('Error in handleRequest:', error);
      return { error: 'Internal server error' };
    }
  }

  // Đóng database connection
  close() {
    this.db.close();
  }
}

module.exports = TrainingApp;
