/**
 * utils/favorite.js - 收藏状态辅助
 */

const api = require('./api')
const { isLoggedIn } = require('./auth')
const { resolveFavoriteFlag } = require('./json')

const MAX_FAVORITE_PAGES = 5
const FAVORITE_PAGE_SIZE = 50

function favoriteListHasRecipe(list, id) {
  const sid = String(id)
  return (list || []).some((item) => {
    const r = item.recipe || item
    return r && String(r.id) === sid
  })
}

function favoritesHasMore(data, loadedCount) {
  if (data && typeof data.has_more === 'boolean') return data.has_more
  const total = data && data.total
  if (typeof total === 'number') return loadedCount < total
  return false
}

/**
 * 解析菜谱是否已收藏：优先读详情字段，已登录时再分页查收藏列表兜底
 */
async function resolveFavoriteState(recipeId, recipe) {
  if (resolveFavoriteFlag(recipe)) return true
  if (!isLoggedIn() || !recipeId) return false

  let page = 1
  let loaded = 0
  try {
    for (let i = 0; i < MAX_FAVORITE_PAGES; i++) {
      const data = await api.getFavorites({ page, page_size: FAVORITE_PAGE_SIZE })
      const list = (data && data.list) ? data.list : []
      if (favoriteListHasRecipe(list, recipeId)) return true
      loaded += list.length
      if (!favoritesHasMore(data, loaded) || !list.length) break
      page++
    }
  } catch (e) {
    return false
  }
  return false
}

module.exports = { resolveFavoriteState }
