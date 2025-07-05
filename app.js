// app.js
App({
  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        // 这里需要填写你的云开发环境ID
        env: 'aikaifa-7gsoxle972f4e68b', // CloudBase环境ID
        traceUser: true
      });
    } else {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    }

    // 检查更新
    this.checkForUpdate();
    
    // 获取系统信息
    this.getSystemInfo();
  },

  onShow() {
    // 小程序切前台时触发
  },

  onHide() {
    // 小程序切后台时触发
  },

  // 检查小程序更新
  checkForUpdate() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();
      
      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          updateManager.onUpdateReady(() => {
            wx.showModal({
              title: '更新提示',
              content: '新版本已经准备好，是否重启应用？',
              success: (res) => {
                if (res.confirm) {
                  updateManager.applyUpdate();
                }
              }
            });
          });
          
          updateManager.onUpdateFailed(() => {
            wx.showModal({
              title: '更新失败',
              content: '新版本下载失败，请删除当前小程序，重新搜索打开',
              showCancel: false
            });
          });
        }
      });
    }
  },

  // 获取系统信息
  getSystemInfo() {
    wx.getSystemInfo({
      success: (res) => {
        this.globalData.systemInfo = res;
        
        // 设置状态栏高度
        this.globalData.statusBarHeight = res.statusBarHeight;
        
        // 计算导航栏高度
        const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
        this.globalData.navBarHeight = (menuButtonInfo.top - res.statusBarHeight) * 2 + menuButtonInfo.height;
      }
    });
  },

  globalData: {
    systemInfo: null,
    statusBarHeight: 0,
    navBarHeight: 0,
    userInfo: null
  }
})
