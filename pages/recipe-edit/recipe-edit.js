const api = require('../../utils/api')

Page({
  data: {
    isEdit: false, id: 0, name: '', category: '荤菜', categoryIndex: 0,
    difficulty: 'medium', cookTime: '', coverUrl: '', coverKey: '',
    ingredients: [{ name: '', amount: '' }], steps: [''],
    tips: '', submitting: false,
    categories: ['荤菜', '素菜', '汤', '主食', '凉菜', '其他']
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ isEdit: true, id: options.id })
      this.loadRecipe(options.id)
    }
  },

  async loadRecipe(id) {
    try {
      const r = await api.getRecipe(id)
      this.setData({
        name: r.name, category: r.category, difficulty: r.difficulty,
        cookTime: String(r.cook_time), coverUrl: r.cover_url, coverKey: r.image_key,
        ingredients: typeof r.ingredients === 'string' ? JSON.parse(r.ingredients) : (r.ingredients || [{ name: '', amount: '' }]),
        steps: typeof r.steps === 'string' ? JSON.parse(r.steps) : (r.steps || ['']),
        tips: r.tips || ''
      })
    } catch (e) {}
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

  onIngredient(e) {
    const idx = e.currentTarget.dataset.idx
    const field = e.currentTarget.dataset.field
    const val = e.detail.value
    const items = this.data.ingredients.slice()
    if (field === 'iname') items[idx].name = val
    else items[idx].amount = val
    this.setData({ ingredients: items })
  },

  addIngredient() {
    this.setData({ ingredients: [...this.data.ingredients, { name: '', amount: '' }] })
  },

  delIngredient(e) {
    const items = this.data.ingredients.slice()
    items.splice(e.currentTarget.dataset.idx, 1)
    this.setData({ ingredients: items.length ? items : [{ name: '', amount: '' }] })
  },

  onStep(e) {
    const steps = this.data.steps.slice()
    steps[e.currentTarget.dataset.idx] = e.detail.value
    this.setData({ steps })
  },

  addStep() { this.setData({ steps: [...this.data.steps, ''] }) },
  
  delStep(e) {
    const steps = this.data.steps.slice()
    steps.splice(e.currentTarget.dataset.idx, 1)
    this.setData({ steps: steps.length ? steps : [''] })
  },

  async chooseImage() {
    const res = await wx.chooseImage({ count: 1, sizeType: ['compressed'] })
    try {
      const data = await api.upload(res.tempFilePaths[0])
      this.setData({ coverUrl: data.url, coverKey: data.key })
    } catch (e) {}
  },

  async submit() {
    if (!this.data.name.trim()) {
      wx.showToast({ title: '请输入菜名', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    const data = {
      name: this.data.name,
      category: this.data.category,
      difficulty: this.data.difficulty,
      cook_time: parseInt(this.data.cookTime) || 0,
      image_key: this.data.coverKey,
      cover_url: this.data.coverUrl,
      ingredients: JSON.stringify(this.data.ingredients.filter(i => i.name)),
      steps: JSON.stringify(this.data.steps.filter(s => s)),
      tips: this.data.tips
    }
    try {
      if (this.data.isEdit) await api.updateRecipe(this.data.id, data)
      else await api.createRecipe(data)
      wx.navigateBack()
    } catch (e) {}
    this.setData({ submitting: false })
  }
})
