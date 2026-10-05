const fs = require('fs');
const path = require('path');

const tests = [
    'app.js',
    'package.json',
    'public/index.html'
];

console.log('Starting automated tests...');

for (const file of tests) {
    if (!fs.existsSync(path.join(__dirname, file))) {
        console.error(`TEST FAILED: ${file} not found`);
        process.exit(1);
    }

    console.log(`TEST PASSED: ${file} exists`);
}

console.log('All automated tests passed.');
