     1|const api = require('../../utils/api')
     2|
     3|Page({
     4|  data: { families: [], showCreateModal: false, newName: '' },
     5|  onShow() {
    wx.hideTabBar() this.loadFamilies() },
     6|  async loadFamilies() {
     7|    try { this.setData({ families: await api.getFamilies() }) } catch (e) {}
     8|  },
     9|  showCreate() { this.setData({ showCreateModal: true, newName: '' }) },
    10|  hideCreate() { this.setData({ showCreateModal: false }) },
    11|  onNewName(e) { this.setData({ newName: e.detail.value }) },
    12|  async createFamily() {
    13|    if (!this.data.newName) return wx.showToast({ title: '请输入名称', icon: 'none' })
    14|    try {
    15|      await api.createFamily({ name: this.data.newName })
    16|      this.hideCreate()
    17|      this.loadFamilies()
    18|    } catch (e) {}
    19|  },
    20|  goJoin() { wx.navigateTo({ url: '/pages/family-join/family-join' }) }
    21|})
    22|