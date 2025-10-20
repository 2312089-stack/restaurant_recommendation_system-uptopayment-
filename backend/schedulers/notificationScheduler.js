// backend/schedulers/notificationScheduler.js
// Automated notification system for time-based promotions and reminders

import cron from 'node-cron';
import User from '../models/User.js';
import Order from '../models/Order.js';
import notificationService from '../services/notificationService.js';

class NotificationScheduler {
  constructor() {
    this.jobs = [];
  }

  // ============================================
  // START ALL SCHEDULED JOBS
  // ============================================
  startAllJobs() {
    console.log('🕐 Starting notification scheduler...');
    
    // Lunch time promotions (11 AM daily)
    this.scheduleLunchPromo();
    
    // Dinner time promotions (7 PM daily)
    this.scheduleDinnerPromo();
    
    // Late night promotions (10 PM daily)
    this.scheduleLateNightPromo();
    
    // Reorder suggestions (Every 3 days at 10 AM)
    this.scheduleReorderSuggestions();
    
    // Daily digest (8 AM daily)
    this.scheduleDailyDigest();
    
    // Cleanup old notifications (2 AM daily)
    this.scheduleCleanup();
    
    // Weekend special offers (Friday 5 PM)
    this.scheduleWeekendSpecials();
    
    console.log(`✅ ${this.jobs.length} notification jobs scheduled`);
  }

  // ============================================
  // LUNCH TIME PROMOTIONS (11 AM DAILY)
  // ============================================
  scheduleLunchPromo() {
    const job = cron.schedule('0 11 * * *', async () => {
      console.log('🍱 Running lunch time promotion...');
      
      try {
        // Get all active users
        const users = await User.find({ isActive: true }).select('_id');
        
        for (const user of users) {
          // Check if user has ordered in last 7 days
          const recentOrders = await Order.countDocuments({
            customerId: user._id,
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          });
          
          // Send promo if user is active
          if (recentOrders > 0) {
            await notificationService.createNotification(
              user._id,
              'time_based_promo',
              '🍱 Lunch Time Delights!',
              'Explore delicious lunch options near you. Order now and get it delivered fresh!',
              {
                actionUrl: '/discovery',
                priority: 'low',
                timeSlot: 'lunch'
              }
            );
          }
        }
        
        console.log(`✅ Lunch promotions sent to ${users.length} users`);
      } catch (error) {
        console.error('❌ Error sending lunch promotions:', error);
      }
    }, {
      timezone: 'Asia/Kolkata'
    });
    
    this.jobs.push({ name: 'Lunch Promo', job });
  }

  // ============================================
  // DINNER TIME PROMOTIONS (7 PM DAILY)
  // ============================================
  scheduleDinnerPromo() {
    const job = cron.schedule('0 19 * * *', async () => {
      console.log('🌙 Running dinner time promotion...');
      
      try {
        const users = await User.find({ isActive: true }).select('_id');
        
        for (const user of users) {
          const recentOrders = await Order.countDocuments({
            customerId: user._id,
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          });
          
          if (recentOrders > 0) {
            await notificationService.createNotification(
              user._id,
              'time_based_promo',
              '🌙 Dinner Time Treats!',
              'Treat yourself to a delicious dinner tonight! Check out top-rated restaurants.',
              {
                actionUrl: '/discovery',
                priority: 'low',
                timeSlot: 'dinner'
              }
            );
          }
        }
        
        console.log(`✅ Dinner promotions sent to ${users.length} users`);
      } catch (error) {
        console.error('❌ Error sending dinner promotions:', error);
      }
    }, {
      timezone: 'Asia/Kolkata'
    });
    
    this.jobs.push({ name: 'Dinner Promo', job });
  }

  // ============================================
  // LATE NIGHT PROMOTIONS (10 PM DAILY)
  // ============================================
  scheduleLateNightPromo() {
    const job = cron.schedule('0 22 * * *', async () => {
      console.log('🌃 Running late night promotion...');
      
      try {
        const users = await User.find({ isActive: true }).select('_id');
        
        for (const user of users) {
          await notificationService.createNotification(
            user._id,
            'time_based_promo',
            '🌃 Late Night Cravings?',
            'Order from restaurants open late near you! Quick delivery available.',
            {
              actionUrl: '/discovery',
              priority: 'low',
              timeSlot: 'latenight'
            }
          );
        }
        
        console.log(`✅ Late night promotions sent`);
      } catch (error) {
        console.error('❌ Error sending late night promotions:', error);
      }
    }, {
      timezone: 'Asia/Kolkata'
    });
    
    this.jobs.push({ name: 'Late Night Promo', job });
  }

  // ============================================
  // REORDER SUGGESTIONS (10 AM, EVERY 3 DAYS)
  // ============================================
  scheduleReorderSuggestions() {
    const job = cron.schedule('0 10 */3 * *', async () => {
      console.log('🍽️ Running reorder suggestions...');
      
      try {
        // Get users who ordered 3-7 days ago
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        const recentOrders = await Order.find({
          orderStatus: 'delivered',
          createdAt: { $gte: sevenDaysAgo, $lte: threeDaysAgo }
        }).distinct('customerId');
        
        for (const userId of recentOrders) {
          await notificationService.sendReorderSuggestion(userId);
        }
        
        console.log(`✅ Reorder suggestions sent to ${recentOrders.length} users`);
      } catch (error) {
        console.error('❌ Error sending reorder suggestions:', error);
      }
    }, {
      timezone: 'Asia/Kolkata'
    });
    
    this.jobs.push({ name: 'Reorder Suggestions', job });
  }

  // ============================================
  // DAILY DIGEST (8 AM DAILY)
  // ============================================
  scheduleDailyDigest() {
    const job = cron.schedule('0 8 * * *', async () => {
      console.log('📬 Running daily digest...');
      
      try {
        const users = await User.find({ isActive: true }).select('_id');
        
        for (const user of users) {
          await notificationService.sendDailyDigest(user._id);
        }
        
        console.log(`✅ Daily digest sent to ${users.length} users`);
      } catch (error) {
        console.error('❌ Error sending daily digest:', error);
      }
    }, {
      timezone: 'Asia/Kolkata'
    });
    
    this.jobs.push({ name: 'Daily Digest', job });
  }

  // ============================================
  // CLEANUP OLD NOTIFICATIONS (2 AM DAILY)
  // ============================================
  scheduleCleanup() {
    const job = cron.schedule('0 2 * * *', async () => {
      console.log('🧹 Running notification cleanup...');
      
      try {
        const deletedCount = await notificationService.cleanupOldNotifications(30);
        console.log(`✅ Cleaned up ${deletedCount} old notifications`);
      } catch (error) {
        console.error('❌ Error cleaning up notifications:', error);
      }
    }, {
      timezone: 'Asia/Kolkata'
    });
    
    this.jobs.push({ name: 'Cleanup', job });
  }

  // ============================================
  // WEEKEND SPECIALS (FRIDAY 5 PM)
  // ============================================
  scheduleWeekendSpecials() {
    const job = cron.schedule('0 17 * * 5', async () => {
      console.log('🎉 Running weekend special promotions...');
      
      try {
        const users = await User.find({ isActive: true }).select('_id');
        
        const bulkNotifications = users.map(user => ({
          userId: user._id,
          type: 'discount_offer',
          title: '🎉 Weekend Special Offer!',
          message: 'Get flat 25% off on all orders this weekend! Use code: WEEKEND25',
          data: {
            code: 'WEEKEND25',
            discount: 25,
            validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            actionUrl: '/discovery',
            priority: 'high'
          }
        }));
        
        await notificationService.sendBulkNotifications(
          users.map(u => u._id),
          'discount_offer',
          '🎉 Weekend Special Offer!',
          'Get flat 25% off on all orders this weekend! Use code: WEEKEND25',
          {
            code: 'WEEKEND25',
            discount: 25,
            validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            actionUrl: '/discovery',
            priority: 'high'
          }
        );
        
        console.log(`✅ Weekend specials sent to ${users.length} users`);
      } catch (error) {
        console.error('❌ Error sending weekend specials:', error);
      }
    }, {
      timezone: 'Asia/Kolkata'
    });
    
    this.jobs.push({ name: 'Weekend Specials', job });
  }

  // ============================================
  // ABANDONED CART REMINDERS (Every hour)
  // ============================================
  scheduleAbandonedCartReminders() {
    const job = cron.schedule('0 * * * *', async () => {
      console.log('🛒 Checking for abandoned carts...');
      
      try {
        // This would require a Cart model tracking
        // For now, just a placeholder
        console.log('✅ Abandoned cart check complete');
      } catch (error) {
        console.error('❌ Error checking abandoned carts:', error);
      }
    }, {
      timezone: 'Asia/Kolkata'
    });
    
    this.jobs.push({ name: 'Abandoned Cart', job });
  }

  // ============================================
  // STOP ALL JOBS
  // ============================================
  stopAllJobs() {
    console.log('🛑 Stopping all notification jobs...');
    
    this.jobs.forEach(({ name, job }) => {
      job.stop();
      console.log(`✅ Stopped: ${name}`);
    });
    
    this.jobs = [];
  }

  // ============================================
  // GET JOB STATUS
  // ============================================
  getJobStatus() {
    return this.jobs.map(({ name, job }) => ({
      name,
      running: job.running || false
    }));
  }

  // ============================================
  // MANUAL TRIGGER (For testing)
  // ============================================
  async triggerJob(jobName) {
    console.log(`🔧 Manually triggering: ${jobName}`);
    
    switch (jobName) {
      case 'lunch':
        await this.scheduleLunchPromo();
        break;
      case 'dinner':
        await this.scheduleDinnerPromo();
        break;
      case 'reorder':
        await this.scheduleReorderSuggestions();
        break;
      case 'digest':
        await this.scheduleDailyDigest();
        break;
      case 'cleanup':
        await this.scheduleCleanup();
        break;
      case 'weekend':
        await this.scheduleWeekendSpecials();
        break;
      default:
        console.log('Unknown job name');
    }
  }
}

// Export singleton instance
const notificationScheduler = new NotificationScheduler();

export default notificationScheduler;

// Auto-start when imported (optional)
// notificationScheduler.startAllJobs();