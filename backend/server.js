const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const db = require('./services/db');
const { parseLogFile } = require('./parser/logParser');
const auth = require('./services/auth');
const requireAuth = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Setup directories
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // accept txt and log
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.log' || ext === '.txt') {
      cb(null, true);
    } else {
      cb(new Error('Only .log and .txt files are allowed'));
    }
  }
});

app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: "ok" });
});

// ==================== AUTHENTICATION ROUTES ====================

// Sign Up
app.post('/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = await db.findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const passwordHash = auth.hashPassword(password);
    const user = await db.createUser(name, email, passwordHash);
    const token = auth.signToken({ userId: user.id || user._id, email: user.email });

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: user.id || user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        accountType: user.accountType,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Sign up error:', error);
    res.status(500).json({ error: 'Error during user sign up' });
  }
});

// Login
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const valid = auth.verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = auth.signToken({ userId: user.id || user._id, email: user.email });

    res.json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user.id || user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        accountType: user.accountType,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error during user login' });
  }
});

// Forgot Password (Mock Reset Handler)
app.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required' });
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email' });
    }

    const passwordHash = auth.hashPassword(newPassword);
    await db.updateUserProfile(user.id || user._id, { passwordHash });

    res.json({ message: 'Password reset successfully. You can now login with your new password.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Error during password reset' });
  }
});

// Logout
app.post('/auth/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Get Current User Profile Info
app.get('/auth/me', requireAuth, (req, res) => {
  res.json({
    id: req.user.id || req.user._id,
    name: req.user.name,
    email: req.user.email,
    profilePicture: req.user.profilePicture,
    accountType: req.user.accountType,
    createdAt: req.user.createdAt
  });
});

// Update Profile
app.put('/auth/profile', requireAuth, async (req, res) => {
  try {
    const { name, profilePicture, accountType } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (profilePicture) updates.profilePicture = profilePicture;
    if (accountType) updates.accountType = accountType;

    const updated = await db.updateUserProfile(req.user.id || req.user._id, updates);
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updated.id || updated._id,
        name: updated.name,
        email: updated.email,
        profilePicture: updated.profilePicture,
        accountType: updated.accountType,
        createdAt: updated.createdAt
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Error updating user profile' });
  }
});

// Upload Log Endpoint
app.post('/upload-log', requireAuth, upload.single('logFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a log file' });
    }

    console.log(`Received log file upload: ${req.file.filename}`);
    
    // Parse log
    const parsedData = await parseLogFile(req.file.path);
    
    // Save to Database under authenticated user
    const userId = req.user.id || req.user._id;
    const savedRecord = await db.saveLogAnalysis(
      req.file.originalname, 
      parsedData.stats, 
      parsedData.parsedLogs, 
      userId,
      req.file.size,
      'parsed'
    );

    res.json({
      message: 'Log file uploaded and parsed successfully',
      id: savedRecord._id || savedRecord.id,
      filename: savedRecord.filename,
      uploadDate: savedRecord.uploadDate,
      stats: savedRecord.stats,
      logsSample: savedRecord.parsedLogs.slice(0, 100)
    });
  } catch (error) {
    console.error('Error uploading/parsing log:', error);
    res.status(500).json({ error: error.message || 'Error processing log file' });
  }
});

// GET Dashboard endpoint (returns latest or selected log summary)
app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const { id } = req.query;
    const userId = req.user.id || req.user._id;
    let record;
    if (id) {
      record = await db.getAnalysisById(id, userId);
    } else {
      record = await db.getLatestAnalysis(userId);
    }

    if (!record) {
      return res.json({ message: 'No logs analyzed yet. Please upload a log file.' });
    }
    
    res.json({
      id: record._id || record.id,
      filename: record.filename,
      uploadDate: record.uploadDate,
      stats: record.stats,
      aiAnalysis: record.aiAnalysis,
      chats: record.chats || [],
      logsSample: record.parsedLogs.slice(0, 100)
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ error: 'Error fetching dashboard data' });
  }
});

// GET History endpoint (returns upload list)
app.get('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const history = await db.getAllAnalysesMetadata(userId);
    res.json(history);
  } catch (error) {
    console.error('Error fetching upload history:', error);
    res.status(500).json({ error: 'Error fetching history data' });
  }
});

const aiService = require('./services/aiService');

// POST /analyze-log
app.post('/analyze-log', requireAuth, async (req, res) => {
  try {
    const { id } = req.body;
    const userId = req.user.id || req.user._id;
    let logRecord;

    if (id) {
      logRecord = await db.getAnalysisById(id, userId);
    } else {
      logRecord = await db.getLatestAnalysis(userId);
    }

    if (!logRecord) {
      return res.status(404).json({ error: 'Log record not found for analysis' });
    }

    console.log(`Running AI analysis for log file: ${logRecord.filename}`);
    
    // Call AI Service
    const aiAnalysis = await aiService.analyzeLog(logRecord);

    // Save/Update in DB
    const updatedRecord = await db.updateAIAnalysis(logRecord._id || logRecord.id, aiAnalysis);

    res.json({
      message: 'AI analysis generated successfully',
      id: logRecord._id || logRecord.id,
      filename: logRecord.filename,
      aiAnalysis
    });
  } catch (error) {
    console.error('Error running AI analysis:', error);
    res.status(500).json({ error: error.message || 'Error executing AI analysis' });
  }
});

// Load Demo Log Endpoint
app.post('/load-demo', requireAuth, async (req, res) => {
  try {
    const demoLogPath = path.join(__dirname, '../sample-app.log');
    if (!fs.existsSync(demoLogPath)) {
      return res.status(404).json({ error: 'Demo log file not found in workspace' });
    }

    console.log('Loading demo log file...');
    const parsedData = await parseLogFile(demoLogPath);
    
    // Save to Database under authenticated user
    const userId = req.user.id || req.user._id;
    const savedRecord = await db.saveLogAnalysis(
      'sample-app.log', 
      parsedData.stats, 
      parsedData.parsedLogs, 
      userId,
      1800, // file size simulation
      'analyzed'
    );

    // Automatically trigger AI Analysis for demo
    const aiAnalysis = await aiService.analyzeLog(savedRecord);
    const updatedRecord = await db.updateAIAnalysis(savedRecord._id || savedRecord.id, aiAnalysis);

    res.json({
      message: 'Demo log loaded and analyzed successfully',
      id: updatedRecord._id || updatedRecord.id,
      filename: updatedRecord.filename,
      uploadDate: updatedRecord.uploadDate,
      stats: updatedRecord.stats,
      aiAnalysis: updatedRecord.aiAnalysis,
      logsSample: updatedRecord.parsedLogs.slice(0, 100)
    });
  } catch (error) {
    console.error('Error loading demo:', error);
    res.status(500).json({ error: error.message || 'Error loading demo log' });
  }
});

// Upload Raw Text Log Endpoint
app.post('/upload-raw-text', requireAuth, async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: 'Log content cannot be empty' });
    }

    console.log('Received raw log text paste');
    
    // Write text to a temporary file in uploads directory
    const tempFileName = `pasted-${Date.now()}.log`;
    const tempFilePath = path.join(UPLOADS_DIR, tempFileName);
    fs.writeFileSync(tempFilePath, rawText, 'utf8');

    // Parse log file
    const parsedData = await parseLogFile(tempFilePath);

    // Save to Database under authenticated user
    const userId = req.user.id || req.user._id;
    const savedRecord = await db.saveLogAnalysis(
      tempFileName, 
      parsedData.stats, 
      parsedData.parsedLogs, 
      userId,
      Buffer.byteLength(rawText),
      'analyzed'
    );

    // Automatically trigger AI Analysis for pasted logs to make UX faster
    const aiAnalysis = await aiService.analyzeLog(savedRecord);
    const updatedRecord = await db.updateAIAnalysis(savedRecord._id || savedRecord.id, aiAnalysis);

    res.json({
      message: 'Pasted logs parsed and analyzed successfully',
      id: updatedRecord._id || updatedRecord.id,
      filename: 'pasted-logs.txt',
      uploadDate: updatedRecord.uploadDate,
      stats: updatedRecord.stats,
      aiAnalysis: updatedRecord.aiAnalysis,
      logsSample: updatedRecord.parsedLogs.slice(0, 100)
    });
  } catch (error) {
    console.error('Error parsing pasted log text:', error);
    res.status(500).json({ error: error.message || 'Error processing pasted logs' });
  }
});

// POST /chat
app.post('/chat', requireAuth, async (req, res) => {
  try {
    const { message, id } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const userId = req.user.id || req.user._id;
    let logRecord;
    if (id) {
      logRecord = await db.getAnalysisById(id, userId);
    } else {
      logRecord = await db.getLatestAnalysis(userId);
    }

    if (!logRecord) {
      return res.status(404).json({ error: 'No active log record found to chat about' });
    }

    console.log(`User query submitted: "${message}"`);
    const reply = await aiService.chatWithLog(message, logRecord);

    // Save chat to history in DB
    await db.saveChat(logRecord._id || logRecord.id, message, reply);

    res.json({
      reply,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error in chat route:', error);
    res.status(500).json({ error: error.message || 'Error processing chat query' });
  }
});

// DELETE /analysis/:id route
app.delete('/analysis/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id;
    await db.deleteAnalysis(id, userId);
    res.json({ message: 'Log analysis deleted successfully' });
  } catch (error) {
    console.error('Error deleting log analysis:', error);
    res.status(500).json({ error: 'Error deleting log analysis' });
  }
});

// PUT /analysis/:id/rename route
app.put('/analysis/:id/rename', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { filename } = req.body;
    const userId = req.user.id || req.user._id;
    
    if (!filename || !filename.trim()) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const updated = await db.renameAnalysis(id, filename.trim(), userId);
    if (!updated) {
      return res.status(404).json({ error: 'Log analysis record not found or unauthorized' });
    }

    res.json({ message: 'Log file renamed successfully' });
  } catch (error) {
    console.error('Error renaming log analysis:', error);
    res.status(500).json({ error: 'Error renaming log analysis' });
  }
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('Centralized Error Handler caught:', err);
  res.status(err.status || 500).json({
    error: err.message || 'A critical server error occurred.'
  });
});

db.connect().then(() => {
  app.listen(PORT, () => {
    console.log(`LogPilot AI Backend running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to init DB connection:', err);
  // Still run server even if DB init crashes, because we have dynamic fallbacks
  app.listen(PORT, () => {
    console.log(`LogPilot AI Backend running on port ${PORT} (warning: DB failed to connect)`);
  });
});
