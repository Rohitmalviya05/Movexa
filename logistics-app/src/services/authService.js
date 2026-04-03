const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role, phone: user.phone },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
};

const getTokenExpiry = (expiresIn) => {
  const units = { d: 86400, h: 3600, m: 60, s: 1 };
  const match = expiresIn.match(/^(\d+)([dhms])$/);
  if (!match) return 7 * 86400; // default 7 days
  return parseInt(match[1]) * units[match[2]];
};

const signup = async ({ name, phone, email, password, role }) => {
  // Validate role
  if (!['customer', 'driver'].includes(role)) {
    throw { status: 400, message: 'Role must be customer or driver' };
  }

  // Check duplicate phone
  const existing = await UserModel.findByPhone(phone);
  if (existing) {
    throw { status: 409, message: 'Phone number already registered' };
  }

  if (email) {
    const existingEmail = await UserModel.findByEmail(email);
    if (existingEmail) {
      throw { status: 409, message: 'Email already registered' };
    }
  }

  const user = await UserModel.create({ name, phone, email, password, role });
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user.id);

  const refreshExpiry = new Date();
  refreshExpiry.setSeconds(
    refreshExpiry.getSeconds() + getTokenExpiry(process.env.JWT_REFRESH_EXPIRES_IN || '30d')
  );
  await UserModel.saveRefreshToken(user.id, refreshToken, refreshExpiry);

  return { user, accessToken, refreshToken };
};

const login = async ({ phone, password }) => {
  const user = await UserModel.findByPhone(phone);
  if (!user) throw { status: 401, message: 'Invalid phone number or password' };
  if (!user.is_active) throw { status: 403, message: 'Account has been deactivated' };

  const isValid = await UserModel.verifyPassword(password, user.password_hash);
  if (!isValid) throw { status: 401, message: 'Invalid phone number or password' };

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user.id);

  const refreshExpiry = new Date();
  refreshExpiry.setSeconds(
    refreshExpiry.getSeconds() + getTokenExpiry(process.env.JWT_REFRESH_EXPIRES_IN || '30d')
  );
  await UserModel.saveRefreshToken(user.id, refreshToken, refreshExpiry);

  const { password_hash, ...safeUser } = user;
  return { user: safeUser, accessToken, refreshToken };
};

const refreshAccessToken = async (refreshToken) => {
  const stored = await UserModel.findRefreshToken(refreshToken);
  if (!stored) throw { status: 401, message: 'Invalid or expired refresh token' };
  if (!stored.is_active) throw { status: 403, message: 'Account deactivated' };

  const user = { id: stored.user_id, role: stored.role };
  const newAccessToken = generateAccessToken(user);
  return { accessToken: newAccessToken };
};

module.exports = { signup, login, refreshAccessToken, generateAccessToken, getTokenExpiry };
