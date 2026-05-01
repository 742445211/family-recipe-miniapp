     1|const api = require('../../utils/api')
     2|
     3|function safeParse(str) {
     4|  if (!str || typeof str !== 'string') return []
     5|  try { return JSON.parse(str) } catch (e) { return [] }
     6|}
     7|
     8|Page({
     9|  data: { recipe: {}, ingredients: [], seasonings: [], steps: [], isFav: false, orderNote: '' },
    10|
    11|  onLoad(options) {
    12|    this.setData({ recipeId: options.id, orderNote: '' })
    13|    this.loadRecipe(options.id)
    14|  },
    15|
    16|  onShow() {
    wx.hideTabBar()
    17|    // 编辑返回后刷新
    18|    if (this.data.recipeId) {
    19|      this.loadRecipe(this.data.recipeId)
    20|    }
    21|  },
    22|
    23|  async loadRecipe(id) {
    24|    try {
    25|      const r = await api.getRecipe(id)
    26|      this.setData({
    27|        recipe: r,
    28|        ingredients: safeParse(r.ingredients),
    29|        seasonings: safeParse(r.seasonings),
    30|        steps: safeParse(r.steps)
    31|      })
    32|    } catch (e) {
    33|      wx.showToast({ title: '加载失败', icon: 'none' })
    34|    }
    35|  },
    36|
    37|  async toggleFavorite() {
    38|    const id = this.data.recipe.id
    39|    try {
    40|      if (this.data.isFav) await api.removeFavorite(id)
    41|      else await api.addFavorite(id)
    42|      this.setData({ isFav: !this.data.isFav })
    43|    } catch (e) {}
    44|  },
    45|
    46|  async markCooked() {
    47|    try {
    48|      await api.markCooked(this.data.recipe.id)
    49|      wx.showToast({ title: '已标记', icon: 'success' })
    50|      const r = this.data.recipe
    51|      r.cook_count++
    52|      this.setData({ recipe: r })
    53|    } catch (e) {}
    54|  },
    55|
    56|  editRecipe() {
    57|    wx.navigateTo({ url: '/pages/recipe-edit/recipe-edit?id=' + this.data.recipe.id })
    58|  },
    59|
    60|  onNoteInput(e) {
    61|    this.setData({ orderNote: e.detail.value })
    62|  },
    63|
    64|  async addToMenu() {
    65|    const recipeId = this.data.recipe.id
    66|    if (!recipeId) {
    67|      wx.showToast({ title: '菜谱信息未加载', icon: 'none' })
    68|      return
    69|    }
    70|    try {
    71|      await api.addOrder({ recipe_id: recipeId, quantity: 1, note: this.data.orderNote.trim() })
    72|      wx.showToast({ title: '已加入今日点菜', icon: 'success' })
    73|      this.setData({ orderNote: '' })
    74|    } catch (e) {
    75|      wx.showToast({ title: '添加失败', icon: 'none' })
    76|    }
    77|  }
    78|})
    79|