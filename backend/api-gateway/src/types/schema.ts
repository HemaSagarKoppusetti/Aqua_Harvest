import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  scalar Date
  scalar JSON
  scalar Upload

  # Location types
  type Location {
    latitude: Float!
    longitude: Float!
    address: String
  }

  input LocationInput {
    latitude: Float!
    longitude: Float!
    address: String
  }

  # User types
  type User {
    id: ID!
    name: String!
    email: String
    phone: String
    location: Location!
    address: String
    householdSize: Int
    roofArea: Float
    propertyType: String
    assessments: [Assessment!]!
    createdAt: Date!
    updatedAt: Date!
  }

  input UserInput {
    name: String!
    email: String
    phone: String
    location: LocationInput!
    address: String
    householdSize: Int
    roofArea: Float
    propertyType: String
  }

  # Assessment types
  type Assessment {
    id: ID!
    user: User
    location: Location!
    roofArea: Float!
    roofType: String!
    annualRainfall: Float
    runoffCoefficient: Float
    feasibilityScore: Float!
    waterPotential: Float!
    recommendedStructures: [StructureRecommendation!]!
    costEstimate: Float!
    paybackPeriod: Int
    environmentalImpact: EnvironmentalImpact!
    createdAt: Date!
    updatedAt: Date!
  }

  input AssessmentInput {
    location: LocationInput!
    roofArea: Float
    roofType: String
    householdSize: Int
    propertyType: String
    userId: ID
  }

  # Structure types
  type Structure {
    id: ID!
    name: String!
    type: String!
    description: String
    minRoofArea: Float
    maxRoofArea: Float
    costPerSqft: Float!
    efficiencyRating: Float!
    maintenanceCostAnnual: Float
    lifespanYears: Int
    specifications: JSON
    createdAt: Date!
  }

  type StructureRecommendation {
    id: ID!
    structure: Structure!
    recommendedQuantity: Int!
    estimatedCost: Float!
    priority: Int!
    suitabilityScore: Float!
    specifications: JSON
  }

  input StructureFilters {
    type: String
    minCost: Float
    maxCost: Float
    minEfficiency: Float
    roofAreaRange: [Float]
  }

  # Environmental impact
  type EnvironmentalImpact {
    waterSaved: Float!
    co2Reduction: Float!
    energySaved: Float
    treesEquivalent: Int
  }

  # Rainfall data
  type RainfallData {
    id: ID!
    location: Location!
    district: String
    state: String
    date: Date!
    precipitation: Float!
    temperatureAvg: Float
    humidityAvg: Float
    dataSource: String!
    createdAt: Date!
  }

  # Groundwater data
  type GroundwaterData {
    id: ID!
    location: Location!
    district: String
    state: String
    waterTableDepth: Float
    aquiferType: String
    soilPermeability: Float
    groundwaterQuality: String
    lastMeasured: Date
    dataSource: String!
    createdAt: Date!
  }

  # Impact metrics for government dashboard
  type ImpactMetrics {
    id: ID!
    district: String!
    state: String!
    month: Date!
    totalAssessments: Int!
    totalImplementations: Int!
    waterHarvested: Float!
    co2Reduction: Float!
    moneySaved: Float!
    jobsCreated: Int!
    updatedAt: Date!
  }

  # AI Predictions
  type AIPrediction {
    id: ID!
    assessment: Assessment!
    modelType: String!
    modelVersion: String!
    inputData: JSON!
    predictionResult: JSON!
    confidenceScore: Float
    processingTimeMs: Int
    createdAt: Date!
  }

  # Contractor types
  type Contractor {
    id: ID!
    name: String!
    companyName: String
    phone: String!
    email: String
    location: Location!
    serviceRadiusKm: Int!
    specializations: [String!]!
    rating: Float
    totalProjects: Int
    licenseNumber: String
    verified: Boolean!
    active: Boolean!
    createdAt: Date!
  }

  # Implementation tracking
  type Implementation {
    id: ID!
    assessment: Assessment!
    contractor: Contractor
    user: User!
    status: String!
    startDate: Date
    completionDate: Date
    actualCost: Float
    structuresInstalled: JSON
    performanceData: JSON
    userRating: Float
    userFeedback: String
    createdAt: Date!
    updatedAt: Date!
  }

  # Query types
  type Query {
    # User queries
    user(id: ID!): User
    users(limit: Int, offset: Int): [User!]!

    # Assessment queries
    assessment(id: ID!): Assessment
    assessments(userId: ID, limit: Int, offset: Int): [Assessment!]!
    assessmentsByLocation(location: LocationInput!, radiusKm: Float): [Assessment!]!

    # Structure queries
    structure(id: ID!): Structure
    structures(filters: StructureFilters): [Structure!]!

    # Data queries
    rainfallData(location: LocationInput!, startDate: String, endDate: String): [RainfallData!]!
    groundwaterData(location: LocationInput!, radiusKm: Float): GroundwaterData
    
    # Impact queries
    impactMetrics(district: String, state: String, timeRange: String): ImpactMetrics
    districtImpact(district: String!, timeRange: String): [ImpactMetrics!]!
    stateImpact(state: String!, timeRange: String): [ImpactMetrics!]!
    
    # Contractor queries
    contractor(id: ID!): Contractor
    contractors(location: LocationInput!, radiusKm: Float, specialization: String): [Contractor!]!
    
    # Implementation queries
    implementation(id: ID!): Implementation
    implementations(userId: ID, contractorId: ID, status: String): [Implementation!]!

    # AI/ML queries
    roofDetection(location: LocationInput!): JSON
    rainfallPrediction(location: LocationInput!): JSON
    feasibilityScore(input: AssessmentInput!): Float
  }

  # Mutation types
  type Mutation {
    # User mutations
    createUser(input: UserInput!): User!
    updateUser(id: ID!, input: UserInput!): User!
    deleteUser(id: ID!): Boolean!

    # Assessment mutations
    createAssessment(input: AssessmentInput!): Assessment!
    updateAssessment(id: ID!, input: AssessmentInput!): Assessment!
    deleteAssessment(id: ID!): Boolean!

    # Structure mutations
    createStructure(input: StructureInput!): Structure!
    updateStructure(id: ID!, input: StructureInput!): Structure!
    deleteStructure(id: ID!): Boolean!

    # Implementation mutations
    createImplementation(input: ImplementationInput!): Implementation!
    updateImplementation(id: ID!, input: ImplementationInput!): Implementation!
    updateImplementationStatus(id: ID!, status: String!): Implementation!

    # Contractor mutations
    createContractor(input: ContractorInput!): Contractor!
    updateContractor(id: ID!, input: ContractorInput!): Contractor!
    verifyContractor(id: ID!): Contractor!

    # Data import mutations
    importRainfallData(file: Upload!): Boolean!
    importGroundwaterData(file: Upload!): Boolean!

    # AI/ML mutations
    trainModel(modelType: String!): Boolean!
    updateModel(modelType: String!, version: String!): Boolean!
  }

  # Subscription types for real-time updates
  type Subscription {
    assessmentCreated: Assessment!
    implementationUpdated(userId: ID!): Implementation!
    impactMetricsUpdated(district: String, state: String): ImpactMetrics!
    contractorLocationUpdated(location: LocationInput!, radiusKm: Float!): Contractor!
  }

  # Additional input types
  input StructureInput {
    name: String!
    type: String!
    description: String
    minRoofArea: Float
    maxRoofArea: Float
    costPerSqft: Float!
    efficiencyRating: Float!
    maintenanceCostAnnual: Float
    lifespanYears: Int
    specifications: JSON
  }

  input ContractorInput {
    name: String!
    companyName: String
    phone: String!
    email: String
    location: LocationInput!
    serviceRadiusKm: Int!
    specializations: [String!]!
    licenseNumber: String
  }

  input ImplementationInput {
    assessmentId: ID!
    contractorId: ID
    userId: ID!
    status: String!
    startDate: String
    actualCost: Float
    structuresInstalled: JSON
  }
`;