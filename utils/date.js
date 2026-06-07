/**
 * 日期工具：统一 YYYY-MM-DD 格式
 */

function pad2(n) {
  return String(n).padStart(2, '0')
}

/** 将 Date 格式化为 YYYY-MM-DD */
function formatYMD(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
}

/** 今天 YYYY-MM-DD */
function todayYMD() {
  return formatYMD(new Date())
}

/** 规范化日期字符串为 YYYY-MM-DD（兼容 ISO 带时间） */
function normalizeYMD(s) {
  if (!s) return ''
  const str = String(s).trim()
  if (str.length >= 10 && str[4] === '-' && str[7] === '-') {
    return str.slice(0, 10)
  }
  const d = new Date(str)
  if (!isNaN(d.getTime())) return formatYMD(d)
  return str
}

module.exports = { formatYMD, todayYMD, normalizeYMD }
