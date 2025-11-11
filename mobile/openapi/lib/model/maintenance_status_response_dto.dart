//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//
// @dart=2.18

// ignore_for_file: unused_element, unused_import
// ignore_for_file: always_put_required_named_parameters_first
// ignore_for_file: constant_identifier_names
// ignore_for_file: lines_longer_than_80_chars

part of openapi.api;

class MaintenanceStatusResponseDto {
  /// Returns a new [MaintenanceStatusResponseDto] instance.
  MaintenanceStatusResponseDto({
    this.error,
    this.operation,
    this.progress,
  });

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  String? error;

  MaintenanceStatusResponseDtoOperationEnum? operation;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  num? progress;

  @override
  bool operator ==(Object other) => identical(this, other) || other is MaintenanceStatusResponseDto &&
    other.error == error &&
    other.operation == operation &&
    other.progress == progress;

  @override
  int get hashCode =>
    // ignore: unnecessary_parenthesis
    (error == null ? 0 : error!.hashCode) +
    (operation == null ? 0 : operation!.hashCode) +
    (progress == null ? 0 : progress!.hashCode);

  @override
  String toString() => 'MaintenanceStatusResponseDto[error=$error, operation=$operation, progress=$progress]';

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};
    if (this.error != null) {
      json[r'error'] = this.error;
    } else {
    //  json[r'error'] = null;
    }
    if (this.operation != null) {
      json[r'operation'] = this.operation;
    } else {
    //  json[r'operation'] = null;
    }
    if (this.progress != null) {
      json[r'progress'] = this.progress;
    } else {
    //  json[r'progress'] = null;
    }
    return json;
  }

  /// Returns a new [MaintenanceStatusResponseDto] instance and imports its values from
  /// [value] if it's a [Map], null otherwise.
  // ignore: prefer_constructors_over_static_methods
  static MaintenanceStatusResponseDto? fromJson(dynamic value) {
    upgradeDto(value, "MaintenanceStatusResponseDto");
    if (value is Map) {
      final json = value.cast<String, dynamic>();

      return MaintenanceStatusResponseDto(
        error: mapValueOfType<String>(json, r'error'),
        operation: MaintenanceStatusResponseDtoOperationEnum.fromJson(json[r'operation']),
        progress: num.parse('${json[r'progress']}'),
      );
    }
    return null;
  }

  static List<MaintenanceStatusResponseDto> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <MaintenanceStatusResponseDto>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = MaintenanceStatusResponseDto.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }

  static Map<String, MaintenanceStatusResponseDto> mapFromJson(dynamic json) {
    final map = <String, MaintenanceStatusResponseDto>{};
    if (json is Map && json.isNotEmpty) {
      json = json.cast<String, dynamic>(); // ignore: parameter_assignments
      for (final entry in json.entries) {
        final value = MaintenanceStatusResponseDto.fromJson(entry.value);
        if (value != null) {
          map[entry.key] = value;
        }
      }
    }
    return map;
  }

  // maps a json object with a list of MaintenanceStatusResponseDto-objects as value to a dart map
  static Map<String, List<MaintenanceStatusResponseDto>> mapListFromJson(dynamic json, {bool growable = false,}) {
    final map = <String, List<MaintenanceStatusResponseDto>>{};
    if (json is Map && json.isNotEmpty) {
      // ignore: parameter_assignments
      json = json.cast<String, dynamic>();
      for (final entry in json.entries) {
        map[entry.key] = MaintenanceStatusResponseDto.listFromJson(entry.value, growable: growable,);
      }
    }
    return map;
  }

  /// The list of required keys that must be present in a JSON.
  static const requiredKeys = <String>{
  };
}


class MaintenanceStatusResponseDtoOperationEnum {
  /// Instantiate a new enum with the provided [value].
  const MaintenanceStatusResponseDtoOperationEnum._(this.value);

  /// The underlying value of this enum member.
  final String value;

  @override
  String toString() => value;

  String toJson() => value;

  static const restoreDatabase = MaintenanceStatusResponseDtoOperationEnum._(r'restore-database');

  /// List of all possible values in this [enum][MaintenanceStatusResponseDtoOperationEnum].
  static const values = <MaintenanceStatusResponseDtoOperationEnum>[
    restoreDatabase,
  ];

  static MaintenanceStatusResponseDtoOperationEnum? fromJson(dynamic value) => MaintenanceStatusResponseDtoOperationEnumTypeTransformer().decode(value);

  static List<MaintenanceStatusResponseDtoOperationEnum> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <MaintenanceStatusResponseDtoOperationEnum>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = MaintenanceStatusResponseDtoOperationEnum.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }
}

/// Transformation class that can [encode] an instance of [MaintenanceStatusResponseDtoOperationEnum] to String,
/// and [decode] dynamic data back to [MaintenanceStatusResponseDtoOperationEnum].
class MaintenanceStatusResponseDtoOperationEnumTypeTransformer {
  factory MaintenanceStatusResponseDtoOperationEnumTypeTransformer() => _instance ??= const MaintenanceStatusResponseDtoOperationEnumTypeTransformer._();

  const MaintenanceStatusResponseDtoOperationEnumTypeTransformer._();

  String encode(MaintenanceStatusResponseDtoOperationEnum data) => data.value;

  /// Decodes a [dynamic value][data] to a MaintenanceStatusResponseDtoOperationEnum.
  ///
  /// If [allowNull] is true and the [dynamic value][data] cannot be decoded successfully,
  /// then null is returned. However, if [allowNull] is false and the [dynamic value][data]
  /// cannot be decoded successfully, then an [UnimplementedError] is thrown.
  ///
  /// The [allowNull] is very handy when an API changes and a new enum value is added or removed,
  /// and users are still using an old app with the old code.
  MaintenanceStatusResponseDtoOperationEnum? decode(dynamic data, {bool allowNull = true}) {
    if (data != null) {
      switch (data) {
        case r'restore-database': return MaintenanceStatusResponseDtoOperationEnum.restoreDatabase;
        default:
          if (!allowNull) {
            throw ArgumentError('Unknown enum value to decode: $data');
          }
      }
    }
    return null;
  }

  /// Singleton [MaintenanceStatusResponseDtoOperationEnumTypeTransformer] instance.
  static MaintenanceStatusResponseDtoOperationEnumTypeTransformer? _instance;
}


