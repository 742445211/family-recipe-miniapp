const api = require('../../utils/api')

Page({
  data: { loading: false },
  handleLogin() {
    this.setData({ loading: true })
    wx.login({
      success: async (res) => {
        try {
          const data = await api.login(res.code, '', '')
          wx.setStorageSync('token', data.token)
          wx.setStorageSync('userInfo', data)
          wx.switchTab({ url: '/pages/index/index' })
        } catch (e) {
          wx.showToast({ title: '登录失败', icon: 'none' })
        }
        this.setData({ loading: false })
      }
    })
  }
})
