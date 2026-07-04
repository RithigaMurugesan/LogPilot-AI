const fs = require('fs');
const readline = require('readline');

// Common log level matching regex (INFO/DEBUG/WARNING/ERROR/FATAL/SUCCESS)
// Supports brackets like [INFO] or just plain INFO
const LOG_LINE_REGEX = /^(\S+)\s+\[?(INFO|DEBUG|WARNING|ERROR|FATAL|SUCCESS)\]?\s+([^:]+):\s+(.*)$/i;

async function parseLogFile(filePath) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const parsedLogs = [];
  let totalLogs = 0;
  let malformedCount = 0;
  let lineCount = 0;
  
  const levelCounts = {
    INFO: 0,
    DEBUG: 0,
    WARNING: 0,
    ERROR: 0,
    FATAL: 0,
    SUCCESS: 0
  };

  const moduleCounts = {};

  for await (const line of rl) {
    lineCount++;
    if (!line.trim()) continue;
    totalLogs++;

    const match = line.match(LOG_LINE_REGEX);
    if (!match) {
      malformedCount++;
      continue;
    }

    const [_, timestamp, levelInput, moduleRaw, message] = match;
    const level = levelInput.toUpperCase();
    const serviceModule = moduleRaw.trim();

    levelCounts[level] = (levelCounts[level] || 0) + 1;
    moduleCounts[serviceModule] = (moduleCounts[serviceModule] || 0) + 1;

    parsedLogs.push({
      lineNumber: lineCount,
      timestamp,
      level,
      module: serviceModule,
      message: message.trim()
    });
  }

  // Calculate rates
  const validLogsCount = parsedLogs.length;
  const errors = (levelCounts.ERROR || 0) + (levelCounts.FATAL || 0);
  const warnings = levelCounts.WARNING || 0;
  
  const errorRate = validLogsCount > 0 ? (errors / validLogsCount) * 100 : 0;
  const successRate = validLogsCount > 0 ? ((validLogsCount - errors) / validLogsCount) * 100 : 0;

  // Clamped health score calculation:
  // healthScore = 100 - (errorWeight * errors + warnWeight * warnings) / totalLogs * 100
  // Let's use errorWeight = 2.0, warnWeight = 0.5
  const errorWeight = 2.0;
  const warnWeight = 0.5;
  let healthScore = 100;
  if (validLogsCount > 0) {
    const penalty = ((errorWeight * errors + warnWeight * warnings) / validLogsCount) * 100;
    healthScore = Math.max(0, Math.min(100, 100 - penalty));
  }

  return {
    stats: {
      totalLogs: validLogsCount,
      malformedCount,
      levelCounts,
      errorRate: parseFloat(errorRate.toFixed(2)),
      successRate: parseFloat(successRate.toFixed(2)),
      healthScore: parseFloat(healthScore.toFixed(2)),
      moduleCounts
    },
    parsedLogs
  };
}

module.exports = {
  parseLogFile
};
