// FlexPass Smart Contract Configuration
export const FLEXPASS_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_FLEXPASS_CONTRACT_ADDRESS as `0x${string}` || '0x6625CD770546B3690ce8d266F5b1A9fa1E480605' as const

export const FLEXPASS_ABI = [
  // Service Registration
  {
    "inputs": [
      {"name": "name", "type": "string"},
      {"name": "rate", "type": "uint256"},
      {"name": "serviceType", "type": "uint8"}
    ],
    "name": "registerService",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Get Service Info
  {
    "inputs": [{"name": "provider", "type": "address"}],
    "name": "getService",
    "outputs": [
      {"name": "name", "type": "string"},
      {"name": "rate", "type": "uint256"},
      {"name": "serviceType", "type": "uint8"},
      {"name": "isActive", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // Session Management
  {
    "inputs": [
      {"name": "provider", "type": "address"},
      {"name": "sessionId", "type": "bytes32"}
    ],
    "name": "startSession",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"name": "sessionId", "type": "bytes32"}],
    "name": "chargeSession",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "sessionId", "type": "bytes32"}],
    "name": "endSession",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Get Session Info
  {
    "inputs": [{"name": "sessionId", "type": "bytes32"}],
    "name": "getSession",
    "outputs": [
      {"name": "provider", "type": "address"},
      {"name": "customer", "type": "address"},
      {"name": "startTime", "type": "uint256"},
      {"name": "endTime", "type": "uint256"},
      {"name": "totalCost", "type": "uint256"},
      {"name": "lastChargeTime", "type": "uint256"},
      {"name": "totalMinutesCharged", "type": "uint256"},
      {"name": "isActive", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "provider", "type": "address"},
      {"indexed": false, "name": "name", "type": "string"},
      {"indexed": false, "name": "rate", "type": "uint256"},
      {"indexed": false, "name": "serviceType", "type": "uint8"}
    ],
    "name": "ServiceRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "sessionId", "type": "bytes32"},
      {"indexed": true, "name": "provider", "type": "address"},
      {"indexed": true, "name": "customer", "type": "address"},
      {"indexed": false, "name": "chargeAmount", "type": "uint256"},
      {"indexed": false, "name": "minutesCharged", "type": "uint256"}
    ],
    "name": "SessionCharged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "sessionId", "type": "bytes32"},
      {"indexed": true, "name": "provider", "type": "address"},
      {"indexed": true, "name": "customer", "type": "address"},
      {"indexed": false, "name": "startTime", "type": "uint256"}
    ],
    "name": "SessionStarted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "sessionId", "type": "bytes32"},
      {"indexed": true, "name": "provider", "type": "address"},
      {"indexed": true, "name": "customer", "type": "address"},
      {"indexed": false, "name": "endTime", "type": "uint256"},
      {"indexed": false, "name": "totalCost", "type": "uint256"}
    ],
    "name": "SessionEnded",
    "type": "event"
  }
] as const

// Service Types Enum (matches smart contract)
export enum ServiceType {
  GYM = 0,
  WIFI = 1,
  POWER = 2,
  CUSTOM = 3
}

export const SERVICE_TYPE_NAMES = {
  [ServiceType.GYM]: 'Gym/Fitness',
  [ServiceType.WIFI]: 'WiFi/Internet',
  [ServiceType.POWER]: 'EV Charging',
  [ServiceType.CUSTOM]: 'Custom Service'
}

// USDC Contract (for rate calculations) - 18 decimal USDC
export const USDC_DECIMALS = 18
export const USDC_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS as `0x${string}` || '0x6B0dacea6a72E759243c99Eaed840DEe9564C194' as const

// Helper function to convert USDC rate to wei (18 decimals)
export function usdcToWei(usdcAmount: string): bigint {
  const amount = parseFloat(usdcAmount)
  return BigInt(Math.floor(amount * Math.pow(10, USDC_DECIMALS)))
}

// Helper function to convert wei to USDC (18 decimals)
export function weiToUsdc(weiAmount: bigint): string {
  return (Number(weiAmount) / Math.pow(10, USDC_DECIMALS)).toFixed(2)
}

// Mock contract address for testing (valid checksummed address)
export const MOCK_CONTRACT_ADDRESS = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed' as const