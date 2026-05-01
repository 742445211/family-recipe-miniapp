const api = require('../../utils/api')

Page({
  data: {
    orders: [],
    currentDate: new Date(),
    dateStr: ''
  },

  onShow() {
    this.updateDateStr()
    this.loadOrders()
  },

  updateDateStr() {
    const d = this.data.currentDate
    const str = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
    this.setData({ dateStr: str })
  },

  async loadOrders() {
    try {
      console.log('[order] loading orders for', this.data.dateStr)
      const orders = await api.getOrders(this.data.dateStr)
      console.log('[order] got', orders ? orders.length : 0, 'orders', JSON.stringify(orders))
      this.setData({ orders: orders || [] })
    } catch (e) {
      console.error('[order] loadOrders error:', JSON.stringify(e))
      wx.showToast({ title: '加载点菜失败', icon: 'none' })
    }
  },

  prevDay() {
    const d = new Date(this.data.currentDate)
    d.setDate(d.getDate() - 1)
    this.setData({ currentDate: d })
    this.updateDateStr()
    this.loadOrders()
  },

  nextDay() {
    const d = new Date(this.data.currentDate)
    d.setDate(d.getDate() + 1)
    this.setData({ currentDate: d })
    this.updateDateStr()
    this.loadOrders()
  },

  async removeOrder(e) {
    try {
      await api.removeOrder(e.currentTarget.dataset.id)
      this.loadOrders()
    } catch (e) {}
  },

  addRecipe() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
