const api = require('../../utils/api')

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
}

function formatDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
}

Page({
  data: {
    orders: [],
    dateStr: todayStr()
  },

  onShow() {
    this.loadOrders()
  },

  async loadOrders() {
    try {
      const orders = await api.getOrders(this.data.dateStr)
      this.setData({ orders: Array.isArray(orders) ? orders : [] })
    } catch (e) {
      this.setData({ orders: [] })
      wx.showToast({ title: '加载点菜失败', icon: 'none' })
    }
  },

  prevDay() {
    const [y, m, d] = this.data.dateStr.split('-').map(Number)
    const prev = new Date(y, m-1, d)
    prev.setDate(prev.getDate() - 1)
    this.setData({ dateStr: formatDate(prev) })
    this.loadOrders()
  },

  nextDay() {
    const [y, m, d] = this.data.dateStr.split('-').map(Number)
    const next = new Date(y, m-1, d)
    next.setDate(next.getDate() + 1)
    this.setData({ dateStr: formatDate(next) })
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
