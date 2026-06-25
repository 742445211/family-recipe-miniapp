/**
 * pages/family-join/family-join.js - 加入家庭页面
 * 职责：
 *   1. 输入 6 位邀请码
 *   2. 调用 API 加入家庭
 *   3. 加入成功后返回上一页
 */

const api = require('../../utils/api')
const { requireLogin, applyFamilyToken } = require('../../utils/auth')

Page({
  data: {
    code: ''  // 邀请码输入值
  },

  /**
   * onShow - 页面显示时检查登录状态
   */
  onShow() {
    if (!requireLogin()) return
  },

  /**
   * onCode - 邀请码输入事件
   * @param {Object} e - 输入事件，e.detail.value 为邀请码
   */
  onCode(e) {
    this.setData({ code: e.detail.value })
  },

  /**
   * join - 提交加入家庭请求
   * 校验邀请码为 6 位 → 调用 API → 成功后延迟返回
   * @returns {Promise<void>}
   */
  async join() {
    const code = this.data.code.trim()

    // 校验邀请码长度必须为 6 位
    if (!code || code.length !== 6) {
      return wx.showToast({ title: '请输入6位邀请码', icon: 'none' })
    }

    try {
      const data = await api.joinFamily(code)
      applyFamilyToken(data)
      wx.showToast({ title: '加入成功', icon: 'success' })
      // 延迟 1.5s 返回上一页，让用户看到成功提示
      setTimeout(() => wx.navigateBack(), 1500)
    } catch (e) {}
  }
})
