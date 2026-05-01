  // 点菜（按日期，直接点菜到当天）
  getOrders: (date) => request('/orders' + (date ? '?date=' + date : '')),
  addOrder: (data) => request('/orders', 'POST', data),
  removeOrder: (id) => request('/orders/' + id, 'DELETE'),