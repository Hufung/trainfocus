const fs = require('fs');
const path = require('path');

// Ensure dist directory exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Read the source HTML file
const sourceFile = path.join(__dirname, 'index.html');
let htmlContent = fs.readFileSync(sourceFile, 'utf8');

// Write the processed file to dist
const outputFile = path.join(distDir, 'index.html');
fs.writeFileSync(outputFile, htmlContent, 'utf8');

// Copy google verification file if exists
const googleFile = path.join(__dirname, 'google4d83934a99618a06.html');
if (fs.existsSync(googleFile)) {
    fs.copyFileSync(googleFile, path.join(distDir, 'google4d83934a99618a06.html'));
}

console.log('Build completed successfully!');
console.log('Using Netlify DB for user authentication');

