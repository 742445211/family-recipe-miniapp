/**
 * pages/mine/mine.js - "我的"页面（Tab 页）
 * 职责：
 *   1. 展示用户个人信息（昵称、头像）
 *   2. 编辑个人资料（昵称、头像）
 *   3. 厨师身份切换（toggleChef）
 *   4. 导航入口：AI 推荐、我的家庭、我的收藏
 *   5. 退出登录
 */

const api = require('../../utils/api')
const { requireLogin } = require('../../utils/auth')
const notification = require('../../utils/notification')

function getAppSafe() {
  try {
    return getApp()
  } catch (e) {
    return null
  }
}

Page({
  data: {
    userInfo: {},                         // 用户信息 { nickname, avatar }
    isChef: wx.getStorageSync('isChef') || false,  // 是否为厨师身份
    showAI: false,                        // AI 推荐入口（由后端功能开关控制）
    showEdit: false,                      // 是否显示编辑资料弹窗
    editNickname: '',                     // 编辑中的昵称
    editAvatar: ''                        // 编辑中的头像 URL
  },

  /**
   * onShow - 页面显示时加载用户资料
   * @returns {Promise<void>}
   */
  onShow() {
    wx.showTabBar()
    if (!requireLogin()) return
    const app = getAppSafe()
    const apply = () => {
      const features = (app && app.globalData && app.globalData.features) || {}
      this.setData({ showAI: !!features.ai_recommend })
      this.loadProfile()
    }
    if (app && app._featuresPromise) {
      app._featuresPromise.then(apply).catch(apply)
      return
    }
    apply()
  },

  /**
   * loadProfile - 加载用户个人资料
   * 从 API 获取 → 更新本地存储 → 更新页面 data
   * 如果 API 失败则使用本地缓存的用户信息
   * @returns {Promise<void>}
   */
  async loadProfile() {
    try {
      const profile = await api.getProfile()
      const info = {
        nickname: profile.nickname,
        avatar: profile.avatar_url
      }
      const isChef = profile.is_chef || false
      // 同步更新本地存储
      wx.setStorageSync('userInfo', info)
      wx.setStorageSync('isChef', isChef)
      this.setData({ userInfo: info, isChef })
    } catch (e) {
      // API 失败时 fallback 到本地存储
      const info = wx.getStorageSync('userInfo')
      this.setData({ userInfo: info || {}, isChef: wx.getStorageSync('isChef') || false })
    }
  },

  /**
   * showEditDialog - 打开编辑资料弹窗
   * 将当前用户信息填入编辑字段
   */
  showEditDialog() {
    this.setData({
      showEdit: true,
      editNickname: this.data.userInfo.nickname || '',
      editAvatar: this.data.userInfo.avatar || ''
    })
  },

  /**
   * hideEditDialog - 关闭编辑资料弹窗
   */
  hideEditDialog() {
    this.setData({ showEdit: false })
  },

  /**
   * onNicknameInput - 昵称输入事件
   * @param {Object} e - 输入事件
   */
  onNicknameInput(e) {
    this.setData({ editNickname: e.detail.value })
  },

  /**
   * onAvatarInput - 头像URL输入事件
   * @param {Object} e - 输入事件
   */
  onAvatarInput(e) {
    this.setData({ editAvatar: e.detail.value })
  },

  /**
   * chooseAvatar - 选择并上传头像图片
   * 流程：选图 → 上传 → 更新 editAvatar
   * @returns {Promise<void>}
   */
  async chooseAvatar() {
    try {
      const res = await wx.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
      wx.showLoading({ title: '上传中...' })
      const data = await api.upload(res.tempFilePaths[0])
      wx.hideLoading()
      this.setData({ editAvatar: data.url })
    } catch (e) {
      wx.hideLoading()
    }
  },

  /**
   * saveProfile - 保存个人资料
   * 校验昵称不为空 → 调用 updateProfile → 刷新资料
   * @returns {Promise<void>}
   */
  async saveProfile() {
    // 校验昵称不能为空
    if (!this.data.editNickname.trim()) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' })
      return
    }
    try {
      await api.updateProfile({
        nickname: this.data.editNickname.trim(),
        avatar_url: this.data.editAvatar.trim()
      })
      wx.showToast({ title: '保存成功', icon: 'success' })
      this.hideEditDialog()
      // 重新加载资料以获取最新数据
      this.loadProfile()
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  /**
   * goAI - 跳转到 AI 推荐页面
   */
  goAI() {
    const app = getAppSafe()
    const features = (app && app.globalData && app.globalData.features) || {}
    if (!features.ai_recommend) {
      wx.showToast({ title: 'AI推荐功能未开启', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/ai-recommend/ai-recommend' })
  },

  /**
   * goFamily - 跳转到家庭管理页面
   */
  goFamily() { wx.navigateTo({ url: '/pages/family/family' }) },

  /**
   * goFavorites - 跳转到收藏列表（通过首页切换模式）
   * 设置 globalData.indexMode 为 'favorites'，首页 onShow 时会识别并切换到收藏模式
   */
  goFavorites() {
    getApp().globalData.indexMode = 'favorites'
    wx.switchTab({ url: '/pages/index/index' })
  },

  goNotificationSettings() {
    wx.navigateTo({ url: '/pages/notification-settings/notification-settings' })
  },

  /**
   * logout - 退出登录
   * 清除本地所有缓存 → 跳转到登录页
   */
  logout() {
    notification.disconnectSocket()
    wx.removeStorageSync('token')
    wx.removeStorageSync('userInfo')
    wx.removeStorageSync('isChef')
    wx.reLaunch({ url: '/pages/login/login' })
  },

  /**
   * toggleChef - 切换厨师身份
   * 调用 API 切换 → 更新本地存储和页面状态
   * 如果失败则回滚开关状态
   *
   * @param {Object} e - switch 组件 change 事件，e.detail.value 为新值
   * @returns {Promise<void>}
   */
  async toggleChef(e) {
    const newVal = e.detail.value  // 用户操作后的新值
    try {
      const data = await api.toggleChef()
      // 以服务器返回值为准，更新本地存储和页面
      wx.setStorageSync('isChef', data.is_chef)
      this.setData({ isChef: data.is_chef })
      wx.showToast({ title: data.is_chef ? '已设为厨师' : '已取消厨师', icon: 'success' })

      // 成为厨师时请求订阅消息授权（接收点菜通知）
      if (data.is_chef) {
        wx.requestSubscribeMessage({
          tmplIds: ['WCehmUVgB8k4zx27u9znF9h66Y1mYzLIjd6bNn0SRgw'],
          success() {},
          fail() {}
        })
      }
    } catch (err) {
      // 失败回滚开关状态：恢复到操作前的值
      this.setData({ isChef: !newVal })
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  }
})
