const api = require('../../utils/api')

Page({
  data: { loading: false, items: [], rawResult: '' },

  async getRecommend() {
    this.setData({ loading: true, items: [], rawResult: '' })
    try {
      const data = await api.getAIRecommend()
      const text = data.recommendation || ''
      const items = this.parseRecommendations(text)
      this.setData({ rawResult: text, items })
    } catch (e) {
      wx.showToast({ title: '推荐失败，请重试', icon: 'none' })
    }
    this.setData({ loading: false })
  },

  parseRecommendations(text) {
    const lines = text.split('\n').filter(l => l.trim())
    return lines.map((line, i) => {
      // "菜名 - 推荐理由" 或 "1. 菜名 - 推荐理由" 等格式
      const cleaned = line.replace(/^\d+[\.\、\)]\s*/, '').trim()
      const dashIdx = cleaned.indexOf(' - ')
      if (dashIdx > 0) {
        return {
          name: cleaned.substring(0, dashIdx).trim(),
          reason: cleaned.substring(dashIdx + 3).trim()
        }
      }
      return { name: cleaned, reason: '' }
    })
  }
})
