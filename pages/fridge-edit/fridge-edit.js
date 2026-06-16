/**
 * pages/fridge-edit/fridge-edit.js - 冰箱食材手动录入/编辑
 */

const api = require('../../utils/api')
const { requireLogin } = require('../../utils/auth')
const { normalizeYMD } = require('../../utils/date')

Page({
  data: {
    id: null,
    isEdit: false,
    name: '',
    amount: '',
    expiryDate: '',
    note: '',
    submitting: false
  },

  async onLoad(options) {
    if (!requireLogin()) return
    if (options.id) {
      this.setData({ id: options.id, isEdit: true })
      wx.setNavigationBarTitle({ title: '编辑食材' })
      await this.loadItem(options.id)
    } else {
      wx.setNavigationBarTitle({ title: '添加食材' })
    }
  },

  async loadItem(id) {
    try {
      const list = await api.getFridgeItems()
      const item = (Array.isArray(list) ? list : []).find(i => String(i.id) === String(id))
      if (!item) {
        wx.showToast({ title: '食材不存在', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 800)
        return
      }
      this.setData({
        name: item.name || '',
        amount: item.amount || '',
        expiryDate: item.expiry_date ? normalizeYMD(item.expiry_date) : '',
        note: item.note || ''
      })
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [field]: e.detail.value })
  },

  onExpiryChange(e) {
    this.setData({ expiryDate: e.detail.value })
  },

  clearExpiry() {
    this.setData({ expiryDate: '' })
  },

  async submit() {
    const name = this.data.name.trim()
    if (!name) {
      return wx.showToast({ title: '请输入食材名称', icon: 'none' })
    }
    const payload = {
      name,
      amount: this.data.amount.trim(),
      note: this.data.note.trim()
    }
    if (this.data.expiryDate) {
      payload.expiry_date = this.data.expiryDate
    }
    this.setData({ submitting: true })
    try {
      if (this.data.isEdit) {
        await api.updateFridgeItem(this.data.id, payload)
      } else {
        await api.createFridgeItem(payload)
      }
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 800)
    } catch (e) {
      wx.showToast({ title: (e && e.msg) || '保存失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
