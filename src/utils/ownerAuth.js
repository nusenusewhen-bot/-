// src/utils/ownerAuth.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const AUTH_FILE = path.join(__dirname, '../../data/authorized.json');
const KEYS_FILE = path.join(__dirname, '../../data/used_keys.json');

// make sure folders exist
if (!fs.existsSync(path.dirname(AUTH_FILE))) fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
if (!fs.existsSync(path.dirname(KEYS_FILE))) fs.mkdirSync(path.dirname(KEYS_FILE), { recursive: true });

// load or init
let authorized = new Set();
let usedKeys = new Set();

if (fs.existsSync(AUTH_FILE)) {
  try {
    const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
    authorized = new Set(data);
  } catch {}
}
if (fs.existsSync(KEYS_FILE)) {
  try {
    const data = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
    usedKeys = new Set(data);
  } catch {}
}

function saveAuth() {
  fs.writeFileSync(AUTH_FILE, JSON.stringify([...authorized]), 'utf8');
}
function saveKeys() {
  fs.writeFileSync(KEYS_FILE, JSON.stringify([...usedKeys]), 'utf8');
}

function generateKey() {
  return crypto.randomBytes(16).toString('hex'); // 32 char nice key
}

function isOwnerAuthorized(userId) {
  return authorized.has(userId);
}

function redeemKey(key, userId) {
  if (usedKeys.has(key)) return { success: false, msg: 'that key already used' };
  usedKeys.add(key);
  authorized.add(userId);
  saveKeys();
  saveAuth();
  return { success: true, msg: 'access granted — secret commands unlocked' };
}

module.exports = {
  generateKey,
  isOwnerAuthorized,
  redeemKey,
  authorized // for debug if u want
};
