// Frontend debugging script
// This script should be run in the browser console on localhost:3000

function debugFrontendAuth() {
  console.log('🔍 Frontend Authentication Debug');
  console.log('================================');
  
  // Check localStorage
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  console.log('📱 LocalStorage Check:');
  console.log('Token exists:', !!token);
  console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'null');
  console.log('User exists:', !!user);
  
  if (user) {
    try {
      const userData = JSON.parse(user);
      console.log('User data:', userData);
    } catch (e) {
      console.log('❌ User data is corrupted:', e.message);
    }
  }
  
  console.log('\n🌐 API Test:');
  
  if (!token) {
    console.log('❌ No token found. Please login first.');
    console.log('Go to: http://localhost:3000/login');
    console.log('Credentials: email.admin@contoh.com / admin123');
    return;
  }
  
  // Test API call
  fetch('http://localhost:8080/api/contacts', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log('API Response Status:', response.status);
    console.log('API Response OK:', response.ok);
    
    if (response.ok) {
      return response.json();
    } else {
      return response.json().then(error => {
        throw new Error(error.message || 'API Error');
      });
    }
  })
  .then(data => {
    console.log('✅ API Success!');
    console.log('Contacts count:', data.contacts.length);
    console.log('First 3 contacts:', data.contacts.slice(0, 3).map(c => c.name));
  })
  .catch(error => {
    console.log('❌ API Error:', error.message);
  });
}

// Instructions for use
console.log('🛠️ FRONTEND DEBUG INSTRUCTIONS:');
console.log('1. Open http://localhost:3000 in browser');
console.log('2. Open browser console (F12)');
console.log('3. Paste this entire script');
console.log('4. Run: debugFrontendAuth()');
console.log('');
console.log('If no token, login first with:');
console.log('Email: email.admin@contoh.com');
console.log('Password: admin123');

// Auto-run if in browser environment
if (typeof window !== 'undefined') {
  debugFrontendAuth();
} 