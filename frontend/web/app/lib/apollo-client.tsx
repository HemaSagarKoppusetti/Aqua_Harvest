'use client'

import { ApolloClient, InMemoryCache, ApolloProvider as ApolloProviderBase, createHttpLink, from } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { ReactNode } from 'react'

// HTTP Link for GraphQL endpoint
const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql',
})

// Auth link for JWT tokens
const authLink = setContext((_, { headers }) => {
  // Get the authentication token from local storage if it exists
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
  
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    }
  }
})

// Error link for handling GraphQL and network errors
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      )
    })
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`)
    
    // Handle 401 errors (unauthorized)
    if ('statusCode' in networkError && networkError.statusCode === 401) {
      // Clear token and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken')
        window.location.href = '/login'
      }
    }
  }
})

// Create Apollo Client
const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Assessment: {
        fields: {
          recommendedStructures: {
            merge: false, // Replace instead of merging
          },
        },
      },
      User: {
        fields: {
          assessments: {
            merge: false,
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
  },
})

// Custom Apollo Provider component
interface ApolloProviderProps {
  children: ReactNode
}

export function ApolloProvider({ children }: ApolloProviderProps) {
  return (
    <ApolloProviderBase client={client}>
      {children}
    </ApolloProviderBase>
  )
}

// Export client for direct usage if needed
export { client }

// GraphQL queries and mutations
export const GET_ASSESSMENT = `
  query GetAssessment($input: AssessmentInput!) {
    assessment(input: $input) {
      id
      feasibilityScore
      waterPotential
      recommendedStructures {
        id
        name
        type
        cost
        specifications
      }
      costEstimate
      paybackPeriod
      environmentalImpact {
        waterSaved
        co2Reduction
      }
      createdAt
    }
  }
`

export const CREATE_ASSESSMENT = `
  mutation CreateAssessment($input: AssessmentInput!) {
    createAssessment(input: $input) {
      id
      feasibilityScore
      waterPotential
      recommendedStructures {
        id
        name
        type
        cost
        specifications
      }
      costEstimate
      paybackPeriod
      environmentalImpact {
        waterSaved
        co2Reduction
      }
      createdAt
    }
  }
`

export const GET_RAINFALL_DATA = `
  query GetRainfallData($location: LocationInput!, $startDate: String, $endDate: String) {
    rainfallData(location: $location, startDate: $startDate, endDate: $endDate) {
      date
      precipitation
      temperature
      humidity
    }
  }
`

export const GET_STRUCTURES = `
  query GetStructures($filters: StructureFilters) {
    structures(filters: $filters) {
      id
      name
      type
      description
      costPerSqft
      efficiencyRating
      specifications
    }
  }
`

export const GET_USER_ASSESSMENTS = `
  query GetUserAssessments($userId: ID!) {
    user(id: $userId) {
      id
      name
      email
      assessments {
        id
        feasibilityScore
        waterPotential
        costEstimate
        createdAt
        location {
          latitude
          longitude
          address
        }
      }
    }
  }
`

export const GET_IMPACT_METRICS = `
  query GetImpactMetrics($district: String, $state: String, $timeRange: String) {
    impactMetrics(district: $district, state: $state, timeRange: $timeRange) {
      totalAssessments
      totalImplementations
      waterHarvested
      co2Reduction
      moneySaved
      jobsCreated
    }
  }
`