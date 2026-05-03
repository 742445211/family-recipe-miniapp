/**
 * pages/order/order.js - 点菜页面（Tab 页）
 * 职责：
 *   1. 按日期显示点菜列表
 *   2. 按餐次筛选（早餐/午餐/晚餐/全部）
 *   3. 支持前后切换日期
 *   4. 删除已点菜品
 *   5. 快捷跳转到菜谱首页添加菜品
 */

const api = require('../../utils/api')
const { requireLogin } = require('../../utils/auth')

/**
 * todayStr - 获取今天的日期字符串 YYYY-MM-DD
 * @returns {string} - 格式如 "2025-01-15"
 */
function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
}

/**
 * formatDate - 将 Date 对象格式化为 YYYY-MM-DD 字符串
 * @param {Date} d - 日期对象
 * @returns {string} - 格式如 "2025-01-15"
 */
function formatDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
}

Page({
  data: {
    orders: [],           // 点菜列表数据
    dateStr: todayStr(),  // 当前选中的日期（默认今天）
    mealType: '',         // 当前餐次筛选：''（全部）| 'breakfast' | 'lunch' | 'dinner'
    meals: [
      { key: '', label: '全部' },
      { key: 'breakfast', label: '🌅 早餐' },
      { key: 'lunch', label: '☀️ 午餐' },
      { key: 'dinner', label: '🌙 晚餐' }
    ]
  },

  /**
   * onShow - 页面显示时加载点菜数据（每次切换 Tab 触发）
   */
  onShow() {
    wx.showTabBar()
    if (!requireLogin()) return
    this.loadOrders()
  },

  /**
   * loadOrders - 加载点菜列表
   * 根据当前日期和餐次筛选条件请求 API
   * @returns {Promise<void>}
   */
  async loadOrders() {
    try {
      const orders = await api.getOrders(this.data.dateStr, this.data.mealType)
      // 确保 orders 为数组
      this.setData({ orders: Array.isArray(orders) ? orders : [] })
    } catch (e) {
      this.setData({ orders: [] })
      wx.showToast({ title: '加载点菜失败', icon: 'none' })
    }
  },

  /**
   * switchMeal - 切换餐次筛选
   * @param {Object} e - 点击事件，e.currentTarget.dataset.val 为餐次值
   */
  switchMeal(e) {
    const val = e.currentTarget.dataset.val
    this.setData({ mealType: val })
    this.loadOrders()
  },

  /**
   * prevDay - 切换到前一天
   * 解析当前日期字符串 → 减一天 → 格式化 → 重新加载
   */
  prevDay() {
    const [y, m, d] = this.data.dateStr.split('-').map(Number)
    const prev = new Date(y, m-1, d)
    prev.setDate(prev.getDate() - 1)
    this.setData({ dateStr: formatDate(prev) })
    this.loadOrders()
  },

  /**
   * nextDay - 切换到后一天
   */
  nextDay() {
    const [y, m, d] = this.data.dateStr.split('-').map(Number)
    const next = new Date(y, m-1, d)
    next.setDate(next.getDate() + 1)
    this.setData({ dateStr: formatDate(next) })
    this.loadOrders()
  },

  /**
   * removeOrder - 删除指定点菜记录
   * @param {Object} e - 点击事件，e.currentTarget.dataset.id 为点菜记录 ID
   */
  async removeOrder(e) {
    try {
      await api.removeOrder(e.currentTarget.dataset.id)
      this.loadOrders()
    } catch (e) {}
  },

  /**
   * addRecipe - 跳转到菜谱首页（Tab 切换），方便添加新菜品
   */
  addRecipe() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
