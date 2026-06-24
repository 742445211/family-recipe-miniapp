/**
 * pages/login/login.js - 登录页面
 * 职责：
 *   1. 调用 wx.login 获取微信临时 code
 *   2. 将 code 发送到后端换取 token 和用户信息
 *   3. 登录成功后存储 token 并跳转首页
 *   4. 处理登录中 / 登录失败的 UI 状态
 */

const api = require('../../utils/api')
const notification = require('../../utils/notification')

Page({
  data: {
    loading: false  // 是否正在登录中（控制按钮 loading 状态）
  },

  /**
   * handleLogin - 处理登录流程
   *
   * 流程：
   *   1. 设置 loading = true
   *   2. 调用 wx.login 获取临时 code
   *   3. 将 code 发送后端 API 换取 token
   *   4. 存储 token 和 userInfo 到本地
   *   5. 跳转到首页
   *
   * @returns {void}
   */
  handleLogin() {
    this.setData({ loading: true })

    // 第一步：调用微信登录接口获取临时 code
    wx.login({
      success: async (res) => {
        // 如果没有 code，说明登录失败
        if (!res.code) {
          this.setData({ loading: false })
          wx.showToast({ title: '登录失败', icon: 'none' })
          return
        }
        try {
          // 第二步：将 code 发送后端换取 token（不传昵称，保留数据库中已有值）
          const data = await api.login(res.code, '', '')

          if (!data || !data.token) {
            this.setData({ loading: false })
            wx.showToast({ title: '登录失败，未获取到凭证', icon: 'none' })
            return
          }

          // 兼容 { token, user: {...} } 与扁平 { token, nickname, ... } 两种响应
          const user = data.user || data
          wx.setStorageSync('token', data.token)
          wx.setStorageSync('userInfo', {
            nickname: user.nickname || data.nickname || '',
            avatar: user.avatar_url || user.avatar || data.avatar || data.avatar_url || ''
          })

          this.setData({ loading: false })
          wx.switchTab({
            url: '/pages/index/index',
            success: () => {
              notification.connectSocket()
            }
          })
        } catch (e) {
          // API 调用失败：恢复 loading 状态
          this.setData({ loading: false })
        }
      },
      fail: () => {
        // wx.login 本身失败
        this.setData({ loading: false })
        wx.showToast({ title: '登录失败', icon: 'none' })
      }
    })
  }
})
