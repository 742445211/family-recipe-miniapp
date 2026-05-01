const api = require('../../utils/api')

Page({
  data: { loading: false },

  handleLogin() {
    this.setData({ loading: true })
    wx.login({
      success: async (res) => {
        if (!res.code) {
          this.setData({ loading: false })
          wx.showToast({ title: '登录失败', icon: 'none' })
          return
        }
        try {
          const data = await api.login(res.code, '微信用户', '')
          wx.setStorageSync('token', data.token)
          wx.setStorageSync('userInfo', data.user)
          wx.switchTab({ url: '/pages/index/index' })
        } catch (e) {
          this.setData({ loading: false })
        }
      },
      fail: () => {
        this.setData({ loading: false })
        wx.showToast({ title: '登录失败', icon: 'none' })
      }
    })
  }
})
