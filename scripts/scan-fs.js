const fs = require('fs');
const path = require('path');

const batLines = [
  '@echo off',
  'title PRINT BAZZAR - Production Server',
  'color 0E',
  '',
  ':: Switch to current folder on ANY computer',
  'cd /d "%~dp0"',
  '',
  'echo ======================================================================',
  'echo          PRINT BAZZAR - Digital Printing Production System',
  'echo                      Local Server Launcher',
  'echo ======================================================================',
  'echo.',
  'echo Current Folder: %CD%',
  'echo.',
  '',
  ':: 1. Check if Node.js is installed',
  'node -v >nul 2>nul',
  'if %errorlevel% equ 0 goto NODE_INSTALLED',
  'echo.',
  'echo ======================================================================',
  'echo   [ERROR] Node.js is NOT installed on this computer!',
  'echo ======================================================================',
  'echo   To run Print Bazzar on this shop computer:',
  'echo   1. Open browser: https://nodejs.org',
  'echo   2. Download and install the LTS version',
  'echo   3. Then double-click PRINT BAZZAR APP again!',
  'echo ======================================================================',
  'echo.',
  'pause',
  'exit /b',
  '',
  ':NODE_INSTALLED',
  'echo [OK] Node.js is detected.',
  'echo.',
  '',
  ':: 2. Check if server is already running',
  'netstat -ano | findstr :3000 | findstr LISTENING >nul',
  'if %errorlevel% neq 0 goto START_SERVER',
  'echo [OK] Print Bazzar Server is ALREADY running on port 3000!',
  'echo Opening application in your browser...',
  'start http://localhost:3000',
  'goto RUNNING',
  '',
  ':START_SERVER',
  'echo Starting Print Bazzar Local Server...',
  'echo [INFO] Data is stored locally in data\\db.json',
  'echo.',
  'start /b npm start > "server.log" 2>&1',
  '',
  'echo Waiting for server to initialize...',
  'ping 127.0.0.1 -n 4 >nul',
  'echo [SUCCESS] Opening Print Bazzar in your default browser...',
  'start http://localhost:3000',
  '',
  ':RUNNING',
  'cls',
  'echo ======================================================================',
  'echo          PRINT BAZZAR - Production Server is ONLINE [ACTIVE]',
  'echo ======================================================================',
  'echo.',
  'echo  * Local Address:       http://localhost:3000',
  'echo.',
  'echo  * Local Database:      %CD%\\data\\db.json',
  'echo  * Automated Backups:   %CD%\\data\\backups\\',
  'echo.',
  'echo ======================================================================',
  'echo   KEEP THIS WINDOW OPEN WHILE WORKING IN THE SHOP.',
  'echo   To stop the server, simply close this window.',
  'echo ======================================================================',
  'echo.',
  'pause',
  ''
];

const content = batLines.join('\r\n');
const targets = [
  path.join(process.cwd(), 'PRINT BAZZAR APP.bat'),
  path.join('C:', 'Users', 'Dell', 'Desktop', 'PRINT BAZZAR APP.bat'),
  path.join('C:', 'Users', 'Dell', 'Desktop', 'designer', 'PRINT BAZZAR APP.bat'),
];

for (const t of targets) {
  try {
    fs.writeFileSync(t, content, 'utf8');
    console.log('Successfully written to:', t);
  } catch (e) {
    console.warn('Could not write to', t, e.message);
  }
}

