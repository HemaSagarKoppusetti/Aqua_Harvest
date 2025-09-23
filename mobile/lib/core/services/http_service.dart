import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/app_config.dart';
import '../utils/logger.dart';
import '../utils/storage_service.dart';

class HttpService {
  late final Dio _dio;
  final Logger _logger = Logger();
  final StorageService _storage = StorageService();

  HttpService() {
    _dio = Dio(BaseOptions(
      baseUrl: AppConfig.baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      sendTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    _setupInterceptors();
  }

  void _setupInterceptors() {
    // Request interceptor
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Add auth token if available
          final token = await _storage.getUserToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }

          _logger.info('API Request: ${options.method} ${options.uri}');
          _logger.debug('Request Headers: ${options.headers}');
          _logger.debug('Request Data: ${options.data}');

          handler.next(options);
        },
        onResponse: (response, handler) {
          _logger.info(
            'API Response: ${response.statusCode} ${response.requestOptions.uri}',
          );
          _logger.debug('Response Data: ${response.data}');

          handler.next(response);
        },
        onError: (error, handler) {
          _logger.error(
            'API Error: ${error.response?.statusCode} ${error.requestOptions.uri}',
            error: error,
            stackTrace: error.stackTrace,
          );

          // Handle common errors
          if (error.response?.statusCode == 401) {
            // Token expired, clear stored token
            _storage.clearUserToken();
          }

          handler.next(error);
        },
      ),
    );
  }

  // GET request
  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      final response = await _dio.get<T>(
        path,
        queryParameters: queryParameters,
        options: options,
      );
      return response;
    } catch (e) {
      _logger.error('GET request failed', error: e);
      rethrow;
    }
  }

  // POST request
  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      final response = await _dio.post<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
      return response;
    } catch (e) {
      _logger.error('POST request failed', error: e);
      rethrow;
    }
  }

  // PUT request
  Future<Response<T>> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      final response = await _dio.put<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
      return response;
    } catch (e) {
      _logger.error('PUT request failed', error: e);
      rethrow;
    }
  }

  // DELETE request
  Future<Response<T>> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      final response = await _dio.delete<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
      return response;
    } catch (e) {
      _logger.error('DELETE request failed', error: e);
      rethrow;
    }
  }

  // File upload
  Future<Response<T>> uploadFile<T>(
    String path,
    FormData formData, {
    Map<String, dynamic>? queryParameters,
    Options? options,
    ProgressCallback? onSendProgress,
  }) async {
    try {
      final response = await _dio.post<T>(
        path,
        data: formData,
        queryParameters: queryParameters,
        options: options,
        onSendProgress: onSendProgress,
      );
      return response;
    } catch (e) {
      _logger.error('File upload failed', error: e);
      rethrow;
    }
  }

  // File download
  Future<Response> downloadFile(
    String urlPath,
    String savePath, {
    Map<String, dynamic>? queryParameters,
    Options? options,
    ProgressCallback? onReceiveProgress,
  }) async {
    try {
      final response = await _dio.download(
        urlPath,
        savePath,
        queryParameters: queryParameters,
        options: options,
        onReceiveProgress: onReceiveProgress,
      );
      return response;
    } catch (e) {
      _logger.error('File download failed', error: e);
      rethrow;
    }
  }
}

// Provider for HttpService
final httpServiceProvider = Provider<HttpService>((ref) {
  return HttpService();
});

// Common API result wrapper
class ApiResult<T> {
  final bool success;
  final T? data;
  final String? message;
  final int? statusCode;
  final Map<String, dynamic>? errors;

  const ApiResult({
    required this.success,
    this.data,
    this.message,
    this.statusCode,
    this.errors,
  });

  factory ApiResult.success(T data, {String? message, int? statusCode}) {
    return ApiResult(
      success: true,
      data: data,
      message: message,
      statusCode: statusCode,
    );
  }

  factory ApiResult.error(
    String message, {
    int? statusCode,
    Map<String, dynamic>? errors,
  }) {
    return ApiResult(
      success: false,
      message: message,
      statusCode: statusCode,
      errors: errors,
    );
  }

  factory ApiResult.fromResponse(Response response) {
    final isSuccess = response.statusCode != null && 
        response.statusCode! >= 200 && 
        response.statusCode! < 300;

    if (isSuccess) {
      return ApiResult.success(
        response.data,
        statusCode: response.statusCode,
      );
    } else {
      return ApiResult.error(
        response.statusMessage ?? 'Unknown error',
        statusCode: response.statusCode,
      );
    }
  }

  factory ApiResult.fromDioError(DioException error) {
    String message = 'Network error';
    Map<String, dynamic>? errors;

    switch (error.type) {
      case DioExceptionType.connectionTimeout:
        message = 'Connection timeout';
        break;
      case DioExceptionType.sendTimeout:
        message = 'Request timeout';
        break;
      case DioExceptionType.receiveTimeout:
        message = 'Response timeout';
        break;
      case DioExceptionType.badCertificate:
        message = 'Certificate error';
        break;
      case DioExceptionType.badResponse:
        message = error.response?.data['message'] ?? 
                 error.response?.statusMessage ?? 
                 'Server error';
        errors = error.response?.data['errors'];
        break;
      case DioExceptionType.cancel:
        message = 'Request cancelled';
        break;
      case DioExceptionType.connectionError:
        message = 'Connection error';
        break;
      case DioExceptionType.unknown:
        message = 'Unknown network error';
        break;
    }

    return ApiResult.error(
      message,
      statusCode: error.response?.statusCode,
      errors: errors,
    );
  }
}