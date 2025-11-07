//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//
// @dart=2.18

// ignore_for_file: unused_element, unused_import
// ignore_for_file: always_put_required_named_parameters_first
// ignore_for_file: constant_identifier_names
// ignore_for_file: lines_longer_than_80_chars

part of openapi.api;

class MaintenanceRestoreBackupResponseDto {
  /// Returns a new [MaintenanceRestoreBackupResponseDto] instance.
  MaintenanceRestoreBackupResponseDto({
    this.error,
    required this.success,
  });

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  String? error;

  bool success;

  @override
  bool operator ==(Object other) => identical(this, other) || other is MaintenanceRestoreBackupResponseDto &&
    other.error == error &&
    other.success == success;

  @override
  int get hashCode =>
    // ignore: unnecessary_parenthesis
    (error == null ? 0 : error!.hashCode) +
    (success.hashCode);

  @override
  String toString() => 'MaintenanceRestoreBackupResponseDto[error=$error, success=$success]';

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};
    if (this.error != null) {
      json[r'error'] = this.error;
    } else {
    //  json[r'error'] = null;
    }
      json[r'success'] = this.success;
    return json;
  }

  /// Returns a new [MaintenanceRestoreBackupResponseDto] instance and imports its values from
  /// [value] if it's a [Map], null otherwise.
  // ignore: prefer_constructors_over_static_methods
  static MaintenanceRestoreBackupResponseDto? fromJson(dynamic value) {
    upgradeDto(value, "MaintenanceRestoreBackupResponseDto");
    if (value is Map) {
      final json = value.cast<String, dynamic>();

      return MaintenanceRestoreBackupResponseDto(
        error: mapValueOfType<String>(json, r'error'),
        success: mapValueOfType<bool>(json, r'success')!,
      );
    }
    return null;
  }

  static List<MaintenanceRestoreBackupResponseDto> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <MaintenanceRestoreBackupResponseDto>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = MaintenanceRestoreBackupResponseDto.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }

  static Map<String, MaintenanceRestoreBackupResponseDto> mapFromJson(dynamic json) {
    final map = <String, MaintenanceRestoreBackupResponseDto>{};
    if (json is Map && json.isNotEmpty) {
      json = json.cast<String, dynamic>(); // ignore: parameter_assignments
      for (final entry in json.entries) {
        final value = MaintenanceRestoreBackupResponseDto.fromJson(entry.value);
        if (value != null) {
          map[entry.key] = value;
        }
      }
    }
    return map;
  }

  // maps a json object with a list of MaintenanceRestoreBackupResponseDto-objects as value to a dart map
  static Map<String, List<MaintenanceRestoreBackupResponseDto>> mapListFromJson(dynamic json, {bool growable = false,}) {
    final map = <String, List<MaintenanceRestoreBackupResponseDto>>{};
    if (json is Map && json.isNotEmpty) {
      // ignore: parameter_assignments
      json = json.cast<String, dynamic>();
      for (final entry in json.entries) {
        map[entry.key] = MaintenanceRestoreBackupResponseDto.listFromJson(entry.value, growable: growable,);
      }
    }
    return map;
  }

  /// The list of required keys that must be present in a JSON.
  static const requiredKeys = <String>{
    'success',
  };
}

