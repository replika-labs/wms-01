const fetch = require('node-fetch');

async function testLogin() {
  try {
    console.log('Testing login API...');
    
    const response = await fetch('http://localhost:8080/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'email.admin@contoh.com',
        password: 'admin123'
      })
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok && data.token) {
      console.log('✅ Login successful!');
      console.log('Token received:', data.token.substring(0, 20) + '...');
    } else {
      console.log('❌ Login failed');
    }

  } catch (error) {
    console.error('❌ Error testing login:', error.message);
  }
}

testLogin(); 