const api = require('../../utils/api')

Page({
  data: { loading: false, result: '' },
  async getRecommend() {
    this.setData({ loading: true })
    try {
      const data = await api.getAIRecommend()
      this.setData({ result: data.recommendation })
    } catch (e) {}
    this.setData({ loading: false })
  }
})
