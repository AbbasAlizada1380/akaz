import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import sequelize from '../dbconnection.js';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- Helper to locate executables ----------
function findExecutable(baseName) {
  // If MYSQL_BIN_DIR is set, try that path first
  if (process.env.MYSQL_BIN_DIR) {
    const fullPath = path.join(process.env.MYSQL_BIN_DIR, baseName);
    // On Windows, add .exe if not present
    const candidate = process.platform === 'win32' && !fullPath.endsWith('.exe')
      ? fullPath + '.exe'
      : fullPath;
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    console.warn(`⚠️  ${baseName} not found in MYSQL_BIN_DIR (${candidate}). Will try system PATH.`);
  }
  // Fallback to just the base name (rely on PATH)
  return baseName;
}

const mysqldumpExe = findExecutable('mysqldump');
const mysqlExe = findExecutable('mysql');

// ---------- Database config ----------
const dbConfig = sequelize.config;
const {
  database: DB_NAME,
  username: DB_USER,
  password: DB_PASS,
  host: DB_HOST,
  port: DB_PORT,
} = dbConfig;

// ---------- Generic spawn with input stream ----------
function spawnCommand(cmd, args, inputStream = null) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    if (inputStream) {
      inputStream.pipe(child.stdin);
      inputStream.on('error', (err) => {
        child.stdin.end();
        reject(err);
      });
    } else {
      child.stdin.end();
    }

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const error = new Error(`Command failed with exit code ${code}: ${stderr || stdout}`);
        error.code = code;
        error.stderr = stderr;
        error.stdout = stdout;
        reject(error);
      }
    });

    child.on('error', (err) => {
      // This catches "ENOENT" – executable not found
      reject(err);
    });
  });
}

// ---------- Check that the executables are available ----------
async function checkExecutable(exe, label) {
  try {
    await spawnCommand(exe, ['--version']);
    console.log(`✅ ${label} found at: ${exe}`);
  } catch (err) {
    throw new Error(
      `❌ ${label} is not available.\n` +
      `Tried: ${exe}\n` +
      'Please install MySQL client tools and/or set MYSQL_BIN_DIR in your .env file.\n' +
      `Original error: ${err.message}`
    );
  }
}

// ---------- EXPORT ----------
export const exportDatabase = async (req, res) => {
  try {
    // Ensure mysqldump exists before doing anything
    await checkExecutable(mysqldumpExe, 'mysqldump');

    const filename = `backup_${new Date().toISOString().slice(0, 10)}.sql`;

    const args = [
      `--host=${DB_HOST}`,
      `--port=${DB_PORT}`,
      `--user=${DB_USER}`,
      `--password=${DB_PASS}`,
      '--single-transaction',
      '--routines',
      '--triggers',
      '--no-tablespaces',
      DB_NAME
    ];

    console.log('🔹 Exporting database with mysqldump...');

    const { stdout, stderr } = await spawnCommand(mysqldumpExe, args);

    // Ignore warnings but treat other stderr as errors
    if (stderr && !stderr.includes('Warning')) {
      console.error('mysqldump stderr:', stderr);
      if (stderr.toLowerCase().includes('error')) {
        throw new Error(stderr);
      }
    }

    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(stdout));
    return res.send(stdout);
  } catch (error) {
    console.error('Export error:', error);
    let message = 'Error exporting database';
    if (error.message.includes('Access denied')) {
      message = 'Access denied. Please check your database credentials in dbconnection.js.';
    } else if (error.code === 'ENOENT' || error.message.includes('not available')) {
      message = 'MySQL client tools (mysqldump) not found. Please install them or set MYSQL_BIN_DIR.';
    }
    return res.status(500).json({ message, error: error.message });
  }
};

// ---------- IMPORT (Multer setup) ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tmpDir = path.join(__dirname, '../tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    cb(null, tmpDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const safeName = base.replace(/[^a-zA-Z0-9]/g, '_') + Date.now() + ext;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.sql') {
      cb(null, true);
    } else {
      cb(new Error('Only .sql files are allowed'), false);
    }
  },
  limits: { fileSize: 200 * 1024 * 1024 },
}).single('sqlFile');

export const importDatabase = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: 'File upload error', error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;

    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ message: 'Uploaded file not found on server' });
    }

    try {
      // Check mysql executable exists
      await checkExecutable(mysqlExe, 'mysql');

      const args = [
        `--host=${DB_HOST}`,
        `--port=${DB_PORT}`,
        `--user=${DB_USER}`,
        `--password=${DB_PASS}`,
        `--init-command=SET FOREIGN_KEY_CHECKS=0`,
        DB_NAME
      ];

      console.log('🔹 Importing database with mysql...');

      const fileStream = fs.createReadStream(filePath);
      const { stdout, stderr } = await spawnCommand(mysqlExe, args, fileStream);

      if (stderr && !stderr.includes('Warning')) {
        console.error('mysql stderr:', stderr);
        if (stderr.toLowerCase().includes('error')) {
          throw new Error(stderr);
        }
      }

      fs.unlinkSync(filePath);
      return res.status(200).json({ message: 'Database imported successfully' });
    } catch (error) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      console.error('Import error:', error);
      let message = 'Error importing database';
      if (error.message.includes('Access denied')) {
        message = 'Access denied. Please check your database credentials in dbconnection.js.';
      } else if (error.code === 'ENOENT' || error.message.includes('not available')) {
        message = 'MySQL client tools (mysql) not found. Please install them or set MYSQL_BIN_DIR.';
      }
      return res.status(500).json({ message, error: error.message });
    }
  });
};