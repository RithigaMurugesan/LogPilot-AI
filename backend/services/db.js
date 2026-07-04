const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const DATA_DIR = path.join(__dirname, '../data');
const JSON_DB_PATH = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial JSON DB template if file doesn't exist
if (!fs.existsSync(JSON_DB_PATH)) {
  fs.writeFileSync(JSON_DB_PATH, JSON.stringify({ logs: [], analyses: [], users: [] }, null, 2));
}

let useMongo = false;

// Define User Schema
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,
  profilePicture: String,
  createdAt: { type: Date, default: Date.now },
  accountType: { type: String, default: 'Developer' }
});

// Define MongoDB Schemas if Mongo is used
const LogAnalysisSchema = new mongoose.Schema({
  userId: String,
  filename: String,
  fileSize: Number, // in bytes
  status: { type: String, default: 'pending' }, // 'pending', 'analyzed', 'failed'
  uploadDate: { type: Date, default: Date.now },
  stats: {
    totalLogs: Number,
    levelCounts: mongoose.Schema.Types.Mixed,
    errorRate: Number,
    successRate: Number,
    healthScore: Number,
    moduleCounts: mongoose.Schema.Types.Mixed,
  },
  parsedLogs: Array,
  aiAnalysis: mongoose.Schema.Types.Mixed,
  chats: Array,
});

let LogAnalysisModel;
let UserModel;

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('No MONGODB_URI found. Using local JSON DB fallback.');
    useMongo = false;
    return;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('Successfully connected to MongoDB Atlas.');
    useMongo = true;
    LogAnalysisModel = mongoose.model('LogAnalysis', LogAnalysisSchema);
    UserModel = mongoose.model('User', UserSchema);
  } catch (error) {
    console.error('Failed to connect to MongoDB Atlas. Falling back to local JSON DB.', error.message);
    useMongo = false;
  }
}

// Read local JSON DB
function readJsonDB() {
  try {
    const data = fs.readFileSync(JSON_DB_PATH, 'utf8');
    const parsed = JSON.parse(data);
    if (!parsed.analyses) parsed.analyses = [];
    if (!parsed.users) parsed.users = [];
    return parsed;
  } catch (e) {
    return { logs: [], analyses: [], users: [] };
  }
}

// Write local JSON DB
function writeJsonDB(data) {
  try {
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error writing to local JSON DB', e);
  }
}

// DB Operations Repository Interface
const db = {
  connect: connectDB,

  saveLogAnalysis: async (filename, stats, parsedLogs, userId = null, fileSize = 0, status = 'analyzed') => {
    const record = {
      userId: userId ? userId.toString() : null,
      filename,
      fileSize,
      status,
      uploadDate: new Date(),
      stats,
      parsedLogs,
      aiAnalysis: null,
      chats: [],
    };

    if (useMongo && LogAnalysisModel) {
      try {
        const mongoDoc = new LogAnalysisModel(record);
        const saved = await mongoDoc.save();
        return saved.toObject();
      } catch (err) {
        console.error('Mongo save failed, falling back to local save', err);
      }
    }

    // JSON Fallback
    const data = readJsonDB();
    record.id = Date.now().toString();
    data.analyses.push(record);
    writeJsonDB(data);
    return record;
  },

  updateAIAnalysis: async (id, aiAnalysis) => {
    if (useMongo && LogAnalysisModel) {
      try {
        let updated;
        if (mongoose.Types.ObjectId.isValid(id)) {
          updated = await LogAnalysisModel.findByIdAndUpdate(id, { aiAnalysis, status: 'analyzed' }, { new: true });
        } else {
          updated = await LogAnalysisModel.findOneAndUpdate({ filename: id }, { aiAnalysis, status: 'analyzed' }, { new: true });
        }
        if (updated) return updated.toObject();
      } catch (err) {
        console.error('Mongo update AI failed', err);
      }
    }

    // JSON Fallback
    const data = readJsonDB();
    const index = data.analyses.findIndex(a => a.id === id || a.filename === id || (a._id && a._id.toString() === id));
    if (index !== -1) {
      data.analyses[index].aiAnalysis = aiAnalysis;
      data.analyses[index].status = 'analyzed';
      writeJsonDB(data);
      return data.analyses[index];
    }
    return null;
  },

  getLatestAnalysis: async (userId = null) => {
    const uIdStr = userId ? userId.toString() : null;
    if (useMongo && LogAnalysisModel) {
      try {
        const latest = await LogAnalysisModel.findOne({ userId: uIdStr }).sort({ uploadDate: -1 });
        if (latest) return latest.toObject();
      } catch (err) {
        console.error('Mongo get latest failed', err);
      }
    }

    // JSON Fallback
    const data = readJsonDB();
    const filtered = data.analyses.filter(a => a.userId === uIdStr);
    if (filtered.length > 0) {
      return filtered[filtered.length - 1];
    }
    return null;
  },

  getAnalysisById: async (id, userId = null) => {
    const uIdStr = userId ? userId.toString() : null;
    if (useMongo && LogAnalysisModel) {
      try {
        if (mongoose.Types.ObjectId.isValid(id)) {
          const doc = await LogAnalysisModel.findById(id);
          if (doc && doc.userId === uIdStr) return doc.toObject();
        }
      } catch (err) {
        console.error('Mongo get by ID failed', err);
      }
    }

    // JSON Fallback
    const data = readJsonDB();
    return data.analyses.find(a => (a.id === id || (a._id && a._id.toString() === id)) && a.userId === uIdStr) || null;
  },

  getAllAnalysesMetadata: async (userId = null) => {
    const uIdStr = userId ? userId.toString() : null;
    if (useMongo && LogAnalysisModel) {
      try {
        const list = await LogAnalysisModel.find({ userId: uIdStr }, 'filename uploadDate fileSize status stats.healthScore').sort({ uploadDate: -1 });
        return list.map(doc => {
          const obj = doc.toObject();
          return {
            id: obj._id ? obj._id.toString() : obj.id,
            filename: obj.filename,
            fileSize: obj.fileSize || 0,
            status: obj.status || 'analyzed',
            uploadDate: obj.uploadDate,
            healthScore: obj.stats ? obj.stats.healthScore : null
          };
        });
      } catch (err) {
        console.error('Mongo get metadata list failed', err);
      }
    }

    // JSON Fallback
    const data = readJsonDB();
    return data.analyses
      .filter(a => a.userId === uIdStr)
      .map(a => ({
        id: a.id || (a._id ? a._id.toString() : ''),
        filename: a.filename,
        fileSize: a.fileSize || 0,
        status: a.status || 'analyzed',
        uploadDate: a.uploadDate,
        healthScore: a.stats ? a.stats.healthScore : null
      })).reverse();
  },

  saveChat: async (id, message, reply) => {
    const chatEntry = { message, reply, timestamp: new Date() };
    if (useMongo && LogAnalysisModel) {
      try {
        let updated;
        if (mongoose.Types.ObjectId.isValid(id)) {
          updated = await LogAnalysisModel.findByIdAndUpdate(
            id,
            { $push: { chats: chatEntry } },
            { new: true }
          );
        }
        if (updated) return updated.toObject();
      } catch (err) {
        console.error('Mongo save chat failed', err);
      }
    }

    // JSON Fallback
    const data = readJsonDB();
    const index = data.analyses.findIndex(a => a.id === id || (a._id && a._id.toString() === id));
    if (index !== -1) {
      if (!data.analyses[index].chats) {
        data.analyses[index].chats = [];
      }
      data.analyses[index].chats.push(chatEntry);
      writeJsonDB(data);
      return data.analyses[index];
    }
    return null;
  },

  deleteAnalysis: async (id, userId = null) => {
    const uIdStr = userId ? userId.toString() : null;
    if (useMongo && LogAnalysisModel) {
      try {
        if (mongoose.Types.ObjectId.isValid(id)) {
          const doc = await LogAnalysisModel.findById(id);
          if (doc && doc.userId === uIdStr) {
            await LogAnalysisModel.findByIdAndDelete(id);
            return true;
          }
        }
      } catch (err) {
        console.error('Mongo delete analysis failed', err);
      }
    }

    // JSON Fallback
    const data = readJsonDB();
    const beforeCount = data.analyses.length;
    data.analyses = data.analyses.filter(a => !((a.id === id || (a._id && a._id.toString() === id)) && a.userId === uIdStr));
    if (data.analyses.length !== beforeCount) {
      writeJsonDB(data);
      return true;
    }
    return false;
  },

  renameAnalysis: async (id, filename, userId = null) => {
    const uIdStr = userId ? userId.toString() : null;
    if (useMongo && LogAnalysisModel) {
      try {
        if (mongoose.Types.ObjectId.isValid(id)) {
          const doc = await LogAnalysisModel.findById(id);
          if (doc && doc.userId === uIdStr) {
            doc.filename = filename;
            await doc.save();
            return doc.toObject();
          }
        }
      } catch (err) {
        console.error('Mongo rename analysis failed', err);
      }
    }

    // JSON Fallback
    const data = readJsonDB();
    const index = data.analyses.findIndex(a => (a.id === id || (a._id && a._id.toString() === id)) && a.userId === uIdStr);
    if (index !== -1) {
      data.analyses[index].filename = filename;
      writeJsonDB(data);
      return data.analyses[index];
    }
    return null;
  },

  createUser: async (name, email, passwordHash) => {
    const record = {
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      profilePicture: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
      createdAt: new Date(),
      accountType: 'Developer'
    };

    if (useMongo && UserModel) {
      try {
        const doc = new UserModel(record);
        const saved = await doc.save();
        return saved.toObject();
      } catch (err) {
        console.error('Mongo createUser failed', err);
      }
    }

    const data = readJsonDB();
    record.id = Date.now().toString();
    data.users.push(record);
    writeJsonDB(data);
    return record;
  },

  findUserByEmail: async (email) => {
    const normalizedEmail = email.toLowerCase().trim();
    if (useMongo && UserModel) {
      try {
        const doc = await UserModel.findOne({ email: normalizedEmail });
        if (doc) return doc.toObject();
      } catch (err) {
        console.error('Mongo findUserByEmail failed', err);
      }
    }

    const data = readJsonDB();
    return data.users.find(u => u.email === normalizedEmail) || null;
  },

  findUserById: async (id) => {
    if (useMongo && UserModel) {
      try {
        if (mongoose.Types.ObjectId.isValid(id)) {
          const doc = await UserModel.findById(id);
          if (doc) return doc.toObject();
        }
      } catch (err) {
        console.error('Mongo findUserById failed', err);
      }
    }

    const data = readJsonDB();
    return data.users.find(u => u.id === id || (u._id && u._id.toString() === id)) || null;
  },

  updateUserProfile: async (id, profileData) => {
    if (useMongo && UserModel) {
      try {
        let updated;
        if (mongoose.Types.ObjectId.isValid(id)) {
          updated = await UserModel.findByIdAndUpdate(id, { $set: profileData }, { new: true });
        }
        if (updated) return updated.toObject();
      } catch (err) {
        console.error('Mongo updateUserProfile failed', err);
      }
    }

    const data = readJsonDB();
    const index = data.users.findIndex(u => u.id === id || (u._id && u._id.toString() === id));
    if (index !== -1) {
      data.users[index] = { ...data.users[index], ...profileData };
      writeJsonDB(data);
      return data.users[index];
    }
    return null;
  }
};

module.exports = db;
