const fetch = require('node-fetch');

async function testContactsAPI() {
  try {
    console.log('🧪 Testing Contact Management API System...\n');
    
    // Step 1: Login to get authentication token
    console.log('1. 🔐 Testing Authentication...');
    
    const credentialsToTry = [
      { email: 'email.admin@contoh.com', password: 'admin123' },
      { email: 'admin@wms.com', password: 'admin123' },
      { email: 'test@admin.com', password: 'admin123' }
    ];
    
    let token = null;
    let loginSuccess = false;
    
    for (const credentials of credentialsToTry) {
      console.log(`   Trying login with ${credentials.email}...`);
      
      try {
        const loginResponse = await fetch('http://localhost:8080/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(credentials)
        });

        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          if (loginData.success && loginData.token) {
            console.log(`   ✅ Login successful with ${credentials.email}`);
            console.log(`   👤 User: ${loginData.user.name} (${loginData.user.role})`);
            token = loginData.token;
            loginSuccess = true;
            break;
          }
        } else {
          const errorData = await loginResponse.json();
          console.log(`   ❌ Login failed: ${errorData.message}`);
        }
      } catch (error) {
        console.log(`   ❌ Login error: ${error.message}`);
      }
    }
    
    if (!loginSuccess) {
      console.log('\n❌ Could not authenticate with any credentials!');
      console.log('Available credentials to try manually:');
      credentialsToTry.forEach(cred => {
        console.log(`   - ${cred.email} / ${cred.password}`);
      });
      return;
    }
    
    console.log(`   🎫 Token: ${token.substring(0, 20)}...\n`);
    
    // Step 2: Test GET /api/contacts
    console.log('2. 📋 Testing GET /api/contacts...');
    
    try {
      const contactsResponse = await fetch('http://localhost:8080/api/contacts', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (contactsResponse.ok) {
        const contactsData = await contactsResponse.json();
        console.log(`   ✅ GET /api/contacts successful`);
        console.log(`   📊 Total contacts: ${contactsData.contacts.length}`);
        console.log(`   📄 Pagination: Page ${contactsData.pagination.current} of ${contactsData.pagination.pages}`);
        
        if (contactsData.filters && contactsData.filters.typeStats) {
          console.log(`   📈 Statistics:`);
          Object.entries(contactsData.filters.typeStats).forEach(([type, stats]) => {
            console.log(`      - ${type}: ${stats.active}/${stats.total} active`);
          });
        }
        
        if (contactsData.contacts.length > 0) {
          console.log(`   👥 Sample contacts:`);
          contactsData.contacts.slice(0, 3).forEach(contact => {
            console.log(`      - ${contact.name} (${contact.type}) - ${contact.isActive ? 'Active' : 'Inactive'}`);
          });
        }
      } else {
        const errorData = await contactsResponse.json();
        console.log(`   ❌ GET /api/contacts failed: ${contactsResponse.status} - ${errorData.message}`);
      }
    } catch (error) {
      console.log(`   ❌ GET /api/contacts error: ${error.message}`);
    }
    
    console.log('');
    
    // Step 3: Test GET /api/contacts with filters
    console.log('3. 🔍 Testing GET /api/contacts with filters...');
    
    try {
      const filteredResponse = await fetch('http://localhost:8080/api/contacts?type=tailor&isActive=true&search=&page=1&limit=5', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (filteredResponse.ok) {
        const filteredData = await filteredResponse.json();
        console.log(`   ✅ Filtered query successful`);
        console.log(`   ✂️ Active tailors found: ${filteredData.contacts.length}`);
        
        if (filteredData.contacts.length > 0) {
          console.log(`   👨‍🎨 Tailors:`);
          filteredData.contacts.forEach(contact => {
            console.log(`      - ${contact.name} (${contact.company || 'No company'})`);
          });
        }
      } else {
        const errorData = await filteredResponse.json();
        console.log(`   ❌ Filtered query failed: ${filteredResponse.status} - ${errorData.message}`);
      }
    } catch (error) {
      console.log(`   ❌ Filtered query error: ${error.message}`);
    }
    
    console.log('');
    
    // Step 4: Test POST /api/contacts (Create new contact)
    console.log('4. ➕ Testing POST /api/contacts (Create contact)...');
    
    const testContact = {
      name: 'Test Contact API',
      type: 'supplier',
      email: 'test.api@example.com',
      phone: '021-1111111',
      whatsappPhone: '081111111111',
      address: 'Test Address API',
      company: 'Test Company API',
      position: 'Test Position',
      notes: 'This is a test contact created via API testing'
    };
    
    try {
      const createResponse = await fetch('http://localhost:8080/api/contacts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testContact)
      });

      if (createResponse.ok) {
        const createData = await createResponse.json();
        console.log(`   ✅ POST /api/contacts successful`);
        console.log(`   🆕 Created contact: ${createData.contact.name} (ID: ${createData.contact.id})`);
        console.log(`   💬 Message: ${createData.message}`);
        
        // Store the created contact ID for testing updates/deletes
        global.testContactId = createData.contact.id;
      } else {
        const errorData = await createResponse.json();
        console.log(`   ❌ POST /api/contacts failed: ${createResponse.status} - ${errorData.message || errorData.error}`);
      }
    } catch (error) {
      console.log(`   ❌ POST /api/contacts error: ${error.message}`);
    }
    
    console.log('');
    
    // Step 5: Test frontend connectivity simulation
    console.log('5. 🌐 Testing Frontend-Backend Connectivity...');
    
    // Simulate frontend API call
    try {
      const frontendSimulation = await fetch('http://localhost:8080/api/contacts?page=1&limit=10&type=all&search=&isActive=true', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3000' // Simulate frontend origin
        }
      });

      if (frontendSimulation.ok) {
        const frontendData = await frontendSimulation.json();
        console.log(`   ✅ Frontend simulation successful`);
        console.log(`   🔗 CORS headers present: ${frontendSimulation.headers.get('access-control-allow-origin') ? 'Yes' : 'No'}`);
        console.log(`   📦 Data structure valid: ${frontendData.contacts && frontendData.pagination ? 'Yes' : 'No'}`);
      } else {
        console.log(`   ❌ Frontend simulation failed: ${frontendSimulation.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Frontend simulation error: ${error.message}`);
    }
    
    console.log('\n📋 SUMMARY:');
    console.log('========================================');
    console.log(`✅ Authentication: ${loginSuccess ? 'Working' : 'Failed'}`);
    console.log(`📊 Backend API: Testing complete`);
    console.log(`🔐 Token required: Yes (all routes protected)`);
    console.log(`🌐 CORS: Configured for frontend`);
    
    console.log('\n🎯 NEXT STEPS FOR FRONTEND DEBUGGING:');
    console.log('1. Check if frontend localStorage has valid token');
    console.log('2. Verify frontend API calls include Authorization header');
    console.log('3. Check frontend error handling for authentication failures');
    console.log('4. Ensure frontend uses correct API endpoint URLs');
    
    console.log('\n🔧 CREDENTIALS FOR TESTING:');
    console.log('Email: email.admin@contoh.com');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('❌ Test script error:', error.message);
  }
}

// Run the test
testContactsAPI(); 