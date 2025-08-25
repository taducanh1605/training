/**
 * OAuth Utils - Server-to-Server Authentication Helper Library
 * 
 * Thư viện tiện ích để xác thực người dùng qua OAuth API từ các webserver khác
 * Hỗ trợ login manual và quản lý user cho server-to-server communication
 * 
 * @version 2.0.0
 * @author Your Name
 */

// Import fetch cho Node.js nếu cần
let fetch;
if (typeof window === 'undefined') {
  // Node.js environment - ưu tiên built-in fetch (Node 18+)
  if (typeof globalThis.fetch !== 'undefined') {
    fetch = globalThis.fetch;
  } else {
    // Fallback to node-fetch for older Node.js versions
    try {
      fetch = require('node-fetch');
    } catch (e) {
      throw new Error('fetch is not available. Please upgrade to Node.js 18+ or install node-fetch: npm install node-fetch');
    }
  }
} else {
  // Browser environment
  fetch = window.fetch;
}

class OAuthUtils {
  /**
   * Khởi tạo OAuthUtils cho server-to-server communication
   * @param {string} apiBaseUrl - URL gốc của OAuth API (vd: 'http://localhost:3000')
   * @param {Object} options - Các tùy chọn bổ sung
   * @param {string} options.defaultAppName - Tên app mặc định cho server này
   * @param {string} options.defaultAppDisplayName - Tên hiển thị app mặc định
   * @param {string} options.defaultAppDescription - Mô tả app mặc định
   * @param {number} options.timeout - Timeout cho API calls (ms, default: 30000)
   * @param {Object} options.headers - Headers mặc định cho tất cả API calls
   */
  constructor(apiBaseUrl, options = {}) {
    this.apiBaseUrl = apiBaseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.defaultAppName = options.defaultAppName || null;
    this.defaultAppDisplayName = options.defaultAppDisplayName || null;
    this.defaultAppDescription = options.defaultAppDescription || null;
    this.timeout = options.timeout || 30000;
    this.defaultHeaders = options.headers || {};
    this.currentToken = null;
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Gọi API với xác thực và timeout
   * @private
   * @param {string} endpoint 
   * @param {Object} options 
   * @returns {Promise<{status: number, data: Object}>}
   */
  async apiCall(endpoint, options = {}) {
    const url = `${this.apiBaseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...this.defaultHeaders,
      ...options.headers
    };

    // Thêm Authorization header nếu có token
    if (this.currentToken) {
      headers['Authorization'] = `Bearer ${this.currentToken}`;
    }

    // Tạo AbortController cho timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const data = await response.json();
      return { status: response.status, data };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        return { 
          status: 0, 
          data: { 
            success: false, 
            message: `Request timeout after ${this.timeout}ms` 
          } 
        };
      }
      
      return { 
        status: 0, 
        data: { 
          success: false, 
          message: `Network error: ${error.message}` 
        } 
      };
    }
  }

  /**
   * Merge app info với default app info
   * @private
   * @param {Object} appInfo 
   * @returns {Object}
   */
  mergeAppInfo(appInfo = {}) {
    const merged = {};
    
    // Sử dụng default app info nếu không có trong appInfo
    if (appInfo.app_name || this.defaultAppName) {
      merged.app_name = appInfo.app_name || this.defaultAppName;
    }
    
    if (appInfo.app_display_name || this.defaultAppDisplayName) {
      merged.app_display_name = appInfo.app_display_name || this.defaultAppDisplayName || merged.app_name;
    }
    
    if (appInfo.app_description || this.defaultAppDescription) {
      merged.app_description = appInfo.app_description || this.defaultAppDescription;
    }
    
    return merged;
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Đăng ký app với OAuth server khi app khởi động
   * 
   * @param {Object} appInfo - Thông tin app để đăng ký
   * @param {string} appInfo.app_name - Tên unique của app
   * @param {string} appInfo.app_display_name - Tên hiển thị của app
   * @param {string} appInfo.app_description - Mô tả app (tùy chọn)
   * 
   * @returns {Promise<Object>} Kết quả đăng ký app
   */
  async registerApp(appInfo = {}) {
    try {
      const appData = {
        app_name: appInfo.app_name || this.defaultAppName || 'unnamed-app',
        app_display_name: appInfo.app_display_name || this.defaultAppDisplayName || 'Unnamed Application',
        app_description: appInfo.app_description || this.defaultAppDescription || ''
      };

      const result = await this.apiCall('/api/app-register', {
        method: 'POST',
        body: JSON.stringify(appData)
      });

      if (result.data.success) {
        return {
          success: true,
          isNew: result.data.isNew,
          app: result.data.app,
          message: result.data.message
        };
      } else {
        return {
          success: false,
          message: result.data.message || 'App registration failed'
        };
      }
    } catch (error) {
      console.error('App registration error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Đăng nhập bằng email và password
   * 
   * @param {Object} credentials - Thông tin đăng nhập
   * @param {string} credentials.email - Email của user
   * @param {string} credentials.password - Password của user
   * @param {Object} appInfo - Thông tin app (tùy chọn, sẽ merge với default app info)
   * @param {string} appInfo.app_name - Tên app (override default)
   * @param {string} appInfo.app_display_name - Tên hiển thị của app (override default)
   * @param {string} appInfo.app_description - Mô tả app (override default)
   * 
   * @returns {Promise<Object>} Kết quả đăng nhập
   * 
   * @example
   * // Sử dụng default app info
   * const result = await oauthUtils.loginWithEmail({
   *   email: 'user@example.com',
   *   password: 'password123'
   * });
   * 
   * // Override app info
   * const result = await oauthUtils.loginWithEmail({
   *   email: 'user@example.com',
   *   password: 'password123'
   * }, {
   *   app_name: 'special-app',
   *   app_display_name: 'Special App Instance'
   * });
   */
  async loginWithEmail(credentials, appInfo = {}) {
    const { email, password } = credentials;
    
    if (!email || !password) {
      return {
        success: false,
        message: 'Email và password là bắt buộc'
      };
    }

    const requestBody = { email, password };
    
    // Merge với default app info
    const finalAppInfo = this.mergeAppInfo(appInfo);
    if (finalAppInfo.app_name) {
      Object.assign(requestBody, finalAppInfo);
    }

    const result = await this.apiCall('/api/login', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });

    // Tự động lưu token nếu login thành công
    if (result.data.success && result.data.token) {
      this.currentToken = result.data.token;
    }

    return {
      success: result.data.success,
      message: result.data.message,
      user: result.data.user,
      app: result.data.app,
      token: result.data.token
    };
  }

  /**
   * Đăng ký tài khoản mới
   * 
   * @param {Object} userData - Thông tin đăng ký
   * @param {string} userData.name - Tên đầy đủ của user
   * @param {string} userData.email - Email của user (phải unique)
   * @param {string} userData.password - Password (tối thiểu 6 ký tự)
   * @param {string} userData.password2 - Xác nhận password (phải giống password)
   * 
   * @returns {Promise<Object>} Kết quả đăng ký
   * 
   * @example
   * const result = await oauthUtils.register({
   *   name: 'John Doe',
   *   email: 'john@example.com',
   *   password: 'password123',
   *   password2: 'password123'
   * });
   * 
   * if (result.success) {
   *   console.log('Đăng ký thành công:', result.user);
   * } else {
   *   console.error('Lỗi:', result.message);
   * }
   */
  async register(userData) {
    const { name, email, password, password2 } = userData;
    
    // Validation cơ bản
    if (!name || !email || !password || !password2) {
      return {
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin'
      };
    }

    if (password !== password2) {
      return {
        success: false,
        message: 'Password không khớp'
      };
    }

    if (password.length < 6) {
      return {
        success: false,
        message: 'Password phải có ít nhất 6 ký tự'
      };
    }

    const result = await this.apiCall('/api/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, password2 })
    });

    // Tự động lưu token nếu register thành công
    if (result.data.success && result.data.token) {
      this.currentToken = result.data.token;
    }

    return {
      success: result.data.success,
      message: result.data.message,
      user: result.data.user,
      token: result.data.token
    };
  }

  /**
   * Authenticate với một token đã có (từ session, cookie, v.v.)
   * 
   * @param {string} token - JWT token
   * @returns {Promise<Object>} Thông tin user
   * 
   * @example
   * const result = await oauthUtils.authenticateWithToken('eyJhbGciOiJIUzI1NiIs...');
   * if (result.success) {
   *   console.log('Authenticated user:', result.user);
   * }
   */
  async authenticateWithToken(token) {
    if (!token) {
      return {
        success: false,
        message: 'Token is required'
      };
    }

    // Set token tạm thời để test
    const oldToken = this.currentToken;
    this.currentToken = token;

    const result = await this.apiCall('/api/auth');
    
    if (result.data.success) {
      // Token hợp lệ, giữ lại
      return {
        success: true,
        message: result.data.message,
        user: result.data.data,
        token: token
      };
    } else {
      // Token không hợp lệ, restore token cũ
      this.currentToken = oldToken;
      return {
        success: false,
        message: result.data.message
      };
    }
  }

  /**
   * Login cho user từ một server khác (server-to-server authentication)
   * Dành cho trường hợp server A đã xác thực user và muốn login user đó vào OAuth server
   * 
   * @param {Object} userInfo - Thông tin user đã được xác thực
   * @param {string} userInfo.email - Email của user
   * @param {string} userInfo.name - Tên user
   * @param {string} userInfo.provider - Provider (vd: 'external-server', 'server-a')
   * @param {Object} appInfo - Thông tin app
   * 
   * @returns {Promise<Object>} Kết quả tạo/login user
   * 
   * @example
   * const result = await oauthUtils.serverToServerAuth({
   *   email: 'user@example.com',
   *   name: 'John Doe',
   *   provider: 'my-server'
   * });
   */
  async serverToServerAuth(userInfo, appInfo = {}) {
    const { email, name, provider } = userInfo;
    
    if (!email || !name || !provider) {
      return {
        success: false,
        message: 'email, name và provider là bắt buộc'
      };
    }

    const requestBody = { 
      email, 
      name, 
      provider: provider || 'external-server' 
    };
    
    // Merge với default app info
    const finalAppInfo = this.mergeAppInfo(appInfo);
    if (finalAppInfo.app_name) {
      Object.assign(requestBody, finalAppInfo);
    }

    // Gọi API endpoint mới (cần implement trên server)
    const result = await this.apiCall('/api/server-auth', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });

    if (result.data.success && result.data.token) {
      this.currentToken = result.data.token;
    }

    return {
      success: result.data.success,
      message: result.data.message,
      user: result.data.user,
      app: result.data.app,
      token: result.data.token
    };
  }

  /**
   * Lấy thông tin user hiện tại (đã đăng nhập)
   * 
   * @returns {Promise<Object>} Thông tin user (không bao gồm password)
   * 
   * @example
   * const userInfo = await oauthUtils.getUser();
   * 
   * if (userInfo.success) {
   *   console.log('User ID:', userInfo.user.id);
   *   console.log('Name:', userInfo.user.name);
   *   console.log('Email:', userInfo.user.email);
   *   console.log('Provider:', userInfo.user.provider);
   * }
   */
  async getUser() {
    if (!this.currentToken) {
      return {
        success: false,
        message: 'No authentication token found. Please authenticate first.'
      };
    }

    const result = await this.apiCall('/api/auth');
    
    return {
      success: result.data.success,
      message: result.data.message,
      user: result.data.data // User info without password
    };
  }

  /**
   * Validate một user token (kiểm tra token có hợp lệ không)
   * 
   * @param {string} token - Token cần validate
   * @returns {Promise<Object>} Kết quả validation
   * 
   * @example
   * const validation = await oauthUtils.validateToken('eyJhbGciOiJIUzI1NiIs...');
   * if (validation.success) {
   *   console.log('Token is valid for user:', validation.user);
   * }
   */
  async validateToken(token) {
    if (!token) {
      return {
        success: false,
        message: 'Token is required'
      };
    }

    const tempToken = this.currentToken;
    this.currentToken = token;

    const result = await this.apiCall('/api/auth');
    
    // Restore original token
    this.currentToken = tempToken;

    return {
      success: result.data.success,
      message: result.data.message,
      user: result.data.success ? result.data.data : null,
      token: token
    };
  }

  /**
   * Lấy danh sách apps mà user đã đăng nhập
   * 
   * @returns {Promise<Object>} Danh sách apps của user
   * 
   * @example
   * const userApps = await oauthUtils.getUserApps();
   * 
   * if (userApps.success) {
   *   userApps.apps.forEach(app => {
   *     console.log(`App: ${app.app_display_name}`);
   *     console.log(`Login count: ${app.login_count}`);
   *   });
   * }
   */
  async getUserApps() {
    if (!this.currentToken) {
      return {
        success: false,
        message: 'Authentication required'
      };
    }

    const result = await this.apiCall('/api/user/apps');
    
    return {
      success: result.data.success,
      message: result.data.message,
      apps: result.data.data
    };
  }

  /**
   * Lấy danh sách tất cả apps (cần quyền admin)
   * 
   * @returns {Promise<Object>} Danh sách tất cả apps
   */
  async getAllApps() {
    if (!this.currentToken) {
      return {
        success: false,
        message: 'Authentication required'
      };
    }

    const result = await this.apiCall('/api/apps');
    
    return {
      success: result.data.success,
      message: result.data.message,
      apps: result.data.data
    };
  }

  /**
   * Tạo app mới
   * 
   * @param {Object} appData - Thông tin app
   * @param {string} appData.app_name - Tên app (unique)
   * @param {string} appData.app_display_name - Tên hiển thị
   * @param {string} appData.app_description - Mô tả app
   * 
   * @returns {Promise<Object>} Kết quả tạo app
   */
  async createApp(appData) {
    if (!this.currentToken) {
      return {
        success: false,
        message: 'Authentication required'
      };
    }

    const result = await this.apiCall('/api/apps', {
      method: 'POST',
      body: JSON.stringify(appData)
    });
    
    return {
      success: result.data.success,
      message: result.data.message,
      app: result.data.data
    };
  }

  /**
   * Đăng xuất - Xóa token hiện tại
   */
  logout() {
    this.currentToken = null;
    return {
      success: true,
      message: 'Logged out successfully'
    };
  }

  /**
   * Kiểm tra xem đã có token chưa
   * 
   * @returns {boolean} True nếu có token
   */
  isAuthenticated() {
    return !!this.currentToken;
  }

  /**
   * Lấy token hiện tại
   * 
   * @returns {string|null} Token hiện tại
   */
  getToken() {
    return this.currentToken;
  }

  /**
   * Set token thủ công
   * 
   * @param {string} token - JWT token
   */
  setToken(token) {
    this.currentToken = token;
  }

  /**
   * Lấy URL cơ sở của API
   * 
   * @returns {string} API base URL
   */
  getApiBaseUrl() {
    return this.apiBaseUrl;
  }

  /**
   * Set timeout cho API calls
   * 
   * @param {number} timeout - Timeout trong milliseconds
   */
  setTimeout(timeout) {
    this.timeout = timeout;
  }

  /**
   * Set default headers cho tất cả API calls
   * 
   * @param {Object} headers - Headers object
   */
  setDefaultHeaders(headers) {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }

  /**
   * Set default app info
   * 
   * @param {Object} appInfo - App info object
   * @param {string} appInfo.app_name - Tên app
   * @param {string} appInfo.app_display_name - Tên hiển thị
   * @param {string} appInfo.app_description - Mô tả app
   */
  setDefaultAppInfo(appInfo) {
    this.defaultAppName = appInfo.app_name;
    this.defaultAppDisplayName = appInfo.app_display_name;
    this.defaultAppDescription = appInfo.app_description;
  }
}

// Export cho cả CommonJS và ES6
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OAuthUtils;
}
if (typeof window !== 'undefined') {
  window.OAuthUtils = OAuthUtils;
}

/**
 * USAGE EXAMPLES FOR SERVER-TO-SERVER:
 * 
 * // Khởi tạo với default app info
 * const OAuthUtils = require('./oauth_utils.js');
 * const oauthClient = new OAuthUtils('http://localhost:3000', {
 *   defaultAppName: 'my-web-server',
 *   defaultAppDisplayName: 'My Web Server',
 *   defaultAppDescription: 'My awesome web application',
 *   timeout: 5000,
 *   headers: {
 *     'User-Agent': 'MyServer/1.0'
 *   }
 * });
 * 
 * // Đăng ký app khi khởi động
 * const oauthClient = new OAuthUtils('http://localhost:2444');
 * 
 * const appRegistration = await oauthClient.registerApp({
 *   app_name: 'my-server',
 *   app_display_name: 'My Web Server',
 *   app_description: 'My awesome application'
 * });
 * 
 * if (appRegistration.success) {
 *   console.log('App registered:', appRegistration.app);
 * }
 * 
 * // Express.js middleware example
 * app.post('/api/login', async (req, res) => {
 *   const { email, password } = req.body;
 *   
 *   try {
 *     const result = await oauthClient.loginWithEmail({ email, password });
 *     
 *     if (result.success) {
 *       // Lưu token vào session hoặc cookie
 *       req.session.authToken = result.token;
 *       res.json({ success: true, user: result.user });
 *     } else {
 *       res.status(401).json({ success: false, message: result.message });
 *     }
 *   } catch (error) {
 *     res.status(500).json({ success: false, message: error.message });
 *   }
 * });
 * 
 * // Middleware để check authentication
 * const authMiddleware = async (req, res, next) => {
 *   const token = req.session.authToken || req.headers.authorization?.replace('Bearer ', '');
 *   
 *   if (!token) {
 *     return res.status(401).json({ message: 'Authentication required' });
 *   }
 *   
 *   try {
 *     const validation = await oauthClient.validateToken(token);
 *     if (validation.success) {
 *       req.user = validation.user;
 *       next();
 *     } else {
 *       res.status(401).json({ message: 'Invalid token' });
 *     }
 *   } catch (error) {
 *     res.status(500).json({ message: error.message });
 *   }
 * };
 * 
 * // Sử dụng middleware
 * app.get('/api/profile', authMiddleware, async (req, res) => {
 *   res.json({ user: req.user });
 * });
 * 
 * // Server-to-server auth (khi server A đã xác thực user)
 * app.post('/api/external-login', async (req, res) => {
 *   const { userEmail, userName } = req.body; // User đã được xác thực ở server khác
 *   
 *   try {
 *     const result = await oauthClient.serverToServerAuth({
 *       email: userEmail,
 *       name: userName,
 *       provider: 'my-server'
 *     });
 *     
 *     if (result.success) {
 *       req.session.authToken = result.token;
 *       res.json({ success: true, user: result.user });
 *     }
 *   } catch (error) {
 *     res.status(500).json({ success: false, message: error.message });
 *   }
 * });
 * 
 * // Batch operations
 * const users = ['user1@example.com', 'user2@example.com'];
 * const loginPromises = users.map(email => 
 *   oauthClient.loginWithEmail({ email, password: 'defaultPass' })
 * );
 * const results = await Promise.all(loginPromises);
 */
