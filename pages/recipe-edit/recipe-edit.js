const api = require('../../utils/api')
const { requireLogin } = require('../../utils/auth')

Page({
  data: {
    id: null,
    isEdit: false,
    name: '',
    category: '',
    categoryIndex: -1,
    categories: ['荤菜', '素菜', '汤', '主食', '凉菜', '其他'],
    difficulty: 'medium',
    cookTime: 0,
    coverUrl: '',
    ingredients: [{ name: '', amount: '' }],
    seasonings: [],
    steps: [''],
    tips: '',
    submitting: false
  },

  onLoad(options) {
    if (!requireLogin()) return
    if (options.id) {
      this.setData({ id: options.id, isEdit: true })
      wx.setNavigationBarTitle({ title: '编辑菜谱' })
      this.loadRecipe(options.id)
    } else {
      wx.setNavigationBarTitle({ title: '新增菜谱' })
    }
  },

  async loadRecipe(id) {
    try {
      const r = await api.getRecipe(id)
      const ing = JSON.parse(r.ingredients || '[]')
      const steps = JSON.parse(r.steps || '[]')
      this.setData({
        name: r.name,
        category: r.category || '',
        categoryIndex: Math.max(0, this.data.categories.indexOf(r.category)),
        difficulty: r.difficulty || 'medium',
        cookTime: r.cook_time || 0,
        coverUrl: r.cover_url || '',
        ingredients: ing.length ? ing : [{ name: '', amount: '' }],
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

  onCategory(e) {
    const idx = parseInt(e.detail.value)
    this.setData({ categoryIndex: idx, category: this.data.categories[idx] })
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

  // 食材
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

  // 步骤
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

  async submit() {
    if (!this.data.name.trim()) {
      return wx.showToast({ title: '请输入菜名', icon: 'none' })
    }
    this.setData({ submitting: true })

    const payload = {
      name: this.data.name.trim(),
      category: this.data.category || '其他',
      difficulty: this.data.difficulty,
      cook_time: parseInt(this.data.cookTime) || 0,
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
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
