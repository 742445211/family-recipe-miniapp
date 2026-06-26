/**
 * utils/features.js - 应用功能开关（独立模块，避免 app.js 依赖 api.js）
 */

const BASE_URL = 'https://www.zzzjc.xin/api'

const DEFAULT_FEATURES = {
  ai_recommend: false,
  catalog_recipe: false,
  fridge: false,
  blind_box: false
}

/**
 * normalizeFeatures - 规范化功能开关；catalog 依赖 ai_recommend
 * @param {Object} raw
 * @returns {{ ai_recommend: boolean, catalog_recipe: boolean, fridge: boolean, blind_box: boolean }}
 */
function normalizeFeatures(raw) {
  if (!raw || typeof raw !== 'object') {
    return Object.assign({}, DEFAULT_FEATURES)
  }
  const aiRecommend = !!raw.ai_recommend
  return {
    ai_recommend: aiRecommend,
    catalog_recipe: aiRecommend && !!raw.catalog_recipe,
    fridge: raw.fridge !== false,
    blind_box: raw.blind_box !== false
  }
}

function parseFeaturesResponse(body) {
  if (body && body.code === 0 && body.data) {
    return normalizeFeatures(body.data)
  }
  return Object.assign({}, DEFAULT_FEATURES)
}

/**
 * loadAppFeatures - 拉取公开功能开关，失败时返回默认关闭
 */
function loadAppFeatures() {
  return new Promise((resolve) => {
    wx.request({
      url: BASE_URL + '/app/features',
      method: 'GET',
      success(res) {
        resolve(parseFeaturesResponse(res.data))
      },
      fail() {
        resolve(Object.assign({}, DEFAULT_FEATURES))
      }
    })
  })
}

function syncFeaturesToApp(app, features) {
  if (app && app.globalData) {
    app.globalData.features = normalizeFeatures(features)
  }
}

function getCachedFeatures(app) {
  if (app && app.globalData && app.globalData.features) {
    return normalizeFeatures(app.globalData.features)
  }
  return Object.assign({}, DEFAULT_FEATURES)
}

/**
 * refreshAppFeatures - 拉取最新开关并写入 globalData
 */
function refreshAppFeatures(app) {
  return loadAppFeatures().then((features) => {
    syncFeaturesToApp(app, features)
    return features
  })
}

module.exports = {
  DEFAULT_FEATURES,
  loadAppFeatures,
  refreshAppFeatures,
  syncFeaturesToApp,
  normalizeFeatures,
  getCachedFeatures
}
