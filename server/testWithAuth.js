const http = require('http');
const querystring = require('querystring');

function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(responseData);
                    resolve({ status: res.statusCode, data: parsedData });
                } catch (error) {
                    resolve({ status: res.statusCode, data: responseData });
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        if (data) {
            req.write(data);
        }
        
        req.end();
    });
}

async function testWithAuthentication() {
    try {
        console.log('Testing dashboard with authentication...');
        
        // Try different user credentials
        const credentialsToTry = [
            { email: 'admin@wms.com', password: 'admin123' },
            { email: 'test@admin.com', password: 'admin123' },
            { email: 'email.admin@contoh.com', password: 'admin123' },
            { email: 'admin@contoh.com', password: 'admin123' },
            { email: 'admin@wms.com', password: 'password' },
            { email: 'admin@wms.com', password: '123456' }
        ];
        
        let token = null;
        
        for (const credentials of credentialsToTry) {
            console.log(`Trying login with ${credentials.email}...`);
            
            const loginData = JSON.stringify(credentials);
            
            const loginOptions = {
                hostname: 'localhost',
                port: 8080,
                path: '/api/auth/login',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(loginData)
                }
            };
            
            const loginResponse = await makeRequest(loginOptions, loginData);
            
            if (loginResponse.status === 200) {
                console.log('✅ Login successful with', credentials.email);
                token = loginResponse.data.token;
                break;
            } else {
                console.log(`❌ Login failed for ${credentials.email}:`, loginResponse.data.message);
            }
        }
        
        if (!token) {
            console.log('❌ Could not login with any credentials. Let\'s create a test user...');
            
            // Register a new test user
            const registerData = JSON.stringify({
                name: 'Test Admin Dashboard',
                email: 'testdash@admin.com',
                phone: '081234567890',
                role: 'admin',
                password: 'admin123'
            });
            
            const registerOptions = {
                hostname: 'localhost',
                port: 8080,
                path: '/api/auth/register',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(registerData)
                }
            };
            
            console.log('Creating test user...');
            const registerResponse = await makeRequest(registerOptions, registerData);
            
            if (registerResponse.status === 201) {
                console.log('✅ Test user created, trying login...');
                
                const loginData = JSON.stringify({
                    email: 'testdash@admin.com',
                    password: 'admin123'
                });
                
                const loginOptions = {
                    hostname: 'localhost',
                    port: 8080,
                    path: '/api/auth/login',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(loginData)
                    }
                };
                
                const loginResponse = await makeRequest(loginOptions, loginData);
                
                if (loginResponse.status === 200) {
                    console.log('✅ Login successful with new test user');
                    token = loginResponse.data.token;
                } else {
                    console.log('❌ Login failed with new test user:', loginResponse.data.message);
                    return;
                }
            } else {
                console.log('❌ Failed to create test user:', registerResponse.data);
                return;
            }
        }
        
        // Step 2: Test dashboard with token
        const dashboardOptions = {
            hostname: 'localhost',
            port: 8080,
            path: '/api/dashboard/summary',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };
        
        console.log('Testing dashboard with token...');
        const dashboardResponse = await makeRequest(dashboardOptions);
        
        if (dashboardResponse.status === 200) {
            console.log('✅ Dashboard API working with authentication!');
            console.log('Response data structure:');
            console.log('- orderStats:', dashboardResponse.data.orderStats ? 'Present' : 'Missing');
            console.log('- materialStats:', dashboardResponse.data.materialStats ? 'Present' : 'Missing');
            console.log('- productStats:', dashboardResponse.data.productStats ? 'Present' : 'Missing');
            console.log('- userStats:', dashboardResponse.data.userStats ? 'Present' : 'Missing');
            console.log('- progressStats:', dashboardResponse.data.progressStats ? 'Present' : 'Missing');
            console.log('- criticalMaterials:', Array.isArray(dashboardResponse.data.criticalMaterials) ? `Array (${dashboardResponse.data.criticalMaterials.length})` : 'Missing');
            console.log('- upcomingDeadlines:', Array.isArray(dashboardResponse.data.upcomingDeadlines) ? `Array (${dashboardResponse.data.upcomingDeadlines.length})` : 'Missing');
            console.log('- recentActivities:', Array.isArray(dashboardResponse.data.recentActivities) ? `Array (${dashboardResponse.data.recentActivities.length})` : 'Missing');
            console.log('- orderTrend:', Array.isArray(dashboardResponse.data.orderTrend) ? `Array (${dashboardResponse.data.orderTrend.length})` : 'Missing');
            console.log('- productionTrend:', Array.isArray(dashboardResponse.data.productionTrend) ? `Array (${dashboardResponse.data.productionTrend.length})` : 'Missing');
            
            console.log('\n📊 Sample Data:');
            console.log('Order Stats:', JSON.stringify(dashboardResponse.data.orderStats, null, 2));
        } else {
            console.log('❌ Dashboard API failed:', dashboardResponse.status);
            console.log('Error details:', dashboardResponse.data);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testWithAuthentication(); 