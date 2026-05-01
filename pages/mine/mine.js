const api = require('../../utils/api')

Page({
  data: { userInfo: {} },
  onShow() {
    const info = wx.getStorageSync('userInfo')
    this.setData({ userInfo: info || {} })
  },
  goAI() { wx.navigateTo({ url: '/pages/ai-recommend/ai-recommend' }) },
  goFamily() { wx.navigateTo({ url: '/pages/family/family' }) },
  goFavorites() { wx.navigateTo({ url: '/pages/index/index?mode=favorites' }) },
  logout() {
    wx.removeStorageSync('token')
    wx.removeStorageSync('userInfo')
    wx.reLaunch({ url: '/pages/login/login' })
  }
})
