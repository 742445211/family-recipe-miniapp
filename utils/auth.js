// 需要登录才能访问的页面调用此函数
// 返回 true 表示已登录，false 表示已跳转登录页
function requireLogin() {
  const token = wx.getStorageSync('token')
  if (token) return true

  wx.reLaunch({ url: '/pages/login/login' })
  return false
}

module.exports = { requireLogin }
