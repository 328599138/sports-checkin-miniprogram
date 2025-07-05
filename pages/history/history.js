// history.js
Page({
  data: {
    totalDays: 0,
    currentStreak: 0,
    thisMonthCount: 0,
    currentMonth: '',
    currentYear: 0,
    currentMonthIndex: 0,
    calendarDays: [],
    recentRecords: [],
    checkinData: {},
    sportTypes: {
      'running': { name: '跑步', emoji: '🏃‍♂️' },
      'cycling': { name: '骑行', emoji: '🚴‍♂️' },
      'swimming': { name: '游泳', emoji: '🏊‍♂️' },
      'gym': { name: '健身', emoji: '💪' },
      'yoga': { name: '瑜伽', emoji: '🧘‍♀️' },
      'walking': { name: '散步', emoji: '🚶‍♂️' },
      'basketball': { name: '篮球', emoji: '🏀' },
      'football': { name: '足球', emoji: '⚽' }
    }
  },

  onLoad() {
    const now = new Date();
    this.setData({
      currentYear: now.getFullYear(),
      currentMonthIndex: now.getMonth()
    });
    this.updateMonthDisplay();
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  // 更新月份显示
  updateMonthDisplay() {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    this.setData({
      currentMonth: `${this.data.currentYear}年${months[this.data.currentMonthIndex]}`
    });
  },

  // 加载所有数据
  async loadData() {
    try {
      wx.showLoading({
        title: '加载中...',
        mask: true
      });

      await Promise.all([
        this.loadCheckinData(),
        this.loadStatistics(),
        this.loadRecentRecords()
      ]);

      this.generateCalendar();
      wx.hideLoading();
    } catch (error) {
      console.error('加载数据失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  // 加载打卡数据
  async loadCheckinData() {
    try {
      const openid = wx.getStorageSync('openid') || await this.getOpenId();
      
      // 获取当前月份的所有打卡记录
      const startDate = new Date(this.data.currentYear, this.data.currentMonthIndex, 1);
      const endDate = new Date(this.data.currentYear, this.data.currentMonthIndex + 1, 0);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const result = await wx.cloud.database().collection('sports_checkin')
        .where({
          openid: openid,
          date: wx.cloud.database().command.gte(startDateStr).and(wx.cloud.database().command.lte(endDateStr))
        })
        .get();

      // 转换为日期索引的对象
      const checkinData = {};
      result.data.forEach(record => {
        checkinData[record.date] = {
          sportType: record.sportType,
          sportName: record.sportName,
          sportEmoji: this.data.sportTypes[record.sportType]?.emoji || '💪',
          datetime: record.datetime
        };
      });

      this.setData({ checkinData });
    } catch (error) {
      console.error('加载打卡数据失败:', error);
    }
  },

  // 加载统计数据（使用云函数）
  async loadStatistics() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'userManager',
        data: {
          action: 'getStats'
        }
      });

      if (result.result.success) {
        this.setData({
          totalDays: result.result.data.totalCount,
          thisMonthCount: result.result.data.monthlyCount,
          currentStreak: result.result.data.currentStreak
        });
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  },

  // 计算连续打卡天数
  async calculateStreak(openid) {
    try {
      // 获取最近30天的打卡记录
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDateStr = thirtyDaysAgo.toISOString().split('T')[0];

      const result = await wx.cloud.database().collection('sports_checkin')
        .where({
          openid: openid,
          date: wx.cloud.database().command.gte(startDateStr)
        })
        .orderBy('date', 'desc')
        .get();

      if (result.data.length === 0) return 0;

      // 计算连续天数
      let streak = 0;
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // 检查是否包含今天
      const dates = result.data.map(record => record.date).sort((a, b) => b.localeCompare(a));
      
      for (let i = 0; i < dates.length; i++) {
        const expectedDate = new Date(today);
        expectedDate.setDate(today.getDate() - i);
        const expectedDateStr = expectedDate.toISOString().split('T')[0];
        
        if (dates[i] === expectedDateStr) {
          streak++;
        } else {
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error('计算连续打卡失败:', error);
      return 0;
    }
  },

  // 加载最近记录（使用云函数）
  async loadRecentRecords() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'userManager',
        data: {
          action: 'getHistory',
          data: {
            limit: 10
          }
        }
      });

      if (result.result.success) {
        const recentRecords = result.result.data.map(record => {
          const date = new Date(record.datetime);
          return {
            id: record._id,
            sportName: record.sportName,
            sportEmoji: this.data.sportTypes[record.sportType]?.emoji || '💪',
            displayDate: this.formatDisplayDate(date),
            displayTime: this.formatDisplayTime(date),
            date: record.date
          };
        });

        this.setData({ recentRecords });
      }
    } catch (error) {
      console.error('加载最近记录失败:', error);
    }
  },

  // 生成日历
  generateCalendar() {
    const year = this.data.currentYear;
    const month = this.data.currentMonthIndex;
    
    // 当月第一天和最后一天
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 日历开始日期（包含上月末尾几天）
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // 生成6周的日历
    const calendarDays = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    for (let i = 0; i < 42; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const dateStr = currentDate.toISOString().split('T')[0];
      const checkinInfo = this.data.checkinData[dateStr];
      
      calendarDays.push({
        date: dateStr,
        day: currentDate.getDate(),
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: dateStr === todayStr,
        hasCheckin: !!checkinInfo,
        sportEmoji: checkinInfo?.sportEmoji || ''
      });
    }
    
    this.setData({ calendarDays });
  },

  // 获取用户openid（使用云函数）
  async getOpenId() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'getOpenId'
      });
      const openid = result.result.openid;
      wx.setStorageSync('openid', openid);
      return openid;
    } catch (error) {
      console.error('获取openid失败:', error);
      // 如果云函数调用失败，使用缓存的openid
      const cachedOpenId = wx.getStorageSync('openid');
      if (cachedOpenId) {
        return cachedOpenId;
      }
      // 最后的兜底方案
      const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      wx.setStorageSync('openid', tempId);
      return tempId;
    }
  },

  // 格式化显示日期
  formatDisplayDate(date) {
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays === 2) return '前天';
    
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  },

  // 格式化显示时间
  formatDisplayTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  // 上一个月
  previousMonth() {
    let { currentYear, currentMonthIndex } = this.data;
    
    if (currentMonthIndex === 0) {
      currentYear--;
      currentMonthIndex = 11;
    } else {
      currentMonthIndex--;
    }
    
    this.setData({
      currentYear,
      currentMonthIndex
    });
    
    this.updateMonthDisplay();
    this.loadData();
  },

  // 下一个月
  nextMonth() {
    let { currentYear, currentMonthIndex } = this.data;
    
    if (currentMonthIndex === 11) {
      currentYear++;
      currentMonthIndex = 0;
    } else {
      currentMonthIndex++;
    }
    
    this.setData({
      currentYear,
      currentMonthIndex
    });
    
    this.updateMonthDisplay();
    this.loadData();
  },

  // 显示日期详情
  showDayDetail(e) {
    const date = e.currentTarget.dataset.date;
    const checkinInfo = this.data.checkinData[date];
    
    if (checkinInfo) {
      wx.showModal({
        title: '打卡详情',
        content: `日期：${date}\n运动：${checkinInfo.sportName}`,
        showCancel: false,
        confirmText: '知道了'
      });
    }
  }
}) 