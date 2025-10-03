class SellerStatusManager {
  constructor() {
    // Map of sellerId -> { isOnline, dashboardStatus, lastActive, socketId }
    this.sellerStatuses = new Map();
    this.io = null;
  }

async initialize(io) {
    this.io = io;
    
    // ✅ NEW: Load online sellers from database on startup
    try {
      const Seller = (await import('../models/Seller.js')).default;
      const onlineSellers = await Seller.find({ 
        isOnline: true,
        dashboardStatus: { $ne: 'offline' }
      });
      
      onlineSellers.forEach(seller => {
        this.sellerStatuses.set(seller._id.toString(), {
          isOnline: true,
          dashboardStatus: seller.dashboardStatus || 'online',
          lastActive: seller.lastActive,
          socketId: null // Will be updated when they connect
        });
      });
      
      console.log(`✅ Loaded ${onlineSellers.length} online sellers from database`);
    }
catch (error) {
      console.error('Failed to load seller statuses from database:', error);
    }
    
    console.log('✅ Seller Status Manager initialized');
  }
   async getSellerStatus(sellerId) {
    // Check memory first
    let status = this.sellerStatuses.get(sellerId);
    
    if (!status) {
      // ✅ Fallback to database
      try {
        const Seller = (await import('../models/Seller.js')).default;
        const seller = await Seller.findById(sellerId).select('isOnline dashboardStatus lastActive');
        
        if (seller) {
          status = {
            isOnline: seller.isOnline || false,
            dashboardStatus: seller.dashboardStatus || 'offline',
            lastActive: seller.lastActive,
            socketId: null
          };
          
          // Cache it
          if (seller.isOnline) {
            this.sellerStatuses.set(sellerId, status);
          }
        }
      } catch (error) {
        console.error('Database fallback failed:', error);
      }
    }
    
    return status || {
      isOnline: false,
      dashboardStatus: 'offline',
      lastActive: null,
      socketId: null
    };
  }
  // Set seller online when they open dashboard
  setSellerOnline(sellerId, socketId) {
    this.sellerStatuses.set(sellerId, {
      isOnline: true,
      dashboardStatus: 'online',
      lastActive: new Date(),
      socketId: socketId
    });
    console.log(`🟢 Seller ${sellerId} is now ONLINE`, {
      socketId,
      timestamp: new Date().toISOString()
    });

    // Broadcast status change to all connected clients
    this.broadcastStatusChange(sellerId, true, 'online');

    // DEBUG: Log current online sellers
    console.log('📊 Current online sellers:', Array.from(this.sellerStatuses.keys()));

    return this.sellerStatuses.get(sellerId);
  }

  // Set seller offline when they close dashboard
  setSellerOffline(sellerId) {
    const status = this.sellerStatuses.get(sellerId);
    if (status) {
      this.sellerStatuses.set(sellerId, {
        ...status,
        isOnline: false,
        dashboardStatus: 'offline',
        lastActive: new Date(),
        socketId: null
      });

      console.log(`🔴 Seller ${sellerId} is now OFFLINE`);

      // Broadcast status change to all connected clients
      this.broadcastStatusChange(sellerId, false, 'offline');
    }
  }

  // Update seller status (busy, online, etc.)
  updateSellerStatus(sellerId, dashboardStatus) {
    const status = this.sellerStatuses.get(sellerId);
    if (status) {
      this.sellerStatuses.set(sellerId, {
        ...status,
        dashboardStatus,
        lastActive: new Date()
      });

      console.log(`📊 Seller ${sellerId} status updated to: ${dashboardStatus}`);

      // Broadcast status change
      this.broadcastStatusChange(sellerId, status.isOnline, dashboardStatus);
    }
  }

  // Get seller status
  getSellerStatus(sellerId) {
    return this.sellerStatuses.get(sellerId) || {
      isOnline: false,
      dashboardStatus: 'offline',
      lastActive: null,
      socketId: null
    };
  }

  // Get multiple seller statuses
  getMultipleSellerStatuses(sellerIds) {
    const statuses = {};
    sellerIds.forEach(sellerId => {
      statuses[sellerId] = this.getSellerStatus(sellerId);
    });
    return statuses;
  }

  // Broadcast status change to all clients
  broadcastStatusChange(sellerId, isOnline, dashboardStatus) {
    if (!this.io) {
      console.warn('⚠️ Socket.IO not initialized, cannot broadcast');
      return;
    }
    const statusData = {
      sellerId,
      isOnline,
      dashboardStatus,
      timestamp: new Date()
    };

    // Emit to all connected clients
    this.io.emit('seller-status-changed', statusData);

    console.log(`📡 Broadcasted status change for seller ${sellerId}:`, statusData);
  }

  // Clean up inactive sellers (optional - run periodically)
  cleanupInactiveSellers(timeoutMinutes = 30) {
    const now = new Date();
    let cleaned = 0;
    this.sellerStatuses.forEach((status, sellerId) => {
      if (status.lastActive) {
        const inactiveMinutes = (now - new Date(status.lastActive)) / (1000 * 60);

        if (inactiveMinutes > timeoutMinutes && status.isOnline) {
          console.log(`🧹 Auto-setting seller ${sellerId} offline due to inactivity`);
          this.setSellerOffline(sellerId);
          cleaned++;
        }
      }
    });

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} inactive sellers`);
    }
  }

  // Get all online sellers
  getOnlineSellers() {
    const onlineSellers = [];
    this.sellerStatuses.forEach((status, sellerId) => {
      if (status.isOnline && status.dashboardStatus !== 'offline') {
        onlineSellers.push({
          sellerId,
          ...status
        });
      }
    });
    return onlineSellers;
  }

  // Check if seller can accept orders
  canAcceptOrders(sellerId) {
    const status = this.getSellerStatus(sellerId);
    return status.isOnline && status.dashboardStatus !== 'offline';
  }
}

// Export singleton instance
const sellerStatusManager = new SellerStatusManager();
export default sellerStatusManager;
