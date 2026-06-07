/**
 * utils/notification.js - WebSocket 通知连接管理
 */

const WS_BASE = 'wss://www.zzzjc.xin/api/ws'
const TEMPLATE_ID = 'WCehmUVgB8k4zx27u9znF9h66Y1mYzLIjd6bNn0SRgw'

let socketTask = null
let reconnectTimer = null
let reconnectAttempt = 0
let messageHandler = null

function parseSocketMessage(raw) {
  if (!raw || typeof raw !== 'string') return null
  try {
    const msg = JSON.parse(raw)
    if (!msg || typeof msg !== 'object') return null
    return msg
  } catch (e) {
    return null
  }
}

function mealLabel(mealType) {
  const map = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' }
  return map[mealType] || mealType || ''
}

function connectSocket(onMessage) {
  const token = wx.getStorageSync('token')
  if (!token) return

  messageHandler = onMessage || messageHandler
  if (socketTask) {
    try { socketTask.close() } catch (e) {}
    socketTask = null
  }

  socketTask = wx.connectSocket({
    url: WS_BASE + '?token=' + encodeURIComponent(token),
    fail() { scheduleReconnect() }
  })

  socketTask.onOpen(() => {
    reconnectAttempt = 0
  })

  socketTask.onMessage((res) => {
    const msg = parseSocketMessage(res.data)
    if (!msg) return
    if (msg.type === 'ORDER_CREATED') {
      wx.showToast({ title: msg.title || '有新的点菜', icon: 'none' })
      wx.vibrateShort({ type: 'medium' })
      if (typeof messageHandler === 'function') {
        messageHandler(msg)
      }
    }
  })

  socketTask.onClose(() => {
    socketTask = null
    scheduleReconnect()
  })

  socketTask.onError(() => {
    scheduleReconnect()
  })
}

function scheduleReconnect() {
  if (!wx.getStorageSync('token')) return
  if (reconnectTimer) return
  const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempt))
  reconnectAttempt++
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connectSocket(messageHandler)
  }, delay)
}

function disconnectSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  reconnectAttempt = 0
  if (socketTask) {
    try { socketTask.close() } catch (e) {}
    socketTask = null
  }
}

function requestSubscribeAuth() {
  wx.requestSubscribeMessage({
    tmplIds: [TEMPLATE_ID],
    success() {},
    fail() {}
  })
}

module.exports = {
  connectSocket,
  disconnectSocket,
  parseSocketMessage,
  mealLabel,
  requestSubscribeAuth,
  TEMPLATE_ID
}
