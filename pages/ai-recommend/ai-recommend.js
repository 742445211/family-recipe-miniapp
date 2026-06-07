/**
 * pages/ai-recommend/ai-recommend.js - AI 智能推荐页面
 */

const api = require('../../utils/api')
const { requireLogin } = require('../../utils/auth')

function parseRecommendation(text) {
  if (!text || typeof text !== 'string') {
    return { items: [], raw: '' }
  }
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const items = lines.map((line) => {
    const matched = line.match(/^\d+\.\s*(.+?)(?:\s*[-–—]\s*(.+))?$/)
    if (matched) {
      return { name: matched[1].trim(), reason: (matched[2] || '').trim() }
    }
    return { name: line, reason: '' }
  })
  return { items, raw: text }
}

Page({
  data: {
    loading: false,
    items: [],
    rawResult: ''
  },

  onLoad() {
    if (!requireLogin()) return
  },

  async getRecommend() {
    if (this.data.loading) return
    this.setData({ loading: true, items: [], rawResult: '' })
    try {
      const data = await api.getAIRecommend()
      const text = (data && data.recommendation) ? data.recommendation : ''
      const parsed = parseRecommendation(text)
      if (parsed.items.length) {
        this.setData({ items: parsed.items, rawResult: '' })
      } else {
        this.setData({ items: [], rawResult: parsed.raw || '暂无推荐结果' })
      }
    } catch (e) {
      wx.showToast({ title: (e && e.msg) || '推荐失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  }
})
