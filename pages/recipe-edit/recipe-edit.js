/**
 * pages/recipe-edit/recipe-edit.js - 菜谱编辑 / 新增页
 */

const api = require('../../utils/api')
const { requireLogin } = require('../../utils/auth')
const { DEFAULT_CATEGORY_NAMES, mergeCategoryNames } = require('../../utils/category')
const { safeParse } = require('../../utils/json')
const { markIndexNeedRefresh } = require('../../utils/index-refresh')

const CATALOG_RATE_LIMIT_MAX = 5
const CATALOG_RATE_WINDOW_HOURS = 2

function getAppSafe() {
  try {
    return getApp()
  } catch (e) {
    return null
  }
}

function formatCatalogRetryHint(sec) {
  if (!sec || sec <= 0) return '稍后再试'
  const h = Math.ceil(sec / 3600)
  if (h <= 1) return '约 1 小时后再试'
  return '约 ' + h + ' 小时后再试'
}

function hasFormContent(data) {
  if (data.name.trim()) return true
  if (data.coverUrl) return true
  if (data.tips.trim()) return true
  if (data.ingredients.some(i => i.name && i.name.trim())) return true
  if (data.seasonings.some(i => i.name && i.name.trim())) return true
  if (data.steps.some(s => s && s.trim())) return true
  return false
}

Page({
  data: {
    id: null,
    isEdit: false,
    name: '',
    category: '',
    categoryIndex: -1,
    categories: DEFAULT_CATEGORY_NAMES.slice(),
    categoryOptions: [],
    categorySheetVisible: false,
    difficulty: 'medium',
    cookTime: 0,
    coverUrl: '',
    ingredients: [{ name: '', amount: '' }],
    seasonings: [],
    steps: [''],
    tips: '',
    submitting: false,
    catalogEnabled: false,
    catalogLoading: false,
    catalogGenerated: false,
    catalogVariants: [],
    selectedCatalogId: null,
    catalogRateLimit: null,
    variantSheetVisible: false,
    variantOptions: [],
    currentVariantLabel: ''
  },

  async onLoad(options) {
    if (!requireLogin()) return
    await this._initCatalogFeature()
    await this.loadCategories()
    if (options.id) {
      this.setData({ id: options.id, isEdit: true })
      wx.setNavigationBarTitle({ title: '编辑菜谱' })
      await this.loadRecipe(options.id)
    } else {
      wx.setNavigationBarTitle({ title: '新增菜谱' })
    }
  },

  async _initCatalogFeature() {
    const app = getAppSafe()
    if (app && app._featuresPromise) {
      try {
        await app._featuresPromise
      } catch (e) { /* ignore */ }
    }
    const enabled = !!(app && app.globalData && app.globalData.features && app.globalData.features.catalog_recipe)
    this.setData({ catalogEnabled: enabled })
  },

  _buildCategoryOptions(categories) {
    return (categories || []).map((c) => ({ value: c, label: c }))
  },

  async loadCategories() {
    try {
      const data = await api.getCategories()
      const categories = mergeCategoryNames(data)
      this.setData({
        categories,
        categoryOptions: this._buildCategoryOptions(categories)
      })
    } catch (e) {
      const categories = DEFAULT_CATEGORY_NAMES.slice()
      this.setData({
        categories,
        categoryOptions: this._buildCategoryOptions(categories)
      })
    }
  },

  async loadRecipe(id) {
    try {
      const r = await api.getRecipe(id)
      const ing = safeParse(r.ingredients)
      const seasonings = safeParse(r.seasonings)
      const steps = safeParse(r.steps)
      let categories = this.data.categories.slice()
      let category = r.category || ''
      let categoryIndex = category ? categories.indexOf(category) : -1
      if (category && categoryIndex < 0) {
        categories = [...categories, category]
        categoryIndex = categories.length - 1
      }
      this.setData({
        name: r.name,
        category,
        categories,
        categoryIndex,
        categoryOptions: this._buildCategoryOptions(categories),
        difficulty: r.difficulty || 'medium',
        cookTime: r.cook_time || 0,
        coverUrl: r.cover_url || '',
        ingredients: ing.length ? ing : [{ name: '', amount: '' }],
        seasonings,
        steps: steps.length ? steps : [''],
        tips: r.tips || ''
      })
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [field]: e.detail.value })
  },

  openCategorySheet() {
    this.setData({ categorySheetVisible: true })
  },

  closeCategorySheet() {
    this.setData({ categorySheetVisible: false })
  },

  onCategorySelect(e) {
    const { value } = e.detail
    const idx = this.data.categories.indexOf(value)
    this.setData({
      category: value,
      categoryIndex: idx >= 0 ? idx : -1,
      categorySheetVisible: false
    })
  },

  setDifficulty(e) {
    this.setData({ difficulty: e.currentTarget.dataset.val })
  },

  async chooseImage() {
    try {
      const res = await wx.chooseImage({ count: 1, sizeType: ['compressed'] })
      wx.showLoading({ title: '上传中...' })
      const data = await api.upload(res.tempFilePaths[0])
      wx.hideLoading()
      this.setData({ coverUrl: data.url })
    } catch (e) { wx.hideLoading() }
  },

  addIngredient() {
    this.setData({ ingredients: [...this.data.ingredients, { name: '', amount: '' }] })
  },

  delIngredient(e) {
    const idx = e.currentTarget.dataset.idx
    const list = this.data.ingredients.filter((_, i) => i !== idx)
    this.setData({ ingredients: list.length ? list : [{ name: '', amount: '' }] })
  },

  onIngredient(e) {
    const idx = e.currentTarget.dataset.idx
    const field = e.currentTarget.dataset.field
    const key = 'ingredients[' + idx + '].' + (field === 'iname' ? 'name' : 'amount')
    this.setData({ [key]: e.detail.value })
  },

  addSeasoning() {
    this.setData({ seasonings: [...this.data.seasonings, { name: '', amount: '' }] })
  },

  delSeasoning(e) {
    const idx = e.currentTarget.dataset.idx
    const list = this.data.seasonings.filter((_, i) => i !== idx)
    this.setData({ seasonings: list })
  },

  onSeasoning(e) {
    const idx = e.currentTarget.dataset.idx
    const field = e.currentTarget.dataset.field
    const key = 'seasonings[' + idx + '].' + (field === 'sname' ? 'name' : 'amount')
    this.setData({ [key]: e.detail.value })
  },

  addStep() {
    this.setData({ steps: [...this.data.steps, ''] })
  },

  delStep(e) {
    const idx = e.currentTarget.dataset.idx
    const list = this.data.steps.filter((_, i) => i !== idx)
    this.setData({ steps: list.length ? list : [''] })
  },

  onStep(e) {
    const idx = e.currentTarget.dataset.idx
    this.setData({ ['steps[' + idx + ']']: e.detail.value })
  },

  applyVariant(v) {
    const ing = safeParse(v.ingredients)
    const seasonings = safeParse(v.seasonings)
    const steps = safeParse(v.steps)
    let categories = this.data.categories.slice()
    let category = v.category || ''
    let categoryIndex = category ? categories.indexOf(category) : -1
    if (category && categoryIndex < 0) {
      categories = [...categories, category]
      categoryIndex = categories.length - 1
    }
    const variantOptions = this.data.catalogVariants.map(item => ({
      value: item.id,
      label: item.variant_label || item.name,
      subtitle: item.category || ''
    }))
    this.setData({
      name: v.name,
      category,
      categories,
      categoryIndex,
      categoryOptions: this._buildCategoryOptions(categories),
      difficulty: v.difficulty || 'medium',
      cookTime: v.cook_time || 0,
      coverUrl: v.cover_url || '',
      ingredients: ing.length ? ing : [{ name: '', amount: '' }],
      seasonings: seasonings.length ? seasonings : [],
      steps: steps.length ? steps : [''],
      tips: v.tips || '',
      selectedCatalogId: v.id,
      currentVariantLabel: v.variant_label || v.name,
      variantOptions
    })
  },

  async _confirmOverwriteIfNeeded() {
    if (!hasFormContent(this.data)) return true
    const res = await new Promise((resolve) => {
      wx.showModal({
        title: '覆盖已填内容？',
        content: '搜索生成将覆盖当前表单内容，是否继续？',
        success: (r) => resolve(r.confirm)
      })
    })
    return res
  },

  async onCatalogLookup(e) {
    const ds = e && e.currentTarget && e.currentTarget.dataset
    const newVariant = !!(ds && (ds.newVariant === true || ds.newVariant === 'true'))
    const name = this.data.name.trim()
    if (!name) {
      return wx.showToast({ title: '请先输入菜名', icon: 'none' })
    }
    if (!newVariant && hasFormContent(this.data)) {
      const ok = await this._confirmOverwriteIfNeeded()
      if (!ok) return
    }
    this.setData({ catalogLoading: true })
    try {
      const data = await api.lookupCatalogRecipe(name, newVariant)
      const variants = data.variants || []
      if (!variants.length) {
        return wx.showToast({ title: '未找到菜谱', icon: 'none' })
      }
      const selected = variants.find(v => v.id === data.selected_id) || variants[0]
      const variantOptions = variants.map(item => ({
        value: item.id,
        label: item.variant_label || item.name,
        subtitle: item.category || ''
      }))
      this.setData({
        catalogVariants: variants,
        catalogGenerated: !!data.generated,
        catalogRateLimit: data.rate_limit || null,
        variantOptions
      })
      this.applyVariant(selected)
      const tip = data.generated ? '已生成并填入表单' : '已从菜谱库填入'
      wx.showToast({ title: tip, icon: 'none' })
    } catch (e) {
      if (e && e.code === 429) {
        const rl = e.data && e.data.rate_limit
        const hint = formatCatalogRetryHint(rl && rl.reset_after_sec)
        wx.showModal({ title: '生成次数已满', content: hint, showCancel: false })
        if (e.data) this.setData({ catalogRateLimit: e.data.rate_limit })
        return
      }
      wx.showToast({ title: (e && e.msg) || '生成失败', icon: 'none' })
    } finally {
      this.setData({ catalogLoading: false })
    }
  },

  openVariantSheet() {
    this.setData({ variantSheetVisible: true })
  },

  closeVariantSheet() {
    this.setData({ variantSheetVisible: false })
  },

  onVariantSelect(e) {
    const { value } = e.detail
    const v = this.data.catalogVariants.find(item => item.id === value)
    if (!v) return
    this.applyVariant(v)
    this.setData({ variantSheetVisible: false })
    api.markCatalogRecipeUsed(v.id).catch(() => {})
  },

  async submit() {
    if (!this.data.name.trim()) {
      return wx.showToast({ title: '请输入菜名', icon: 'none' })
    }
    this.setData({ submitting: true })
    const payload = {
      name: this.data.name.trim(),
      category: this.data.category || '其他',
      difficulty: this.data.difficulty,
      cook_time: parseInt(this.data.cookTime, 10) || 0,
      cover_url: this.data.coverUrl,
      ingredients: JSON.stringify(this.data.ingredients.filter(i => i.name)),
      seasonings: JSON.stringify(this.data.seasonings.filter(i => i.name)),
      steps: JSON.stringify(this.data.steps.filter(s => s.trim())),
      tips: this.data.tips
    }
    try {
      if (this.data.id) {
        await api.updateRecipe(this.data.id, payload)
      } else {
        await api.createRecipe(payload)
      }
      wx.showToast({ title: '保存成功', icon: 'success' })
      markIndexNeedRefresh() // 返回首页 Tab 时刷新列表
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
