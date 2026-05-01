const api = require('../../utils/api')

Page({
  data: { code: '' },

  onShow() {
    wx.hideTabBar()
  },

  onCode(e) {
    this.setData({ code: e.detail.value })
  },

  async join() {
    const code = this.data.code.trim()
    if (!code || code.length !== 6) {
      return wx.showToast({ title: '请输入6位邀请码', icon: 'none' })
    }
    try {
      await api.joinFamily(code)
      wx.showToast({ title: '加入成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    } catch (e) {}
  }
})
