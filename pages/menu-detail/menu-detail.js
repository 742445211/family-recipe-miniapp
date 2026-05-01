const api = require('../../utils/api')

Page({
  data: { menu: {}, statusText: '' },

  onLoad(options) { this.loadMenu(options.id) },

  async loadMenu(id) {
    try {
      const m = await api.getMenu(id)
      m.statusText = m.status === 'draft' ? '草稿' : m.status === 'voting' ? '投票中' : '已确认'
      this.setData({ menu: m, statusText: m.statusText })
    } catch (e) {}
  },

  async removeItem(e) {
    try {
      await api.removeMenuItem(this.data.menu.id, e.currentTarget.dataset.id)
      this.loadMenu(this.data.menu.id)
    } catch (e) {}
  },

  addRecipe() {
    wx.navigateTo({ url: '/pages/index/index?mode=select&menuId=' + this.data.menu.id })
  },

  async confirmMenu() {
    try {
      await api.confirmMenu(this.data.menu.id)
      this.loadMenu(this.data.menu.id)
    } catch (e) {}
  }
})
