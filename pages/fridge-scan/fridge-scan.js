/**
 * pages/fridge-scan/fridge-scan.js - 冰箱拍照识别确认
 */

const api = require('../../utils/api')
const { requireLogin } = require('../../utils/auth')

const POLL_MS = 1500
const TERMINAL = { done: true, failed: true, confirmed: true }

Page({
  data: {
    scanId: null,
    status: 'pending',
    imageUrl: '',
    errorMsg: '',
    polling: false,
    candidates: [],
    submitting: false
  },

  onLoad(options) {
    if (!requireLogin()) return
    if (!options.id) {
      wx.showToast({ title: '缺少识别任务', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 800)
      return
    }
    this.setData({ scanId: options.id })
    this.pollScan()
  },

  onUnload() {
    if (this._pollTimer) clearTimeout(this._pollTimer)
  },

  _mapCandidates(items) {
    return (items || []).map((item, index) => ({
      key: index,
      checked: true,
      name: item.name || '',
      amount: item.amount || '',
      expiryDate: item.expiry_date ? String(item.expiry_date).slice(0, 10) : '',
      note: item.note || ''
    }))
  },

  async pollScan() {
    if (!this.data.scanId) return
    this.setData({ polling: true })
    try {
      const data = await api.getFridgeScan(this.data.scanId)
      const status = data.status || 'pending'
      const update = {
        status,
        imageUrl: data.image_url || this.data.imageUrl,
        errorMsg: data.error_msg || '',
        polling: !TERMINAL[status]
      }
      if (status === 'done' && data.recognized_items) {
        update.candidates = this._mapCandidates(data.recognized_items)
      }
      if (status === 'confirmed') {
        update.candidates = this.data.candidates.length
          ? this.data.candidates
          : this._mapCandidates(data.recognized_items)
      }
      this.setData(update)
      if (!TERMINAL[status]) {
        this._pollTimer = setTimeout(() => this.pollScan(), POLL_MS)
      }
    } catch (e) {
      this.setData({ polling: false, status: 'failed', errorMsg: (e && e.msg) || '加载失败' })
    }
  },

  toggleCandidate(e) {
    const idx = e.currentTarget.dataset.idx
    const key = 'candidates[' + idx + '].checked'
    this.setData({ [key]: !this.data.candidates[idx].checked })
  },

  onCandidateInput(e) {
    const idx = e.currentTarget.dataset.idx
    const field = e.currentTarget.dataset.field
    const key = 'candidates[' + idx + '].' + field
    this.setData({ [key]: e.detail.value })
  },

  onCandidateDate(e) {
    const idx = e.currentTarget.dataset.idx
    this.setData({ ['candidates[' + idx + '].expiryDate']: e.detail.value })
  },

  goBack() {
    wx.navigateBack()
  },

  async retryScan() {
    if (!this.data.scanId || this.data.polling) return
    this.setData({ polling: true, errorMsg: '' })
    try {
      await api.retryFridgeScan(this.data.scanId)
      this.pollScan()
    } catch (e) {
      this.setData({
        polling: false,
        status: 'failed',
        errorMsg: (e && e.msg) || '重试失败'
      })
    }
  },

  async confirmItems() {
    const selected = this.data.candidates
      .filter(c => c.checked && c.name.trim())
      .map(c => {
        const item = {
          name: c.name.trim(),
          amount: c.amount.trim(),
          note: c.note.trim()
        }
        if (c.expiryDate) item.expiry_date = c.expiryDate
        return item
      })
    if (!selected.length) {
      return wx.showToast({ title: '请至少选择一条食材', icon: 'none' })
    }
    this.setData({ submitting: true })
    try {
      await api.confirmFridgeScan(this.data.scanId, selected)
      wx.showToast({ title: '已入库', icon: 'success' })
      setTimeout(() => {
        wx.switchTab({ url: '/pages/fridge/fridge' })
      }, 800)
    } catch (e) {
      wx.showToast({ title: (e && e.msg) || '入库失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
