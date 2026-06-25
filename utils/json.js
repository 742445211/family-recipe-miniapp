/**
 * utils/json.js - JSON 解析与菜谱字段辅助
 * 后端 ingredients/steps 等字段为 JSON 字符串，解析失败不应导致页面白屏。
 */

/**
 * safeParse - 安全解析 JSON 字符串
 * @param {string} str
 * @param {*} fallback - 解析失败或空值时的默认值，默认 []
 */
function safeParse(str, fallback) {
  const empty = fallback !== undefined ? fallback : []
  if (!str || typeof str !== 'string') return empty
  try {
    const val = JSON.parse(str)
    return val == null ? empty : val
  } catch (e) {
    return empty
  }
}

/** 从详情接口对象读取是否已收藏（后端字段名可能不一致） */
function resolveFavoriteFlag(recipe) {
  if (!recipe || typeof recipe !== 'object') return false
  if (recipe.is_favorited === true || recipe.is_favorite === true) return true
  if (recipe.is_fav === true || recipe.favorited === true) return true
  return false
}

module.exports = { safeParse, resolveFavoriteFlag }
