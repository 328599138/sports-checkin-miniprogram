// index.js
Page({
  data: {
    currentDate: '',
    currentDay: '',
    isCheckedToday: false,
    selectedSport: 'running',
    weeklyCount: 0,
    totalCount: 0,
    sportTypes: [
      { id: 'running', name: '跑步', emoji: '🏃‍♂️' },
      { id: 'cycling', name: '骑行', emoji: '🚴‍♂️' },
      { id: 'swimming', name: '游泳', emoji: '🏊‍♂️' },
      { id: 'gym', name: '健身', emoji: '💪' },
      { id: 'yoga', name: '瑜伽', emoji: '🧘‍♀️' },
      { id: 'walking', name: '散步', emoji: '🚶‍♂️' },
      { id: 'basketball', name: '篮球', emoji: '🏀' },
      { id: 'football', name: '足球', emoji: '⚽' }
    ]
  },

  onLoad() {
    this.initDate();
    this.checkTodayStatus();
    this.loadStatistics();
  },

  onShow() {
    this.checkTodayStatus();
    this.loadStatistics();
  },

  // 初始化日期显示
  initDate() {
    const now = new Date();
    const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    
    this.setData({
      currentDate: this.formatDate(now),
      currentDay: days[now.getDay()]
    });
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
  },

  // 检查今日是否已打卡（使用云函数）
  async checkTodayStatus() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'userManager',
        data: {
          action: 'checkToday'
        }
      });

      if (result.result.success) {
        this.setData({
          isCheckedToday: result.result.isCheckedToday
        });
      }
    } catch (error) {
      console.error('检查打卡状态失败:', error);
    }
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

  // 选择运动类型
  selectSport(e) {
    const sport = e.currentTarget.dataset.sport;
    this.setData({
      selectedSport: sport
    });
  },

  // 处理打卡（使用云函数）
  async handleCheckin() {
    if (this.data.isCheckedToday) {
      return;
    }

    try {
      wx.showLoading({
        title: '打卡中...',
        mask: true
      });

      const selectedSportInfo = this.data.sportTypes.find(s => s.id === this.data.selectedSport);
      
      // 调用云函数进行打卡
      const result = await wx.cloud.callFunction({
        name: 'userManager',
        data: {
          action: 'checkin',
          data: {
            sportType: this.data.selectedSport,
            sportName: selectedSportInfo?.name || '运动'
          }
        }
      });

      wx.hideLoading();

      if (result.result.success) {
        // 更新状态
        this.setData({
          isCheckedToday: true
        });

        // 重新加载统计数据
        this.loadStatistics();
        
        // 显示成功提示
        wx.showToast({
          title: '打卡成功！',
          icon: 'success',
          duration: 2000
        });

        // 触觉反馈
        wx.vibrateShort();

        // 打卡成功后的额外反馈
        setTimeout(() => {
          wx.showModal({
            title: '🎉 打卡成功',
            content: `今日${selectedSportInfo?.name}打卡完成！继续保持运动习惯！`,
            showCancel: false,
            confirmText: '太棒了',
            confirmColor: '#4ecdc4'
          });
        }, 2500);
      } else {
        wx.showToast({
          title: result.result.error || '打卡失败',
          icon: 'error',
          duration: 2000
        });
      }

    } catch (error) {
      console.error('打卡失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '打卡失败，请重试',
        icon: 'error',
        duration: 2000
      });
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
          weeklyCount: result.result.data.weeklyCount,
          totalCount: result.result.data.totalCount
        });
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  },

  // 跳转到历史页面
  goToHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    });
  }
})
