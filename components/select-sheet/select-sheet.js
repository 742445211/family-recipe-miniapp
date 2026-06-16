/**
 * select-sheet - 底部滑出选择面板（替代原生 picker）
 */
Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    title: {
      type: String,
      value: ''
    },
    options: {
      type: Array,
      value: []
    },
    value: {
      type: null,
      value: ''
    }
  },

  data: {
    mounted: false,
    active: false
  },

  observers: {
    visible(v) {
      if (v) {
        this.setData({ mounted: true })
        setTimeout(() => this.setData({ active: true }), 20)
      } else if (this.data.mounted) {
        this.setData({ active: false })
        setTimeout(() => this.setData({ mounted: false }), 280)
      }
    }
  },

  methods: {
    noop() {},

    onMaskTap() {
      this.triggerEvent('close')
    },

    onCancel() {
      this.triggerEvent('close')
    },

    onSelect(e) {
      const idx = e.currentTarget.dataset.index
      const item = this.properties.options[idx]
      if (!item) return
      this.triggerEvent('select', { value: item.value, index: idx, item })
      this.triggerEvent('close')
    }
  }
})
