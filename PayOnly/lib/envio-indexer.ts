'use client'

export interface EnvioPaymentEvent {
  id?: string
  sessionId: string
  customerAddress: string
  providerAddress: string
  amount: string
  reason: string
  conditions: {
    wifiConnected?: boolean
    locationInRange?: boolean
    batteryCharging?: boolean
    signalStrength?: number
    distance?: number
  }
  timestamp: number
  blockNumber?: number
  transactionHash?: string
}

export interface EnvioSessionEvent {
  id?: string
  sessionId: string
  customerAddress: string
  providerAddress: string
  serviceType: string
  status: 'started' | 'active' | 'paused' | 'ended'
  totalCost: string
  duration: number
  timestamp: number
  blockNumber?: number
  transactionHash?: string
}

export interface EnvioServiceEvent {
  id?: string
  providerAddress: string
  serviceName: string
  serviceType: string
  rate: string
  isActive: boolean
  timestamp: number
  blockNumber?: number
  transactionHash?: string
}

export class EnvioIndexer {
  private graphqlUrl: string
  private apiKey?: string

  constructor(graphqlUrl?: string, apiKey?: string) {
    this.graphqlUrl = graphqlUrl || process.env.NEXT_PUBLIC_ENVIO_GRAPHQL_URL || ''
    this.apiKey = apiKey
    
    if (!this.graphqlUrl) {
      console.warn('⚠️ Envio GraphQL URL not configured')
    }
  }

  // Generic GraphQL query method
  private async query(query: string, variables?: Record<string, any>) {
    if (!this.graphqlUrl) {
      throw new Error('Envio GraphQL URL not configured')
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    try {
      const response = await fetch(this.graphqlUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query,
          variables
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`)
      }

      return result.data
    } catch (error) {
      console.error('Envio GraphQL query failed:', error)
      throw error
    }
  }

  // Log payment event
  async logPaymentEvent(event: EnvioPaymentEvent): Promise<string> {
    const mutation = `
      mutation LogPaymentEvent($input: PaymentEventInput!) {
        logPaymentEvent(input: $input) {
          id
          sessionId
          amount
          reason
          timestamp
        }
      }
    `

    try {
      const result = await this.query(mutation, { input: event })
      console.log('✅ Payment event logged to Envio:', result.logPaymentEvent.id)
      return result.logPaymentEvent.id
    } catch (error) {
      console.error('❌ Failed to log payment event:', error)
      throw error
    }
  }

  // Log session event
  async logSessionEvent(event: EnvioSessionEvent): Promise<string> {
    const mutation = `
      mutation LogSessionEvent($input: SessionEventInput!) {
        logSessionEvent(input: $input) {
          id
          sessionId
          status
          timestamp
        }
      }
    `

    try {
      const result = await this.query(mutation, { input: event })
      console.log('✅ Session event logged to Envio:', result.logSessionEvent.id)
      return result.logSessionEvent.id
    } catch (error) {
      console.error('❌ Failed to log session event:', error)
      throw error
    }
  }

  // Log service event
  async logServiceEvent(event: EnvioServiceEvent): Promise<string> {
    const mutation = `
      mutation LogServiceEvent($input: ServiceEventInput!) {
        logServiceEvent(input: $input) {
          id
          providerAddress
          serviceName
          timestamp
        }
      }
    `

    try {
      const result = await this.query(mutation, { input: event })
      console.log('✅ Service event logged to Envio:', result.logServiceEvent.id)
      return result.logServiceEvent.id
    } catch (error) {
      console.error('❌ Failed to log service event:', error)
      throw error
    }
  }

  // Query payment events
  async getPaymentEvents(filters?: {
    sessionId?: string
    customerAddress?: string
    providerAddress?: string
    fromTimestamp?: number
    toTimestamp?: number
    limit?: number
  }): Promise<EnvioPaymentEvent[]> {
    const query = `
      query GetPaymentEvents(
        $sessionId: String
        $customerAddress: String
        $providerAddress: String
        $fromTimestamp: Int
        $toTimestamp: Int
        $limit: Int
      ) {
        paymentEvents(
          where: {
            sessionId: $sessionId
            customerAddress: $customerAddress
            providerAddress: $providerAddress
            timestamp_gte: $fromTimestamp
            timestamp_lte: $toTimestamp
          }
          orderBy: timestamp
          orderDirection: desc
          first: $limit
        ) {
          id
          sessionId
          customerAddress
          providerAddress
          amount
          reason
          conditions
          timestamp
          blockNumber
          transactionHash
        }
      }
    `

    try {
      const result = await this.query(query, filters)
      return result.paymentEvents || []
    } catch (error) {
      console.error('❌ Failed to get payment events:', error)
      return []
    }
  }

  // Query session events
  async getSessionEvents(filters?: {
    sessionId?: string
    customerAddress?: string
    providerAddress?: string
    status?: string
    limit?: number
  }): Promise<EnvioSessionEvent[]> {
    const query = `
      query GetSessionEvents(
        $sessionId: String
        $customerAddress: String
        $providerAddress: String
        $status: String
        $limit: Int
      ) {
        sessionEvents(
          where: {
            sessionId: $sessionId
            customerAddress: $customerAddress
            providerAddress: $providerAddress
            status: $status
          }
          orderBy: timestamp
          orderDirection: desc
          first: $limit
        ) {
          id
          sessionId
          customerAddress
          providerAddress
          serviceType
          status
          totalCost
          duration
          timestamp
          blockNumber
          transactionHash
        }
      }
    `

    try {
      const result = await this.query(query, filters)
      return result.sessionEvents || []
    } catch (error) {
      console.error('❌ Failed to get session events:', error)
      return []
    }
  }

  // Query service events
  async getServiceEvents(filters?: {
    providerAddress?: string
    serviceType?: string
    isActive?: boolean
    limit?: number
  }): Promise<EnvioServiceEvent[]> {
    const query = `
      query GetServiceEvents(
        $providerAddress: String
        $serviceType: String
        $isActive: Boolean
        $limit: Int
      ) {
        serviceEvents(
          where: {
            providerAddress: $providerAddress
            serviceType: $serviceType
            isActive: $isActive
          }
          orderBy: timestamp
          orderDirection: desc
          first: $limit
        ) {
          id
          providerAddress
          serviceName
          serviceType
          rate
          isActive
          timestamp
          blockNumber
          transactionHash
        }
      }
    `

    try {
      const result = await this.query(query, filters)
      return result.serviceEvents || []
    } catch (error) {
      console.error('❌ Failed to get service events:', error)
      return []
    }
  }

  // Get session analytics
  async getSessionAnalytics(sessionId: string): Promise<{
    totalPayments: number
    totalAmount: string
    averagePayment: string
    paymentFrequency: number
    conditions: Record<string, number>
  }> {
    const query = `
      query GetSessionAnalytics($sessionId: String!) {
        sessionAnalytics(sessionId: $sessionId) {
          totalPayments
          totalAmount
          averagePayment
          paymentFrequency
          conditions
        }
      }
    `

    try {
      const result = await this.query(query, { sessionId })
      return result.sessionAnalytics || {
        totalPayments: 0,
        totalAmount: '0',
        averagePayment: '0',
        paymentFrequency: 0,
        conditions: {}
      }
    } catch (error) {
      console.error('❌ Failed to get session analytics:', error)
      return {
        totalPayments: 0,
        totalAmount: '0',
        averagePayment: '0',
        paymentFrequency: 0,
        conditions: {}
      }
    }
  }

  // Get provider analytics
  async getProviderAnalytics(providerAddress: string): Promise<{
    totalSessions: number
    totalRevenue: string
    averageSessionDuration: number
    topServiceTypes: Array<{ type: string; count: number }>
  }> {
    const query = `
      query GetProviderAnalytics($providerAddress: String!) {
        providerAnalytics(providerAddress: $providerAddress) {
          totalSessions
          totalRevenue
          averageSessionDuration
          topServiceTypes {
            type
            count
          }
        }
      }
    `

    try {
      const result = await this.query(query, { providerAddress })
      return result.providerAnalytics || {
        totalSessions: 0,
        totalRevenue: '0',
        averageSessionDuration: 0,
        topServiceTypes: []
      }
    } catch (error) {
      console.error('❌ Failed to get provider analytics:', error)
      return {
        totalSessions: 0,
        totalRevenue: '0',
        averageSessionDuration: 0,
        topServiceTypes: []
      }
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    const query = `
      query HealthCheck {
        _meta {
          block {
            number
            timestamp
          }
        }
      }
    `

    try {
      const result = await this.query(query)
      console.log('✅ Envio indexer health check passed:', result._meta)
      return true
    } catch (error) {
      console.error('❌ Envio indexer health check failed:', error)
      return false
    }
  }
}

// Global Envio indexer instance
export const envioIndexer = new EnvioIndexer()