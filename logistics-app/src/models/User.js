const { query, transaction } = require('../config/database');
const bcrypt = require('bcryptjs');

class UserModel {
  // Create new user (customer or driver)
  static async create({ name, phone, email, password, role }) {
    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (name, phone, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, phone, email, role, is_verified, created_at`,
      [name, phone, email || null, hashedPassword, role]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      `SELECT id, name, phone, email, role, is_verified, is_active, created_at
       FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByPhone(phone) {
    const result = await query(
      `SELECT * FROM users WHERE phone = $1`,
      [phone]
    );
    return result.rows[0] || null;
  }

  static async findByEmail(email) {
    const result = await query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );
    return result.rows[0] || null;
  }

  static async updateProfile(userId, { name, email }) {
    const result = await query(
      `UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email),
       updated_at = NOW()
       WHERE id = $3
       RETURNING id, name, phone, email, role, is_verified`,
      [name, email, userId]
    );
    return result.rows[0];
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updatePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [hashedPassword, userId]
    );
  }

  static async setVerified(userId) {
    await query(
      `UPDATE users SET is_verified = true, updated_at = NOW() WHERE id = $1`,
      [userId]
    );
  }

  static async deactivate(userId) {
    await query(
      `UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`,
      [userId]
    );
  }

  static async saveRefreshToken(userId, token, expiresAt) {
    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3, created_at = NOW()`,
      [userId, token, expiresAt]
    );
  }

  static async findRefreshToken(token) {
    const result = await query(
      `SELECT rt.*, u.id as user_id, u.role, u.is_active
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token = $1 AND rt.expires_at > NOW()`,
      [token]
    );
    return result.rows[0] || null;
  }

  static async deleteRefreshToken(userId) {
    await query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId]);
  }
}

module.exports = UserModel;
