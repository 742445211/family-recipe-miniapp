const api = require('../../utils/api')

Page({
  data: { menus: [] },
  onShow() { this.loadMenus() },
  async loadMenus() {
    try {
      const data = await api.getMenus()
      this.setData({ menus: data.list })
    } catch (e) {}
  },
  toDetail(e) {
    wx.navigateTo({ url: '/pages/menu-detail/menu-detail?id=' + e.currentTarget.dataset.id })
  },
  createMenu() {
    wx.navigateTo({ url: '/pages/menu-create/menu-create' })
  }
})
