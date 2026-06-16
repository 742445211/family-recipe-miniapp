/**
 * utils/features.js - 应用功能开关（独立模块，避免 app.js 依赖 api.js）
 */

const BASE_URL = 'https://www.zzzjc.xin/api'

/**
 * loadAppFeatures - 拉取公开功能开关，失败时返回默认关闭
 * @returns {Promise<{ ai_recommend: boolean, catalog_recipe: boolean, fridge: boolean }>}
 */
function loadAppFeatures() {
  return new Promise((resolve) => {
    wx.request({
      url: BASE_URL + '/app/features',
      method: 'GET',
      success(res) {
        if (res.data && res.data.code === 0 && res.data.data) {
          resolve({
            ai_recommend: !!res.data.data.ai_recommend,
            catalog_recipe: !!res.data.data.catalog_recipe,
            fridge: !!res.data.data.fridge
          })
          return
        }
        resolve({ ai_recommend: false, catalog_recipe: false, fridge: false })
      },
      fail() {
        resolve({ ai_recommend: false, catalog_recipe: false, fridge: false })
      }
    })
  })
}

module.exports = { loadAppFeatures }
