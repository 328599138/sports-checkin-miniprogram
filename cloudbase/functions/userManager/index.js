// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action, data } = event

  try {
    switch (action) {
      case 'checkin':
        return await handleCheckin(openid, data)
      case 'getStats':
        return await getStatistics(openid, data)
      case 'getHistory':
        return await getHistory(openid, data)
      case 'checkToday':
        return await checkTodayStatus(openid)
      default:
        return { success: false, error: '未知操作' }
    }
  } catch (error) {
    console.error('云函数执行错误:', error)
    return { success: false, error: error.message }
  }
}

// 处理打卡
async function handleCheckin(openid, data) {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  
  // 检查今天是否已经打卡
  const existingCheckin = await db.collection('sports_checkin')
    .where({
      openid: openid,
      date: todayStr
    })
    .get()
  
  if (existingCheckin.data.length > 0) {
    return { success: false, error: '今天已经打过卡了' }
  }
  
  // 添加打卡记录
  const result = await db.collection('sports_checkin').add({
    data: {
      openid: openid,
      date: todayStr,
      datetime: now.toISOString(),
      sportType: data.sportType,
      sportName: data.sportName,
      timestamp: Date.now(),
      _createTime: now
    }
  })
  
  return { success: true, id: result._id }
}

// 检查今日打卡状态
async function checkTodayStatus(openid) {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  
  const result = await db.collection('sports_checkin')
    .where({
      openid: openid,
      date: todayStr
    })
    .get()
  
  return { 
    success: true, 
    isCheckedToday: result.data.length > 0,
    todayRecord: result.data[0] || null
  }
}

// 获取统计数据
async function getStatistics(openid, data) {
  const now = new Date()
  
  // 本周开始日期
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const weekStartStr = weekStart.toISOString().split('T')[0]
  
  // 本月开始日期
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthStartStr = monthStart.toISOString().split('T')[0]
  
  // 并行查询统计数据
  const [weeklyResult, monthlyResult, totalResult] = await Promise.all([
    // 本周打卡
    db.collection('sports_checkin')
      .where({
        openid: openid,
        date: _.gte(weekStartStr)
      })
      .count(),
    
    // 本月打卡
    db.collection('sports_checkin')
      .where({
        openid: openid,
        date: _.gte(monthStartStr)
      })
      .count(),
    
    // 总打卡
    db.collection('sports_checkin')
      .where({
        openid: openid
      })
      .count()
  ])
  
  // 计算连续打卡天数
  const currentStreak = await calculateStreak(openid)
  
  return {
    success: true,
    data: {
      weeklyCount: weeklyResult.total,
      monthlyCount: monthlyResult.total,
      totalCount: totalResult.total,
      currentStreak: currentStreak
    }
  }
}

// 获取历史记录
async function getHistory(openid, data) {
  const { year, month, limit = 10 } = data || {}
  
  let query = db.collection('sports_checkin').where({ openid: openid })
  
  // 如果指定了年月，则过滤
  if (year && month !== undefined) {
    const startDate = new Date(year, month, 1)
    const endDate = new Date(year, month + 1, 0)
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]
    
    query = query.where({
      date: _.gte(startDateStr).and(_.lte(endDateStr))
    })
  }
  
  const result = await query
    .orderBy('datetime', 'desc')
    .limit(limit)
    .get()
  
  return {
    success: true,
    data: result.data
  }
}

// 计算连续打卡天数
async function calculateStreak(openid) {
  try {
    // 获取最近30天的打卡记录
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const startDateStr = thirtyDaysAgo.toISOString().split('T')[0]

    const result = await db.collection('sports_checkin')
      .where({
        openid: openid,
        date: _.gte(startDateStr)
      })
      .orderBy('date', 'desc')
      .get()

    if (result.data.length === 0) return 0

    // 计算连续天数
    let streak = 0
    const today = new Date()
    const dates = result.data.map(record => record.date).sort((a, b) => b.localeCompare(a))
    
    for (let i = 0; i < dates.length; i++) {
      const expectedDate = new Date(today)
      expectedDate.setDate(today.getDate() - i)
      const expectedDateStr = expectedDate.toISOString().split('T')[0]
      
      if (dates[i] === expectedDateStr) {
        streak++
      } else {
        break
      }
    }

    return streak
  } catch (error) {
    console.error('计算连续打卡失败:', error)
    return 0
  }
} 