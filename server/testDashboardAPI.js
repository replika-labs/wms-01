const http = require('http');

function makeRequest(options) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsedData });
                } catch (error) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.end();
    });
}

async function testDashboardAPI() {
    try {
        console.log('Testing dashboard API endpoint...');
        
        // Test the dashboard endpoint
        const dashboardOptions = {
            hostname: 'localhost',
            port: 8080,
            path: '/api/dashboard/summary',
            method: 'GET'
        };
        
        try {
            const response = await makeRequest(dashboardOptions);
            console.log('Response status:', response.status);
            
            if (response.status === 200) {
                console.log('✅ Dashboard API working!');
                console.log('Response data keys:', Object.keys(response.data));
            } else if (response.status === 401) {
                console.log('📝 Expected 401 - authentication required');
            } else if (response.status === 500) {
                console.log('❌ 500 Error - server error');
                console.log('Error details:', response.data);
            } else {
                console.log('❓ Unexpected status:', response.status);
                console.log('Response:', response.data);
            }
        } catch (error) {
            console.log('❌ Request failed:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testDashboardAPI(); 