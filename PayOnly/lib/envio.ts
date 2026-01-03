import { createPublicClient, http, isAddress } from 'viem'
import { baseSepolia } from 'viem/chains'
import { FLEXPASS_CONTRACT_ADDRESS, FLEXPASS_ABI, ServiceType, SERVICE_TYPE_NAMES } from './contracts'

export interface ServiceData {
  id: string
  name: string
  rate: string
  rateUnit: string
  type: 'POWER' | 'GYM' | 'WIFI' | 'CUSTOM'
  verified: boolean
  provider: string
  description: string
  color: string
  icon: string
  isCustom?: boolean
  walletAddress?: string
}

// Create a public client for reading from Base Sepolia
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org')
})

// Helper function to convert wei to USDC display format (18 decimals)
function weiToUsdc(weiAmount: bigint): string {
  return (Number(weiAmount) / Math.pow(10, 18)).toFixed(2)
}

// Query the smart contract for service information
async function queryContractService(providerAddress: string): Promise<ServiceData | null> {
  try {
    if (!isAddress(providerAddress)) {
      return null
    }

    const result = await publicClient.readContract({
      address: FLEXPASS_CONTRACT_ADDRESS,
      abi: FLEXPASS_ABI,
      functionName: 'getService',
      args: [providerAddress as `0x${string}`]
    })

    const [name, rate, serviceType, isActive] = result as [string, bigint, number, boolean]

    if (!isActive || !name) {
      return null
    }

    const typeString = Object.keys(ServiceType)[serviceType] as keyof typeof ServiceType
    const colors = {
      POWER: '#39ff14',
      GYM: '#ffd700', 
      WIFI: '#00d4ff',
      CUSTOM: '#9333ea'
    }

    const icons = {
      POWER: '⚡',
      GYM: '🏋️',
      WIFI: '📶',
      CUSTOM: '🏪'
    }

    return {
      id: providerAddress,
      name,
      rate: weiToUsdc(rate),
      rateUnit: '/min',
      type: typeString as 'POWER' | 'GYM' | 'WIFI' | 'CUSTOM',
      verified: true, // On-chain services are verified
      provider: `${providerAddress.slice(0, 6)}...${providerAddress.slice(-4)}`,
      description: `${SERVICE_TYPE_NAMES[serviceType]} service registered on FlexPass`,
      color: colors[typeString as keyof typeof colors] || '#9333ea',
      icon: icons[typeString as keyof typeof icons] || '🏪',
      walletAddress: providerAddress
    }
  } catch (error) {
    console.error('Error querying contract service:', error)
    return null
  }
}

const MOCK_SERVICES: Record<string, ServiceData> = {
  '0xGym': {
    id: '0xGym',
    name: "Gold's Gym Premium Access",
    rate: '0.10',
    rateUnit: '/min',
    type: 'GYM',
    verified: true,
    provider: "Gold's Gym International",
    description: 'Full gym access with premium equipment',
    color: '#ffd700',
    icon: '🏋️',
  },
  '0xPower': {
    id: '0xPower',
    name: 'Tesla Supercharger Station',
    rate: '0.25',
    rateUnit: '/kWh',
    type: 'POWER',
    verified: true,
    provider: 'Tesla Inc.',
    description: 'High-speed DC charging up to 250kW',
    color: '#39ff14',
    icon: '⚡',
  },
  '0xWiFi': {
    id: '0xWiFi',
    name: 'WeWork Guest Network',
    rate: '0.05',
    rateUnit: '/min',
    type: 'WIFI',
    verified: true,
    provider: 'WeWork Companies Inc.',
    description: 'High-speed business internet access',
    color: '#00d4ff',
    icon: '📶',
  },
  // Additional service variations
  'gym-premium': {
    id: 'gym-premium',
    name: 'Premium Fitness Center',
    rate: '0.15',
    rateUnit: '/min',
    type: 'GYM',
    verified: true,
    provider: 'FitLife Centers',
    description: 'Premium gym with spa and pool access',
    color: '#ffd700',
    icon: '🏋️',
  },
  'charger-fast': {
    id: 'charger-fast',
    name: 'FastCharge Station',
    rate: '0.30',
    rateUnit: '/kWh',
    type: 'POWER',
    verified: true,
    provider: 'FastCharge Network',
    description: 'Ultra-fast 350kW DC charging',
    color: '#39ff14',
    icon: '⚡',
  },
  'wifi-premium': {
    id: 'wifi-premium',
    name: 'Premium WiFi Access',
    rate: '0.08',
    rateUnit: '/min',
    type: 'WIFI',
    verified: true,
    provider: 'PremiumNet',
    description: 'High-speed fiber internet access',
    color: '#00d4ff',
    icon: '📶',
  },
}

// Custom services storage (in real app, this would be in localStorage or database)
let customServices: Record<string, ServiceData> = {}

// Load custom services from localStorage
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('flexpass-custom-services')
    if (saved) {
      customServices = JSON.parse(saved)
    }
  } catch (error) {
    console.error('Error loading custom services:', error)
  }
}

// Save custom services to localStorage
function saveCustomServices() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('flexpass-custom-services', JSON.stringify(customServices))
    } catch (error) {
      console.error('Error saving custom services:', error)
    }
  }
}

// Add a custom service
export function addCustomService(
  walletAddress: string,
  name: string,
  type: 'POWER' | 'GYM' | 'WIFI' | 'CUSTOM' = 'CUSTOM',
  rate: string = '0.10',
  rateUnit: string = '/min'
): ServiceData {
  if (!isAddress(walletAddress)) {
    throw new Error('Invalid wallet address format')
  }

  const serviceId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  const colors = {
    POWER: '#39ff14',
    GYM: '#ffd700',
    WIFI: '#00d4ff',
    CUSTOM: '#9333ea'
  }

  const icons = {
    POWER: '⚡',
    GYM: '🏋️',
    WIFI: '📶',
    CUSTOM: '🏪'
  }

  const customService: ServiceData = {
    id: serviceId,
    name: name.trim(),
    rate,
    rateUnit,
    type,
    verified: false, // Custom services are unverified by default
    provider: 'Custom Service',
    description: `Custom service: ${name}`,
    color: colors[type],
    icon: icons[type],
    isCustom: true,
    walletAddress
  }

  customServices[serviceId] = customService
  customServices[walletAddress] = customService // Also allow lookup by wallet address
  saveCustomServices()
  
  return customService
}

// Get all custom services
export function getCustomServices(): ServiceData[] {
  return Object.values(customServices).filter(service => service.id.startsWith('custom-'))
}

// Delete a custom service
export function deleteCustomService(serviceId: string): boolean {
  const service = customServices[serviceId]
  if (service && service.isCustom) {
    delete customServices[serviceId]
    if (service.walletAddress) {
      delete customServices[service.walletAddress]
    }
    saveCustomServices()
    return true
  }
  return false
}

export async function verifyService(hash: string): Promise<ServiceData | null> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800))
  
  // First, try to query the smart contract if it's a valid address
  if (isAddress(hash)) {
    try {
      const contractService = await queryContractService(hash)
      if (contractService) {
        return contractService
      }
    } catch (error) {
      console.error('Error querying smart contract:', error)
    }
  }
  
  // Fallback to mock services for demo purposes
  let service = MOCK_SERVICES[hash]
  
  // Then try custom services
  if (!service) {
    service = customServices[hash]
  }
  
  // If not found, try case-insensitive match
  if (!service) {
    const lowerHash = hash.toLowerCase()
    const matchingKey = Object.keys(MOCK_SERVICES).find(key => 
      key.toLowerCase() === lowerHash
    )
    if (matchingKey) {
      service = MOCK_SERVICES[matchingKey]
    }
  }
  
  // Check if it's a wallet address
  if (!service && isAddress(hash)) {
    // Check if we have this wallet address saved
    service = customServices[hash]
    
    // If not saved, create a temporary service
    if (!service) {
      service = {
        id: hash,
        name: `Wallet ${hash.slice(0, 6)}...${hash.slice(-4)}`,
        rate: '0.10',
        rateUnit: '/min',
        type: 'CUSTOM',
        verified: false,
        provider: 'Unknown Wallet',
        description: 'Custom wallet service - not registered on FlexPass',
        color: '#9333ea',
        icon: '👤',
        isCustom: true,
        walletAddress: hash
      }
    }
  }
  
  // If still not found, try partial matching for common patterns
  if (!service) {
    if (hash.toLowerCase().includes('gym') || hash.toLowerCase().includes('fitness')) {
      service = MOCK_SERVICES['0xGym']
    } else if (hash.toLowerCase().includes('power') || hash.toLowerCase().includes('charge')) {
      service = MOCK_SERVICES['0xPower']
    } else if (hash.toLowerCase().includes('wifi') || hash.toLowerCase().includes('network')) {
      service = MOCK_SERVICES['0xWiFi']
    }
  }
  
  if (!service) {
    throw new Error(`Service not found or not verified: ${hash}`)
  }
  
  return service
}

export function parseFlexPassQR(qrData: string): { id: string; type: string } | null {
  try {
    // Try to parse as JSON first (new format from merchant portal)
    try {
      const parsed = JSON.parse(qrData)
      if (parsed.hash && parsed.type) {
        return { id: parsed.hash, type: parsed.type }
      }
    } catch {
      // Not JSON, continue with other formats
    }

    // Handle FlexPass URL format
    if (qrData.startsWith('flex://')) {
      const url = new URL(qrData)
      if (url.hostname !== 'connect') {
        return null
      }
      
      const id = url.searchParams.get('id')
      const type = url.searchParams.get('type')
      
      if (!id || !type) {
        return null
      }
      
      return { id, type }
    }
    
    // Handle direct hash input
    if (qrData.trim()) {
      const hash = qrData.trim()
      
      // Check if it's a wallet address
      if (isAddress(hash)) {
        return { id: hash, type: 'CUSTOM' }
      }
      
      // Determine type based on hash pattern
      let type = 'GYM' // default
      if (hash.toLowerCase().includes('power') || hash.toLowerCase().includes('charge')) {
        type = 'POWER'
      } else if (hash.toLowerCase().includes('wifi') || hash.toLowerCase().includes('network')) {
        type = 'WIFI'
      } else if (hash === '0xPower') {
        type = 'POWER'
      } else if (hash === '0xWiFi') {
        type = 'WIFI'
      }
      
      return { id: hash, type }
    }
    
    return null
  } catch {
    // If URL parsing fails, treat as direct hash
    if (qrData.trim()) {
      const hash = qrData.trim()
      
      // Check if it's a wallet address
      if (isAddress(hash)) {
        return { id: hash, type: 'CUSTOM' }
      }
      
      let type = 'GYM' // default
      
      if (hash.toLowerCase().includes('power') || hash.toLowerCase().includes('charge')) {
        type = 'POWER'
      } else if (hash.toLowerCase().includes('wifi') || hash.toLowerCase().includes('network')) {
        type = 'WIFI'
      }
      
      return { id: hash, type }
    }
    return null
  }
}

export function generateMockQR(serviceId: string): string {
  const service = MOCK_SERVICES[serviceId] || customServices[serviceId]
  if (!service) {
    throw new Error('Invalid service ID')
  }
  
  return `flex://connect?id=${serviceId}&type=${service.type}`
}

// Helper function to get all available services (built-in + custom)
export function getAllServices(): ServiceData[] {
  const builtInServices = Object.values(MOCK_SERVICES)
  const customServicesList = getCustomServices()
  return [...builtInServices, ...customServicesList]
}

// Helper function to search services
export function searchServices(query: string): ServiceData[] {
  const lowerQuery = query.toLowerCase()
  const allServices = getAllServices()
  return allServices.filter(service => 
    service.name.toLowerCase().includes(lowerQuery) ||
    service.provider.toLowerCase().includes(lowerQuery) ||
    service.id.toLowerCase().includes(lowerQuery) ||
    service.type.toLowerCase().includes(lowerQuery) ||
    (service.walletAddress && service.walletAddress.toLowerCase().includes(lowerQuery))
  )
}