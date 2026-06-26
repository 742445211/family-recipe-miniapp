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
const { isLoggedIn } = require('../../utils/auth')
const { formatYMD, todayYMD, normalizeYMD } = require('../../utils/date')
const { loadAppFeatures, syncFeaturesToApp } = require('../../utils/features')

function effectiveMealType(mealType) {
  return mealType || 'dinner'
}

Page({
  data: {
    orders: [],
    dateStr: todayYMD(),
    mealType: '',
    needLogin: false,
    unreadNotifications: [],
    unreadCount: 0,
    meals: [
      { key: '', label: '全部' },
      { key: 'breakfast', label: '🌅 早餐' },
      { key: 'lunch', label: '☀️ 午餐' },
      { key: 'dinner', label: '🌙 晚餐' }
    ],
    blindBoxEnabled: true,
    showBlindBox: false,
    blindBoxLoading: false,
    blindBoxRecipe: null,
    blindBoxPoolSize: 0,
    blindBoxMeal: 'dinner',
    blindBoxExcludeIds: []
  },

  /**
   * onShow - 页面显示时加载点菜数据
   * prepareShare 仅首次调用：每次 onShow 都创建 activity_id 会增加后端压力
   */
  onShow() {
    wx.showTabBar()
    if (!isLoggedIn()) {
      this.setData({ needLogin: true, orders: [], unreadCount: 0, unreadNotifications: [] })
      return
    }
    this.setData({ needLogin: false })
    this.loadFeatureFlags()
    this.loadOrders()
    this.loadUnreadNotifications()
    this._ensureShareForDate()
    getApp().setNotificationCallback(() => {
      this.loadOrders()
      this.loadUnreadNotifications()
    })
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  _ensureShareForDate() {
    const dateStr = this.data.dateStr
    if (this._lastShareDate === dateStr) return
    this._lastShareDate = dateStr
    this.prepareShare()
  },

  async loadFeatureFlags() {
    try {
      const features = await loadAppFeatures()
      syncFeaturesToApp(getApp(), features)
      this.setData({ blindBoxEnabled: !!features.blind_box })
    } catch (e) {
      // 功能开关拉取失败时不展示盲盒，避免入口可见但接口 403
      this.setData({ blindBoxEnabled: false })
    }
  },

  async loadUnreadNotifications() {
    try {
      const list = await api.getUnreadNotifications()
      const notifications = Array.isArray(list) ? list : []
      this.setData({
        unreadNotifications: notifications.slice(0, 3),
        unreadCount: notifications.length
      })
      getApp().globalData.unreadCount = notifications.length
    } catch (e) {
      this.setData({ unreadNotifications: [], unreadCount: 0 })
    }
  },

  async onNotificationTap(e) {
    const id = e.currentTarget.dataset.id
    const date = e.currentTarget.dataset.date
    const meal = e.currentTarget.dataset.meal
    try {
      await api.markNotificationRead(id)
    } catch (e) {}
    if (date) {
      this.setData({ dateStr: normalizeYMD(date), mealType: meal || '' })
      this._lastShareDate = null
      this.loadOrders()
      this._ensureShareForDate()
    }
    this.loadUnreadNotifications()
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
    this.setData({ dateStr: formatYMD(prev) })
    this._lastShareDate = null
    this.loadOrders()
    this._ensureShareForDate()
  },

  /**
   * nextDay - 切换到后一天
   */
  nextDay() {
    const [y, m, d] = this.data.dateStr.split('-').map(Number)
    const next = new Date(y, m-1, d)
    next.setDate(next.getDate() + 1)
    this.setData({ dateStr: formatYMD(next) })
    this._lastShareDate = null
    this.loadOrders()
    this._ensureShareForDate()
  },

  /**
   * removeOrder - 删除指定点菜记录
   * @param {Object} e - 点击事件，e.currentTarget.dataset.id 为点菜记录 ID
   */
  async removeOrder(e) {
    try {
      await api.removeOrder(e.currentTarget.dataset.id)
      this.loadOrders()
    } catch (e) {
      wx.showToast({ title: (e && e.msg) || '删除失败', icon: 'none' })
    }
  },

  /**
   * addRecipe - 跳转到菜谱首页（Tab 切换），方便添加新菜品
   */
  addRecipe() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  openBlindBox() {
    this.setData({
      showBlindBox: true,
      blindBoxRecipe: null,
      blindBoxExcludeIds: [],
      blindBoxMeal: effectiveMealType(this.data.mealType)
    })
    this.drawBlindBox()
  },

  closeBlindBox() {
    this.setData({ showBlindBox: false, blindBoxLoading: false })
  },

  onBlindBoxMealChange(e) {
    const val = e.currentTarget.dataset.val
    this.setData({ blindBoxMeal: val, blindBoxExcludeIds: [] })
    if (!this.data.mealType) {
      this.drawBlindBox()
    }
  },

  blindBoxMealType() {
    return effectiveMealType(this.data.mealType || this.data.blindBoxMeal)
  },

  async drawBlindBox() {
    if (this.data.blindBoxLoading) return
    this.setData({ blindBoxLoading: true, blindBoxRecipe: null })
    try {
      const data = await api.drawBlindBox({
        date: this.data.dateStr,
        meal_type: this.blindBoxMealType(),
        exclude_ids: this.data.blindBoxExcludeIds
      })
      const recipe = data && data.recipe
      if (!recipe || !recipe.id) {
        wx.showToast({ title: '抽取失败', icon: 'none' })
        return
      }
      const exclude = this.data.blindBoxExcludeIds.slice()
      if (exclude.indexOf(recipe.id) === -1) exclude.push(recipe.id)
      this.setData({
        blindBoxRecipe: recipe,
        blindBoxPoolSize: data.pool_size || 0,
        blindBoxExcludeIds: exclude
      })
    } catch (e) {
      if (e && e.code === 429) {
        wx.showToast({ title: e.msg || '抽太勤了，稍后再试', icon: 'none' })
      } else if (e && e.msg) {
        wx.showToast({ title: e.msg, icon: 'none' })
      }
      if (e && e.msg && e.msg.indexOf('没有可选') >= 0) {
        this.setData({ showBlindBox: false })
      }
    } finally {
      this.setData({ blindBoxLoading: false })
    }
  },

  redrawBlindBox() {
    this.drawBlindBox()
  },

  goBlindBoxDetail() {
    const recipe = this.data.blindBoxRecipe
    if (!recipe || !recipe.id) return
    wx.navigateTo({ url: '/pages/recipe-detail/recipe-detail?id=' + recipe.id })
  },

  async confirmBlindBoxOrder() {
    const recipe = this.data.blindBoxRecipe
    if (!recipe || !recipe.id) return
    if (this._blindBoxOrdering) return
    this._blindBoxOrdering = true
    const meal = this.blindBoxMealType()
    try {
      await api.addOrder({
        recipe_id: recipe.id,
        date: this.data.dateStr,
        meal_type: meal,
        quantity: 1
      })
      wx.showToast({ title: '已加入菜单', icon: 'success' })
      this.setData({ showBlindBox: false })
      if (!this.data.mealType || this.data.mealType === meal) {
        this.loadOrders()
      }
    } catch (e) {
      wx.showToast({ title: (e && e.msg) || '添加失败', icon: 'none' })
    } finally {
      this._blindBoxOrdering = false
    }
  },

  // ========== 动态消息分享 ==========

  /**
   * prepareShare - 准备动态消息分享
   * 调用后端创建 activity_id，绑定到 wx.updateShareMenu
   * 之后用户点击分享按钮时，分享的卡片即可被动态更新
   */
  async prepareShare() {
    try {
      const data = await api.shareOrder(this.data.dateStr)
      if (data && data.activity_id) {
        wx.updateShareMenu({
          withShareTicket: true,
          activityId: data.activity_id,
          isUpdatableMessage: true
        })
      }
    } catch (e) {
      // 创建失败不影响正常使用，静默跳过
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
