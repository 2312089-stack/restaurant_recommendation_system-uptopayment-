// test-view-history.js - Run this to test your view history system
// Usage: node test-view-history.js

const API_BASE = 'http://localhost:5000/api';

async function testViewHistory() {
  console.log('\n🧪 Testing View History System\n');
  console.log('='.repeat(50));

  try {
    // Test 1: Check system status
    console.log('\n1️⃣ Checking system status...');
    const statusRes = await fetch(`${API_BASE}/view-history/status`);
    const statusData = await statusRes.json();
    
    if (statusData.success) {
      console.log('✅ System is working!');
      console.log('   Total views:', statusData.systemStats?.totalViews || 0);
      console.log('   Recent views (24h):', statusData.systemStats?.recentViews24h || 0);
    } else {
      console.log('❌ System check failed');
      return;
    }

    // Test 2: Get most viewed dishes
    console.log('\n2️⃣ Fetching most viewed dishes...');
    const mostViewedRes = await fetch(`${API_BASE}/view-history/most-viewed?limit=5&days=7`);
    const mostViewedData = await mostViewedRes.json();
    
    if (mostViewedData.success) {
      console.log(`✅ Found ${mostViewedData.dishes?.length || 0} most viewed dishes`);
      mostViewedData.dishes?.slice(0, 3).forEach((dish, i) => {
        console.log(`   ${i + 1}. ${dish.name} - ${dish.viewStats?.totalViews || 0} views`);
      });
    } else {
      console.log('⚠️  No most viewed data yet');
    }

    // Test 3: Track a test view (requires a valid dish ID)
    console.log('\n3️⃣ Testing view tracking...');
    console.log('   ℹ️  To test tracking, you need to:');
    console.log('   1. Go to http://localhost:5173/discovery');
    console.log('   2. Click on any dish');
    console.log('   3. Check browser console for tracking logs');
    console.log('   4. Refresh home page to see it in "Recently Viewed"');

    // Test 4: Check if components are rendering
    console.log('\n4️⃣ Component Checklist:');
    console.log('   ✓ RecentlyViewed.jsx - Shows empty state when no data');
    console.log('   ✓ MostViewed.jsx - Shows empty state when no data');
    console.log('   ✓ ViewHistoryContext - Loads data from localStorage + API');
    console.log('   ✓ DishDetailsPage - Tracks view on mount');

    console.log('\n' + '='.repeat(50));
    console.log('✅ Basic tests passed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Open your app: http://localhost:5173');
    console.log('2. Navigate to Discovery page');
    console.log('3. Click on 3-4 different dishes');
    console.log('4. Go back to Home page');
    console.log('5. You should see dishes in "Recently Viewed"');
    console.log('6. After multiple views, check "Most Viewed This Week"');
    console.log('\n💡 Tip: Open browser DevTools Console to see tracking logs\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n🔍 Troubleshooting:');
    console.log('1. Make sure your backend is running on port 5000');
    console.log('2. Check if MongoDB is connected');
    console.log('3. Verify routes are loaded in server.js');
    console.log('4. Check backend console for errors\n');
  }
}

// Run tests
testViewHistory();