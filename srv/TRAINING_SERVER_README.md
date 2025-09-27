# Training Server

## Mô tả
Training Server là một ứng dụng backend chuyên dụng cho hệ thống tập luyện thể dục. Server được thiết kế để xử lý xác thực OAuth và quản lý dữ liệu training cho người dùng.

## Tính năng chính

### 🔐 OAuth Authentication
- Tích hợp với API_BASE: `https://pika-proxy.taducanhbkhn.workers.dev`
- Xác thực JWT token
- Auto-registration với main server
- Middleware bảo mật cho tất cả API endpoints

### 💾 Quản lý Database
- SQLite database với 3 bảng chính:
  - **profiles**: Thông tin user từ server (user_id, email, name)
  - **metrics**: Thông tin cá nhân (giới tính, chiều cao, cân nặng, mục tiêu)
  - **workouts**: Nội dung bài tập dạng JSON text
- Database location: `./db/training.db3`

### 📊 API Endpoints

#### Authentication
```
POST /auth/login - Xác thực user và trả về token
GET /health - Health check endpoint
```

#### Training API (Cần authentication)
```
GET /api/training/profile - Lấy thông tin profile user
PUT /api/training/profile - Cập nhật profile user

GET /api/training/workout - Lấy bài tập training
POST /api/training/workout - Lưu bài tập mới

GET /api/training/workouts - Lấy danh sách workouts
```

## Cấu trúc Project

```
srv/
├── .env                          # Environment configuration
├── db/
│   └── training.db3             # SQLite database
├── models/
│   └── TrainingApp.js           # Main app logic (gộp BaseApp + TrainingApp)
├── oauth_utils.js               # OAuth utilities
├── training-server.js           # Main server file
├── test-api.js                  # API testing script
├── start-training-server.bat    # Windows start script
├── package.json                 # Dependencies
└── TRAINING_SERVER_README.md    # Documentation này
```

## Cài đặt và Chạy

### 1. Cài đặt Dependencies
```bash
npm install
```

### 2. Cấu hình Environment
File `.env` chứa:
```env
PORT=2445
NODE_ENV=development
API_BASE=https://pika-proxy.taducanhbkhn.workers.dev
DB_PATH=./db/training.db3
APP_NAME=training-app
APP_DISPLAY_NAME=Training Application
APP_DESCRIPTION=Fitness and workout training application
```

### 3. Khởi động Server

#### Windows:
```bash
start-training-server.bat
```

#### Linux/Mac:
```bash
npm start
# hoặc
node training-server.js
```

Server sẽ chạy trên: `http://localhost:2445`

### 4. Test API
```bash
node test-api.js
```

## Database Schema

### Bảng `profiles`
```sql
CREATE TABLE profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Bảng `metrics`
```sql
CREATE TABLE metrics (
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
);
```

### Bảng `workouts`
```sql
CREATE TABLE workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  exercises TEXT NOT NULL,  -- JSON text chứa bài tập
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles (user_id) ON DELETE CASCADE
);
```

## API Usage Examples

### Login và lấy token
```javascript
const response = await fetch('http://localhost:2445/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password'
  })
});

const { token } = await response.json();
```

### Lấy profile user
```javascript
const profile = await fetch('http://localhost:2445/api/training/profile', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Lấy bài tập training
```javascript
const workout = await fetch('http://localhost:2445/api/training/workout', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Lưu bài tập mới
```javascript
const result = await fetch('http://localhost:2445/api/training/workout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    exercises: {
      "day1": ["Push-ups", "Squats"],
      "day2": ["Pull-ups", "Lunges"]
    }
  })
});
```

## Lưu ý kỹ thuật

### Dependencies chính
- **express**: Web framework
- **cors**: Cross-origin resource sharing
- **sqlite3**: Database driver
- **jsonwebtoken**: JWT authentication
- **dotenv**: Environment configuration

### Node.js Version
- Sử dụng Node.js 22+ với built-in fetch API
- Fallback về node-fetch nếu cần

### Security
- Tất cả API endpoints (trừ /health và /auth/login) đều yêu cầu JWT token
- Database sử dụng parameterized queries để tránh SQL injection
- CORS được cấu hình để chấp nhận requests từ frontend

### Performance
- Database indexes trên user_id để tối ưu queries
- Connection pooling với SQLite
- Async/await pattern cho tất cả database operations

## Troubleshooting

### Lỗi thường gặp

1. **Port 2445 đã được sử dụng**
   - Đổi PORT trong file .env
   - Hoặc kill process đang dùng port: `netstat -ano | findstr :2445`

2. **Database connection error**
   - Kiểm tra folder ./db/ có tồn tại không
   - Quyền ghi vào thư mục db/

3. **OAuth authentication failed**
   - Kiểm tra API_BASE có đúng không
   - Kiểm tra network connection tới main server

4. **Module not found errors**
   - Chạy `npm install` để cài đầy đủ dependencies

### Debug mode
Để bật debug logs chi tiết:
```bash
NODE_ENV=development node training-server.js
```

## Development

### Thêm API endpoint mới
1. Thêm route vào `training-server.js`
2. Thêm method vào `TrainingApp.js`
3. Update `handleRequest()` method

### Thay đổi database schema
1. Backup database hiện tại
2. Update `setupDatabase()` method trong TrainingApp.js
3. Xóa file .db3 để tạo lại database mới

---

**Author**: Training Team  
**Version**: 1.0.0  
**Last Updated**: August 26, 2025