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
      // Bảng profiles - TẤT CẢ thông tin cá nhân của user
      this.db.run(`CREATE TABLE IF NOT EXISTS profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        user_email TEXT NOT NULL,
        user_name TEXT NOT NULL,
        gender TEXT DEFAULT 'o',
        weight REAL,
        height REAL,
        birthdate TEXT,
        activity_level TEXT DEFAULT 'moderate',
        fitness_goal TEXT DEFAULT 'maintain',
        exercises TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Bảng metrics - Lịch sử tập luyện của user (để lập biểu đồ)
      this.db.run(`CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        exercise_name TEXT NOT NULL,
        exercise_data TEXT,
        progress_completed BOOLEAN DEFAULT 0,
        workout_duration INTEGER,
        workout_date DATE,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES profiles (user_id) ON DELETE CASCADE
      )`);

      // Bảng workouts - Template bài tập mẫu (Lower Power, Upper Body, etc.)
      this.db.run(`CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_name TEXT NOT NULL,
        exercises_template TEXT NOT NULL,
        gender TEXT DEFAULT 'o',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // KHÔNG tạo index ở đây - sẽ tạo sau khi biết chắc cấu trúc bảng
      // Index sẽ được tạo trong recreateMetricsTable() và recreateWorkoutsTable()
    });

    console.log('Training database schema initialized');
    
    // Tạo index an toàn cho profiles sau khi tạo bảng
    setTimeout(() => {
      this.createSafeIndexes('profiles');
    }, 100);
  }

  // FORCE recreate profiles từ user_profiles (để đảm bảo có đầy đủ data)
  async forceRecreateProfilesFromUserProfiles() {
    try {
      console.log('=== FORCE RECREATE PROFILES FROM USER_PROFILES ===');
      
      // 1. Đọc TOÀN BỘ dữ liệu từ user_profiles
      let userProfilesData = [];
      try {
        const userProfilesInfo = await this.query("PRAGMA table_info(user_profiles)");
        if (userProfilesInfo.length > 0) {
          userProfilesData = await this.query('SELECT * FROM user_profiles');
          console.log(`Found ${userProfilesData.length} records in user_profiles`);
          
          // In ra sample data để debug
          if (userProfilesData.length > 0) {
            console.log('Sample user_profiles record:', JSON.stringify(userProfilesData[0], null, 2));
          }
        } else {
          console.log('user_profiles table not found - nothing to migrate');
          return;
        }
      } catch (e) {
        console.log('user_profiles table not accessible:', e.message);
        return;
      }
      
      if (userProfilesData.length === 0) {
        console.log('user_profiles table is empty - nothing to migrate');
        return;
      }
      
      // 2. XÓA bảng profiles cũ (nếu có)
      try {
        await this.run('DROP TABLE IF EXISTS profiles');
        console.log('Dropped existing profiles table');
      } catch (e) {
        console.log('No existing profiles table to drop');
      }
      
      // 3. TẠO LẠI bảng profiles với cấu trúc đầy đủ
      await this.run(`CREATE TABLE profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        user_email TEXT NOT NULL,
        user_name TEXT NOT NULL,
        gender TEXT DEFAULT 'o',
        weight REAL,
        height REAL,
        birthdate TEXT,
        activity_level TEXT DEFAULT 'moderate',
        fitness_goal TEXT DEFAULT 'maintain',
        exercises TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      console.log('Created new profiles table with full schema');
      
      // 4. MIGRATE TẤT CẢ DỮ LIỆU từ user_profiles
      let migratedCount = 0;
      for (const user of userProfilesData) {
        try {
          const insertData = this.mapUserProfileData(user);
          console.log(`Migrating user ${user.user_id}:`, JSON.stringify(insertData, null, 2));
          
          await this.run(
            `INSERT INTO profiles (user_id, user_email, user_name, gender, weight, height, birthdate, activity_level, fitness_goal, exercises, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              insertData.user_id, insertData.user_email, insertData.user_name,
              insertData.gender, insertData.weight, insertData.height,
              insertData.birthdate, insertData.activity_level, insertData.fitness_goal,
              insertData.exercises, insertData.created_at, insertData.updated_at
            ]
          );
          
          migratedCount++;
          console.log(`Successfully migrated user ${insertData.user_id}`);
        } catch (e) {
          console.error(`Error migrating user ${user.user_id}:`, e);
        }
      }
      
      // 5. Xác nhận migration thành công
      const finalCount = await this.query('SELECT COUNT(*) as count FROM profiles');
      console.log(`MIGRATION COMPLETED: ${migratedCount}/${userProfilesData.length} users migrated`);
      console.log(`Final profiles table count: ${finalCount[0].count}`);
      
      // 6. Chỉ xóa user_profiles khi migration thành công 100%
      if (migratedCount === userProfilesData.length && migratedCount > 0) {
        await this.run('DROP TABLE user_profiles');
        console.log('user_profiles table dropped after successful migration');
      } else {
        console.log('Keeping user_profiles table due to migration issues');
      }
      
    } catch (error) {
      console.error('Error in force profiles recreation:', error);
    }
  }

  // Migration thông minh từ user_profiles sang profiles
  async smartProfilesMigration() {
    try {
      console.log('=== SMART PROFILES MIGRATION ===');
      
      // 1. Đọc dữ liệu user_profiles TRƯỚC (nếu tồn tại)
      let userProfilesData = [];
      try {
        const userProfilesInfo = await this.query("PRAGMA table_info(user_profiles)");
        if (userProfilesInfo.length > 0) {
          userProfilesData = await this.query('SELECT * FROM user_profiles');
          console.log(`Found user_profiles table with ${userProfilesData.length} records`);
        } else {
          console.log('user_profiles table not found - no migration needed');
          return;
        }
      } catch (e) {
        console.log('user_profiles table not found - no migration needed');
        return;
      }
      
      // 2. Kiểm tra profiles table có tồn tại không
      let profilesExists = false;
      let profilesData = [];
      try {
        const profilesInfo = await this.query("PRAGMA table_info(profiles)");
        if (profilesInfo.length > 0) {
          profilesData = await this.query('SELECT * FROM profiles');
          profilesExists = true;
          console.log(`Found profiles table with ${profilesData.length} records`);
        }
      } catch (e) {
        console.log('profiles table not found');
      }
      
      // 3. Đảm bảo profiles table tồn tại với cấu trúc đúng
      if (!profilesExists) {
        console.log('Creating profiles table...');
        await this.run(`CREATE TABLE IF NOT EXISTS profiles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL UNIQUE,
          user_email TEXT NOT NULL,
          user_name TEXT NOT NULL,
          gender TEXT DEFAULT 'o',
          weight REAL,
          height REAL,
          birthdate TEXT,
          activity_level TEXT DEFAULT 'moderate',
          fitness_goal TEXT DEFAULT 'maintain',
          exercises TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        console.log('profiles table created successfully');
      }
      
      // 4. THỰC SỰ MIGRATE DỮ LIỆU từ user_profiles vào profiles
      if (userProfilesData.length > 0) {
        console.log(`Starting migration of ${userProfilesData.length} user records...`);
        
        if (profilesExists && profilesData.length > 0) {
          console.log('Case: Both tables exist - merging data');
          await this.mergeProfilesTables(userProfilesData, profilesData);
        } else {
          console.log('Case: Migrating all user_profiles data to profiles');
          await this.migrateAllUserProfiles(userProfilesData);
        }
        
        // 5. Xác nhận dữ liệu đã được migrate thành công
        const migratedData = await this.query('SELECT COUNT(*) as count FROM profiles');
        console.log(`Migration completed. profiles table now has ${migratedData[0].count} records`);
        
        // 6. Chỉ xóa bảng cũ sau khi đã xác nhận migrate thành công
        if (migratedData[0].count > 0) {
          await this.backupAndDropUserProfiles();
        } else {
          console.error('Migration failed - profiles table is empty. Keeping user_profiles table.');
        }
      }
      
    } catch (error) {
      console.error('Error during smart profiles migration:', error);
    }
  }
  
  // Migrate tất cả dữ liệu từ user_profiles sang profiles mới
  async migrateAllUserProfiles(userData) {
    console.log('Migrating all user_profiles data...');
    
    for (const user of userData) {
      try {
        const insertData = this.mapUserProfileData(user);
        
        await this.run(
          `INSERT INTO profiles (user_id, user_email, user_name, gender, weight, height, birthdate, activity_level, fitness_goal, exercises, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            insertData.user_id, insertData.user_email, insertData.user_name,
            insertData.gender, insertData.weight, insertData.height,
            insertData.birthdate, insertData.activity_level, insertData.fitness_goal,
            insertData.exercises, insertData.created_at, insertData.updated_at
          ]
        );
        
        console.log(`  Migrated user ${insertData.user_id}`);
      } catch (e) {
        console.error(`  Error migrating user ${user.user_id}:`, e);
      }
    }
  }
  
  // Merge dữ liệu từ 2 bảng (ưu tiên profiles, bổ sung từ user_profiles)
  async mergeProfilesTables(userProfilesData, profilesData) {
    console.log('Merging data from both tables...');
    
    // Tạo map của profiles hiện tại
    const existingProfiles = new Map();
    profilesData.forEach(profile => {
      existingProfiles.set(profile.user_id, profile);
    });
    
    let mergedCount = 0;
    let skippedCount = 0;
    
    for (const user of userProfilesData) {
      if (existingProfiles.has(user.user_id)) {
        console.log(`  User ${user.user_id} already exists in profiles - skipping`);
        skippedCount++;
        continue;
      }
      
      try {
        const insertData = this.mapUserProfileData(user);
        
        await this.run(
          `INSERT INTO profiles (user_id, user_email, user_name, gender, weight, height, birthdate, activity_level, fitness_goal, exercises, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            insertData.user_id, insertData.user_email, insertData.user_name,
            insertData.gender, insertData.weight, insertData.height,
            insertData.birthdate, insertData.activity_level, insertData.fitness_goal,
            insertData.exercises, insertData.created_at, insertData.updated_at
          ]
        );
        
        console.log(`  Merged user ${insertData.user_id}`);
        mergedCount++;
      } catch (e) {
        console.error(`  Error merging user ${user.user_id}:`, e);
      }
    }
    
    console.log(`Merge completed: ${mergedCount} new records added, ${skippedCount} skipped`);
  }
  
  // Map dữ liệu từ user_profiles format sang profiles format
  mapUserProfileData(user) {
    return {
      user_id: user.user_id,
      user_email: user.user_email || user.email || null,
      user_name: user.user_name || user.name || 'Unknown User',
      gender: user.gender || 'o',
      weight: user.weight || null,
      height: user.height || null,
      birthdate: user.birthdate || null,
      activity_level: user.activity_level || 'moderate',
      fitness_goal: user.fitness_goal || 'maintain',
      exercises: user.exercises || null,
      created_at: user.created_at || new Date().toISOString(),
      updated_at: user.updated_at || new Date().toISOString()
    };
  }
  
  // Xóa bảng user_profiles sau khi migration thành công
  async backupAndDropUserProfiles() {
    try {
      console.log('Dropping user_profiles table...');
      await this.run(`DROP TABLE user_profiles`);
      console.log('user_profiles table dropped successfully');
    } catch (e) {
      console.error('Error dropping user_profiles:', e);
    }
  }

  // Kiểm tra và migrate database schema (chỉ cho metrics và workouts)
  async checkAndMigrateSchema() {
    try {
      console.log('Checking database schema...');
      
      // Kiểm tra cấu trúc bảng metrics - SAFE với DB không tồn tại
      let metricsColumns = [];
      try {
        const metricsInfo = await this.query("PRAGMA table_info(metrics)");
        metricsColumns = metricsInfo.map(col => col.name);
      } catch (e) {
        console.log('Metrics table does not exist, will be created automatically');
        return; // Exit early nếu table không tồn tại
      }
      
      // Kiểm tra cấu trúc bảng workouts - SAFE với DB không tồn tại
      let workoutsColumns = [];
      try {
        const workoutsInfo = await this.query("PRAGMA table_info(workouts)");
        workoutsColumns = workoutsInfo.map(col => col.name);
      } catch (e) {
        console.log('Workouts table does not exist, will be created automatically');
        return; // Exit early nếu table không tồn tại
      }
      
      // Cấu trúc mong muốn cho metrics (lịch sử tập luyện)
      const expectedMetricsColumns = [
        'id', 'user_id', 'exercise_name', 'exercise_data', 
        'progress_completed', 'workout_duration', 'workout_date', 
        'notes', 'created_at'
      ];
      
      // Cấu trúc mong muốn cho workouts (templates)
      const expectedWorkoutsColumns = [
        'id', 'template_name', 'exercises_template', 'gender', 'created_at'
      ];
      
      // Kiểm tra metrics có đúng cấu trúc không
      const metricsNeedMigration = !expectedMetricsColumns.every(col => metricsColumns.includes(col)) ||
                                   metricsColumns.includes('template_category') || // old structure
                                   metricsColumns.includes('difficulty_level') ||  // old structure
                                   metricsColumns.includes('user_email') ||        // old structure
                                   metricsColumns.includes('session_name');        // old structure
      
      // Kiểm tra workouts có đúng cấu trúc không  
      const workoutsNeedMigration = !expectedWorkoutsColumns.every(col => workoutsColumns.includes(col)) ||
                                    workoutsColumns.includes('template_category') ||  // old structure
                                    workoutsColumns.includes('difficulty_level') ||  // old structure
                                    workoutsColumns.includes('estimated_duration') || // old structure
                                    workoutsColumns.includes('user_id') ||            // old structure
                                    workoutsColumns.includes('exercises');            // old structure
      
      if (metricsNeedMigration) {
        console.log('Metrics table needs migration, recreating...');
        await this.recreateMetricsTable();
      } else {
        console.log('Metrics table structure is correct');
      }
      
      if (workoutsNeedMigration) {
        console.log('Workouts table needs migration, recreating...');
        await this.recreateWorkoutsTable();
      } else {
        console.log('Workouts table structure is correct');
      }
      
    } catch (error) {
      console.error('Error checking schema (non-critical):', error);
      // Không throw error để không crash server
    }
  }
  
  // Tạo lại bảng metrics với cấu trúc mới
  async recreateMetricsTable() {
    try {
      console.log('Backing up metrics data...');
      
      // Backup dữ liệu cũ (nếu có)
      let backupData = [];
      try {
        backupData = await this.query('SELECT * FROM metrics');
      } catch (e) {
        console.log('No existing metrics data to backup');
      }
      
      // Xóa bảng cũ
      await this.run('DROP TABLE IF EXISTS metrics');
      
      // Tạo bảng mới
      await this.run(`CREATE TABLE metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        exercise_name TEXT NOT NULL,
        exercise_data TEXT,
        progress_completed BOOLEAN DEFAULT 0,
        workout_duration INTEGER,
        workout_date DATE,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES profiles (user_id) ON DELETE CASCADE
      )`);
      
      // Tạo indexes AN TOÀN - chỉ sau khi đã tạo bảng với cấu trúc mới
      await this.createSafeIndexes('metrics');
      
      console.log('Metrics table recreated successfully');
      
      // Migrate dữ liệu cũ nếu có (chỉ migrate những field tương thích)
      if (backupData.length > 0) {
        console.log(`Migrating ${backupData.length} metrics records...`);
        for (const record of backupData) {
          try {
            // Sử dụng workout_date từ record cũ nếu có, ngược lại dùng created_at
            const workoutDate = record.workout_date || 
                              (record.created_at ? record.created_at.split('T')[0] : null) ||
                              new Date().toISOString().split('T')[0];
            
            await this.run(
              'INSERT INTO metrics (user_id, exercise_name, exercise_data, progress_completed, workout_duration, workout_date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [
                record.user_id,
                record.exercise_name || 'Unknown Exercise',
                record.exercise_data || null,
                record.progress_completed || 0,
                record.workout_duration || null,
                workoutDate,
                record.notes || null,
                record.created_at || new Date().toISOString()
              ]
            );
          } catch (e) {
            console.error('Error migrating metrics record:', e);
          }
        }
        console.log('Metrics data migration completed');
      }
      
    } catch (error) {
      console.error('Error recreating metrics table:', error);
    }
  }
  
  // Tạo lại bảng workouts với cấu trúc mới
  async recreateWorkoutsTable() {
    try {
      console.log('Backing up workouts data...');
      
      // Backup dữ liệu cũ (nếu có)
      let backupData = [];
      try {
        backupData = await this.query('SELECT * FROM workouts');
      } catch (e) {
        console.log('No existing workouts data to backup');
      }
      
      // Xóa bảng cũ
      await this.run('DROP TABLE IF EXISTS workouts');
      
      // Tạo bảng mới
      await this.run(`CREATE TABLE workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_name TEXT NOT NULL,
        exercises_template TEXT NOT NULL,
        gender TEXT DEFAULT 'o',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      
      // Tạo indexes AN TOÀN - chỉ sau khi đã tạo bảng với cấu trúc mới
      await this.createSafeIndexes('workouts');
      
      console.log('Workouts table recreated successfully');
      
      // Migrate dữ liệu cũ nếu có (chỉ migrate những field tương thích)
      if (backupData.length > 0) {
        console.log(`Migrating ${backupData.length} workouts records...`);
        for (const record of backupData) {
          try {
            // Chỉ migrate những record có exercises_template hoặc exercises
            const exercisesData = record.exercises_template || record.exercises;
            if (exercisesData) {
              await this.run(
                'INSERT INTO workouts (template_name, exercises_template, gender, created_at) VALUES (?, ?, ?, ?)',
                [
                  record.template_name || record.session_name || 'Unnamed Template',
                  exercisesData,
                  record.gender || 'o',
                  record.created_at || new Date().toISOString()
                ]
              );
            }
          } catch (e) {
            console.error('Error migrating workouts record:', e);
          }
        }
        console.log('Workouts data migration completed');
      }
      
    } catch (error) {
      console.error('Error recreating workouts table:', error);
    }
  }

  // Tạo indexes an toàn - chỉ sau khi biết chắc cấu trúc bảng
  async createSafeIndexes(tableName) {
    try {
      console.log(`Creating safe indexes for ${tableName} table...`);
      
      if (tableName === 'metrics') {
        // Kiểm tra từng column trước khi tạo index
        const tableInfo = await this.query(`PRAGMA table_info(${tableName})`);
        const columns = tableInfo.map(col => col.name);
        
        // Chỉ tạo index cho columns tồn tại
        if (columns.includes('user_id')) {
          await this.run('CREATE INDEX IF NOT EXISTS idx_metrics_user_id ON metrics(user_id)');
          console.log('Created index: idx_metrics_user_id');
        }
        
        if (columns.includes('workout_date')) {
          await this.run('CREATE INDEX IF NOT EXISTS idx_metrics_date ON metrics(workout_date)');
          console.log('Created index: idx_metrics_date');
        }
        
        if (columns.includes('exercise_name')) {
          await this.run('CREATE INDEX IF NOT EXISTS idx_metrics_exercise ON metrics(exercise_name)');
          console.log('Created index: idx_metrics_exercise');
        }
        
      } else if (tableName === 'workouts') {
        // Kiểm tra từng column trước khi tạo index
        const tableInfo = await this.query(`PRAGMA table_info(${tableName})`);
        const columns = tableInfo.map(col => col.name);
        
        if (columns.includes('template_name')) {
          await this.run('CREATE INDEX IF NOT EXISTS idx_workouts_template ON workouts(template_name)');
          console.log('Created index: idx_workouts_template');
        }
        
        if (columns.includes('gender')) {
          await this.run('CREATE INDEX IF NOT EXISTS idx_workouts_gender ON workouts(gender)');
          console.log('Created index: idx_workouts_gender');
        }
      }
      
      // Luôn tạo index cho profiles.user_id vì đây là bảng cố định
      if (tableName === 'profiles') {
        await this.run('CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id)');
        console.log('Created index: idx_profiles_user_id');
      }
      
    } catch (error) {
      console.error(`Error creating indexes for ${tableName}:`, error);
      // Không throw - index không quan trọng bằng functionality
    }
  }

  // Kiểm tra schema thủ công (có thể gọi từ API)
  async checkDatabaseSchema() {
    try {
      const metricsInfo = await this.query("PRAGMA table_info(metrics)");
      const workoutsInfo = await this.query("PRAGMA table_info(workouts)");
      
      return {
        success: true,
        metrics: {
          exists: metricsInfo.length > 0,
          columns: metricsInfo.map(col => ({ name: col.name, type: col.type }))
        },
        workouts: {
          exists: workoutsInfo.length > 0,
          columns: workoutsInfo.map(col => ({ name: col.name, type: col.type }))
        },
        message: 'Database schema information retrieved'
      };
    } catch (error) {
      console.error('Error checking database schema:', error);
      return { error: 'Failed to check database schema' };
    }
  }

  // Hàm kiểm tra và tạo lại bảng nếu cấu trúc không đúng
  async forceCheckAndRecreateSchema() {
    try {
      console.log('Force checking and recreating database schema...');
      
      // Kiểm tra cấu trúc bảng metrics
      const metricsInfo = await this.query("PRAGMA table_info(metrics)");
      const metricsColumns = metricsInfo.map(col => col.name);
      
      // Kiểm tra cấu trúc bảng workouts  
      const workoutsInfo = await this.query("PRAGMA table_info(workouts)");
      const workoutsColumns = workoutsInfo.map(col => col.name);
      
      // Cấu trúc mong muốn cho metrics (lịch sử tập luyện)
      const expectedMetricsColumns = [
        'id', 'user_id', 'exercise_name', 'exercise_data', 
        'progress_completed', 'workout_duration', 'workout_date', 
        'notes', 'created_at'
      ];
      
      // Cấu trúc mong muốn cho workouts (templates)
      const expectedWorkoutsColumns = [
        'id', 'template_name', 'exercises_template', 'gender', 'created_at'
      ];
      
      let result = {
        success: true,
        actions: [],
        message: 'Schema check completed'
      };
      
      // Kiểm tra metrics có đúng cấu trúc không
      const metricsNeedMigration = !expectedMetricsColumns.every(col => metricsColumns.includes(col)) ||
                                   metricsColumns.includes('template_category') || // old structure
                                   metricsColumns.includes('difficulty_level') ||   // old structure
                                   metricsColumns.includes('user_email') ||         // old structure
                                   metricsColumns.includes('session_name');         // old structure
      
      // Kiểm tra workouts có đúng cấu trúc không  
      const workoutsNeedMigration = !expectedWorkoutsColumns.every(col => workoutsColumns.includes(col)) ||
                                    workoutsColumns.includes('template_category') ||  // old structure
                                    workoutsColumns.includes('difficulty_level') ||  // old structure
                                    workoutsColumns.includes('estimated_duration') || // old structure
                                    workoutsColumns.includes('user_id') ||            // old structure
                                    workoutsColumns.includes('exercises');            // old structure
      
      if (metricsNeedMigration) {
        console.log('Metrics table needs recreation...');
        await this.recreateMetricsTable();
        result.actions.push('Recreated metrics table');
      } else {
        console.log('Metrics table structure is correct');
        result.actions.push('Metrics table is up to date');
      }
      
      if (workoutsNeedMigration) {
        console.log('Workouts table needs recreation...');
        await this.recreateWorkoutsTable();
        result.actions.push('Recreated workouts table');
      } else {
        console.log('Workouts table structure is correct');
        result.actions.push('Workouts table is up to date');
      }
      
      // Kiểm tra lại sau khi migration
      const finalMetricsInfo = await this.query("PRAGMA table_info(metrics)");
      const finalWorkoutsInfo = await this.query("PRAGMA table_info(workouts)");
      
      result.final_schema = {
        metrics: finalMetricsInfo.map(col => ({ name: col.name, type: col.type })),
        workouts: finalWorkoutsInfo.map(col => ({ name: col.name, type: col.type }))
      };
      
      console.log('Schema check and recreation completed successfully');
      return result;
      
    } catch (error) {
      console.error('Error in force schema check:', error);
      return { 
        error: 'Failed to check and recreate schema',
        details: error.message 
      };
    }
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
    // CHỈ sử dụng bảng profiles
    const existing = await this.get('SELECT id FROM profiles WHERE user_id = ?', [user.id]);

    if (!existing) {
      console.log(`Creating user profile for user ${user.id}`);
      await this.run(
        'INSERT INTO profiles (user_id, user_email, user_name) VALUES (?, ?, ?)',
        [user.id, user.email, user.name]
      );
      
      // Không cần tạo metrics mặc định - tất cả thông tin đã ở profiles
    } else {
      // Update user info if changed
      try {
        await this.run(
          'UPDATE profiles SET user_email = ?, user_name = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
          [user.email, user.name, user.id]
        );
      } catch (updateError) {
        console.error('Error updating user profile:', updateError);
        // Try without updated_at if column doesn't exist
        try {
          await this.run(
            'UPDATE profiles SET user_email = ?, user_name = ? WHERE user_id = ?',
            [user.email, user.name, user.id]
          );
        } catch (e) {
          console.error('Failed to update user profile:', e);
        }
      }
    }
  }

  // Get user profile với thông tin từ bảng profiles
  async getUserProfile(userId = null, email = null) {
    try {
      // CHỈ sử dụng bảng profiles
      const profile = await this.get('SELECT * FROM profiles WHERE user_id = ? OR user_email = ?', [userId, email]);
      
      if (!profile) {
        return { error: 'User profile not found' };
      }

      // Lấy metrics (lịch sử tập luyện)
      let metrics = [];
      try {
        metrics = await this.all('SELECT * FROM metrics WHERE user_id = ? ORDER BY workout_date DESC, created_at DESC LIMIT 20', [profile.user_id]);
      } catch (e) {
        console.log('Error getting metrics:', e.message);
        metrics = [];
      }
      
      // Lấy danh sách template workouts có sẵn (theo giới tính hoặc unisex)
      let workoutTemplates = [];
      try {
        const workoutsInfo = await this.query("PRAGMA table_info(workouts)");
        const workoutsColumns = workoutsInfo.map(col => col.name);
        
        if (workoutsColumns.includes('template_name')) {
          // Cấu trúc mới - có template_name
          workoutTemplates = await this.all('SELECT * FROM workouts WHERE gender = ? OR gender = "o" ORDER BY template_name', [profile.gender || 'o']);
        } else {
          // Cấu trúc cũ - có thể có session_name
          workoutTemplates = await this.all('SELECT * FROM workouts ORDER BY created_at DESC', []);
        }
      } catch (e) {
        console.log('Error getting workout templates, table may not exist:', e.message);
        workoutTemplates = [];
      }

      // Đảm bảo profile có đầy đủ thông tin với giá trị mặc định
      const completeProfile = {
        ...profile,
        gender: profile.gender || 'o',
        weight: profile.weight || null,
        height: profile.height || null,
        birthdate: profile.birthdate || null,
        activity_level: profile.activity_level || 'moderate',
        fitness_goal: profile.fitness_goal || 'maintain',
        exercises: profile.exercises || null,
        // Thêm flag để frontend biết profile đã hoàn thiện
        profile_completed: !!(profile.gender && profile.weight && profile.height)
      };



      return {
        success: true,
        profile: completeProfile,
        workout_history: metrics || [],
        workout_templates: workoutTemplates || [],
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
      console.log('Updating user profile for user:', user.id, 'with data:', JSON.stringify(data));
      
      // CHỈ sử dụng bảng profiles
      let profilesColumns = [];
      try {
        const profilesInfo = await this.query("PRAGMA table_info(profiles)");
        profilesColumns = profilesInfo.map(col => col.name);
        console.log('Profiles table columns:', profilesColumns);
      } catch (e) {
        console.error('Error checking profiles table structure:', e);
        return { error: 'Profiles table not accessible' };
      }

      // Chuẩn bị tất cả fields cần update - CHỈ các fields tồn tại trong DB
      const profileFields = [];
      const profileValues = [];

      // Update thông tin profile cơ bản
      if (data.name && profilesColumns.includes('user_name')) {
        profileFields.push('user_name = ?');
        profileValues.push(data.name);
      }

      if (data.email && profilesColumns.includes('user_email')) {
        profileFields.push('user_email = ?');
        profileValues.push(data.email);
      }

      // Update thông tin cá nhân (chỉ nếu columns tồn tại)
      if (data.gender && profilesColumns.includes('gender')) {
        profileFields.push('gender = ?');
        profileValues.push(data.gender);
      }

      if (data.weight !== undefined && profilesColumns.includes('weight')) {
        profileFields.push('weight = ?');
        profileValues.push(data.weight);
      }

      if (data.height !== undefined && profilesColumns.includes('height')) {
        profileFields.push('height = ?');
        profileValues.push(data.height);
      }

      if (data.birthdate !== undefined && profilesColumns.includes('birthdate')) {
        profileFields.push('birthdate = ?');
        profileValues.push(data.birthdate);
      }

      if (data.activity_level && profilesColumns.includes('activity_level')) {
        profileFields.push('activity_level = ?');
        profileValues.push(data.activity_level);
      }

      if (data.fitness_goal && profilesColumns.includes('fitness_goal')) {
        profileFields.push('fitness_goal = ?');
        profileValues.push(data.fitness_goal);
      }

      // Cập nhật tất cả thông tin cá nhân vào profiles
      if (profileFields.length > 0) {
        if (profilesColumns.includes('updated_at')) {
          profileFields.push('updated_at = CURRENT_TIMESTAMP');
        }
        profileValues.push(user.id);

        const profileSql = `UPDATE profiles SET ${profileFields.join(', ')} WHERE user_id = ?`;
        console.log('Executing profile update SQL:', profileSql, 'with values:', profileValues);
        
        const result = await this.run(profileSql, profileValues);
        console.log('Profile update result:', result);
      }

      // Save exercises if provided - lưu vào profiles (kiểm tra column tồn tại)
      if (data.exercises && profilesColumns.includes('exercises')) {
        console.log('Saving exercises to profile for user:', user.id);
        
        try {
          if (profilesColumns.includes('updated_at')) {
            await this.run(
              'UPDATE profiles SET exercises = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
              [JSON.stringify(data.exercises), user.id]
            );
          } else {
            await this.run(
              'UPDATE profiles SET exercises = ? WHERE user_id = ?',
              [JSON.stringify(data.exercises), user.id]
            );
          }
          console.log('Exercises saved successfully to profile for user:', user.id);
        } catch (exerciseError) {
          console.error('Error saving exercises:', exerciseError);
          // Không return error - exercises không critical
        }
      }

      console.log('User profile updated successfully for user:', user.id);
      return {
        success: true,
        message: 'User profile updated successfully'
      };
    } catch (error) {
      console.error('Error updating user profile:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      return { 
        error: 'Failed to update user profile',
        details: error.message 
      };
    }
  }

  // === WORKOUT MANAGEMENT METHODS ===
  // Lưu workout data vào profile (không còn lưu vào bảng workouts)
  async saveUserWorkout(userId, exercisesData) {
    try {
      const exercisesJson = typeof exercisesData === 'string' ? exercisesData : JSON.stringify(exercisesData);
      
      // Lưu exercises vào profile thay vì bảng workouts
      const result = await this.run(
        'UPDATE profiles SET exercises = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [exercisesJson, userId]
      );

      if (result.changes === 0) {
        return { error: 'User profile not found' };
      }

      return {
        success: true,
        message: 'Workout saved successfully to profile'
      };
    } catch (error) {
      console.error('Error saving workout:', error);
      return { error: 'Failed to save workout' };
    }
  }

  // Lấy exercises data từ profile
  async getUserWorkout(userId) {
    try {
      const profile = await this.get('SELECT exercises FROM profiles WHERE user_id = ?', [userId]);
      
      if (!profile) {
        return { error: 'No profile found for user' };
      }

      if (!profile.exercises) {
        return { error: 'No exercises found in profile' };
      }

      // Parse JSON data
      const exercises = JSON.parse(profile.exercises);

      return {
        success: true,
        exercises: exercises,
        message: 'Exercises retrieved successfully from profile'
      };
    } catch (error) {
      console.error('Error getting exercises from profile:', error);
      return { error: 'Failed to get exercises from profile' };
    }
  }

  // Update exercises data trong profile
  async updateUserWorkout(userId, exercisesData) {
    try {
      const exercisesJson = typeof exercisesData === 'string' ? exercisesData : JSON.stringify(exercisesData);
      
      // Cập nhật exercises trong profile
      const result = await this.run(
        'UPDATE profiles SET exercises = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [exercisesJson, userId]
      );
      
      if (result.changes === 0) {
        return { error: 'Profile not found or no changes made' };
      }
      
      return {
        success: true,
        message: 'Exercises updated successfully in profile'
      };
    } catch (error) {
      console.error('Error updating workout:', error);
      return { error: 'Failed to update workout' };
    }
  }

  // === WORKOUT HISTORY METHODS (METRICS) ===
  
  // Thêm lịch sử tập luyện
  async addWorkoutHistory(userId, exerciseName, exerciseData, completed, duration, notes = null) {
    try {
      const result = await this.run(
        'INSERT INTO metrics (user_id, exercise_name, exercise_data, progress_completed, workout_duration, workout_date, notes) VALUES (?, ?, ?, ?, ?, DATE("now"), ?)',
        [userId, exerciseName, JSON.stringify(exerciseData), completed ? 1 : 0, duration, notes]
      );
      
      return {
        success: true,
        history_id: result.lastID,
        message: 'Workout history added successfully'
      };
    } catch (error) {
      console.error('Error adding workout history:', error);
      return { error: 'Failed to add workout history' };
    }
  }

  // Lưu toàn bộ session workout (khi user hoàn thành một session)
  async saveWorkoutSession(userId, sessionData) {
    try {
      const { 
        sessionName, 
        exercises, 
        totalDuration, 
        completedExercises, 
        notes 
      } = sessionData;
      
      const result = await this.run(
        'INSERT INTO metrics (user_id, exercise_name, exercise_data, progress_completed, workout_duration, workout_date, notes) VALUES (?, ?, ?, ?, ?, DATE("now"), ?)',
        [
          userId, 
          sessionName || 'Workout Session',
          JSON.stringify(exercises),
          1, // Session luôn completed
          totalDuration || 0,
          notes || null
        ]
      );
      
      return {
        success: true,
        session_id: result.lastID,
        message: 'Workout session saved successfully'
      };
    } catch (error) {
      console.error('Error saving workout session:', error);
      return { error: 'Failed to save workout session' };
    }
  }

  // Lấy lịch sử tập luyện của user
  async getUserWorkoutHistory(userId, limit = 50) {
    try {
      const history = await this.all(
        'SELECT * FROM metrics WHERE user_id = ? ORDER BY workout_date DESC, created_at DESC LIMIT ?',
        [userId, limit]
      );
      
      return {
        success: true,
        history: history,
        message: 'Workout history retrieved successfully'
      };
    } catch (error) {
      console.error('Error getting workout history:', error);
      return { error: 'Failed to get workout history' };
    }
  }

  // === WORKOUT TEMPLATES METHODS ===

  // Lấy tất cả workout templates
  async getWorkoutTemplates(gender = null) {
    try {
      let sql = 'SELECT * FROM workouts';
      let params = [];
      
      if (gender) {
        sql += ' WHERE gender = ? OR gender = "o"';
        params.push(gender);
      }
      
      sql += ' ORDER BY template_name, created_at DESC';
      
      const templates = await this.all(sql, params);
      
      return {
        success: true,
        templates: templates,
        message: 'Workout templates retrieved successfully'
      };
    } catch (error) {
      console.error('Error getting workout templates:', error);
      return { error: 'Failed to get workout templates' };
    }
  }

  // Thêm workout template mới
  async addWorkoutTemplate(templateData) {
    try {
      const { name, exercises, gender } = templateData;
      
      const result = await this.run(
        'INSERT INTO workouts (template_name, exercises_template, gender) VALUES (?, ?, ?)',
        [name, JSON.stringify(exercises), gender || 'o']
      );
      
      return {
        success: true,
        template_id: result.lastID,
        message: 'Workout template added successfully'
      };
    } catch (error) {
      console.error('Error adding workout template:', error);
      return { error: 'Failed to add workout template' };
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

        case '/workout-history':
          if (method === 'GET') {
            return await this.getUserWorkoutHistory(user.id, data?.limit);
          } else if (method === 'POST') {
            return await this.addWorkoutHistory(
              user.id, 
              data.exerciseName, 
              data.exerciseData, 
              data.completed, 
              data.duration,
              data.notes
            );
          }
          break;

        case '/workout-session':
          if (method === 'POST') {
            return await this.saveWorkoutSession(user.id, data);
          }
          break;

        case '/workout-templates':
          if (method === 'GET') {
            return await this.getWorkoutTemplates(data?.gender);
          } else if (method === 'POST') {
            return await this.addWorkoutTemplate(data);
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
