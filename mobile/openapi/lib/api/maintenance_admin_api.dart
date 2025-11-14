//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//
// @dart=2.18

// ignore_for_file: unused_element, unused_import
// ignore_for_file: always_put_required_named_parameters_first
// ignore_for_file: constant_identifier_names
// ignore_for_file: lines_longer_than_80_chars

part of openapi.api;


class MaintenanceAdminApi {
  MaintenanceAdminApi([ApiClient? apiClient]) : apiClient = apiClient ?? defaultApiClient;

  final ApiClient apiClient;

  /// Performs an HTTP 'DELETE /admin/maintenance/backups/{filename}' operation and returns the [Response].
  /// Parameters:
  ///
  /// * [String] filename (required):
  Future<Response> deleteBackupWithHttpInfo(String filename,) async {
    // ignore: prefer_const_declarations
    final apiPath = r'/admin/maintenance/backups/{filename}'
      .replaceAll('{filename}', filename);

    // ignore: prefer_final_locals
    Object? postBody;

    final queryParams = <QueryParam>[];
    final headerParams = <String, String>{};
    final formParams = <String, String>{};

    const contentTypes = <String>[];


    return apiClient.invokeAPI(
      apiPath,
      'DELETE',
      queryParams,
      postBody,
      headerParams,
      formParams,
      contentTypes.isEmpty ? null : contentTypes.first,
    );
  }

  /// Parameters:
  ///
  /// * [String] filename (required):
  Future<void> deleteBackup(String filename,) async {
    final response = await deleteBackupWithHttpInfo(filename,);
    if (response.statusCode >= HttpStatus.badRequest) {
      throw ApiException(response.statusCode, await _decodeBodyBytes(response));
    }
  }

  /// Performs an HTTP 'GET /admin/maintenance/backups/list' operation and returns the [Response].
  Future<Response> listBackupsWithHttpInfo() async {
    // ignore: prefer_const_declarations
    final apiPath = r'/admin/maintenance/backups/list';

    // ignore: prefer_final_locals
    Object? postBody;

    final queryParams = <QueryParam>[];
    final headerParams = <String, String>{};
    final formParams = <String, String>{};

    const contentTypes = <String>[];


    return apiClient.invokeAPI(
      apiPath,
      'GET',
      queryParams,
      postBody,
      headerParams,
      formParams,
      contentTypes.isEmpty ? null : contentTypes.first,
    );
  }

  Future<MaintenanceListBackupsResponseDto?> listBackups() async {
    final response = await listBackupsWithHttpInfo();
    if (response.statusCode >= HttpStatus.badRequest) {
      throw ApiException(response.statusCode, await _decodeBodyBytes(response));
    }
    // When a remote server returns no body with a status of 204, we shall not decode it.
    // At the time of writing this, `dart:convert` will throw an "Unexpected end of input"
    // FormatException when trying to decode an empty string.
    if (response.body.isNotEmpty && response.statusCode != HttpStatus.noContent) {
      return await apiClient.deserializeAsync(await _decodeBodyBytes(response), 'MaintenanceListBackupsResponseDto',) as MaintenanceListBackupsResponseDto;
    
    }
    return null;
  }

  /// Log into maintenance mode
  ///
  /// Login with maintenance token or cookie to receive current information and perform further actions.
  ///
  /// Note: This method returns the HTTP [Response].
  ///
  /// Parameters:
  ///
  /// * [MaintenanceLoginDto] maintenanceLoginDto (required):
  Future<Response> maintenanceLoginWithHttpInfo(MaintenanceLoginDto maintenanceLoginDto,) async {
    // ignore: prefer_const_declarations
    final apiPath = r'/admin/maintenance/login';

    // ignore: prefer_final_locals
    Object? postBody = maintenanceLoginDto;

    final queryParams = <QueryParam>[];
    final headerParams = <String, String>{};
    final formParams = <String, String>{};

    const contentTypes = <String>['application/json'];


    return apiClient.invokeAPI(
      apiPath,
      'POST',
      queryParams,
      postBody,
      headerParams,
      formParams,
      contentTypes.isEmpty ? null : contentTypes.first,
    );
  }

  /// Log into maintenance mode
  ///
  /// Login with maintenance token or cookie to receive current information and perform further actions.
  ///
  /// Parameters:
  ///
  /// * [MaintenanceLoginDto] maintenanceLoginDto (required):
  Future<MaintenanceAuthDto?> maintenanceLogin(MaintenanceLoginDto maintenanceLoginDto,) async {
    final response = await maintenanceLoginWithHttpInfo(maintenanceLoginDto,);
    if (response.statusCode >= HttpStatus.badRequest) {
      throw ApiException(response.statusCode, await _decodeBodyBytes(response));
    }
    // When a remote server returns no body with a status of 204, we shall not decode it.
    // At the time of writing this, `dart:convert` will throw an "Unexpected end of input"
    // FormatException when trying to decode an empty string.
    if (response.body.isNotEmpty && response.statusCode != HttpStatus.noContent) {
      return await apiClient.deserializeAsync(await _decodeBodyBytes(response), 'MaintenanceAuthDto',) as MaintenanceAuthDto;
    
    }
    return null;
  }

  /// Performs an HTTP 'GET /admin/maintenance/status' operation and returns the [Response].
  Future<Response> maintenanceStatusWithHttpInfo() async {
    // ignore: prefer_const_declarations
    final apiPath = r'/admin/maintenance/status';

    // ignore: prefer_final_locals
    Object? postBody;

    final queryParams = <QueryParam>[];
    final headerParams = <String, String>{};
    final formParams = <String, String>{};

    const contentTypes = <String>[];


    return apiClient.invokeAPI(
      apiPath,
      'GET',
      queryParams,
      postBody,
      headerParams,
      formParams,
      contentTypes.isEmpty ? null : contentTypes.first,
    );
  }

  Future<MaintenanceStatusResponseDto?> maintenanceStatus() async {
    final response = await maintenanceStatusWithHttpInfo();
    if (response.statusCode >= HttpStatus.badRequest) {
      throw ApiException(response.statusCode, await _decodeBodyBytes(response));
    }
    // When a remote server returns no body with a status of 204, we shall not decode it.
    // At the time of writing this, `dart:convert` will throw an "Unexpected end of input"
    // FormatException when trying to decode an empty string.
    if (response.body.isNotEmpty && response.statusCode != HttpStatus.noContent) {
      return await apiClient.deserializeAsync(await _decodeBodyBytes(response), 'MaintenanceStatusResponseDto',) as MaintenanceStatusResponseDto;
    
    }
    return null;
  }

  /// Performs an HTTP 'POST /admin/maintenance/backups/restore' operation and returns the [Response].
  /// Parameters:
  ///
  /// * [MaintenanceRestoreBackupDto] maintenanceRestoreBackupDto (required):
  Future<Response> restoreBackupWithHttpInfo(MaintenanceRestoreBackupDto maintenanceRestoreBackupDto,) async {
    // ignore: prefer_const_declarations
    final apiPath = r'/admin/maintenance/backups/restore';

    // ignore: prefer_final_locals
    Object? postBody = maintenanceRestoreBackupDto;

    final queryParams = <QueryParam>[];
    final headerParams = <String, String>{};
    final formParams = <String, String>{};

    const contentTypes = <String>['application/json'];


    return apiClient.invokeAPI(
      apiPath,
      'POST',
      queryParams,
      postBody,
      headerParams,
      formParams,
      contentTypes.isEmpty ? null : contentTypes.first,
    );
  }

  /// Parameters:
  ///
  /// * [MaintenanceRestoreBackupDto] maintenanceRestoreBackupDto (required):
  Future<void> restoreBackup(MaintenanceRestoreBackupDto maintenanceRestoreBackupDto,) async {
    final response = await restoreBackupWithHttpInfo(maintenanceRestoreBackupDto,);
    if (response.statusCode >= HttpStatus.badRequest) {
      throw ApiException(response.statusCode, await _decodeBodyBytes(response));
    }
  }

  /// Set maintenance mode
  ///
  /// Put Immich into or take it out of maintenance mode
  ///
  /// Note: This method returns the HTTP [Response].
  ///
  /// Parameters:
  ///
  /// * [SetMaintenanceModeDto] setMaintenanceModeDto (required):
  Future<Response> setMaintenanceModeWithHttpInfo(SetMaintenanceModeDto setMaintenanceModeDto,) async {
    // ignore: prefer_const_declarations
    final apiPath = r'/admin/maintenance';

    // ignore: prefer_final_locals
    Object? postBody = setMaintenanceModeDto;

    final queryParams = <QueryParam>[];
    final headerParams = <String, String>{};
    final formParams = <String, String>{};

    const contentTypes = <String>['application/json'];


    return apiClient.invokeAPI(
      apiPath,
      'POST',
      queryParams,
      postBody,
      headerParams,
      formParams,
      contentTypes.isEmpty ? null : contentTypes.first,
    );
  }

  /// Set maintenance mode
  ///
  /// Put Immich into or take it out of maintenance mode
  ///
  /// Parameters:
  ///
  /// * [SetMaintenanceModeDto] setMaintenanceModeDto (required):
  Future<void> setMaintenanceMode(SetMaintenanceModeDto setMaintenanceModeDto,) async {
    final response = await setMaintenanceModeWithHttpInfo(setMaintenanceModeDto,);
    if (response.statusCode >= HttpStatus.badRequest) {
      throw ApiException(response.statusCode, await _decodeBodyBytes(response));
    }
  }

  /// Performs an HTTP 'POST /admin/maintenance/start/restore' operation and returns the [Response].
  Future<Response> startRestoreFlowWithHttpInfo() async {
    // ignore: prefer_const_declarations
    final apiPath = r'/admin/maintenance/start/restore';

    // ignore: prefer_final_locals
    Object? postBody;

    final queryParams = <QueryParam>[];
    final headerParams = <String, String>{};
    final formParams = <String, String>{};

    const contentTypes = <String>[];


    return apiClient.invokeAPI(
      apiPath,
      'POST',
      queryParams,
      postBody,
      headerParams,
      formParams,
      contentTypes.isEmpty ? null : contentTypes.first,
    );
  }

  Future<void> startRestoreFlow() async {
    final response = await startRestoreFlowWithHttpInfo();
    if (response.statusCode >= HttpStatus.badRequest) {
      throw ApiException(response.statusCode, await _decodeBodyBytes(response));
    }
  }
}
