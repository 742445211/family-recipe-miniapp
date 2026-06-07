const api = require('../../utils/api')
const { requireLogin } = require('../../utils/auth')
const notification = require('../../utils/notification')

Page({
  data: {
    channels: [],
    serverChanKey: '',
    barkKey: '',
    barkEndpoint: 'https://api.day.app',
    ntfyTopic: '',
    ntfyEndpoint: 'https://ntfy.sh',
    wecomUserid: ''
  },

  onShow() {
    if (!requireLogin()) return
    this.loadChannels()
  },

  async loadChannels() {
    try {
      const list = await api.getNotificationChannels()
      this.setData({ channels: Array.isArray(list) ? list : [] })
    } catch (e) {
      this.setData({ channels: [] })
    }
  },

  onServerChanInput(e) { this.setData({ serverChanKey: e.detail.value }) },
  onBarkKeyInput(e) { this.setData({ barkKey: e.detail.value }) },
  onBarkEndpointInput(e) { this.setData({ barkEndpoint: e.detail.value }) },
  onNtfyTopicInput(e) { this.setData({ ntfyTopic: e.detail.value }) },
  onNtfyEndpointInput(e) { this.setData({ ntfyEndpoint: e.detail.value }) },
  onWecomInput(e) { this.setData({ wecomUserid: e.detail.value }) },

  requestSubscribe() {
    notification.requestSubscribeAuth()
    wx.showToast({ title: '已请求授权', icon: 'none' })
  },

  async saveServerChan() {
    const key = this.data.serverChanKey.trim()
    if (!key) return wx.showToast({ title: '请填写 SendKey', icon: 'none' })
    try {
      await api.createNotificationChannel({ channel: 'server_chan', secret: key })
      wx.showToast({ title: '已保存', icon: 'success' })
      this.setData({ serverChanKey: '' })
      this.loadChannels()
    } catch (e) {
      wx.showToast({ title: e.msg || '保存失败', icon: 'none' })
    }
  },

  async saveBark() {
    const key = this.data.barkKey.trim()
    if (!key) return wx.showToast({ title: '请填写 Device Key', icon: 'none' })
    try {
      await api.createNotificationChannel({
        channel: 'bark',
        secret: key,
        endpoint: this.data.barkEndpoint.trim() || 'https://api.day.app'
      })
      wx.showToast({ title: '已保存', icon: 'success' })
      this.setData({ barkKey: '' })
      this.loadChannels()
    } catch (e) {
      wx.showToast({ title: e.msg || '保存失败', icon: 'none' })
    }
  },

  async saveNtfy() {
    const topic = this.data.ntfyTopic.trim()
    if (!topic) return wx.showToast({ title: '请填写 Topic', icon: 'none' })
    try {
      await api.createNotificationChannel({
        channel: 'ntfy',
        topic: topic,
        endpoint: this.data.ntfyEndpoint.trim() || 'https://ntfy.sh'
      })
      wx.showToast({ title: '已保存', icon: 'success' })
      this.setData({ ntfyTopic: '' })
      this.loadChannels()
    } catch (e) {
      wx.showToast({ title: e.msg || '保存失败', icon: 'none' })
    }
  },

  async saveWecom() {
    const userid = this.data.wecomUserid.trim()
    if (!userid) return wx.showToast({ title: '请填写 UserID', icon: 'none' })
    try {
      await api.createNotificationChannel({ channel: 'wecom_workbench', secret: userid })
      wx.showToast({ title: '已保存', icon: 'success' })
      this.setData({ wecomUserid: '' })
      this.loadChannels()
    } catch (e) {
      wx.showToast({ title: e.msg || '保存失败', icon: 'none' })
    }
  },

  async deleteChannel(e) {
    const id = e.currentTarget.dataset.id
    try {
      await api.deleteNotificationChannel(id)
      wx.showToast({ title: '已删除', icon: 'success' })
      this.loadChannels()
    } catch (e) {}
  }
})
