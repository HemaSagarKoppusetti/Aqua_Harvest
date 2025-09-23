import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config/app_config.dart';
import '../utils/logger.dart';

/// Storage service for managing local data persistence
class StorageService {
  static late SharedPreferences _prefs;
  static late FlutterSecureStorage _secureStorage;
  static late Box _hiveBox;

  static const String _hiveBoxName = 'aquaharvest_box';

  /// Initialize storage services
  static Future<void> init() async {
    try {
      // Initialize SharedPreferences
      _prefs = await SharedPreferences.getInstance();
      
      // Initialize Secure Storage
      _secureStorage = const FlutterSecureStorage(
        aOptions: AndroidOptions(
          encryptedSharedPreferences: true,
        ),
        iOptions: IOSOptions(
          accessibility: KeychainAccessibility.first_unlock_this_device,
        ),
      );
      
      // Initialize Hive box
      _hiveBox = await Hive.openBox(_hiveBoxName);
      
      AppLogger.info('Storage services initialized successfully');
    } catch (e) {
      AppLogger.error('Failed to initialize storage services', e);
      rethrow;
    }
  }

  // SharedPreferences methods (for non-sensitive data)
  
  /// Save string to SharedPreferences
  static Future<bool> setString(String key, String value) async {
    try {
      return await _prefs.setString(key, value);
    } catch (e) {
      AppLogger.error('Failed to save string to SharedPreferences', e);
      return false;
    }
  }

  /// Get string from SharedPreferences
  static String? getString(String key) {
    try {
      return _prefs.getString(key);
    } catch (e) {
      AppLogger.error('Failed to get string from SharedPreferences', e);
      return null;
    }
  }

  /// Save int to SharedPreferences
  static Future<bool> setInt(String key, int value) async {
    try {
      return await _prefs.setInt(key, value);
    } catch (e) {
      AppLogger.error('Failed to save int to SharedPreferences', e);
      return false;
    }
  }

  /// Get int from SharedPreferences
  static int? getInt(String key) {
    try {
      return _prefs.getInt(key);
    } catch (e) {
      AppLogger.error('Failed to get int from SharedPreferences', e);
      return null;
    }
  }

  /// Save bool to SharedPreferences
  static Future<bool> setBool(String key, bool value) async {
    try {
      return await _prefs.setBool(key, value);
    } catch (e) {
      AppLogger.error('Failed to save bool to SharedPreferences', e);
      return false;
    }
  }

  /// Get bool from SharedPreferences
  static bool getBool(String key, {bool defaultValue = false}) {
    try {
      return _prefs.getBool(key) ?? defaultValue;
    } catch (e) {
      AppLogger.error('Failed to get bool from SharedPreferences', e);
      return defaultValue;
    }
  }

  /// Remove key from SharedPreferences
  static Future<bool> remove(String key) async {
    try {
      return await _prefs.remove(key);
    } catch (e) {
      AppLogger.error('Failed to remove key from SharedPreferences', e);
      return false;
    }
  }

  /// Clear all SharedPreferences
  static Future<bool> clear() async {
    try {
      return await _prefs.clear();
    } catch (e) {
      AppLogger.error('Failed to clear SharedPreferences', e);
      return false;
    }
  }

  // Secure Storage methods (for sensitive data)

  /// Save secure string
  static Future<void> setSecureString(String key, String value) async {
    try {
      await _secureStorage.write(key: key, value: value);
    } catch (e) {
      AppLogger.error('Failed to save secure string', e);
      rethrow;
    }
  }

  /// Get secure string
  static Future<String?> getSecureString(String key) async {
    try {
      return await _secureStorage.read(key: key);
    } catch (e) {
      AppLogger.error('Failed to get secure string', e);
      return null;
    }
  }

  /// Remove secure key
  static Future<void> removeSecure(String key) async {
    try {
      await _secureStorage.delete(key: key);
    } catch (e) {
      AppLogger.error('Failed to remove secure key', e);
    }
  }

  /// Clear all secure storage
  static Future<void> clearSecure() async {
    try {
      await _secureStorage.deleteAll();
    } catch (e) {
      AppLogger.error('Failed to clear secure storage', e);
    }
  }

  // Hive methods (for complex objects)

  /// Save object to Hive
  static Future<void> setObject(String key, dynamic value) async {
    try {
      await _hiveBox.put(key, value);
    } catch (e) {
      AppLogger.error('Failed to save object to Hive', e);
      rethrow;
    }
  }

  /// Get object from Hive
  static T? getObject<T>(String key) {
    try {
      return _hiveBox.get(key) as T?;
    } catch (e) {
      AppLogger.error('Failed to get object from Hive', e);
      return null;
    }
  }

  /// Remove object from Hive
  static Future<void> removeObject(String key) async {
    try {
      await _hiveBox.delete(key);
    } catch (e) {
      AppLogger.error('Failed to remove object from Hive', e);
    }
  }

  /// Clear all Hive data
  static Future<void> clearHive() async {
    try {
      await _hiveBox.clear();
    } catch (e) {
      AppLogger.error('Failed to clear Hive data', e);
    }
  }

  // Convenience methods for app-specific data

  /// Save user token
  static Future<void> saveUserToken(String token) async {
    await setSecureString(AppConfig.userTokenKey, token);
  }

  /// Get user token
  static Future<String?> getUserToken() async {
    return await getSecureString(AppConfig.userTokenKey);
  }

  /// Clear user token
  static Future<void> clearUserToken() async {
    await removeSecure(AppConfig.userTokenKey);
  }

  /// Save user data
  static Future<void> saveUserData(Map<String, dynamic> userData) async {
    await setObject(AppConfig.userDataKey, userData);
  }

  /// Get user data
  static Map<String, dynamic>? getUserData() {
    return getObject<Map<String, dynamic>>(AppConfig.userDataKey);
  }

  /// Clear user data
  static Future<void> clearUserData() async {
    await removeObject(AppConfig.userDataKey);
  }

  /// Check if onboarding is completed
  static bool isOnboardingCompleted() {
    return getBool(AppConfig.onboardingCompletedKey);
  }

  /// Mark onboarding as completed
  static Future<void> setOnboardingCompleted() async {
    await setBool(AppConfig.onboardingCompletedKey, true);
  }

  /// Save assessment cache
  static Future<void> saveAssessmentCache(List<Map<String, dynamic>> assessments) async {
    try {
      final cacheData = {
        'assessments': assessments,
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      };
      await setObject(AppConfig.assessmentCacheKey, cacheData);
    } catch (e) {
      AppLogger.error('Failed to save assessment cache', e);
    }
  }

  /// Get assessment cache
  static List<Map<String, dynamic>>? getAssessmentCache() {
    try {
      final cacheData = getObject<Map<String, dynamic>>(AppConfig.assessmentCacheKey);
      if (cacheData == null) return null;

      final timestamp = cacheData['timestamp'] as int?;
      if (timestamp == null) return null;

      // Check if cache is still valid (24 hours)
      final cacheTime = DateTime.fromMillisecondsSinceEpoch(timestamp);
      if (DateTime.now().difference(cacheTime) > AppConfig.cacheTimeout) {
        removeObject(AppConfig.assessmentCacheKey);
        return null;
      }

      final assessments = cacheData['assessments'] as List?;
      return assessments?.cast<Map<String, dynamic>>();
    } catch (e) {
      AppLogger.error('Failed to get assessment cache', e);
      return null;
    }
  }

  /// Save app settings
  static Future<void> saveSettings(Map<String, dynamic> settings) async {
    await setObject(AppConfig.settingsKey, settings);
  }

  /// Get app settings
  static Map<String, dynamic> getSettings() {
    return getObject<Map<String, dynamic>>(AppConfig.settingsKey) ?? {};
  }

  /// Clear all app data (logout)
  static Future<void> clearAllAppData() async {
    try {
      await clearUserToken();
      await clearUserData();
      await removeObject(AppConfig.assessmentCacheKey);
      await remove(AppConfig.onboardingCompletedKey);
      AppLogger.info('All app data cleared');
    } catch (e) {
      AppLogger.error('Failed to clear all app data', e);
    }
  }

  /// Get storage size information
  static Future<Map<String, dynamic>> getStorageInfo() async {
    try {
      final hiveKeys = _hiveBox.keys.length;
      final prefsKeys = _prefs.getKeys().length;
      
      return {
        'hive_keys': hiveKeys,
        'preferences_keys': prefsKeys,
        'last_updated': DateTime.now().toIso8601String(),
      };
    } catch (e) {
      AppLogger.error('Failed to get storage info', e);
      return {};
    }
  }
}