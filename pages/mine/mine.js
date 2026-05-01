const api = require('../../utils/api')

Page({
  data: {
    userInfo: {},
    isChef: false,
    showEdit: false,
    editNickname: '',
    editAvatar: ''
  },

  onShow() {
    this.loadProfile()
  },

  async loadProfile() {
    try {
      const profile = await api.getProfile()
      const info = {
        nickname: profile.nickname,
        avatar: profile.avatar_url
      }
      wx.setStorageSync('userInfo', info)
      this.setData({ userInfo: info, isChef: profile.is_chef || false })
    } catch (e) {
      // fallback to storage
      const info = wx.getStorageSync('userInfo')
      this.setData({ userInfo: info || {} })
    }
  },

  showEditDialog() {
    this.setData({
      showEdit: true,
      editNickname: this.data.userInfo.nickname || '',
      editAvatar: this.data.userInfo.avatar || ''
    })
  },

  hideEditDialog() {
    this.setData({ showEdit: false })
  },

  onNicknameInput(e) {
    this.setData({ editNickname: e.detail.value })
  },

  onAvatarInput(e) {
    this.setData({ editAvatar: e.detail.value })
  },

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

  async saveProfile() {
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
      this.loadProfile()
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  goAI() { wx.navigateTo({ url: '/pages/ai-recommend/ai-recommend' }) },
  goFamily() { wx.navigateTo({ url: '/pages/family/family' }) },
  goFavorites() {
    getApp().globalData.indexMode = 'favorites'
    wx.switchTab({ url: '/pages/index/index' })
  },
  logout() {
    wx.removeStorageSync('token')
    wx.removeStorageSync('userInfo')
    wx.reLaunch({ url: '/pages/login/login' })
  },

  async toggleChef() {
    try {
      const data = await api.toggleChef()
      this.setData({ isChef: data.is_chef })
      wx.showToast({ title: data.is_chef ? '已设为厨师' : '已取消厨师', icon: 'success' })
    } catch (e) {}
  }
})
