const BASE_URL = 'https://www.zzzjc.xin/api'

const request = (url, method = 'GET', data = {}) => {
  const token = wx.getStorageSync('token')
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + url,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? 'Bearer ' + token : ''
      },
      success(res) {
        if (res.data.code === 401) {
          wx.removeStorageSync('token')
          wx.removeStorageSync('userInfo')
          wx.reLaunch({ url: '/pages/login/login' })
          reject(res.data)
        } else if (res.data.code === 0) {
          resolve(res.data.data)
        } else {
          wx.showToast({ title: res.data.msg || '请求失败', icon: 'none' })
          reject(res.data)
        }
      },
      fail(err) {
        wx.showToast({ title: '网络错误', icon: 'none' })
        reject(err)
      }
    })
  })
}

// API 方法
const api = {
  // 登录
  login: (code, nickname, avatar) => request('/auth/login', 'POST', { code, nickname, avatar_url: avatar }),
  getProfile: () => request('/users/me'),
  updateProfile: (data) => request('/users/me', 'PUT', data),

  // 菜谱
  getRecipes: (params = {}) => {
    const qs = Object.keys(params).map(k => k + '=' + params[k]).join('&')
    return request('/recipes' + (qs ? '?' + qs : ''))
  },
  getRecipe: (id) => request('/recipes/' + id),
  createRecipe: (data) => request('/recipes', 'POST', data),
  updateRecipe: (id, data) => request('/recipes/' + id, 'PUT', data),
  deleteRecipe: (id) => request('/recipes/' + id, 'DELETE'),
  markCooked: (id) => request('/recipes/' + id + '/cooked', 'POST'),

  // 点菜单
  getMenus: (params = {}) => {
    const qs = Object.keys(params).map(k => k + '=' + params[k]).join('&')
    return request('/menus' + (qs ? '?' + qs : ''))
  },
  getMenu: (id) => request('/menus/' + id),
  createMenu: (data) => request('/menus', 'POST', data),
  addMenuItem: (menuId, data) => request('/menus/' + menuId + '/items', 'POST', data),
  removeMenuItem: (menuId, itemId) => request('/menus/' + menuId + '/items/' + itemId, 'DELETE'),
  confirmMenu: (id) => request('/menus/' + id + '/confirm', 'POST'),

  // 家庭
  getFamilies: () => request('/families'),
  createFamily: (data) => request('/families', 'POST', data),
  joinFamily: (code) => request('/families/join', 'POST', { invite_code: code }),
  getMembers: (id) => request('/families/' + id + '/members'),

  // 收藏
  getFavorites: () => request('/favorites'),
  addFavorite: (recipeId) => request('/favorites/' + recipeId, 'POST'),
  removeFavorite: (recipeId) => request('/favorites/' + recipeId, 'DELETE'),

  // AI 推荐
  getAIRecommend: () => request('/ai/recommend', 'POST'),

  // 上传
  upload: (filePath) => new Promise((resolve, reject) => {
    wx.uploadFile({
      url: BASE_URL + '/upload',
      filePath,
      name: 'file',
      header: { 'Authorization': 'Bearer ' + wx.getStorageSync('token') },
      success(res) {
        const data = JSON.parse(res.data)
        if (data.code === 0) resolve(data.data)
        else reject(data)
      },
      fail: reject
    })
  })
}

module.exports = api
