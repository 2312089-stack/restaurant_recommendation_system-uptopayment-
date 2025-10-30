// backend/scripts/testAdminLogin.js
// Run: node scripts/testAdminLogin.js

import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';
const ADMIN_EMAIL = 'admin@tastesphere.com';
const ADMIN_PASSWORD = 'Admin@123456';

console.log('\n🧪 Admin Login Test Script');
console.log('===========================\n');

async function testAdminLogin() {
  try {
    // Step 1: Check if admin exists
    console.log('1️⃣  Checking if admin exists...');
    const checkResponse = await fetch(`${API_URL}/admin/check-admin/${ADMIN_EMAIL}`);
    const checkData = await checkResponse.json();
    
    console.log('   Response:', JSON.stringify(checkData, null, 2));
    
    if (!checkData.success) {
      console.log('   ❌ Admin user not found!\n');
      console.log('   💡 Run this command to create admin:');
      console.log('      node scripts/createAdmin.js\n');
      return;
    }
    
    console.log('   ✅ Admin exists\n');

    // Step 2: Test login
    console.log('2️⃣  Testing admin login...');
    const loginResponse = await fetch(`${API_URL}/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      })
    });

    const loginData = await loginResponse.json();
    console.log('   Status:', loginResponse.status);
    console.log('   Response:', JSON.stringify(loginData, null, 2));

    if (!loginData.success) {
      console.log('\n   ❌ Login failed!');
      console.log('   Error:', loginData.error);
      
      if (loginData.error.includes('Invalid email or password')) {
        console.log('\n   💡 Possible issues:');
        console.log('      1. Wrong password (current: Admin@123456)');
        console.log('      2. Password hash corrupted');
        console.log('      3. Run createAdmin.js to reset password');
      }
      return;
    }

    console.log('\n   ✅ Login successful!');
    const token = loginData.token;

    // Step 3: Test authenticated endpoint
    console.log('\n3️⃣  Testing authenticated endpoint...');
    const testResponse = await fetch(`${API_URL}/admin/test`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const testData = await testResponse.json();
    console.log('   Status:', testResponse.status);
    console.log('   Response:', JSON.stringify(testData, null, 2));

    if (testData.success) {
      console.log('\n   ✅ Authentication working!\n');
    } else {
      console.log('\n   ❌ Authentication failed!\n');
    }

    // Step 4: Test analytics endpoint
    console.log('4️⃣  Testing analytics endpoint...');
    const analyticsResponse = await fetch(`${API_URL}/admin/analytics/system-stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const analyticsData = await analyticsResponse.json();
    console.log('   Status:', analyticsResponse.status);
    console.log('   Response:', JSON.stringify(analyticsData, null, 2));

    if (analyticsData.success) {
      console.log('\n   ✅ Analytics working!\n');
    } else {
      console.log('\n   ❌ Analytics failed!\n');
    }

    console.log('===========================');
    console.log('✅ All tests passed!');
    console.log('===========================\n');
    console.log('🎉 Admin login is working correctly!');
    console.log('\n📱 You can now login at:');
    console.log('   http://localhost:5173/admin/login');
    console.log('\n🔑 Credentials:');
    console.log('   Email:', ADMIN_EMAIL);
    console.log('   Password:', ADMIN_PASSWORD);
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\n💡 Make sure:');
    console.error('   1. Backend server is running (npm start)');
    console.error('   2. Admin user exists (node scripts/createAdmin.js)');
    console.error('   3. Database is connected\n');
  }
}

testAdminLogin();