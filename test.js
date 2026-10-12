const fs = require('fs');
const path = require('path');
const { createServer } = require('./app');

const tests = [
    'app.js',
    'metrics.js',
    'package.json',
    'monitoring/prometheus.yml',
    'public/index.html'
];

async function runTests() {
    console.log('Starting automated tests...');

    for (const file of tests) {
        if (!fs.existsSync(path.join(__dirname, file))) {
            throw new Error(`TEST FAILED: ${file} not found`);
        }

        console.log(`TEST PASSED: ${file} exists`);
    }

    const server = createServer();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
        const homeResponse = await fetch(baseUrl);
        if (homeResponse.status !== 200) {
            throw new Error(`Expected home page status 200, received ${homeResponse.status}`);
        }

        const missingResponse = await fetch(`${baseUrl}/missing`);
        if (missingResponse.status !== 404) {
            throw new Error(`Expected missing page status 404, received ${missingResponse.status}`);
        }

        const metricsResponse = await fetch(`${baseUrl}/metrics`);
        const metrics = await metricsResponse.text();
        if (metricsResponse.status !== 200 || !metricsResponse.headers.get('content-type').includes('text/plain')) {
            throw new Error('Metrics endpoint did not return a Prometheus text response');
        }
        if (!metrics.includes('# TYPE http_requests_total counter') ||
            !metrics.includes('http_requests_total{method="GET",route="home",status_code="200"} 1') ||
            !metrics.includes('http_requests_total{method="GET",route="not_found",status_code="404"} 1') ||
            !metrics.includes('# TYPE http_request_duration_seconds histogram') ||
            !metrics.includes('process_resident_memory_bytes')) {
            throw new Error('Expected request, latency, and process memory metrics were not exposed');
        }

        const prometheusConfig = fs.readFileSync(path.join(__dirname, 'monitoring/prometheus.yml'), 'utf8');
        if (!prometheusConfig.includes('scrape_interval: 15s') ||
            !prometheusConfig.includes('job_name: student-task-manager') ||
            !prometheusConfig.includes('metrics_path: /metrics') ||
            !prometheusConfig.includes('role: endpoints') ||
            !prometheusConfig.includes('__POD_NAMESPACE__') ||
            !prometheusConfig.includes('regex: task-manager-service') ||
            !prometheusConfig.includes('regex: http')) {
            throw new Error('Prometheus scrape configuration is missing the application target');
        }

        console.log('TEST PASSED: /metrics exposes request, latency, and memory metrics');
    } finally {
        server.closeAllConnections();
        await new Promise((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
        });
    }

    console.log('All automated tests passed.');
}

runTests().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
