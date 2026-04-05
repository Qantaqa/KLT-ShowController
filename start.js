const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

const hubDir = path.join(__dirname, 'Hub');
const videoWallDir = path.join(__dirname, 'VideoWall Agent');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Wat wil je opstarten?');
console.log('1: HUB');
console.log('2: VideoWall Agent');
console.log('3: Beide');

rl.question('Keuze (1/2/3): ', (answer) => {
  const choice = String(answer).trim();
  if (choice === '1') runHub();
  else if (choice === '2') runVideoWall();
  else if (choice === '3') {
    runHub();
    runVideoWall();
  } else console.log('Ongeldige keuze');
  rl.close();
});

function runHub() {
  spawn('npm', ['run', 'dev'], { cwd: hubDir, shell: true, stdio: 'inherit' });
}

function runVideoWall() {
  spawn('npm', ['start'], { cwd: videoWallDir, shell: true, stdio: 'inherit' });
}
