/**
 * pages/recipe-edit/recipe-edit.js - 菜谱编辑 / 新增页
 * 职责：
 *   1. 新增菜谱：填写菜名、分类、难度、时间、封面、食材、步骤
 *   2. 编辑菜谱：加载已有菜谱数据，修改后保存
 *   3. 图片上传（wx.chooseImage → api.upload）
 *   4. 食材 / 步骤的动态增删
 *   5. 表单验证 + 提交保存
 */

const api = require('../../utils/api')
const { requireLogin } = require('../../utils/auth')

Page({
  data: {
    id: null,             // 菜谱 ID（编辑模式时有值，新增模式为 null）
    isEdit: false,        // 是否为编辑模式
    name: '',             // 菜名
    category: '',         // 分类
    categoryIndex: -1,    // 分类 picker 索引
    categories: ['荤菜', '素菜', '汤', '主食', '凉菜', '其他'],
    difficulty: 'medium', // 难度：easy/medium/hard
    cookTime: 0,          // 烹饪时间（分钟）
    coverUrl: '',         // 封面图 URL
    ingredients: [{ name: '', amount: '' }],  // 食材列表 [{name, amount}]
    seasonings: [],       // 调料列表
    steps: [''],          // 步骤列表（字符串数组）
    tips: '',             // 小贴士
    submitting: false     // 是否正在提交（防重复提交）
  },

  /**
   * onLoad - 页面加载
   * 根据是否有 id 参数判断新增还是编辑模式
   * @param {Object} options - 页面参数，options.id 存在则为编辑模式
   */
  onLoad(options) {
    if (!requireLogin()) return
    if (options.id) {
      // 编辑模式：设置 ID，加载现有菜谱数据
      this.setData({ id: options.id, isEdit: true })
      wx.setNavigationBarTitle({ title: '编辑菜谱' })
      this.loadRecipe(options.id)
    } else {
      // 新增模式
      wx.setNavigationBarTitle({ title: '新增菜谱' })
    }
  },

  /**
   * loadRecipe - 加载菜谱数据到表单（编辑模式）
   * 将 API 返回的 JSON 字符串字段解析为数组，填入表单
   *
   * @param {string} id - 菜谱 ID
   * @returns {Promise<void>}
   */
  async loadRecipe(id) {
    try {
      const r = await api.getRecipe(id)
      // 解析 JSON 字段（食材和步骤）
      const ing = JSON.parse(r.ingredients || '[]')
      const steps = JSON.parse(r.steps || '[]')
      this.setData({
        name: r.name,
        category: r.category || '',
        // 计算分类在 picker 中的索引
        categoryIndex: Math.max(0, this.data.categories.indexOf(r.category)),
        difficulty: r.difficulty || 'medium',
        cookTime: r.cook_time || 0,
        coverUrl: r.cover_url || '',
        // 食材为空时保留一个空行
        ingredients: ing.length ? ing : [{ name: '', amount: '' }],
        // 步骤为空时保留一个空行
        steps: steps.length ? steps : [''],
        tips: r.tips || ''
      })
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  /**
   * onInput - 通用输入事件处理
   * 通过 data-field 属性区分不同字段
   * @param {Object} e - 输入事件，e.currentTarget.dataset.field 为字段名
   */
  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [field]: e.detail.value })
  },

  /**
   * onCategory - 分类选择事件
   * @param {Object} e - picker change 事件
   */
  onCategory(e) {
    const idx = parseInt(e.detail.value)
    this.setData({ categoryIndex: idx, category: this.data.categories[idx] })
  },

  /**
   * setDifficulty - 设置难度
   * @param {Object} e - 点击事件，e.currentTarget.dataset.val 为难度值
   */
  setDifficulty(e) {
    this.setData({ difficulty: e.currentTarget.dataset.val })
  },

  /**
   * chooseImage - 选择并上传封面图
   * 流程：wx.chooseImage 选图 → wx.showLoading → api.upload 上传 → 更新 coverUrl
   * @returns {Promise<void>}
   */
  async chooseImage() {
    try {
      // 从相册选择一张压缩后的图片
      const res = await wx.chooseImage({ count: 1, sizeType: ['compressed'] })
      wx.showLoading({ title: '上传中...' })
      // 上传到服务器，获取返回的 URL
      const data = await api.upload(res.tempFilePaths[0])
      wx.hideLoading()
      this.setData({ coverUrl: data.url })
    } catch (e) { wx.hideLoading() }
  },

  // ========== 食材管理 ==========

  /**
   * addIngredient - 添加一行食材输入
   */
  addIngredient() {
    this.setData({ ingredients: [...this.data.ingredients, { name: '', amount: '' }] })
  },

  /**
   * delIngredient - 删除指定食材行
   * 删除后如果列表为空，保留一行空输入
   * @param {Object} e - 点击事件，e.currentTarget.dataset.idx 为索引
   */
  delIngredient(e) {
    const idx = e.currentTarget.dataset.idx
    const list = this.data.ingredients.filter((_, i) => i !== idx)
    this.setData({ ingredients: list.length ? list : [{ name: '', amount: '' }] })
  },

  /**
   * onIngredient - 食材输入事件
   * @param {Object} e - 输入事件，含 dataset.idx（索引）和 dataset.field（字段名）
   */
  onIngredient(e) {
    const idx = e.currentTarget.dataset.idx
    const field = e.currentTarget.dataset.field
    // 构造动态 key：ingredients[N].name 或 ingredients[N].amount
    const key = 'ingredients[' + idx + '].' + (field === 'iname' ? 'name' : 'amount')
    this.setData({ [key]: e.detail.value })
  },

  // ========== 步骤管理 ==========

  /**
   * addStep - 添加一个步骤输入框
   */
  addStep() {
    this.setData({ steps: [...this.data.steps, ''] })
  },

  /**
   * delStep - 删除指定步骤
   * 删除后如果列表为空，保留一个空输入框
   * @param {Object} e - 点击事件，e.currentTarget.dataset.idx 为索引
   */
  delStep(e) {
    const idx = e.currentTarget.dataset.idx
    const list = this.data.steps.filter((_, i) => i !== idx)
    this.setData({ steps: list.length ? list : [''] })
  },

  /**
   * onStep - 步骤内容输入事件
   * @param {Object} e - 输入事件，e.currentTarget.dataset.idx 为步骤索引
   */
  onStep(e) {
    const idx = e.currentTarget.dataset.idx
    this.setData({ ['steps[' + idx + ']']: e.detail.value })
  },

  /**
   * submit - 提交保存菜谱
   * 校验菜名不为空 → 构建 payload → 调用 createRecipe 或 updateRecipe
   * @returns {Promise<void>}
   */
  async submit() {
    // 校验：菜名不能为空
    if (!this.data.name.trim()) {
      return wx.showToast({ title: '请输入菜名', icon: 'none' })
    }
    // 设置提交中状态，防止重复点击
    this.setData({ submitting: true })

    // 构建请求体：将食材/步骤数组转为 JSON 字符串存储
    const payload = {
      name: this.data.name.trim(),
      category: this.data.category || '其他',
      difficulty: this.data.difficulty,
      cook_time: parseInt(this.data.cookTime) || 0,
      cover_url: this.data.coverUrl,
      // 过滤掉空食材行后序列化
      ingredients: JSON.stringify(this.data.ingredients.filter(i => i.name)),
      // 过滤掉空调料后序列化
      seasonings: JSON.stringify(this.data.seasonings.filter(i => i.name)),
      // 过滤掉空步骤后序列化
      steps: JSON.stringify(this.data.steps.filter(s => s.trim())),
      tips: this.data.tips
    }

    try {
      // 根据有无 id 判断是更新还是新增
      if (this.data.id) {
        await api.updateRecipe(this.data.id, payload)
      } else {
        await api.createRecipe(payload)
      }
      wx.showToast({ title: '保存成功', icon: 'success' })
      // 延迟返回上一页，让用户看到成功提示
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      // 无论成功或失败都解除提交状态
      this.setData({ submitting: false })
    }
  }
})
