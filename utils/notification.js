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

function base64UrlDecode(part) {
  let base64 = part.replace(/-/g, '+').replace(/_/g, '/')
  const pad = base64.length % 4
  if (pad) base64 += '='.repeat(4 - pad)
  if (typeof atob === 'function') {
    return atob(base64)
  }
  if (typeof wx !== 'undefined' && wx.base64ToArrayBuffer) {
    const buf = wx.base64ToArrayBuffer(base64)
    const bytes = new Uint8Array(buf)
    let raw = ''
    for (let i = 0; i < bytes.length; i++) raw += String.fromCharCode(bytes[i])
    return raw
  }
  return null
}

function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null
  const part = token.split('.')[1]
  if (!part) return null
  try {
    const raw = base64UrlDecode(part)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (e) {
    return null
  }
}

function isTokenExpired(token) {
  const payload = decodeJwtPayload(token)
  // 解析失败时不主动清 token，交由接口 401 处理
  if (!payload || payload.exp == null) return false
  const expMs = Number(payload.exp) * 1000
  if (!expMs) return false
  return expMs < Date.now()
}


/** 清除本地登录态并断开 WebSocket，不跳转（首页等可匿名浏览） */
function clearAuthSession(options = {}) {
  const { toast = false } = options
  intentionalClose = true
  disconnectSocket()
  wx.removeStorageSync('token')
  wx.removeStorageSync('userInfo')
  wx.removeStorageSync('isChef')
  if (toast) {
    wx.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
  }
}

/** 401 / token 过期：清凭证；不再全局 reLaunch，需登录页由 requireLogin() 处理 */
function handleAuthExpired() {
  clearAuthSession({ toast: true })
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
    clearAuthSession({ toast: false })
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
    if (token && isTokenExpired(token)) clearAuthSession({ toast: false })
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
  clearAuthSession,
  handleAuthExpired,
  parseSocketMessage,
  mealLabel,
  requestSubscribeAuth,
  TEMPLATE_ID
}
