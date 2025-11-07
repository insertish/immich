//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//
// @dart=2.18

// ignore_for_file: unused_element, unused_import
// ignore_for_file: always_put_required_named_parameters_first
// ignore_for_file: constant_identifier_names
// ignore_for_file: lines_longer_than_80_chars

part of openapi.api;

class MaintenanceRestoreBackupDto {
  /// Returns a new [MaintenanceRestoreBackupDto] instance.
  MaintenanceRestoreBackupDto({
    required this.backup,
  });

  String backup;

  @override
  bool operator ==(Object other) => identical(this, other) || other is MaintenanceRestoreBackupDto &&
    other.backup == backup;

  @override
  int get hashCode =>
    // ignore: unnecessary_parenthesis
    (backup.hashCode);

  @override
  String toString() => 'MaintenanceRestoreBackupDto[backup=$backup]';

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};
      json[r'backup'] = this.backup;
    return json;
  }

  /// Returns a new [MaintenanceRestoreBackupDto] instance and imports its values from
  /// [value] if it's a [Map], null otherwise.
  // ignore: prefer_constructors_over_static_methods
  static MaintenanceRestoreBackupDto? fromJson(dynamic value) {
    upgradeDto(value, "MaintenanceRestoreBackupDto");
    if (value is Map) {
      final json = value.cast<String, dynamic>();

      return MaintenanceRestoreBackupDto(
        backup: mapValueOfType<String>(json, r'backup')!,
      );
    }
    return null;
  }

  static List<MaintenanceRestoreBackupDto> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <MaintenanceRestoreBackupDto>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = MaintenanceRestoreBackupDto.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }

  static Map<String, MaintenanceRestoreBackupDto> mapFromJson(dynamic json) {
    final map = <String, MaintenanceRestoreBackupDto>{};
    if (json is Map && json.isNotEmpty) {
      json = json.cast<String, dynamic>(); // ignore: parameter_assignments
      for (final entry in json.entries) {
        final value = MaintenanceRestoreBackupDto.fromJson(entry.value);
        if (value != null) {
          map[entry.key] = value;
        }
      }
    }
    return map;
  }

  // maps a json object with a list of MaintenanceRestoreBackupDto-objects as value to a dart map
  static Map<String, List<MaintenanceRestoreBackupDto>> mapListFromJson(dynamic json, {bool growable = false,}) {
    final map = <String, List<MaintenanceRestoreBackupDto>>{};
    if (json is Map && json.isNotEmpty) {
      // ignore: parameter_assignments
      json = json.cast<String, dynamic>();
      for (final entry in json.entries) {
        map[entry.key] = MaintenanceRestoreBackupDto.listFromJson(entry.value, growable: growable,);
      }
    }
    return map;
  }

  /// The list of required keys that must be present in a JSON.
  static const requiredKeys = <String>{
    'backup',
  };
}

