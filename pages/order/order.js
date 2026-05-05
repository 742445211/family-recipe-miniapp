/**
 * pages/order/order.js - 点菜页面（Tab 页）
 * 职责：
 *   1. 按日期显示点菜列表
 *   2. 按餐次筛选（早餐/午餐/晚餐/全部）
 *   3. 支持前后切换日期
 *   4. 删除已点菜品
 *   5. 快捷跳转到菜谱首页添加菜品
 *   6. 分享菜单卡片到群聊（动态消息）
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
   * onShow - 页面显示时加载点菜数据 + 准备动态消息分享
   * 每次切换 Tab 触发
   */
  onShow() {
    wx.showTabBar()
    if (!requireLogin()) return
    this.loadOrders()
    this.prepareShare()
  },

  /**
   * loadOrders - 加载点菜列表
   * 根据当前日期和餐次筛选条件请求 API
   * @returns {Promise<void>}
   */
  async loadOrders() {
    try {
      const orders = await api.getOrders(this.data.dateStr, this.data.mealType)
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
  },

  // ========== 动态消息分享 ==========

  /**
   * prepareShare - 准备动态消息分享
   * 调用后端创建 activity_id，绑定到 wx.updateShareMenu
   * 之后用户点击分享按钮时，分享的卡片即可被动态更新
   */
  async prepareShare() {
    try {
      const data = await api.shareOrder()
      if (data && data.activity_id) {
        wx.updateShareMenu({
          withShareTicket: true,
          activityId: data.activity_id,
          isUpdatableMessage: true
        })
        console.log('[动态消息] activity_id 已绑定:', data.activity_id)
      }
    } catch (e) {
      // 创建失败不影响正常使用，静默跳过
      console.log('[动态消息] 创建失败:', e)
    }
  },

  /**
   * onShareAppMessage - 分享菜单卡片到聊天
   * 微信框架自动调用，返回分享配置
   */
  onShareAppMessage() {
    const dishCount = this.data.orders.length
    const title = dishCount > 0
      ? '今日点菜 (' + dishCount + '道) - 家庭菜谱'
      : '家庭点菜 - 来选今天的菜吧'

    return {
      title: title,
      path: '/pages/order/order',
      imageUrl: ''
    }
  }
})
