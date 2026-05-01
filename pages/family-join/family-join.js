const api = require('../../utils/api')

Page({
  data: { code: '' },
  onCode(e) { this.setData({ code: e.detail.value.toUpperCase() }) },
  async join() {
    if (this.data.code.length < 6) {
      wx.showToast({ title: '请输入6位邀请码', icon: 'none' })
      return
    }
    try {
      await api.joinFamily(this.data.code)
      wx.showToast({ title: '加入成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (e) {}
  }
})
