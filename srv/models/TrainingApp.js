const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// TrainingApp với database schema mới theo yêu cầu
class TrainingApp {
  constructor() {
    this.appName = 'training';
    this.dbPath = this.initializeDatabase();
    this.db = new sqlite3.Database(this.dbPath);
    this.setupDatabase();
  }

  // Khởi tạo database 
  initializeDatabase() {
    const dbDir = path.join(__dirname, '..', 'db');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    const dbPath = path.join(dbDir, `${this.appName}.db3`);
    console.log(`Database path: ${dbPath}`);
    return dbPath;
  }

  // Setup database schema mới
  setupDatabase() {
    this.db.serialize(() => {
      console.log('Setting up database schema...');

      // 1. Bảng profiles - Thông tin cơ bản của user
      this.db.run(`CREATE TABLE IF NOT EXISTS profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        user_email TEXT NOT NULL UNIQUE,
        user_name TEXT NOT NULL,
        gender TEXT DEFAULT 'o', -- 'm' = male, 'f' = female, 'o' = other
        birthdate DATE, -- ngày sinh của user
        mentor_id TEXT, -- ID để cung cấp cho khách hàng add vào danh sách mentor
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // 2. Bảng metrics - Chiều cao, cân nặng theo thời gian
      this.db.run(`CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        height REAL, -- chiều cao (cm)
        weight REAL, -- cân nặng (kg)
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- thời điểm cập nhật
        FOREIGN KEY (user_id) REFERENCES profiles (user_id) ON DELETE CASCADE
      )`);

      // 3. Bảng histo - Lịch sử tập luyện chi tiết
      this.db.run(`CREATE TABLE IF NOT EXISTS histo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        exercise_id TEXT NOT NULL, -- ID của bài tập
        exercise_name TEXT NOT NULL, -- tên bài tập
        progress_status TEXT NOT NULL, -- trạng thái tiến độ hoặc 'done' nếu hoàn thành
        workout_time INTEGER, -- thời gian tập (phút)
        workout_date DATE NOT NULL, -- ngày tập
        notes TEXT, -- ghi chú
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- thời gian tạo record
        FOREIGN KEY (user_id) REFERENCES profiles (user_id) ON DELETE CASCADE
      )`);

      // 4. Bảng progs - Chương trình tập luyện
      this.db.run(`CREATE TABLE IF NOT EXISTS progs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        exercises TEXT NOT NULL, -- JSON string chứa nội dung exercises
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES profiles (user_id) ON DELETE CASCADE
      )`);

      // 5. Bảng mentors - Quản lý mối quan hệ mentor-học viên
      this.db.run(`CREATE TABLE IF NOT EXISTS mentors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mentor_id TEXT NOT NULL, -- ID của mentor
        student_user_id INTEGER NOT NULL, -- user_id của học viên
        custom_name TEXT, -- tên tùy chỉnh cho học viên (mentor có thể đặt)
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_user_id) REFERENCES profiles (user_id) ON DELETE CASCADE,
        UNIQUE(mentor_id, student_user_id) -- Đảm bảo không duplicate relationship
      )`);

      // 6. Bảng prime - Quản lý quyền mentor và giới hạn
      this.db.run(`CREATE TABLE IF NOT EXISTS prime (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE, -- user_id của người có prime
        mentor_id TEXT NOT NULL, -- mentor_id của user này
        max_students INTEGER NOT NULL DEFAULT 3, -- số lượng student tối đa có thể mentor (-1 = unlimited)
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES profiles (user_id) ON DELETE CASCADE,
        FOREIGN KEY (mentor_id) REFERENCES profiles (mentor_id) ON DELETE CASCADE
      )`);

      console.log('Database schema created successfully');
      
      // Tạo indexes sau khi tạo xong tất cả bảng
      this.createIndexes();
    });
  }

  // Tạo indexes sau khi bảng đã tồn tại
  createIndexes() {
    console.log('Creating indexes...');
    
    // Tạo indexes trong serialize để đảm bảo bảng đã được tạo
    this.db.run('CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(user_email)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_metrics_user_id ON metrics(user_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_histo_user_id ON histo(user_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_histo_date ON histo(workout_date)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_progs_user_id ON progs(user_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_mentors_mentor_id ON mentors(mentor_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_prime_user_id ON prime(user_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_prime_mentor_id ON prime(mentor_id)');
    
    console.log('Indexes created successfully');
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

  // === PROFILES METHODS ===
  
  // Tạo profile mới
  async createProfile(profileData) {
    const { user_id, user_email, user_name, gender, mentor_id } = profileData;
    
    try {
      const result = await this.run(
        `INSERT INTO profiles (user_id, user_email, user_name, gender, mentor_id) 
         VALUES (?, ?, ?, ?, ?)`,
        [user_id, user_email, user_name, gender || 'o', mentor_id || null]
      );
      
      // Profile created successfully
      return { success: true, user_id, id: result.lastID };
    } catch (error) {
      console.error('Error creating profile:', error);
      return { error: 'Failed to create profile', details: error.message };
    }
  }

  // Lấy profile theo user_id
  async getProfile(user_id) {
    try {
      const profile = await this.get('SELECT * FROM profiles WHERE user_id = ?', [user_id]);
      return profile || null;
    } catch (error) {
      console.error('Error getting profile:', error);
      return null;
    }
  }

  // Cập nhật profile
  async updateProfile(user_id, updateData) {
    const { user_email, user_name, gender, mentor_id } = updateData;
    
    try {
      const result = await this.run(
        `UPDATE profiles SET user_email = ?, user_name = ?, gender = ?, mentor_id = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = ?`,
        [user_email, user_name, gender, mentor_id, user_id]
      );
      
      if (result.changes > 0) {
        return { success: true, message: 'Profile updated successfully' };
      } else {
        return { error: 'Profile not found' };
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      return { error: 'Failed to update profile', details: error.message };
    }
  }

  // === METRICS METHODS ===
  
  // Thêm metrics mới (chiều cao, cân nặng)
  async addMetrics(user_id, height, weight) {
    try {
      const result = await this.run(
        'INSERT INTO metrics (user_id, height, weight) VALUES (?, ?, ?)',
        [user_id, height, weight]
      );
      
      // Metrics added successfully
      return { success: true, id: result.lastID };
    } catch (error) {
      console.error('Error adding metrics:', error);
      return { error: 'Failed to add metrics', details: error.message };
    }
  }

  // Lấy metrics mới nhất của user
  async getLatestMetrics(user_id) {
    try {
      const metrics = await this.get(
        'SELECT * FROM metrics WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
        [user_id]
      );
      return metrics || null;
    } catch (error) {
      console.error('Error getting latest metrics:', error);
      return null;
    }
  }

  // Lấy lịch sử metrics của user
  async getMetricsHistory(user_id, limit = 50) {
    try {
      const metrics = await this.query(
        'SELECT * FROM metrics WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?',
        [user_id, limit]
      );
      return metrics;
    } catch (error) {
      console.error('Error getting metrics history:', error);
      return [];
    }
  }

  // === HISTO METHODS ===
  
  // Thêm lịch sử tập luyện
  async addWorkoutHistory(historyData) {
    const { user_id, exercise_id, exercise_name, progress_status, workout_time, workout_date, notes } = historyData;
    
    try {
      const result = await this.run(
        `INSERT INTO histo (user_id, exercise_id, exercise_name, progress_status, workout_time, workout_date, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [user_id, exercise_id, exercise_name, progress_status, workout_time, workout_date, notes || null]
      );
      
      // Workout history added successfully
      return { success: true, id: result.lastID };
    } catch (error) {
      console.error('Error adding workout history:', error);
      return { error: 'Failed to add workout history', details: error.message };
    }
  }

  // Lấy lịch sử tập luyện của user
  async getWorkoutHistory(user_id, limit = 100) {
    try {
      const history = await this.query(
        'SELECT * FROM histo WHERE user_id = ? ORDER BY workout_date DESC, created_at DESC LIMIT ?',
        [user_id, limit]
      );
      return history;
    } catch (error) {
      console.error('Error getting workout history:', error);
      return [];
    }
  }

  // Lấy lịch sử tập luyện theo ngày
  async getWorkoutHistoryByDate(user_id, workout_date) {
    try {
      const history = await this.query(
        'SELECT * FROM histo WHERE user_id = ? AND workout_date = ? ORDER BY created_at DESC',
        [user_id, workout_date]
      );
      return history;
    } catch (error) {
      console.error('Error getting workout history by date:', error);
      return [];
    }
  }

  // Cập nhật trạng thái bài tập
  async updateExerciseProgress(histo_id, progress_status, notes = null) {
    try {
      const result = await this.run(
        'UPDATE histo SET progress_status = ?, notes = ? WHERE id = ?',
        [progress_status, notes, histo_id]
      );
      
      if (result.changes > 0) {
        return { success: true, message: 'Exercise progress updated' };
      } else {
        return { error: 'Workout history record not found' };
      }
    } catch (error) {
      console.error('Error updating exercise progress:', error);
      return { error: 'Failed to update exercise progress', details: error.message };
    }
  }

  // === PROGS METHODS ===
  
  // Kiểm tra quyền mentor có thể edit program của student
  async canMentorEditStudent(mentor_user_id, student_user_id) {
    try {
      // Nếu edit chính mình thì luôn được phép
      if (mentor_user_id === student_user_id) {
        return { allowed: true, reason: 'self' };
      }

      // Lấy mentor_id của mentor (từ profiles)
      const mentorProfile = await this.get('SELECT mentor_id FROM profiles WHERE user_id = ?', [mentor_user_id]);
      if (!mentorProfile || !mentorProfile.mentor_id) {
        return { allowed: false, reason: 'Mentor not found or has no mentor_id' };
      }

      // Kiểm tra xem student có trong danh sách students của mentor này không
      // Bảng mentors có: mentor_id (TEXT) và student_user_id (INTEGER)
      const mentorRelation = await this.get(
        'SELECT id FROM mentors WHERE mentor_id = ? AND student_user_id = ?',
        [mentorProfile.mentor_id, student_user_id]
      );

      if (!mentorRelation) {
        return { allowed: false, reason: 'You are not the mentor of this student' };
      }

      return { allowed: true, reason: 'mentor_relation_found' };
    } catch (error) {
      console.error('Error checking mentor permission:', error);
      return { allowed: false, reason: 'Database error: ' + error.message };
    }
  }

  // Lưu chương trình tập luyện (với kiểm tra quyền mentor)
  async saveProgram(user_id, exercises, mentor_user_id = null) {
    const exercisesJson = typeof exercises === 'string' ? exercises : JSON.stringify(exercises);
    
    try {
      // Nếu có mentor_user_id, kiểm tra quyền trước khi lưu
      if (mentor_user_id && mentor_user_id !== user_id) {
        const permission = await this.canMentorEditStudent(mentor_user_id, user_id);
        if (!permission.allowed) {
          return { error: `Permission denied: ${permission.reason}` };
        }
        // Permission granted for mentor
      }
      // Kiểm tra xem user đã có program chưa
      const existingProg = await this.get('SELECT id FROM progs WHERE user_id = ?', [user_id]);
      
      if (existingProg) {
        // Update existing program
        const result = await this.run(
          'UPDATE progs SET exercises = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
          [exercisesJson, user_id]
        );
        
        return { success: true, message: 'Program updated', id: existingProg.id };
      } else {
        // Create new program
        const result = await this.run(
          'INSERT INTO progs (user_id, exercises) VALUES (?, ?)',
          [user_id, exercisesJson]
        );
        
        return { success: true, message: 'Program created', id: result.lastID };
      }
    } catch (error) {
      console.error('Error saving program:', error);
      return { error: 'Failed to save program', details: error.message };
    }
  }

  // Lấy chương trình tập luyện của user (với kiểm tra quyền mentor)
  async getProgram(user_id, mentor_user_id = null) {
    try {
      // Nếu có mentor_user_id, kiểm tra quyền trước khi lấy
      if (mentor_user_id && mentor_user_id !== user_id) {
        const permission = await this.canMentorEditStudent(mentor_user_id, user_id);
        if (!permission.allowed) {
          return { error: `Permission denied: ${permission.reason}` };
        }
        // Permission granted for mentor
      }

      const program = await this.get('SELECT * FROM progs WHERE user_id = ?', [user_id]);
      
      if (program) {
        // Parse JSON exercises
        try {
          program.exercises = JSON.parse(program.exercises);
        } catch (e) {
          console.warn('Failed to parse exercises JSON for user', user_id);
        }
      }
      
      return program || null;
    } catch (error) {
      console.error('Error getting program:', error);
      return null;
    }
  }

  // === MENTORS METHODS ===
  
  // Thêm mối quan hệ mentor-học viên
  async addMentorStudent(mentor_id, student_user_id) {
    try {
      const result = await this.run(
        'INSERT INTO mentors (mentor_id, student_user_id) VALUES (?, ?)',
        [mentor_id, student_user_id]
      );
      
      // Mentor relationship added successfully
      return { success: true, id: result.lastID };
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return { error: 'Mentor-student relationship already exists' };
      }
      console.error('Error adding mentor-student relationship:', error);
      return { error: 'Failed to add mentor-student relationship', details: error.message };
    }
  }

  // Lấy danh sách học viên của mentor
  async getMentorStudents(mentor_id) {
    try {
      const students = await this.query(`
        SELECT p.*, m.created_at as relationship_created_at 
        FROM mentors m 
        JOIN profiles p ON m.student_user_id = p.user_id 
        WHERE m.mentor_id = ? 
        ORDER BY m.created_at DESC
      `, [mentor_id]);
      
      return students;
    } catch (error) {
      console.error('Error getting mentor students:', error);
      return [];
    }
  }

  // Lấy thông tin mentor của học viên
  async getStudentMentor(student_user_id) {
    try {
      const mentorRelation = await this.get(
        'SELECT mentor_id, created_at FROM mentors WHERE student_user_id = ?',
        [student_user_id]
      );
      return mentorRelation || null;
    } catch (error) {
      console.error('Error getting student mentor:', error);
      return null;
    }
  }

  // Xóa mối quan hệ mentor-học viên
  async removeMentorStudent(mentor_id, student_user_id) {
    try {
      const result = await this.run(
        'DELETE FROM mentors WHERE mentor_id = ? AND student_user_id = ?',
        [mentor_id, student_user_id]
      );
      
      if (result.changes > 0) {
        // Mentor relationship removed successfully
        return { success: true, message: 'Mentor-student relationship removed' };
      } else {
        return { error: 'Mentor-student relationship not found' };
      }
    } catch (error) {
      console.error('Error removing mentor-student relationship:', error);
      return { error: 'Failed to remove mentor-student relationship', details: error.message };
    }
  }

  // === UTILITY METHODS ===
  
  // Lấy thống kê tổng quan
  async getDatabaseStats() {
    try {
      const stats = {};
      
      stats.profiles = await this.get('SELECT COUNT(*) as count FROM profiles');
      stats.metrics = await this.get('SELECT COUNT(*) as count FROM metrics');
      stats.histo = await this.get('SELECT COUNT(*) as count FROM histo');
      stats.progs = await this.get('SELECT COUNT(*) as count FROM progs');
      stats.mentors = await this.get('SELECT COUNT(*) as count FROM mentors');
      
      return {
        profiles_count: stats.profiles.count,
        metrics_count: stats.metrics.count,
        workout_history_count: stats.histo.count,
        programs_count: stats.progs.count,
        mentor_relationships_count: stats.mentors.count
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return { error: 'Failed to get database statistics' };
    }
  }

  // Kiểm tra schema database
  async checkNewDatabaseSchema() {
    try {
      const tables = ['profiles', 'metrics', 'histo', 'progs', 'mentors'];
      const schema = {};
      
      for (const table of tables) {
        const tableInfo = await this.query(`PRAGMA table_info(${table})`);
        schema[table] = {
          exists: tableInfo.length > 0,
          columns: tableInfo.map(col => ({ 
            name: col.name, 
            type: col.type, 
            notnull: col.notnull,
            pk: col.pk 
          }))
        };
      }
      
      return {
        success: true,
        schema: schema,
        message: 'New database schema information retrieved'
      };
    } catch (error) {
      console.error('Error checking new database schema:', error);
      return { error: 'Failed to check new database schema' };
    }
  }

  // Đóng kết nối database
  close() {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Database connection closed');
        }
        resolve();
      });
    });
  }

  // ===== UTILITY METHODS =====

  /**
   * Generate unique mentor ID
   * @returns {string} Unique mentor ID
   */
  generateMentorId() {
    // Tạo mentor ID từ timestamp + random (không chứa user_id để bảo mật)
    const timestamp = Date.now().toString(36);
    const random1 = Math.random().toString(36).substr(2, 4);
    const random2 = Math.random().toString(36).substr(2, 4);
    return `${timestamp}${random1}${random2}`.toUpperCase();
  }

  /**
   * Check if mentor ID is unique
   * @param {string} mentorId - Mentor ID to check
   * @returns {Promise<boolean>} True if unique, false if exists
   */
  async isMentorIdUnique(mentorId) {
    return new Promise((resolve) => {
      this.db.get(
        'SELECT id FROM profiles WHERE mentor_id = ?',
        [mentorId],
        (err, result) => {
          if (err) {
            console.error('Error checking mentor ID uniqueness:', err);
            resolve(false);
            return;
          }
          resolve(!result); // true if no result (unique)
        }
      );
    });
  }

  // ===== SERVER INTERFACE METHODS =====

  /**
   * Handle HTTP requests from server
   * @param {string} path - Request path
   * @param {string} method - HTTP method
   * @param {object} params - Request parameters
   * @param {object} user - User info from authentication
   * @returns {Promise<object>} Response data
   */
  async handleRequest(path, method, params, user) {
    try {
      switch (path) {
        case '/workout':
          if (method === 'GET') {
            return await this.getWorkoutData(user.id, params);
          }
          break;
        
        case '/profile':
          if (method === 'GET') {
            return await this.getUserProfile(user.id);
          } else if (method === 'POST' || method === 'PUT') {
            return await this.updateUserProfile(user.id, params);
          }
          break;
        
        case '/metrics':
          if (method === 'GET') {
            return await this.getUserMetrics(user.id);
          } else if (method === 'POST') {
            return await this.addUserMetrics(user.id, params);
          }
          break;
        
        case '/history':
          if (method === 'GET') {
            return await this.getUserHistory(user.id);
          } else if (method === 'POST') {
            return await this.addWorkoutHistory(user.id, params);
          }
          break;
        
        default:
          return { error: 'Endpoint not found', path, method };
      }
    } catch (error) {
      console.error(`Error handling request ${method} ${path}:`, error);
      return { error: error.message };
    }
  }

  /**
   * Create user profile automatically with unique mentor ID
   * @param {number} userId - User ID
   * @param {string} userEmail - User email
   * @param {string} userName - User name
   * @returns {Promise<object>} Create result
   */
  async createUserProfile(userId, userEmail, userName) {
    try {
      // Generate unique mentor ID
      let mentorId;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 5;

      while (!isUnique && attempts < maxAttempts) {
        mentorId = this.generateMentorId();
        isUnique = await this.isMentorIdUnique(mentorId);
        attempts++;
      }

      if (!isUnique) {
        return { error: 'Failed to generate unique mentor ID' };
      }

      return new Promise((resolve) => {
        // Lưu reference đến database để tránh context loss trong nested callbacks
        const db = this.db;
        
        // Bắt đầu transaction để tạo cả profile và prime
        db.serialize(() => {
          db.run('BEGIN TRANSACTION');

          // Tạo profile trước
          db.run(
            `INSERT INTO profiles (user_id, user_email, user_name, gender, mentor_id) 
             VALUES (?, ?, ?, 'o', ?)`,
            [userId, userEmail, userName, mentorId],
            function(err) {
              if (err) {
                console.error('Error creating user profile:', err);
                db.run('ROLLBACK');
                resolve({ error: err.message });
                return;
              }

              const profileId = this.lastID;

              // Tự động tạo prime với max_students = 1 cho user mới
              db.run(
                `INSERT INTO prime (user_id, mentor_id, max_students) VALUES (?, ?, ?)`,
                [userId, mentorId, 1],
                function(primeErr) {
                  if (primeErr) {
                    console.error('Error creating prime for new user:', primeErr);
                    db.run('ROLLBACK');
                    resolve({ error: 'Failed to create prime: ' + primeErr.message });
                    return;
                  }

                  console.log(`✅ Auto-created prime for new user ${userId} with max_students = 1`);

                  // Commit transaction nếu cả 2 đều thành công
                  db.run('COMMIT', function(commitErr) {
                    if (commitErr) {
                      console.error('Error committing transaction:', commitErr);
                      resolve({ error: commitErr.message });
                      return;
                    }

                    resolve({
                      success: true,
                      id: profileId,
                      mentor_id: mentorId,
                      prime_created: true,
                      max_students: 1,
                      message: 'Profile created successfully with mentor ID and prime status (max 1 student)'
                    });
                  });
                }
              );
            }
          );
        });
      });
    } catch (error) {
      console.error('Error in createUserProfile:', error);
      return { error: error.message };
    }
  }

  /**
   * Get user profile information (auto-create if not exists)
   * @param {number} userId - User ID
   * @param {object} userInfo - User info from OAuth {email, name}
   * @returns {Promise<object>} User profile data
   */
  async getUserProfile(userId, userInfo = null) {
    return new Promise((resolve) => {
      this.db.get(
        'SELECT * FROM profiles WHERE user_id = ?',
        [userId],
        async (err, profile) => {
          if (err) {
            console.error('Error getting user profile:', err);
            resolve({ error: err.message });
            return;
          }

          // If profile doesn't exist, create it automatically
          if (!profile && userInfo) {
            // Creating new profile
            const createResult = await this.createUserProfile(userId, userInfo.email, userInfo.name || userInfo.email);
            
            if (createResult.error) {
              resolve({ error: createResult.error });
              return;
            }

            // Get the newly created profile
            this.db.get(
              'SELECT * FROM profiles WHERE user_id = ?',
              [userId],
              (err, newProfile) => {
                if (err || !newProfile) {
                  resolve({ error: 'Failed to retrieve created profile' });
                  return;
                }
                
                resolve({
                  profile: newProfile,
                  metrics: null,
                  isNewProfile: true
                });
              }
            );
            return;
          }

          if (!profile) {
            resolve({ error: 'Profile not found' });
            return;
          }

          // Đảm bảo user có prime (tạo tự động nếu chưa có)
          this.ensureUserPrime(userId).then(primeResult => {
            // Get latest metrics
            this.db.get(
              'SELECT * FROM metrics WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
              [userId],
              (err, metrics) => {
                if (err) {
                  console.error('Error getting user metrics:', err);
                }

                resolve({
                  profile,
                  metrics: metrics || null,
                  prime_ensured: primeResult.success
                });
              }
            );
          }).catch(primeErr => {
            console.error('Error ensuring prime for user:', primeErr);
            // Vẫn trả về profile nếu prime creation thất bại
            this.db.get(
              'SELECT * FROM metrics WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
              [userId],
              (err, metrics) => {
                if (err) {
                  console.error('Error getting user metrics:', err);
                }

                resolve({
                  profile,
                  metrics: metrics || null,
                  prime_ensured: false,
                  prime_error: primeErr.message
                });
              }
            );
          });
        }
      );
    });
  }

  /**
   * Get workout data for user (mentor gets own + students' exercises)
   * @param {number} userId - User ID  
   * @param {object} params - Query parameters
   * @returns {Promise<object>} Workout data
   */
  async getWorkoutData(userId, params = {}) {
    try {
      // Get user's mentor_id and check if they have students
      const userProfile = await new Promise((resolve) => {
        this.db.get(
          `SELECT mentor_id, 
                  (SELECT COUNT(*) FROM mentors WHERE mentor_id = profiles.mentor_id) as student_count
           FROM profiles WHERE user_id = ?`,
          [userId],
          (err, result) => {
            if (err) resolve({ error: err.message });
            else resolve(result);
          }
        );
      });

      if (userProfile.error) return userProfile;
      if (!userProfile) return { error: 'User not found' };

      let allUserIds = [userId]; // Start with current user

      // If user is mentor with students, include their IDs
      if (userProfile.mentor_id && userProfile.student_count > 0) {
        const students = await new Promise((resolve) => {
          this.db.all(
            'SELECT student_user_id FROM mentors WHERE mentor_id = ?',
            [userProfile.mentor_id],
            (err, results) => {
              if (err) resolve({ error: err.message });
              else resolve(results.map(r => r.student_user_id));
            }
          );
        });

        if (students.error) return students;
        allUserIds = allUserIds.concat(students);
      }

      // Get programs for all relevant users
      const programs = await new Promise((resolve) => {
        const placeholders = allUserIds.map(() => '?').join(',');
        this.db.all(
          `SELECT p.*, pr.user_name, pr.user_email 
           FROM progs p
           JOIN profiles pr ON p.user_id = pr.user_id
           WHERE p.user_id IN (${placeholders}) 
           ORDER BY p.created_at DESC`,
          allUserIds,
          (err, results) => {
            if (err) resolve({ error: err.message });
            else resolve(results);
          }
        );
      });

      if (programs.error) return programs;

      // Parse JSON exercises and organize by user
      let exercises = {};
      let exercisesByUser = {};
      
      if (programs.length > 0) {
        programs.forEach(prog => {
          try {
            if (prog.exercises) {
              const progExercises = JSON.parse(prog.exercises);
              if (typeof progExercises === 'object' && progExercises !== null) {
                // Merge into main exercises object
                exercises = { ...exercises, ...progExercises };
                
                // Also organize by user for frontend selection
                if (!exercisesByUser[prog.user_id]) {
                  exercisesByUser[prog.user_id] = {
                    user_name: prog.user_name,
                    user_email: prog.user_email,
                    exercises: {}
                  };
                }
                exercisesByUser[prog.user_id].exercises = { 
                  ...exercisesByUser[prog.user_id].exercises, 
                  ...progExercises 
                };
              }
            }
          } catch (parseErr) {
            console.error('Error parsing exercises JSON:', parseErr);
          }
        });
      }
      
      // If no exercises found, return empty structure for frontend compatibility
      if (Object.keys(exercises).length === 0) {
        exercises = {
          "FullBodyMale": {},
          "FullBodyFemale": {},
          "FullBodyPers": {},
          "Calisthenic": {},
          "pika": {}
        };
      }

      return {
        programs,
        exercises, // Combined exercises for main view
        exercises_by_user: exercisesByUser, // Organized by user for selection
        is_mentor: userProfile.student_count > 0,
        student_count: userProfile.student_count,
        total: programs.length
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Update user profile
   * @param {number} userId - User ID
   * @param {object} profileData - Profile data to update
   * @returns {Promise<object>} Update result
   */
  async updateUserProfile(userId, profileData) {
    return new Promise((resolve) => {
      const { user_name, gender, birthdate } = profileData;
      
      this.db.run(
        `UPDATE profiles 
         SET user_name = COALESCE(?, user_name),
             gender = COALESCE(?, gender), 
             birthdate = COALESCE(?, birthdate),
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [user_name, gender, birthdate, userId],
        function(err) {
          if (err) {
            console.error('Error updating profile:', err);
            resolve({ error: err.message });
            return;
          }

          resolve({ 
            success: true, 
            changes: this.changes,
            message: 'Profile updated successfully' 
          });
        }
      );
    });
  }

  /**
   * Get user's workout exercises (với kiểm tra quyền mentor)
   * @param {number} userId - User ID
   * @param {number} mentorUserId - Mentor User ID (optional)
   * @returns {Promise<object>} User workout data
   */
  async getUserWorkout(userId, mentorUserId = null) {
    // Nếu có mentorUserId, kiểm tra quyền trước
    if (mentorUserId && mentorUserId !== userId) {
      const permission = await this.canMentorEditStudent(mentorUserId, userId);
      if (!permission.allowed) {
        return { error: `Permission denied: ${permission.reason}` };
      }
      // Permission granted for mentor
    }
    return new Promise((resolve) => {
      this.db.get(
        'SELECT * FROM progs WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        [userId],
        (err, program) => {
          if (err) {
            console.error('Error getting user workout:', err);
            resolve({ error: err.message });
            return;
          }

          if (!program) {
            resolve({ error: 'No workout program found' });
            return;
          }

          try {
            const exercises = program.exercises ? JSON.parse(program.exercises) : [];
            resolve({
              program,
              exercises,
              total: exercises.length
            });
          } catch (parseErr) {
            console.error('Error parsing workout exercises:', parseErr);
            resolve({ error: 'Invalid workout data format' });
          }
        }
      );
    });
  }

  /**
   * Update user's workout exercises (wrapper for saveProgram với mentor check)
   * @param {number} userId - User ID
   * @param {object} exercises - Exercise data
   * @param {number} mentorUserId - Mentor User ID (optional)
   * @returns {Promise<object>} Update result
   */
  async updateUserWorkout(userId, exercises, mentorUserId = null) {
    return await this.saveProgram(userId, exercises, mentorUserId);
  }

  /**
   * Get user's workout history
   * @param {number} userId - User ID
   * @param {number} limit - Number of records to fetch
   * @returns {Promise<object>} User workout history
   */
  async getUserWorkoutHistory(userId, limit = 50) {
    return new Promise((resolve) => {
      this.db.all(
        'SELECT * FROM histo WHERE user_id = ? ORDER BY workout_date DESC LIMIT ?',
        [userId, limit],
        (err, history) => {
          if (err) {
            console.error('Error getting workout history:', err);
            resolve({ error: err.message });
            return;
          }

          // Parse exercise_data JSON if exists
          const processedHistory = history.map(record => {
            try {
              if (record.exercise_data) {
                record.exercise_data = JSON.parse(record.exercise_data);
              }
              return record;
            } catch (parseErr) {
              console.error('Error parsing exercise data:', parseErr);
              record.exercise_data = null;
              return record;
            }
          });

          resolve({
            success: true,
            history: processedHistory,
            total: processedHistory.length
          });
        }
      );
    });
  }

  /**
   * Get user metrics (height, weight history)
   * @param {number} userId - User ID
   * @returns {Promise<object>} User metrics data
   */
  async getUserMetrics(userId) {
    return new Promise((resolve) => {
      this.db.all(
        'SELECT * FROM metrics WHERE user_id = ? ORDER BY updated_at DESC',
        [userId],
        (err, metrics) => {
          if (err) {
            console.error('Error getting user metrics:', err);
            resolve({ error: err.message });
            return;
          }

          resolve({
            success: true,
            metrics,
            total: metrics.length
          });
        }
      );
    });
  }

  /**
   * Add user metrics (height, weight)
   * @param {number} userId - User ID
   * @param {object} metricsData - Metrics data {height, weight}
   * @returns {Promise<object>} Add result
   */
  async addUserMetrics(userId, metricsData) {
    return new Promise((resolve) => {
      const { height, weight } = metricsData;

      this.db.run(
        'INSERT INTO metrics (user_id, height, weight) VALUES (?, ?, ?)',
        [userId, height, weight],
        function(err) {
          if (err) {
            console.error('Error adding user metrics:', err);
            resolve({ error: err.message });
            return;
          }

          resolve({
            success: true,
            id: this.lastID,
            message: 'Metrics added successfully'
          });
        }
      );
    });
  }

  /**
   * Get user history (alias for getUserWorkoutHistory)
   * @param {number} userId - User ID
   * @returns {Promise<object>} User history data
   */
  async getUserHistory(userId) {
    return this.getUserWorkoutHistory(userId);
  }

  /**
   * Add workout history record
   * @param {number} userId - User ID
   * @param {object} workoutData - Workout data
   * @returns {Promise<object>} Add result
   */
  async addWorkoutHistory(userId, workoutData) {
    return new Promise((resolve) => {
      const { 
        exercise_name, 
        exercise_data, 
        workout_date = new Date().toISOString(),
        notes 
      } = workoutData;

      const exerciseDataJson = typeof exercise_data === 'object' 
        ? JSON.stringify(exercise_data) 
        : exercise_data;

      this.db.run(
        `INSERT INTO histo (user_id, exercise_name, exercise_data, workout_date, notes) 
         VALUES (?, ?, ?, ?, ?)`,
        [userId, exercise_name, exerciseDataJson, workout_date, notes],
        function(err) {
          if (err) {
            console.error('Error adding workout history:', err);
            resolve({ error: err.message });
            return;
          }

          resolve({
            success: true,
            id: this.lastID,
            message: 'Workout history added successfully'
          });
        }
      );
    });
  }

  /**
   * Update user program (exercises) - with mentor permission check
   * @param {number} editorUserId - User ID of person making the edit
   * @param {number} targetUserId - User ID of person whose exercises are being edited
   * @param {object} programData - Program data {exercises}
   * @returns {Promise<object>} Update result
   */
  async updateUserProgramAsEditor(editorUserId, targetUserId, programData) {
    try {
      // Check if editor has permission to edit target's exercises
      if (editorUserId !== targetUserId) {
        // Check if editor is mentor of target
        const editorProfile = await new Promise((resolve) => {
          this.db.get('SELECT mentor_id FROM profiles WHERE user_id = ?', [editorUserId], (err, result) => {
            if (err) resolve({ error: err.message });
            else resolve(result);
          });
        });

        if (editorProfile.error) return editorProfile;
        if (!editorProfile?.mentor_id) return { error: 'Editor does not have mentor privileges' };

        const isStudentOfEditor = await new Promise((resolve) => {
          this.db.get(
            'SELECT id FROM mentors WHERE mentor_id = ? AND student_user_id = ?',
            [editorProfile.mentor_id, targetUserId],
            (err, result) => {
              if (err) resolve({ error: err.message });
              else resolve(!!result);
            }
          );
        });

        if (typeof isStudentOfEditor === 'object' && isStudentOfEditor.error) return isStudentOfEditor;
        if (!isStudentOfEditor) return { error: 'Editor is not mentor of target user' };
      }

      // Permission granted, update the program
      return await this.updateUserProgram(targetUserId, programData);
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Update user program (exercises) - basic version
   * @param {number} userId - User ID
   * @param {object} programData - Program data {exercises}
   * @returns {Promise<object>} Update result
   */
  async updateUserProgram(userId, programData) {
    return new Promise((resolve) => {
      const { exercises } = programData;
      const exercisesJson = typeof exercises === 'object' 
        ? JSON.stringify(exercises) 
        : exercises;

      // Check if user already has a program
      this.db.get(
        'SELECT id FROM progs WHERE user_id = ?',
        [userId],
        (err, existingProg) => {
          if (err) {
            console.error('Error checking existing program:', err);
            resolve({ error: err.message });
            return;
          }

          if (existingProg) {
            // Update existing program
            this.db.run(
              'UPDATE progs SET exercises = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
              [exercisesJson, userId],
              function(err) {
                if (err) {
                  console.error('Error updating program:', err);
                  resolve({ error: err.message });
                  return;
                }

                resolve({
                  success: true,
                  changes: this.changes,
                  message: 'Program updated successfully'
                });
              }
            );
          } else {
            // Create new program
            this.db.run(
              'INSERT INTO progs (user_id, exercises) VALUES (?, ?)',
              [userId, exercisesJson],
              function(err) {
                if (err) {
                  console.error('Error creating program:', err);
                  resolve({ error: err.message });
                  return;
                }

                resolve({
                  success: true,
                  id: this.lastID,
                  message: 'Program created successfully'
                });
              }
            );
          }
        }
      );
    });
  }

  /**
   * Delete user program (reset to default)
   * @param {number} userId - User ID
   * @returns {Promise<object>} Delete result
   */
  async deleteUserProgram(userId) {
    return new Promise((resolve) => {
      this.db.run(
        'DELETE FROM progs WHERE user_id = ?',
        [userId],
        function(err) {
          if (err) {
            console.error('Error deleting user program:', err);
            resolve({ error: err.message });
            return;
          }

          resolve({
            success: true,
            changes: this.changes,
            message: 'User program deleted successfully'
          });
        }
      );
    });
  }

  /**
   * Generate mentor ID for existing user (if they don't have one)
   * @param {number} userId - User ID
   * @returns {Promise<object>} Generate result
   */
  async generateMentorIdForUser(userId) {
    try {
      // Check if user already has mentor_id
      const profile = await new Promise((resolve) => {
        this.db.get(
          'SELECT mentor_id FROM profiles WHERE user_id = ?',
          [userId],
          (err, result) => {
            if (err) resolve({ error: err.message });
            else resolve(result);
          }
        );
      });

      if (profile.error) {
        return { error: profile.error };
      }

      if (!profile) {
        return { error: 'User profile not found' };
      }

      if (profile.mentor_id) {
        return { 
          success: true, 
          mentor_id: profile.mentor_id, 
          message: 'User already has mentor ID' 
        };
      }

      // Generate new mentor ID
      let mentorId;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 5;

      while (!isUnique && attempts < maxAttempts) {
        mentorId = this.generateMentorId();
        isUnique = await this.isMentorIdUnique(mentorId);
        attempts++;
      }

      if (!isUnique) {
        return { error: 'Failed to generate unique mentor ID' };
      }

      // Update user profile with new mentor_id
      return new Promise((resolve) => {
        this.db.run(
          'UPDATE profiles SET mentor_id = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
          [mentorId, userId],
          function(err) {
            if (err) {
              console.error('Error updating mentor ID:', err);
              resolve({ error: err.message });
              return;
            }

            resolve({
              success: true,
              mentor_id: mentorId,
              message: 'Mentor ID generated successfully'
            });
          }
        );
      });
    } catch (error) {
      console.error('Error in generateMentorIdForUser:', error);
      return { error: error.message };
    }
  }

  // ===== MENTOR-STUDENT MANAGEMENT METHODS =====

  /**
   * Add student to mentor (only mentor can do this)
   * @param {string} mentorId - Mentor's mentor_id
   * @param {number} studentUserId - Student's user_id
   * @returns {Promise<object>} Result
   */
  async addStudentToMentor(mentorId, studentUserId) {
    try {
      // Check if mentor exists and has prime access
      const mentorCheck = await new Promise((resolve) => {
        this.db.get(
          `SELECT p.user_id, pr.max_students 
           FROM profiles p 
           LEFT JOIN prime pr ON p.user_id = pr.user_id 
           WHERE p.mentor_id = ?`,
          [mentorId],
          (err, result) => {
            if (err) resolve({ error: err.message });
            else resolve(result);
          }
        );
      });

      if (mentorCheck.error) return mentorCheck;
      if (!mentorCheck) return { error: 'Mentor not found' };
      if (mentorCheck.max_students === null) return { error: 'User does not have mentor privileges' };

      // Check current student count if not unlimited
      if (mentorCheck.max_students !== -1) {
        const currentCount = await new Promise((resolve) => {
          this.db.get(
            'SELECT COUNT(*) as count FROM mentors WHERE mentor_id = ?',
            [mentorId],
            (err, result) => {
              if (err) resolve({ error: err.message });
              else resolve(result.count);
            }
          );
        });

        if (typeof currentCount === 'object' && currentCount.error) return currentCount;
        if (currentCount >= mentorCheck.max_students) {
          return { error: `Mentor limit reached (${mentorCheck.max_students} students max)` };
        }
      }

      // Check if student exists
      const studentExists = await new Promise((resolve) => {
        this.db.get(
          'SELECT user_id FROM profiles WHERE user_id = ?',
          [studentUserId],
          (err, result) => {
            if (err) resolve({ error: err.message });
            else resolve(!!result);
          }
        );
      });

      if (typeof studentExists === 'object' && studentExists.error) return studentExists;
      if (!studentExists) return { error: 'Student not found' };

      // Add relationship
      return new Promise((resolve) => {
        this.db.run(
          'INSERT INTO mentors (mentor_id, student_user_id) VALUES (?, ?)',
          [mentorId, studentUserId],
          function(err) {
            if (err) {
              if (err.code === 'SQLITE_CONSTRAINT') {
                resolve({ error: 'Student is already added to this mentor' });
              } else {
                resolve({ error: err.message });
              }
              return;
            }

            resolve({
              success: true,
              id: this.lastID,
              message: 'Student added successfully'
            });
          }
        );
      });
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Remove student from mentor
   * @param {string} mentorId - Mentor's mentor_id
   * @param {number} studentUserId - Student's user_id
   * @returns {Promise<object>} Result
   */
  async removeStudentFromMentor(mentorId, studentUserId) {
    return new Promise((resolve) => {
      this.db.run(
        'DELETE FROM mentors WHERE mentor_id = ? AND student_user_id = ?',
        [mentorId, studentUserId],
        function(err) {
          if (err) {
            resolve({ error: err.message });
            return;
          }

          if (this.changes === 0) {
            resolve({ error: 'Student not found in mentor list' });
            return;
          }

          resolve({
            success: true,
            changes: this.changes,
            message: 'Student removed successfully'
          });
        }
      );
    });
  }

  /**
   * Get all students of a mentor
   * @param {string} mentorId - Mentor's mentor_id
   * @returns {Promise<object>} Students list
   */
  async getStudentsByMentor(mentorId) {
    return new Promise((resolve) => {
      this.db.all(
        `SELECT p.user_id, p.user_name, p.gender, p.birthdate, p.mentor_id,
                m.custom_name, m.created_at as added_at
         FROM mentors m 
         JOIN profiles p ON m.student_user_id = p.user_id 
         WHERE m.mentor_id = ?
         ORDER BY m.created_at DESC`,
        [mentorId],
        (err, students) => {
          if (err) {
            resolve({ error: err.message });
            return;
          }

          resolve({
            success: true,
            students,
            total: students.length
          });
        }
      );
    });
  }

  /**
   * Update custom name for student
   * @param {string} mentorId - Mentor ID
   * @param {number} studentUserId - Student user ID
   * @param {string} customName - Custom name for student
   * @returns {Promise<object>} Update result
   */
  async updateStudentCustomName(mentorId, studentUserId, customName) {
    return new Promise((resolve) => {
      this.db.run(
        'UPDATE mentors SET custom_name = ?, updated_at = CURRENT_TIMESTAMP WHERE mentor_id = ? AND student_user_id = ?',
        [customName, mentorId, studentUserId],
        function(err) {
          if (err) {
            console.error('Error updating student custom name:', err);
            resolve({ error: err.message });
            return;
          }

          if (this.changes === 0) {
            resolve({ error: 'Student not found in mentor relationship' });
            return;
          }

          resolve({
            success: true,
            message: 'Student custom name updated successfully'
          });
        }
      );
    });
  }

  /**
   * Ensure user has prime status (auto-create if not exists)
   * @param {number} userId - User ID
   * @returns {Promise<object>} Prime ensure result
   */
  async ensureUserPrime(userId) {
    return new Promise((resolve) => {
      // Lưu reference đến database
      const db = this.db;
      
      // Kiểm tra xem user đã có prime chưa
      db.get(
        'SELECT pr.max_students, p.mentor_id FROM profiles p LEFT JOIN prime pr ON p.user_id = pr.user_id WHERE p.user_id = ?',
        [userId],
        (err, result) => {
          if (err) {
            resolve({ error: err.message });
            return;
          }

          if (!result) {
            resolve({ error: 'User profile not found' });
            return;
          }

          // Nếu user đã có prime, return thành công
          if (result.max_students !== null) {
            resolve({ 
              success: true, 
              already_exists: true, 
              max_students: result.max_students 
            });
            return;
          }

          // Nếu user chưa có prime, tạo mới với max_students = 1
          db.run(
            'INSERT INTO prime (user_id, mentor_id, max_students) VALUES (?, ?, ?)',
            [userId, result.mentor_id, 1],
            function(insertErr) {
              if (insertErr) {
                console.error('Error creating prime for existing user:', insertErr);
                resolve({ error: insertErr.message });
                return;
              }

              console.log(`✅ Auto-created prime for existing user ${userId} with max_students = 1`);

              resolve({
                success: true,
                created: true,
                max_students: 1,
                message: 'Prime status created (max 1 student)'
              });
            }
          );
        }
      );
    });
  }

  /**
   * Check if user has mentor privileges and get limits
   * @param {number} userId - User ID
   * @returns {Promise<object>} Prime status
   */
  async getUserPrimeStatus(userId) {
    return new Promise((resolve) => {
      this.db.get(
        `SELECT pr.max_students, p.mentor_id,
                (SELECT COUNT(*) FROM mentors WHERE mentor_id = p.mentor_id) as current_students
         FROM profiles p 
         LEFT JOIN prime pr ON p.user_id = pr.user_id 
         WHERE p.user_id = ?`,
        [userId],
        (err, result) => {
          if (err) {
            resolve({ error: err.message });
            return;
          }

          if (!result) {
            resolve({ error: 'User not found' });
            return;
          }

          const hasPrime = result.max_students !== null;
          const canAddMore = !hasPrime ? false : 
            (result.max_students === -1 || result.current_students < result.max_students);

          resolve({
            success: true,
            has_prime: hasPrime,
            mentor_id: result.mentor_id,
            max_students: result.max_students,
            current_students: result.current_students || 0,
            can_add_more: canAddMore
          });
        }
      );
    });
  }

  /**
   * Set prime status for user
   * @param {number} userId - User ID
   * @param {number} maxStudents - Max students (-1 for unlimited)
   * @returns {Promise<object>} Result
   */
  async setPrimeStatus(userId, maxStudents) {
    try {
      // Get user's mentor_id
      const profile = await new Promise((resolve) => {
        this.db.get(
          'SELECT mentor_id FROM profiles WHERE user_id = ?',
          [userId],
          (err, result) => {
            if (err) resolve({ error: err.message });
            else resolve(result);
          }
        );
      });

      if (profile.error) return profile;
      if (!profile) return { error: 'User not found' };
      if (!profile.mentor_id) return { error: 'User does not have mentor_id yet' };

      // Insert or update prime status
      return new Promise((resolve) => {
        this.db.run(
          `INSERT INTO prime (user_id, mentor_id, max_students) 
           VALUES (?, ?, ?) 
           ON CONFLICT(user_id) DO UPDATE SET 
           max_students = excluded.max_students,
           updated_at = CURRENT_TIMESTAMP`,
          [userId, profile.mentor_id, maxStudents],
          function(err) {
            if (err) {
              resolve({ error: err.message });
              return;
            }

            resolve({
              success: true,
              message: `Prime status set: ${maxStudents === -1 ? 'unlimited' : maxStudents} students`
            });
          }
        );
      });
    } catch (error) {
      return { error: error.message };
    }
  }
}

module.exports = TrainingApp;