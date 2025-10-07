// frontend/src/utils/debugOrderHistory.js
// Run this in browser console to debug order history issues

const debugOrderHistory = async () => {
  console.log('========================================');
  console.log('ORDER HISTORY DEBUG TOOL');
  console.log('========================================\n');

  // 1. Check localStorage tokens
  console.log('1. CHECKING LOCALSTORAGE TOKENS:');
  const allKeys = Object.keys(localStorage);
  console.log('All localStorage keys:', allKeys);
  
  const possibleTokens = {
    token: localStorage.getItem('token'),
    authToken: localStorage.getItem('authToken'),
    customerToken: localStorage.getItem('customerToken'),
    sellerToken: localStorage.getItem('sellerToken')
  };
  
  console.log('\nToken values:');
  Object.entries(possibleTokens).forEach(([key, value]) => {
    console.log(`  ${key}:`, value ? `${value.substring(0, 20)}...` : 'null');
  });

  // Find the first non-null token
  const token = possibleTokens.token || possibleTokens.authToken || possibleTokens.customerToken;
  
  if (!token) {
    console.error('\n❌ ERROR: No authentication token found!');
    console.log('Solution: Please log in again');
    return;
  }
  
  console.log('\n✅ Token found');

  // 2. Decode JWT to check user info
  console.log('\n2. DECODING TOKEN:');
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const decoded = JSON.parse(jsonPayload);
    console.log('Token payload:', decoded);
    console.log('User email:', decoded.email || decoded.emailId || 'NOT FOUND');
    console.log('Token expiry:', new Date(decoded.exp * 1000).toLocaleString());
    
    // Check if token is expired
    if (decoded.exp * 1000 < Date.now()) {
      console.error('❌ TOKEN EXPIRED! Please log in again');
      return;
    }
  } catch (e) {
    console.error('Error decoding token:', e);
  }

  // 3. Test API endpoint
  console.log('\n3. TESTING API ENDPOINT:');
  const apiUrl = 'http://localhost:5000/api/orders/history';
  console.log('Calling:', apiUrl);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    const data = await response.json();
    console.log('\n4. API RESPONSE:');
    console.log(data);
    
    if (data.success) {
      console.log(`\n✅ SUCCESS: Found ${data.orders?.length || 0} orders`);
      if (data.orders && data.orders.length > 0) {
        console.log('\nFirst order sample:');
        console.log(data.orders[0]);
      }
    } else {
      console.error('\n❌ API returned error:', data.error);
    }
    
  } catch (error) {
    console.error('\n❌ FETCH ERROR:', error);
    console.log('This usually means:');
    console.log('  1. Backend server is not running');
    console.log('  2. CORS issue');
    console.log('  3. Wrong API URL');
  }

  console.log('\n========================================');
  console.log('DEBUG COMPLETE');
  console.log('========================================');
};

// Run the debug
debugOrderHistory();