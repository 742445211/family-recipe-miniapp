/**
 * utils/auth.js - 登录鉴权工具模块
 * 职责：
 *   1. 提供统一的登录状态检查
 *   2. 未登录时自动跳转到登录页面
 *   3. 所有需要登录后才能访问的页面均可调用此模块
 */

/**
 * requireLogin - 检查用户是否已登录
 * 需要登录才能访问的页面调用此函数进行鉴权。
 *
 * 用法示例：
 *   if (!requireLogin()) return;  // 未登录则跳转登录页并中断后续操作
 *
 * @returns {boolean} - true 表示已登录（有 token），
 *                      false 表示未登录并已跳转到登录页面
 */
function requireLogin() {
  // 从本地存储读取 token，判断是否已登录
  const token = wx.getStorageSync('token')
  if (token) return true

  // 未登录：关闭所有页面，跳转到登录页
  wx.reLaunch({ url: '/pages/login/login' })
  return false
}

module.exports = { requireLogin }
