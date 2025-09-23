/// App configuration constants
class AppConfig {
  static const String appName = 'AquaHarvest';
  static const String appVersion = '1.0.0';
  static const String appDescription = 'Rainwater Harvesting Assessment App';
  
  // API Configuration
  static const String baseApiUrl = 'http://localhost:3000'; // API Gateway
  static const String assessmentServiceUrl = 'http://localhost:3001';
  static const String mlServiceUrl = 'http://localhost:8000';
  static const String gisServiceUrl = 'http://localhost:3002';
  
  // GraphQL Configuration
  static const String graphqlEndpoint = '$baseApiUrl/graphql';
  
  // Storage Keys
  static const String userTokenKey = 'user_token';
  static const String userDataKey = 'user_data';
  static const String onboardingCompletedKey = 'onboarding_completed';
  static const String assessmentCacheKey = 'assessment_cache';
  static const String settingsKey = 'app_settings';
  
  // Cache Configuration
  static const Duration cacheTimeout = Duration(hours: 24);
  static const int maxCacheItems = 100;
  
  // Location Configuration
  static const double defaultLatitude = 28.7041; // New Delhi
  static const double defaultLongitude = 77.1025;
  static const double locationAccuracy = 100.0; // meters
  
  // Map Configuration
  static const double defaultZoom = 15.0;
  static const double maxZoom = 20.0;
  static const double minZoom = 5.0;
  
  // Assessment Configuration
  static const int maxAssessmentHistory = 50;
  static const Duration assessmentTimeout = Duration(minutes: 5);
  
  // UI Configuration
  static const Duration animationDuration = Duration(milliseconds: 300);
  static const Duration splashDuration = Duration(seconds: 2);
  
  // Validation Constants
  static const int minRoofArea = 10; // square meters
  static const int maxRoofArea = 10000; // square meters
  static const int minHouseholdSize = 1;
  static const int maxHouseholdSize = 50;
  
  // Regional Configuration for India
  static const Map<String, Map<String, dynamic>> indianRegions = {
    'north': {
      'name': 'North India',
      'states': ['Punjab', 'Haryana', 'Uttar Pradesh', 'Uttarakhand', 'Himachal Pradesh'],
      'avgRainfall': 650,
      'waterCost': 25,
    },
    'south': {
      'name': 'South India',
      'states': ['Tamil Nadu', 'Karnataka', 'Andhra Pradesh', 'Kerala', 'Telangana'],
      'avgRainfall': 920,
      'waterCost': 30,
    },
    'east': {
      'name': 'East India',
      'states': ['West Bengal', 'Odisha', 'Jharkhand', 'Bihar'],
      'avgRainfall': 1200,
      'waterCost': 20,
    },
    'west': {
      'name': 'West India',
      'states': ['Maharashtra', 'Gujarat', 'Rajasthan', 'Goa'],
      'avgRainfall': 550,
      'waterCost': 35,
    },
    'central': {
      'name': 'Central India',
      'states': ['Madhya Pradesh', 'Chhattisgarh'],
      'avgRainfall': 850,
      'waterCost': 28,
    },
  };
  
  // Building Types
  static const List<String> buildingTypes = [
    'residential',
    'commercial',
    'industrial',
    'institutional',
  ];
  
  // Roof Types
  static const List<String> roofTypes = [
    'concrete',
    'tile',
    'metal',
    'asbestos',
    'green',
  ];
  
  // Budget Ranges
  static const List<String> budgetRanges = [
    'low',
    'medium',
    'high',
  ];
  
  // Contact Information
  static const String supportEmail = 'support@aquaharvest.in';
  static const String websiteUrl = 'https://aquaharvest.in';
  static const String privacyPolicyUrl = 'https://aquaharvest.in/privacy';
  static const String termsOfServiceUrl = 'https://aquaharvest.in/terms';
  
  // Environment
  static bool get isProduction => const String.fromEnvironment('ENVIRONMENT') == 'production';
  static bool get isDevelopment => !isProduction;
}