/**
 * 纯 Node 可运行的 utils 冒烟测试：node --test scripts/test-utils.js
 */

const test = require('node:test')
const assert = require('node:assert/strict')
const { safeParse, resolveFavoriteFlag } = require('../utils/json')
const { formatYMD, todayYMD, normalizeYMD } = require('../utils/date')
const { mergeCategoryNames } = require('../utils/category')
const { normalizeFeatures } = require('../utils/features')

test('safeParse 解析数组', () => {
  assert.deepEqual(safeParse('[1,2]'), [1, 2])
})

test('safeParse 非法 JSON 返回空数组', () => {
  assert.deepEqual(safeParse('{bad'), [])
})

test('resolveFavoriteFlag 兼容多种字段', () => {
  assert.equal(resolveFavoriteFlag({ is_favorited: true }), true)
  assert.equal(resolveFavoriteFlag({ is_favorite: true }), true)
  assert.equal(resolveFavoriteFlag({ favorited: true }), true)
  assert.equal(resolveFavoriteFlag({ }), false)
})

test('normalizeYMD 截取 ISO 日期', () => {
  assert.equal(normalizeYMD('2026-06-23T12:00:00+08:00'), '2026-06-23')
})

test('formatYMD / todayYMD', () => {
  const d = new Date(2026, 5, 23)
  assert.equal(formatYMD(d), '2026-06-23')
  assert.match(todayYMD(), /^\d{4}-\d{2}-\d{2}$/)
})

test('mergeCategoryNames 合并去重', () => {
  const names = mergeCategoryNames([{ name: '热菜' }, { name: '凉菜' }, { name: '热菜' }])
  assert.ok(names.indexOf('热菜') >= 0)
  assert.ok(names.indexOf('凉菜') >= 0)
})

test('normalizeFeatures AI 关闭时 catalog 同步关闭', () => {
  assert.deepEqual(normalizeFeatures({
    ai_recommend: false,
    catalog_recipe: true,
    fridge: true,
    blind_box: true
  }), {
    ai_recommend: false,
    catalog_recipe: false,
    fridge: true,
    blind_box: true
  })
})

test('normalizeFeatures AI 开启时保留 catalog', () => {
  const f = normalizeFeatures({ ai_recommend: true, catalog_recipe: true })
  assert.equal(f.ai_recommend, true)
  assert.equal(f.catalog_recipe, true)
})
