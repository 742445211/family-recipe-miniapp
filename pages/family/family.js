const api = require('../../utils/api')

Page({
  data: { families: [], showCreateModal: false, newName: '' },
  onShow() {
    wx.hideTabBar(); this.loadFamilies(); },
  async loadFamilies() {
    try { this.setData({ families: await api.getFamilies() }) } catch (e) {}
  },
  showCreate() { this.setData({ showCreateModal: true, newName: '' }) },
  hideCreate() { this.setData({ showCreateModal: false }) },
  onNewName(e) { this.setData({ newName: e.detail.value }) },
  async createFamily() {
    if (!this.data.newName) return wx.showToast({ title: '请输入名称', icon: 'none' })
    try {
      await api.createFamily({ name: this.data.newName })
      this.hideCreate()
      this.loadFamilies()
    } catch (e) {}
  },
  goJoin() { wx.navigateTo({ url: '/pages/family-join/family-join' }) }
})
