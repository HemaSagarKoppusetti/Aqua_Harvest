import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/pages/register_page.dart';
import '../../features/home/presentation/pages/home_page.dart';
import '../../features/assessment/presentation/pages/assessment_form_page.dart';
import '../../features/assessment/presentation/pages/assessment_result_page.dart';
import '../../features/assessment/presentation/pages/assessment_history_page.dart';
import '../../features/profile/presentation/pages/profile_page.dart';
import '../../features/onboarding/presentation/pages/onboarding_page.dart';
import '../../features/onboarding/presentation/pages/splash_page.dart';
import '../../shared/presentation/pages/main_navigation_page.dart';

/// App route names
class AppRoutes {
  static const String splash = '/';
  static const String onboarding = '/onboarding';
  static const String login = '/login';
  static const String register = '/register';
  static const String main = '/main';
  static const String home = '/main/home';
  static const String assessment = '/main/assessment';
  static const String assessmentForm = '/main/assessment/form';
  static const String assessmentResult = '/main/assessment/result';
  static const String assessmentHistory = '/main/assessment/history';
  static const String profile = '/main/profile';
  static const String settings = '/main/settings';
}

/// GoRouter provider
final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: AppRoutes.splash,
    debugLogDiagnostics: true,
    routes: [
      // Splash Route
      GoRoute(
        path: AppRoutes.splash,
        name: 'splash',
        builder: (context, state) => const SplashPage(),
      ),
      
      // Onboarding Route
      GoRoute(
        path: AppRoutes.onboarding,
        name: 'onboarding',
        builder: (context, state) => const OnboardingPage(),
      ),
      
      // Authentication Routes
      GoRoute(
        path: AppRoutes.login,
        name: 'login',
        builder: (context, state) => const LoginPage(),
      ),
      
      GoRoute(
        path: AppRoutes.register,
        name: 'register',
        builder: (context, state) => const RegisterPage(),
      ),
      
      // Main Navigation Shell
      ShellRoute(
        builder: (context, state, child) {
          return MainNavigationPage(child: child);
        },
        routes: [
          // Home Route
          GoRoute(
            path: AppRoutes.home,
            name: 'home',
            builder: (context, state) => const HomePage(),
          ),
          
          // Assessment Routes
          GoRoute(
            path: AppRoutes.assessment,
            name: 'assessment',
            builder: (context, state) => const AssessmentFormPage(),
            routes: [
              GoRoute(
                path: '/form',
                name: 'assessment-form',
                builder: (context, state) => const AssessmentFormPage(),
              ),
              GoRoute(
                path: '/result/:assessmentId',
                name: 'assessment-result',
                builder: (context, state) {
                  final assessmentId = state.pathParameters['assessmentId']!;
                  return AssessmentResultPage(assessmentId: assessmentId);
                },
              ),
              GoRoute(
                path: '/history',
                name: 'assessment-history',
                builder: (context, state) => const AssessmentHistoryPage(),
              ),
            ],
          ),
          
          // Profile Route
          GoRoute(
            path: AppRoutes.profile,
            name: 'profile',
            builder: (context, state) => const ProfilePage(),
          ),
        ],
      ),
    ],
    
    // Error handler
    errorBuilder: (context, state) => _ErrorPage(error: state.error),
    
    // Redirect logic
    redirect: (context, state) {
      // Add authentication and onboarding checks here
      // For now, allow all routes
      return null;
    },
  );
});

/// Error page widget
class _ErrorPage extends StatelessWidget {
  const _ErrorPage({required this.error});
  
  final Exception? error;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Page Not Found'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.red,
            ),
            const SizedBox(height: 16),
            Text(
              'Oops! Something went wrong',
              style: Theme.of(context).textTheme.headlineSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              error?.toString() ?? 'Page not found',
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => context.go(AppRoutes.home),
              child: const Text('Go Home'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Router extension for easy navigation
extension AppRouterExtension on BuildContext {
  /// Navigate to home
  void goHome() => go(AppRoutes.home);
  
  /// Navigate to assessment form
  void goToAssessmentForm() => go(AppRoutes.assessmentForm);
  
  /// Navigate to assessment result
  void goToAssessmentResult(String assessmentId) {
    go('${AppRoutes.assessment}/result/$assessmentId');
  }
  
  /// Navigate to assessment history
  void goToAssessmentHistory() => go(AppRoutes.assessmentHistory);
  
  /// Navigate to profile
  void goToProfile() => go(AppRoutes.profile);
  
  /// Navigate to login
  void goToLogin() => go(AppRoutes.login);
  
  /// Navigate to register
  void goToRegister() => go(AppRoutes.register);
  
  /// Navigate to onboarding
  void goToOnboarding() => go(AppRoutes.onboarding);
}