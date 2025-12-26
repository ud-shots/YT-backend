import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Users } from '../models/users';
import { YouTubeCredential } from '../models/youtube_credential';
import { FacebookCredential } from '../models/facebook_credential';

export class CommonUtils {
  /**
   * Generate a random string of specified length
   */
  static generateRandomString(length: number = 10): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare a plain text password with a hashed password
   */
  static async comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): { status: boolean; message?: string } {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,40}$/;
    const result = regex.test(password);

    if (!result) {
      return { 
        status: false, 
        message: 'Password should contain one capital, one small letter, one special character, and it should have minimum 8 characters and maximum 40' 
      };
    }

    return { status: true };
  }

  /**
   * Generate a UUID
   */
  static generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Sanitize user input to prevent injection attacks
   */
  static sanitizeInput(input: string): string {
    // Remove potentially dangerous characters
    return input.replace(/[<>]/g, '');
  }

  /**
   * Check if a value is empty
   */
  static isEmpty(value: any): boolean {
    if (value === null || value === undefined) {
      return true;
    }
    if (typeof value === 'string' && value.trim() === '') {
      return true;
    }
    if (Array.isArray(value) && value.length === 0) {
      return true;
    }
    if (typeof value === 'object' && Object.keys(value).length === 0) {
      return true;
    }
    return false;
  }

  /**
   * Get user with credentials
   */
  static async getUserWithCredentials(userId: string) {
    const user = await Users.findByPk(userId, {
      include: [
        { model: YouTubeCredential, as: 'youtube_credential' },
        { model: FacebookCredential, as: 'facebook_credential' }
      ]
    });
    return user;
  }

  /**
   * Format API response
   */
  static formatResponse(success: boolean, statusCode: number, message: string, data: any = null) {
    if (success) {
      return {
        success: {
          status: true,
          statusCode,
          message
        },
        data,
        error: null
      };
    } else {
      return {
        success: null,
        data: null,
        error: {
          status: false,
          statusCode,
          message
        }
      };
    }
  }

  /**
   * Validate URL
   */
  static isValidUrl(string: string): boolean {
    try {
      const url = new URL(string);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
      return false;
    }
  }

  /**
   * Truncate text to specified length
   */
  static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}