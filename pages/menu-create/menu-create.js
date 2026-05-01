const api = require('../../utils/api')

Page({
  data: { name: '', date: '', recipeId: 0 },

  onLoad(options) {
    if (options.recipeId) this.setData({ recipeId: options.recipeId })
    // 默认今天
    const now = new Date()
    const dateStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0')
    this.setData({ date: dateStr })
  },

  onName(e) { this.setData({ name: e.detail.value }) },
  onDate(e) { this.setData({ date: e.detail.value }) },

  async submit() {
    if (!this.data.name) {
      wx.showToast({ title: '请输入菜单名', icon: 'none' })
      return
    }
    try {
      const menu = await api.createMenu({ name: this.data.name, date: this.data.date })
      if (this.data.recipeId) {
        await api.addMenuItem(menu.id, { recipe_id: parseInt(this.data.recipeId), quantity: 1 })
      }
      wx.navigateBack()
    } catch (e) {}
  }
})
