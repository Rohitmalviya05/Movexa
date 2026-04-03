const authService = require('../services/authService');
const UserModel = require('../models/User');
const { cache } = require('../config/redis');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

const signup = async (req, res, next) => {
  try {
    const { name, phone, email, password, role } = req.body;
    const result = await authService.signup({ name, phone, email, password, role });
    return successResponse(res, result, 'Account created successfully', 201);
  } catch (err) {
    if (err.status) return errorResponse(res, err.message, err.status);
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    const result = await authService.login({ phone, password });
    return successResponse(res, result, 'Login successful');
  } catch (err) {
    if (err.status) return errorResponse(res, err.message, err.status);
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return errorResponse(res, 'Refresh token required', 400);
    const result = await authService.refreshAccessToken(refreshToken);
    return successResponse(res, result, 'Token refreshed');
  } catch (err) {
    if (err.status) return errorResponse(res, err.message, err.status);
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const token = req.token;
    const userId = req.user.id;

    // Blacklist current access token (approximate TTL from JWT)
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(token);
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) await cache.blacklistToken(token, ttl);

    // Delete refresh token
    await UserModel.deleteRefreshToken(userId);

    return successResponse(res, {}, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user.id);
    if (!user) return errorResponse(res, 'User not found', 404);
    return successResponse(res, { user });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const updated = await UserModel.updateProfile(req.user.id, { name, email });
    return successResponse(res, { user: updated }, 'Profile updated');
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await UserModel.findByPhone(req.user.phone);
    const isValid = await UserModel.verifyPassword(currentPassword, user.password_hash);
    if (!isValid) return errorResponse(res, 'Current password is incorrect', 400);
    await UserModel.updatePassword(req.user.id, newPassword);
    return successResponse(res, {}, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { signup, login, refresh, logout, getMe, updateProfile, changePassword };
