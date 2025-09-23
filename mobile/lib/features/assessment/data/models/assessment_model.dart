import 'package:json_annotation/json_annotation.dart';

part 'assessment_model.g.dart';

@JsonSerializable()
class AssessmentModel {
  @JsonKey(name: 'id')
  final String? id;
  
  @JsonKey(name: 'user_id')
  final String userId;
  
  @JsonKey(name: 'location')
  final LocationModel location;
  
  @JsonKey(name: 'property_details')
  final PropertyDetailsModel propertyDetails;
  
  @JsonKey(name: 'assessment_results')
  final AssessmentResultsModel? results;
  
  @JsonKey(name: 'status')
  final String status;
  
  @JsonKey(name: 'created_at')
  final DateTime createdAt;
  
  @JsonKey(name: 'updated_at')
  final DateTime updatedAt;

  const AssessmentModel({
    this.id,
    required this.userId,
    required this.location,
    required this.propertyDetails,
    this.results,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  factory AssessmentModel.fromJson(Map<String, dynamic> json) =>
      _$AssessmentModelFromJson(json);

  Map<String, dynamic> toJson() => _$AssessmentModelToJson(this);

  AssessmentModel copyWith({
    String? id,
    String? userId,
    LocationModel? location,
    PropertyDetailsModel? propertyDetails,
    AssessmentResultsModel? results,
    String? status,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return AssessmentModel(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      location: location ?? this.location,
      propertyDetails: propertyDetails ?? this.propertyDetails,
      results: results ?? this.results,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

@JsonSerializable()
class LocationModel {
  @JsonKey(name: 'latitude')
  final double latitude;
  
  @JsonKey(name: 'longitude')
  final double longitude;
  
  @JsonKey(name: 'address')
  final String address;
  
  @JsonKey(name: 'city')
  final String city;
  
  @JsonKey(name: 'state')
  final String state;
  
  @JsonKey(name: 'postal_code')
  final String? postalCode;

  const LocationModel({
    required this.latitude,
    required this.longitude,
    required this.address,
    required this.city,
    required this.state,
    this.postalCode,
  });

  factory LocationModel.fromJson(Map<String, dynamic> json) =>
      _$LocationModelFromJson(json);

  Map<String, dynamic> toJson() => _$LocationModelToJson(this);
}

@JsonSerializable()
class PropertyDetailsModel {
  @JsonKey(name: 'roof_area')
  final double roofArea;
  
  @JsonKey(name: 'roof_type')
  final String roofType;
  
  @JsonKey(name: 'building_type')
  final String buildingType;
  
  @JsonKey(name: 'floors')
  final int floors;
  
  @JsonKey(name: 'occupants')
  final int occupants;
  
  @JsonKey(name: 'current_water_source')
  final String currentWaterSource;

  const PropertyDetailsModel({
    required this.roofArea,
    required this.roofType,
    required this.buildingType,
    required this.floors,
    required this.occupants,
    required this.currentWaterSource,
  });

  factory PropertyDetailsModel.fromJson(Map<String, dynamic> json) =>
      _$PropertyDetailsModelFromJson(json);

  Map<String, dynamic> toJson() => _$PropertyDetailsModelToJson(this);
}

@JsonSerializable()
class AssessmentResultsModel {
  @JsonKey(name: 'feasibility_score')
  final double feasibilityScore;
  
  @JsonKey(name: 'potential_water_collection')
  final double potentialWaterCollection;
  
  @JsonKey(name: 'estimated_cost')
  final double estimatedCost;
  
  @JsonKey(name: 'payback_period')
  final int paybackPeriodMonths;
  
  @JsonKey(name: 'environmental_impact')
  final EnvironmentalImpactModel environmentalImpact;
  
  @JsonKey(name: 'recommended_system')
  final RecommendedSystemModel recommendedSystem;
  
  @JsonKey(name: 'monthly_savings')
  final double monthlySavings;
  
  @JsonKey(name: 'annual_savings')
  final double annualSavings;

  const AssessmentResultsModel({
    required this.feasibilityScore,
    required this.potentialWaterCollection,
    required this.estimatedCost,
    required this.paybackPeriodMonths,
    required this.environmentalImpact,
    required this.recommendedSystem,
    required this.monthlySavings,
    required this.annualSavings,
  });

  factory AssessmentResultsModel.fromJson(Map<String, dynamic> json) =>
      _$AssessmentResultsModelFromJson(json);

  Map<String, dynamic> toJson() => _$AssessmentResultsModelToJson(this);
}

@JsonSerializable()
class EnvironmentalImpactModel {
  @JsonKey(name: 'co2_reduction_kg')
  final double co2ReductionKg;
  
  @JsonKey(name: 'water_saved_liters')
  final double waterSavedLiters;
  
  @JsonKey(name: 'environmental_score')
  final double environmentalScore;

  const EnvironmentalImpactModel({
    required this.co2ReductionKg,
    required this.waterSavedLiters,
    required this.environmentalScore,
  });

  factory EnvironmentalImpactModel.fromJson(Map<String, dynamic> json) =>
      _$EnvironmentalImpactModelFromJson(json);

  Map<String, dynamic> toJson() => _$EnvironmentalImpactModelToJson(this);
}

@JsonSerializable()
class RecommendedSystemModel {
  @JsonKey(name: 'system_type')
  final String systemType;
  
  @JsonKey(name: 'tank_capacity_liters')
  final int tankCapacityLiters;
  
  @JsonKey(name: 'components')
  final List<String> components;
  
  @JsonKey(name: 'installation_complexity')
  final String installationComplexity;

  const RecommendedSystemModel({
    required this.systemType,
    required this.tankCapacityLiters,
    required this.components,
    required this.installationComplexity,
  });

  factory RecommendedSystemModel.fromJson(Map<String, dynamic> json) =>
      _$RecommendedSystemModelFromJson(json);

  Map<String, dynamic> toJson() => _$RecommendedSystemModelToJson(this);
}