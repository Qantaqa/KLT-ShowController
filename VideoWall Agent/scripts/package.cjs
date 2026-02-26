/**
 * Package the VideoWall Agent into a distributable ZIP.
 * Run: npm run package
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VERSION = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
const PACKAGE_NAME = `VideoWall-agent-v${VERSION}`;
const OUTPUT_DIR = path.join('releases', PACKAGE_NAME);
const ZIP_NAME = `${PACKAGE_NAME}.zip`;

console.log(`\n📦 Building VideoWall Agent v${VERSION}...\n`);

// Step 1: Compile TypeScript
console.log('1. Compiling TypeScript...');
try {
    execSync('npx tsc', { stdio: 'inherit' });
} catch (e) {
    console.error('TypeScript compilation failed!');
    process.exit(1);
}

// Step 2: Clean output directory
console.log('2. Preparing package directory...');
if (fs.existsSync('releases')) {
    fs.rmSync('releases', { recursive: true });
}
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(path.join(OUTPUT_DIR, 'dist'), { recursive: true });
fs.mkdirSync(path.join(OUTPUT_DIR, 'media'), { recursive: true });

// Step 3: Copy files
console.log('3. Copying files...');

// Copy compiled JS (only .js files, no .map or .d.ts for smaller package)
const distFiles = fs.readdirSync('dist').filter(f => f.endsWith('.js'));
distFiles.forEach(f => {
    fs.copyFileSync(path.join('dist', f), path.join(OUTPUT_DIR, 'dist', f));
});

// Copy package.json (production version)
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
delete pkg.devDependencies;
delete pkg.scripts.start; // Remove dev script
delete pkg.scripts.package;
pkg.scripts.start = pkg.scripts.serve; // Make "start" run the compiled version
delete pkg.scripts.serve;
fs.writeFileSync(path.join(OUTPUT_DIR, 'package.json'), JSON.stringify(pkg, null, 2));

// Copy scripts
const copyFiles = [
    'install.bat',
    'install.sh',
    'start.bat',
    'start.sh',
    'INSTALL.md'
];

copyFiles.forEach(f => {
    if (fs.existsSync(f)) {
        fs.copyFileSync(f, path.join(OUTPUT_DIR, f));
    }
});

// Copy media files (if any exist)
if (fs.existsSync('media')) {
    const mediaFiles = fs.readdirSync('media');
    mediaFiles.forEach(f => {
        fs.copyFileSync(path.join('media', f), path.join(OUTPUT_DIR, 'media', f));
    });
}

// Step 4: Create ZIP
console.log('4. Creating ZIP archive...');
const zipPath = path.join('releases', ZIP_NAME);

try {
    // Use PowerShell on Windows
    if (process.platform === 'win32') {
        execSync(`powershell -Command "Compress-Archive -Path '${OUTPUT_DIR}\\*' -DestinationPath '${zipPath}' -Force"`, { stdio: 'inherit' });
    } else {
        execSync(`cd releases && zip -r ${ZIP_NAME} ${PACKAGE_NAME}/`, { stdio: 'inherit' });
    }
} catch (e) {
    console.error('ZIP creation failed! The files are still available in:', OUTPUT_DIR);
}

// Report
const files = fs.readdirSync(OUTPUT_DIR);
console.log(`\n✅ Package created successfully!`);
console.log(`   Directory: ${OUTPUT_DIR}/`);
if (fs.existsSync(zipPath)) {
    const size = (fs.statSync(zipPath).size / 1024).toFixed(1);
    console.log(`   ZIP: ${zipPath} (${size} KB)`);
}
console.log(`   Files: ${files.join(', ')}`);
console.log(`\n📋 Distribution: Upload ${ZIP_NAME} to the Hub.`);
console.log(`   The Hub generates start.bat with user-specific configuration.`);
console.log('');
