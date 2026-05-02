App({
  onLaunch() {
    // 不自动跳登录，让用户先浏览菜谱
  },
  globalData: {
    userInfo: null,
    currentFamily: null,
    indexMode: null  // 'favorites' | 'recipes' | null
  }
})
