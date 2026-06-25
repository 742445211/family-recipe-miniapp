/**
 * pages/family/family.js - 家庭管理页面
 * 职责：
 *   1. 展示用户所在的所有家庭列表
 *   2. 创建新家庭（弹出模态框输入名称）
 *   3. 提供入口跳转到"加入家庭"页面（通过邀请码）
 */

const api = require('../../utils/api')
const { requireLogin, applyFamilyToken } = require('../../utils/auth')

Page({
  data: {
    families: [],           // 家庭列表数据
    showCreateModal: false, // 是否显示创建家庭弹窗
    newName: ''             // 新家庭名称输入
  },

  /**
   * onShow - 页面显示时加载家庭列表
   */
  onShow() {
    if (!requireLogin()) return
    this.loadFamilies()
  },

  /**
   * loadFamilies - 加载用户所属家庭列表
   * @returns {Promise<void>}
   */
  async loadFamilies() {
    try { this.setData({ families: await api.getFamilies() }) } catch (e) {}
  },

  /**
   * showCreate - 显示创建家庭弹窗
   */
  showCreate() { this.setData({ showCreateModal: true, newName: '' }) },

  /**
   * hideCreate - 关闭创建家庭弹窗
   */
  hideCreate() { this.setData({ showCreateModal: false }) },

  /**
   * onNewName - 新家庭名称输入事件
   * @param {Object} e - 输入事件
   */
  onNewName(e) { this.setData({ newName: e.detail.value }) },

  /**
   * createFamily - 创建新家庭
   * 校验名称不为空 → 调用 API → 关闭弹窗 → 刷新列表
   * @returns {Promise<void>}
   */
  async createFamily() {
    // 校验：家庭名称不能为空
    if (!this.data.newName) return wx.showToast({ title: '请输入名称', icon: 'none' })
    try {
      const data = await api.createFamily({ name: this.data.newName })
      applyFamilyToken(data)
      this.hideCreate()
      // 创建成功后刷新列表
      this.loadFamilies()
    } catch (e) {}
  },

  /**
   * goJoin - 跳转到加入家庭页面（通过邀请码）
   */
  goJoin() { wx.navigateTo({ url: '/pages/family-join/family-join' }) }
})
