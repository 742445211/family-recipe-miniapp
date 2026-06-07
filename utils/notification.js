/**
 * utils/notification.js - WebSocket 通知连接管理（单例）
 */

const WS_BASE = 'wss://www.zzzjc.xin/api/ws'
const TEMPLATE_ID = 'WCehmUVgB8k4zx27u9znF9h66Y1mYzLIjd6bNn0SRgw'

let socketTask = null
let reconnectTimer = null
let reconnectAttempt = 0
let messageHandler = null
let connecting = false
let connected = false
let intentionalClose = false

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

function decodeJwtPayload(token) {
  const part = token.split('.')[1]
  if (!part) return null
  try {
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const raw = atob(padded)
    const json = decodeURIComponent(
      raw.split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    )
    return JSON.parse(json)
  } catch (e) {
    return null
  }
}

function isTokenExpired(token) {
  const payload = decodeJwtPayload(token)
  if (!payload || !payload.exp) return true
  return payload.exp * 1000 < Date.now()
}

function handleAuthExpired() {
  intentionalClose = true
  disconnectSocket()
  wx.removeStorageSync('token')
  wx.removeStorageSync('userInfo')
  wx.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
}

function updateMessageHandler(onMessage) {
  if (typeof onMessage === 'function') {
    messageHandler = onMessage
  }
}

function bindSocketEvents(task) {
  task.onOpen(() => {
    connecting = false
    connected = true
    reconnectAttempt = 0
  })

  task.onMessage((res) => {
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

  task.onClose(() => {
    connecting = false
    connected = false
    socketTask = null
    if (!intentionalClose && wx.getStorageSync('token')) {
      scheduleReconnect()
    }
  })

  task.onError(() => {
    connecting = false
    connected = false
    if (!intentionalClose && wx.getStorageSync('token')) {
      scheduleReconnect()
    }
  })
}

function connectSocket(onMessage) {
  const token = wx.getStorageSync('token')
  if (!token) return

  if (isTokenExpired(token)) {
    handleAuthExpired()
    return
  }

  updateMessageHandler(onMessage)

  if (connected || connecting) return

  intentionalClose = false
  connecting = true

  if (socketTask) {
    try { socketTask.close() } catch (e) {}
    socketTask = null
  }

  socketTask = wx.connectSocket({
    url: WS_BASE + '?token=' + encodeURIComponent(token),
    fail() {
      connecting = false
      scheduleReconnect()
    }
  })
  bindSocketEvents(socketTask)
}

function scheduleReconnect() {
  const token = wx.getStorageSync('token')
  if (!token || isTokenExpired(token)) {
    if (token && isTokenExpired(token)) handleAuthExpired()
    return
  }
  if (reconnectTimer) return
  const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempt))
  reconnectAttempt++
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connectSocket(messageHandler)
  }, delay)
}

function disconnectSocket() {
  intentionalClose = true
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  reconnectAttempt = 0
  connecting = false
  connected = false
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
  updateMessageHandler,
  handleAuthExpired,
  parseSocketMessage,
  mealLabel,
  requestSubscribeAuth,
  TEMPLATE_ID
}
