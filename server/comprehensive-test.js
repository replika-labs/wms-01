const fetch = require('node-fetch');

async function comprehensiveTest() {
  console.log('🔍 COMPREHENSIVE CONTACT MANAGEMENT SYSTEM TEST');
  console.log('===============================================\n');

  let testResults = {
    database: false,
    backend: false,
    authentication: false,
    contactsAPI: false,
    createContact: false,
    frontend: false
  };

  // Test 1: Database Check
  console.log('1. 🗄️ Testing Database...');
  try {
    const { sequelize } = require('./config/database');
    const Contact = require('./models/Contact');
    
    await sequelize.authenticate();
    const contactCount = await Contact.count();
    
    console.log(`   ✅ Database connected`);
    console.log(`   📊 Total contacts: ${contactCount}`);
    testResults.database = true;
    
    if (contactCount === 0) {
      console.log('   ⚠️ No contacts found. Running seed script...');
      // Re-seed data
      require('./seed-contacts.js');
    }
  } catch (error) {
    console.log(`   ❌ Database error: ${error.message}`);
  }
  console.log('');

  // Test 2: Backend Server
  console.log('2. 🖥️ Testing Backend Server...');
  try {
    const healthResponse = await fetch('http://localhost:8080/api/health');
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log(`   ✅ Backend server running`);
      console.log(`   🔗 Health status: ${healthData.status}`);
      console.log(`   💾 Database: ${healthData.database}`);
      testResults.backend = true;
    } else {
      console.log(`   ❌ Backend server error: ${healthResponse.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Backend server not accessible: ${error.message}`);
    console.log('   💡 Start backend with: npm run dev (in server directory)');
  }
  console.log('');

  // Test 3: Authentication
  console.log('3. 🔐 Testing Authentication...');
  let authToken = null;
  try {
    const loginResponse = await fetch('http://localhost:8080/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'email.admin@contoh.com',
        password: 'admin123'
      })
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      authToken = loginData.token;
      console.log(`   ✅ Authentication working`);
      console.log(`   👤 User: ${loginData.user.name} (${loginData.user.role})`);
      console.log(`   🎫 Token received: ${authToken ? 'Yes' : 'No'}`);
      testResults.authentication = true;
    } else {
      const errorData = await loginResponse.json();
      console.log(`   ❌ Authentication failed: ${errorData.message}`);
    }
  } catch (error) {
    console.log(`   ❌ Authentication error: ${error.message}`);
  }
  console.log('');

  // Test 4: Contacts API
  if (authToken) {
    console.log('4. 📇 Testing Contacts API...');
    try {
      const contactsResponse = await fetch('http://localhost:8080/api/contacts', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (contactsResponse.ok) {
        const contactsData = await contactsResponse.json();
        console.log(`   ✅ Contacts API working`);
        console.log(`   📊 Contacts returned: ${contactsData.contacts.length}`);
        console.log(`   📄 Pagination: Page ${contactsData.pagination.current} of ${contactsData.pagination.pages}`);
        testResults.contactsAPI = true;

        // Show some sample data
        if (contactsData.contacts.length > 0) {
          console.log(`   👥 Sample contacts:`);
          contactsData.contacts.slice(0, 3).forEach(contact => {
            console.log(`      - ${contact.name} (${contact.type})`);
          });
        }
      } else {
        const errorData = await contactsResponse.json();
        console.log(`   ❌ Contacts API failed: ${errorData.message}`);
      }
    } catch (error) {
      console.log(`   ❌ Contacts API error: ${error.message}`);
    }
    console.log('');

    // Test 5: Create Contact
    console.log('5. ➕ Testing Create Contact...');
    try {
      const testContact = {
        name: `Test Contact ${Date.now()}`,
        type: 'supplier',
        email: `test${Date.now()}@example.com`,
        phone: '021-9999999',
        whatsappPhone: '089999999999',
        company: 'Test Company',
        notes: 'Created by comprehensive test script'
      };

      const createResponse = await fetch('http://localhost:8080/api/contacts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testContact)
      });

      if (createResponse.ok) {
        const createData = await createResponse.json();
        console.log(`   ✅ Create contact working`);
        console.log(`   🆕 Created: ${createData.contact.name} (ID: ${createData.contact.id})`);
        testResults.createContact = true;
      } else {
        const errorData = await createResponse.json();
        console.log(`   ❌ Create contact failed: ${errorData.message}`);
      }
    } catch (error) {
      console.log(`   ❌ Create contact error: ${error.message}`);
    }
    console.log('');
  }

  // Test 6: Frontend Server
  console.log('6. 🌐 Testing Frontend Server...');
  try {
    const frontendResponse = await fetch('http://localhost:3000', {
      headers: { 'User-Agent': 'Test-Script' }
    });

    if (frontendResponse.ok) {
      console.log(`   ✅ Frontend server running`);
      console.log(`   🔗 Status: ${frontendResponse.status}`);
      testResults.frontend = true;
    } else {
      console.log(`   ❌ Frontend server error: ${frontendResponse.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Frontend server not accessible: ${error.message}`);
    console.log('   💡 Start frontend with: npm run dev (in client directory)');
  }
  console.log('');

  // Summary and Solutions
  console.log('📋 TEST RESULTS SUMMARY');
  console.log('========================');
  
  Object.entries(testResults).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test.toUpperCase()}: ${passed ? 'PASSED' : 'FAILED'}`);
  });

  console.log('\n🛠️ SOLUTIONS & NEXT STEPS');
  console.log('===========================');

  if (!testResults.database) {
    console.log('❌ DATABASE ISSUE:');
    console.log('   - Check if MySQL/MariaDB is running');
    console.log('   - Verify database connection in .env file');
    console.log('   - Run: node create-contact-tables.js');
  }

  if (!testResults.backend) {
    console.log('❌ BACKEND ISSUE:');
    console.log('   - Start backend: cd server && npm run dev');
    console.log('   - Check port 8080 is not blocked');
  }

  if (!testResults.authentication) {
    console.log('❌ AUTHENTICATION ISSUE:');
    console.log('   - Create admin user: cd server && node createAdminUser.js');
    console.log('   - Or try login with: email.admin@contoh.com / admin123');
  }

  if (!testResults.contactsAPI) {
    console.log('❌ CONTACTS API ISSUE:');
    console.log('   - Check authentication token');
    console.log('   - Verify contact routes are properly registered');
  }

  if (!testResults.frontend) {
    console.log('❌ FRONTEND ISSUE:');
    console.log('   - Start frontend: cd client && npm run dev');
    console.log('   - Check port 3000 is not blocked');
  }

  if (testResults.backend && testResults.authentication && testResults.contactsAPI && testResults.frontend) {
    console.log('✅ SYSTEM IS WORKING CORRECTLY!');
    console.log('');
    console.log('🔧 FRONTEND DEBUGGING STEPS:');
    console.log('1. Open http://localhost:3000/login');
    console.log('2. Login with: email.admin@contoh.com / admin123');
    console.log('3. Navigate to: http://localhost:3000/dashboard/contacts');
    console.log('4. If still showing "No contacts found", open browser console');
    console.log('5. Check for JavaScript errors or network failures');
    console.log('');
    console.log('🔍 Browser Console Debug:');
    console.log('Open browser console and run:');
    console.log('localStorage.getItem("token") // Should show token');
    console.log('localStorage.getItem("user")  // Should show user data');
  }

  console.log('\n📞 SUPPORT INFO:');
  console.log('- Backend: http://localhost:8080/api/health');
  console.log('- Frontend: http://localhost:3000');
  console.log('- Login: email.admin@contoh.com / admin123');

  process.exit(0);
}

// Run the comprehensive test
comprehensiveTest(); 