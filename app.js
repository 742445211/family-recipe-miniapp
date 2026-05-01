App({
  onLaunch() {
    const token = wx.getStorageSync('token')
    if (!token) {
      wx.reLaunch({ url: '/pages/login/login' })
    }
  },
  globalData: {
    userInfo: null,
    currentFamily: null,
    indexMode: null  // 'favorites' | 'recipes' | null
  }
})
