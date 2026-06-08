/**
 * utils/category.js - 菜谱分类选项
 * 未登录使用本地默认分类；已登录从 GET /api/categories 拉取并合并。
 */

/** 与后端 NormalizeCategoryName 默认「其他」对齐的基础分类 */
const DEFAULT_CATEGORY_NAMES = [
  '荤菜', '素菜', '家常菜', '汤羹', '主食', '凉菜', '甜品', '其他'
]

/**
 * 从 API 响应提取分类名并去重合并（默认项在前，家庭自定义在后）。
 * @param {Array} apiList - [{ name }] 或字符串数组
 * @returns {string[]}
 */
function mergeCategoryNames(apiList) {
  const extra = (apiList || [])
    .map((item) => (typeof item === 'string' ? item : item && item.name))
    .filter(Boolean)
  const seen = new Set()
  const result = []
  for (const name of [...DEFAULT_CATEGORY_NAMES, ...extra]) {
    if (!seen.has(name)) {
      seen.add(name)
      result.push(name)
    }
  }
  return result
}

/** 首页 picker：首项「全部」 */
function buildIndexPickerCategories(names) {
  return ['全部', ...(names || DEFAULT_CATEGORY_NAMES)]
}

/**
 * 未登录：优先用公开菜谱真实分类；无数据或失败时回退默认列表。
 * @param {Array} apiList - GET /categories/public 返回的字符串数组
 * @returns {string[]}
 */
function categoriesFromPublicAPI(apiList) {
  const names = (apiList || [])
    .map((item) => (typeof item === 'string' ? item : item && item.name))
    .filter(Boolean)
  return names.length ? names : DEFAULT_CATEGORY_NAMES.slice()
}

module.exports = {
  DEFAULT_CATEGORY_NAMES,
  mergeCategoryNames,
  buildIndexPickerCategories,
  categoriesFromPublicAPI
}
