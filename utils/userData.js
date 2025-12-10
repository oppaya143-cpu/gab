const fs = require('fs');
const path = require('path');
const DATA_PATH = path.resolve(__dirname, '../chatterData.json');

function readData() {
  try {
    if (!fs.existsSync(DATA_PATH)) fs.writeFileSync(DATA_PATH, '{}');
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch (e) {
    console.error('[userData] Read error:', e);
    return {};
  }
}

function writeData(newData) {
  try {
    const tempPath = DATA_PATH + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(newData, null, 2), 'utf8');
    fs.renameSync(tempPath, DATA_PATH);
  } catch (e) {
    console.error('[userData] Write error:', e);
  }
}

function getUser(userId) {
  const data = readData();
  return data[userId] || null;
}

function setUser(userId, userInfo) {
  const data = readData();
  data[userId] = userInfo;
  writeData(data);
}

function updateUser(userId, fields) {
  const data = readData();
  if (!data[userId]) data[userId] = {};
  Object.assign(data[userId], fields);
  writeData(data);
}

module.exports = { getUser, setUser, updateUser, readData, writeData };
