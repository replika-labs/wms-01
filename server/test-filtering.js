const fetch = require('node-fetch');

async function testFilteringIssue() {
  console.log('🔍 TESTING CONTACT FILTERING ISSUE');
  console.log('==================================\n');

  // Step 1: Get authentication token
  console.log('1. 🔐 Getting authentication token...');
  let token = null;
  
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
      token = loginData.token;
      console.log(`   ✅ Authentication successful`);
    } else {
      throw new Error('Authentication failed');
    }
  } catch (error) {
    console.log(`   ❌ Authentication error: ${error.message}`);
    return;
  }
  console.log('');

  // Test different filter scenarios
  const testScenarios = [
    {
      name: 'All Types (no type filter)',
      url: 'http://localhost:8080/api/contacts?page=1&limit=10&isActive=true',
      description: 'No type parameter'
    },
    {
      name: 'All Types (type=all)',
      url: 'http://localhost:8080/api/contacts?page=1&limit=10&type=all&isActive=true',
      description: 'type=all parameter'
    },
    {
      name: 'All Types (type="")',
      url: 'http://localhost:8080/api/contacts?page=1&limit=10&type=&isActive=true',
      description: 'Empty type parameter'
    },
    {
      name: 'Supplier Only',
      url: 'http://localhost:8080/api/contacts?page=1&limit=10&type=supplier&isActive=true',
      description: 'type=supplier'
    },
    {
      name: 'Tailor Only',
      url: 'http://localhost:8080/api/contacts?page=1&limit=10&type=tailor&isActive=true',
      description: 'type=tailor'
    },
    {
      name: 'Internal Only',
      url: 'http://localhost:8080/api/contacts?page=1&limit=10&type=internal&isActive=true',
      description: 'type=internal'
    }
  ];

  console.log('2. 🧪 Testing different filter scenarios...\n');

  for (const scenario of testScenarios) {
    console.log(`Testing: ${scenario.name} (${scenario.description})`);
    
    try {
      const response = await fetch(scenario.url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Success: ${data.contacts.length} contacts returned`);
        
        if (data.contacts.length > 0) {
          const typeBreakdown = {};
          data.contacts.forEach(contact => {
            typeBreakdown[contact.type] = (typeBreakdown[contact.type] || 0) + 1;
          });
          console.log(`   📊 Types: ${JSON.stringify(typeBreakdown)}`);
          console.log(`   👥 Sample: ${data.contacts.slice(0, 2).map(c => `${c.name} (${c.type})`).join(', ')}`);
        } else {
          console.log(`   ⚠️ No contacts returned`);
        }
        
        if (data.filters?.typeStats) {
          console.log(`   📈 Stats: ${JSON.stringify(data.filters.typeStats)}`);
        }
      } else {
        const errorData = await response.json();
        console.log(`   ❌ Failed: ${response.status} - ${errorData.message}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    console.log('');
  }

  console.log('3. 🔍 Direct database query test...');
  try {
    const { sequelize } = require('./config/database');
    const Contact = require('./models/Contact');
    
    const allContacts = await Contact.findAll({
      where: { isActive: true },
      limit: 10
    });
    
    console.log(`   📊 Direct DB query: ${allContacts.length} active contacts found`);
    
    const typeCount = {};
    allContacts.forEach(contact => {
      typeCount[contact.type] = (typeCount[contact.type] || 0) + 1;
    });
    console.log(`   📈 Type breakdown: ${JSON.stringify(typeCount)}`);
    
  } catch (error) {
    console.log(`   ❌ Database error: ${error.message}`);
  }
  
  console.log('\n📋 ANALYSIS SUMMARY:');
  console.log('====================');
  console.log('Compare the results above to identify the filtering issue:');
  console.log('- If "All Types (no type filter)" works but "All Types (type=all)" fails');
  console.log('  → Backend issue: type=all is not handled correctly');
  console.log('- If all "All Types" scenarios fail but specific types work');
  console.log('  → Backend logic issue with empty/missing type parameter');
  console.log('- If direct DB query shows contacts but API doesn\'t');
  console.log('  → Backend filtering logic issue');

  process.exit(0);
}

testFilteringIssue(); 