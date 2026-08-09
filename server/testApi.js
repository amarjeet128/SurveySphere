const http = require('http');

const request = (options, data = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body || '{}') }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
};

async function test() {
  try {
    // Login
    const loginData = JSON.stringify({ email: 'admin@survey.com', password: '123456' });
    const loginRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length }
    }, loginData);
    
    if (!loginRes.data.token) {
      console.log('Login failed');
      return;
    }
    const token = loginRes.data.token;

    // Get Surveys
    const surveysRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/surveys',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (surveysRes.data.length === 0) {
      console.log('No surveys');
      return;
    }
    const surveyId = surveysRes.data[0]._id;
    console.log('Got survey', surveyId, 'with status', surveysRes.data[0].status);

    // Update Status
    const updateData = JSON.stringify({ status: 'Active' });
    const updateRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/surveys/${surveyId}`,
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': updateData.length
      }
    }, updateData);

    console.log('Update Response:', updateRes.status, updateRes.data);
  } catch (e) {
    console.error(e);
  }
}
test();
