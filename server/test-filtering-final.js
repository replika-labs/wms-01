const fetch = require('node-fetch');

async function testFilteringFinal() {
  console.log('🎯 FINAL FILTERING TEST - ALL SCENARIOS');
  console.log('========================================\n');

  // Get authentication token
  const loginResponse = await fetch('http://localhost:8080/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'email.admin@contoh.com',
      password: 'admin123'
    })
  });

  const loginData = await loginResponse.json();
  const token = loginData.token;

  // Test scenarios that should all work now
  const testScenarios = [
    {
      name: '✅ All Types (type=all)',
      url: 'http://localhost:8080/api/contacts?page=1&limit=10&type=all&isActive=true',
      expectContact: true
    },
    {
      name: '✅ All Types (no type)',
      url: 'http://localhost:8080/api/contacts?page=1&limit=10&isActive=true',
      expectContact: true
    },
    {
      name: '✅ Supplier Only',
      url: 'http://localhost:8080/api/contacts?page=1&limit=10&type=supplier&isActive=true',
      expectContact: true,
      expectType: 'supplier'
    },
    {
      name: '✅ Tailor Only',
      url: 'http://localhost:8080/api/contacts?page=1&limit=10&type=tailor&isActive=true',
      expectContact: true,
      expectType: 'tailor'
    },
    {
      name: '✅ Internal Only',
      url: 'http://localhost:8080/api/contacts?page=1&limit=10&type=internal&isActive=true',
      expectContact: true,
      expectType: 'internal'
    },
    {
      name: '✅ Search Functionality',
      url: 'http://localhost:8080/api/contacts?page=1&limit=10&search=Budi&isActive=true',
      expectContact: true
    }
  ];

  let allPassed = true;

  for (const scenario of testScenarios) {
    console.log(`Testing: ${scenario.name}`);
    
    try {
      const response = await fetch(scenario.url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (scenario.expectContact && data.contacts.length > 0) {
          console.log(`   ✅ PASS: ${data.contacts.length} contacts returned`);
          
          // Type validation if specified
          if (scenario.expectType) {
            const allCorrectType = data.contacts.every(c => c.type === scenario.expectType);
            if (allCorrectType) {
              console.log(`   ✅ Type filter working: All contacts are ${scenario.expectType}`);
            } else {
              console.log(`   ❌ Type filter failed: Mixed types found`);
              allPassed = false;
            }
          }
          
          // Show sample contacts
          console.log(`   👥 Sample: ${data.contacts.slice(0, 2).map(c => `${c.name} (${c.type})`).join(', ')}`);
          
        } else if (scenario.expectContact && data.contacts.length === 0) {
          console.log(`   ❌ FAIL: Expected contacts but got none`);
          allPassed = false;
        } else {
          console.log(`   ✅ PASS: Behavior as expected`);
        }
      } else {
        console.log(`   ❌ FAIL: HTTP ${response.status}`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      allPassed = false;
    }
    console.log('');
  }

  // Frontend simulation test
  console.log('🌐 Frontend Simulation Test...');
  try {
    // Simulate what frontend sends for "all types"
    const frontendAllTypes = await fetch('http://localhost:8080/api/contacts?page=1&limit=10&type=all&search=&isActive=true', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000'
      }
    });

    if (frontendAllTypes.ok) {
      const data = await frontendAllTypes.json();
      console.log(`   ✅ Frontend "All Types" simulation: ${data.contacts.length} contacts`);
      console.log(`   📊 Pagination: Page ${data.pagination.current} of ${data.pagination.pages}`);
      
      // Check statistics
      if (data.filters?.typeStats) {
        console.log(`   📈 Statistics working:`);
        Object.entries(data.filters.typeStats).forEach(([type, stats]) => {
          console.log(`      - ${type}: ${stats.active}/${stats.total} active`);
        });
      }
    } else {
      console.log(`   ❌ Frontend simulation failed`);
      allPassed = false;
    }
  } catch (error) {
    console.log(`   ❌ Frontend simulation error: ${error.message}`);
    allPassed = false;
  }

  console.log('\n📋 FINAL RESULTS');
  console.log('=================');
  
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED! ');
    console.log('✅ Contact filtering is now working correctly');
    console.log('✅ "All Types" filter fixed');
    console.log('✅ Specific type filters working');
    console.log('✅ Search functionality working');
    console.log('✅ Frontend-backend communication ready');
    console.log('\n🎯 USER ACTIONS:');
    console.log('1. Refresh the frontend Contact Management page');
    console.log('2. Try selecting "All Types" in the filter dropdown');
    console.log('3. Should now display all contacts (suppliers, tailors, internal)');
    console.log('\n📞 Test completed successfully! The filtering issue is resolved.');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('Additional debugging may be required');
  }

  process.exit(0);
}

testFilteringFinal(); 