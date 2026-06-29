/**
 * utils/api.js - API 请求封装模块
 * 职责：
 *   1. 统一封装微信 wx.request 网络请求
 *   2. 自动携带 Authorization token 认证头
 *   3. 统一处理 401 未授权（清除 token 并返回错误）
 *   4. 统一处理业务错误码（code !== 0）
 *   5. 提供所有后端接口的调用方法
 *
 * API 基地址: https://www.zzzjc.xin/api
 */

const BASE_URL = 'https://www.zzzjc.xin/api'
const notification = require('./notification')

function buildQuery(params = {}) {
  return Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
    .join('&')
}

/**
 * request - 通用网络请求函数
 * @param {string} url    - 接口路径（相对于 BASE_URL）
 * @param {string} method - HTTP 请求方法，默认 'GET'
 * @param {Object} data   - 请求体数据（GET 请求时自动转为 query string 或忽略）
 * @returns {Promise}     - 成功 resolve(data.data)，失败 reject(data|err)
 */
const request = (url, method = 'GET', data = {}) => {
  // 从本地存储读取登录 token
  const token = wx.getStorageSync('token')
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + url,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        // 如果存在 token，携带 Bearer 认证头
        'Authorization': token ? 'Bearer ' + token : ''
      },
      success(res) {
        // 网关/非 JSON 响应时 res.data 可能为空，须先取 body 再读 code
        const body = res.data
        if (res.statusCode === 401 || (body && body.code === 401)) {
          notification.clearAuthSession({ toast: !!token })
          reject(body || { code: 401, msg: '未登录' })
        } else if (body && body.code === 0) {
          resolve(body.data)
        } else if (res.statusCode === 429 || (body && body.code === 429)) {
          reject(body || { code: 429, msg: '请求过于频繁' })
        } else {
          wx.showToast({ title: (body && body.msg) || '请求失败', icon: 'none' })
          reject(body || { code: -1, msg: '请求失败' })
        }
      },
      fail(err) {
        // 网络层错误
        wx.showToast({ title: '网络错误', icon: 'none' })
        reject(err)
      }
    })
  })
}

// ==================== API 方法集合 ====================
const api = {
  // ========== 登录 & 用户 ==========

  /**
   * login - 微信登录
   * @param {string} code     - wx.login 返回的临时 code
   * @param {string} nickname - 用户昵称
   * @param {string} avatar   - 用户头像 URL
   * @returns {Promise}       - 返回 { token, user } 登录凭证和用户信息
   */
  login: (code, nickname, avatar) => request('/auth/login', 'POST', { code, nickname, avatar_url: avatar }),

  /**
   * getProfile - 获取当前用户个人信息
   * @returns {Promise} - 返回用户信息对象
   */
  getProfile: () => request('/users/me'),

  /**
   * updateProfile - 更新当前用户个人信息
   * @param {Object} data - 要更新的用户信息字段
   * @returns {Promise}
   */
  updateProfile: (data) => request('/users/me', 'PUT', data),

  // ========== 菜谱 ==========

  /**
   * getRecipes - 获取菜谱列表（支持搜索、分类筛选与分页）
   * @param {Object} params - { keyword?, category?, page?, page_size? }
   * @returns {Promise}     - { list, total, page, page_size, has_more }
   */
  getRecipes: (params = {}) => {
    const qs = buildQuery(params)
    return request('/recipes' + (qs ? '?' + qs : ''))
  },

  /**
   * getRecipe - 获取单个菜谱详情
   * @param {number|string} id - 菜谱 ID
   * @returns {Promise}        - 返回菜谱详情对象
   */
  getRecipe: (id) => request('/recipes/' + id),

  /**
   * createRecipe - 创建新菜谱
   * @param {Object} data - 菜谱数据
   * @returns {Promise}
   */
  createRecipe: (data) => request('/recipes', 'POST', data),

  /**
   * updateRecipe - 更新菜谱
   * @param {number|string} id   - 菜谱 ID
   * @param {Object} data        - 要更新的菜谱字段
   * @returns {Promise}
   */
  updateRecipe: (id, data) => request('/recipes/' + id, 'PUT', data),

  /**
   * deleteRecipe - 删除菜谱
   * @param {number|string} id - 菜谱 ID
   * @returns {Promise}
   */
  deleteRecipe: (id) => request('/recipes/' + id, 'DELETE'),

  /**
   * getCategories - 获取当前家庭的菜谱分类列表（需登录且已加入家庭）
   * @returns {Promise} - 返回分类对象数组 [{ id, name, sort_order, ... }]
   */
  getCategories: () => request('/categories'),

  /**
   * getPublicCategories - 公开菜谱中出现过的分类（无需登录）
   * @returns {Promise} - 返回分类名字符串数组
   */
  getPublicCategories: () => request('/categories/public'),

  /**
   * markCooked - 标记菜谱已做过（cook_count +1，需登录）
   * @param {number|string} id - 菜谱 ID
   */
  markCooked: (id) => request('/recipes/' + id + '/cooked', 'POST'),

  // ========== 点菜（按日期 + 餐次） ==========

  /**
   * getOrders - 获取点菜列表（可按日期和餐次筛选）
   * @param {string} date     - 日期字符串 YYYY-MM-DD（可选）
   * @param {string} mealType - 餐次类型 'breakfast'|'lunch'|'dinner'（可选，空串表示全部）
   * @returns {Promise}       - 返回点菜列表数组
   */
  getOrders: (date, mealType) => {
    const params = []
    if (date) params.push('date=' + date)
    if (mealType) params.push('meal_type=' + mealType)
    return request('/orders' + (params.length ? '?' + params.join('&') : ''))
  },

  /**
   * addOrder - 添加点菜
   * @param {Object} data - 点菜数据 { recipe_id, meal_type?, quantity?, note? }
   * @returns {Promise}
   */
  addOrder: (data) => request('/orders', 'POST', data),

  /**
   * removeOrder - 删除点菜
   * @param {number|string} id - 点菜记录 ID
   * @returns {Promise}
   */
  removeOrder: (id) => request('/orders/' + id, 'DELETE'),

  /**
   * drawBlindBox - 点菜盲盒抽取
   * @param {Object} data - { date?, meal_type?, exclude_ids? }
   */
  drawBlindBox: (data) => request('/orders/blind-box/draw', 'POST', data || {}),

  // ========== 家庭 ==========

  /**
   * getFamilies - 获取用户所属的所有家庭
   * @returns {Promise} - 返回家庭列表数组
   */
  getFamilies: () => request('/families'),

  /**
   * createFamily - 创建新家庭
   * @param {Object} data - 家庭数据 { name }
   * @returns {Promise}
   */
  createFamily: (data) => request('/families', 'POST', data),

  /**
   * joinFamily - 通过邀请码加入家庭
   * @param {string} code - 6 位邀请码
   * @returns {Promise}
   */
  joinFamily: (code) => request('/families/join', 'POST', { invite_code: code }),

  /**
   * getMembers - 获取家庭成员列表
   * @param {number|string} id - 家庭 ID
   * @returns {Promise}        - 返回成员列表数组
   */
  getMembers: (id) => request('/families/' + id + '/members'),

  /**
   * toggleChef - 切换当前用户的厨师身份
   * @returns {Promise} - 返回 { is_chef: boolean }
   */
  toggleChef: () => request('/families/chef', 'POST'),

  // ========== 收藏 ==========

  /**
   * getFavorites - 获取用户收藏的菜谱列表（分页）
   * @param {Object} params - { page?, page_size? }
   * @returns {Promise} - { list, total, page, page_size, has_more }
   */
  getFavorites: (params = {}) => {
    const qs = buildQuery(params)
    return request('/favorites' + (qs ? '?' + qs : ''))
  },

  /**
   * addFavorite - 收藏菜谱
   * @param {number|string} recipeId - 菜谱 ID
   * @returns {Promise}
   */
  addFavorite: (recipeId) => request('/favorites/' + recipeId, 'POST'),

  /**
   * removeFavorite - 取消收藏菜谱
   * @param {number|string} recipeId - 菜谱 ID
   * @returns {Promise}
   */
  removeFavorite: (recipeId) => request('/favorites/' + recipeId, 'DELETE'),

  /**
   * getAppFeatures - 获取功能开关（公开，无需登录）
   * @returns {Promise} - { ai_recommend: boolean }
   */
  getAppFeatures: () => request('/app/features'),

  // ========== AI 推荐 ==========

  /**
   * getAIRecommend - 获取 AI 智能推荐（结构化 batch + items）
   * @returns {Promise} - { batch_id, items, rate_limit }
   */
  getAIRecommend: () => request('/ai/recommend', 'POST'),

  getAIRecipeItem: (itemId) => request('/ai/items/' + itemId),

  importAIRecipe: (itemId) => request('/ai/items/' + itemId + '/import-recipe', 'POST'),

  addAIRecipeToOrder: (itemId, data) => request('/ai/items/' + itemId + '/add-order', 'POST', data),

  getWeather: () => request('/weather'),

  // ========== 全局菜谱库 ==========

  /**
   * lookupCatalogRecipe - 按菜名查全局库或 AI 生成
   * @param {string} name
   * @param {boolean} newVariant
   * @returns {Promise} - { name, generated, selected_id, variants, rate_limit }
   */
  lookupCatalogRecipe: (name, newVariant = false) =>
    request('/catalog-recipes/lookup', 'POST', { name, new_variant: !!newVariant }),

  getCatalogRecipe: (id) => request('/catalog-recipes/' + id),

  markCatalogRecipeUsed: (id) => request('/catalog-recipes/' + id + '/use', 'POST'),

  // ========== 冰箱食材 ==========

  getFridgeItems: () => request('/fridge/items'),

  createFridgeItem: (data) => request('/fridge/items', 'POST', data),

  createFridgeItems: (items) => request('/fridge/items', 'POST', { items }),

  updateFridgeItem: (id, data) => request('/fridge/items/' + id, 'PUT', data),

  deleteFridgeItem: (id) => request('/fridge/items/' + id, 'DELETE'),

  getFridgeScan: (id) => request('/fridge/scans/' + id),

  retryFridgeScan: (id) => request('/fridge/scans/' + id + '/retry', 'POST'),

  confirmFridgeScan: (id, items) => request('/fridge/scans/' + id + '/confirm', 'POST', { items }),

  /**
   * uploadFridgeScan - 拍照上传并发起冰箱识别
   * 503 时不弹全局 toast，由页面展示离线提示
   */
  uploadFridgeScan: (filePath) => new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token')
    wx.uploadFile({
      url: BASE_URL + '/fridge/scans',
      filePath,
      name: 'file',
      header: { Authorization: token ? 'Bearer ' + token : '' },
      success(res) {
        let data
        try {
          data = JSON.parse(res.data)
        } catch (e) {
          reject({ msg: '响应解析失败' })
          return
        }
        if (res.statusCode === 401 || data.code === 401) {
          notification.clearAuthSession({ toast: !!token })
          reject(data)
          return
        }
        if (data.code === 0) {
          resolve(data.data)
          return
        }
        if (res.statusCode === 503 || data.code === 503) {
          reject({ code: 503, msg: data.msg || '图片识别服务离线', data: data.data })
          return
        }
        reject(data)
      },
      fail: reject
    })
  }),

  // ========== 文件上传 ==========

  /**
   * upload - 上传文件（图片等）到服务器
   * @param {string} filePath - 本地文件临时路径
   * @returns {Promise}       - 成功返回 { url } 上传后的文件 URL
   */
  upload: (filePath) => new Promise((resolve, reject) => {
    wx.uploadFile({
      url: BASE_URL + '/upload',
      filePath,
      name: 'file',
      // 上传也需携带认证 token
      header: { 'Authorization': 'Bearer ' + wx.getStorageSync('token') },
      success(res) {
        let data
        try {
          data = JSON.parse(res.data)
        } catch (e) {
          reject({ msg: '响应解析失败' })
          return
        }
        if (data.code === 0) resolve(data.data)
        else reject(data)
      },
      fail: reject
    })
  }),

  // ========== 动态消息（分享菜单卡片） ==========

  /**
   * shareOrder - 创建动态消息 activity_id
   * @param {string} [date] - 菜单日期 YYYY-MM-DD，默认今天
   * @returns {Promise} - 返回 { activity_id }
   */
  shareOrder: (date) => request('/orders/share', 'POST', date ? { date } : {}),

  // ========== 厨师通知 ==========

  getUnreadNotifications: () => request('/notifications/unread'),

  markNotificationRead: (id) => request('/notifications/' + id + '/read', 'POST'),

  getNotificationChannels: () => request('/notification-channels'),

  createNotificationChannel: (data) => request('/notification-channels', 'POST', data),

  updateNotificationChannel: (id, data) => request('/notification-channels/' + id, 'PUT', data),

  deleteNotificationChannel: (id) => request('/notification-channels/' + id, 'DELETE')
}

module.exports = api
