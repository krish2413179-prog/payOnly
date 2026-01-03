'use client'

import { useState, useCallback } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { parseEther, formatUnits, keccak256, toBytes } from 'viem'
import { FLEXPASS_CONTRACT_ADDRESS, FLEXPASS_ABI, USDC_CONTRACT_ADDRESS, usdcToWei } from '@/lib/contracts'

// Standard ERC20 ABI for USDC operations
const ERC20_ABI = [
  {
    "inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "owner", "type": "address"}, {"name": "spender", "type": "address"}],
    "name": "allowance",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export interface SessionData {
  sessionId: string
  provider: string
  customer: string
  startTime: number
  isActive: boolean
  totalCost?: number
  lastChargeTime?: number
  totalMinutesCharged?: number
}

export function useFlexPassSession() {
  const { address } = useAccount()
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const [currentSession, setCurrentSession] = useState<SessionData | null>(null)

  // Check USDC decimals
  const { data: usdcDecimals } = useReadContract({
    address: USDC_CONTRACT_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'decimals',
  })

  // Check USDC balance
  const { data: usdcBalance } = useReadContract({
    address: USDC_CONTRACT_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })

  // Check USDC allowance for FlexPass contract
  const { data: usdcAllowance } = useReadContract({
    address: USDC_CONTRACT_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, FLEXPASS_CONTRACT_ADDRESS] : undefined,
  })

  // Use actual decimals from contract, fallback to 18
  const actualDecimals = usdcDecimals || 18

  // Generate unique session ID
  const generateSessionId = useCallback((provider: string, customer: string): string => {
    const timestamp = Date.now().toString()
    const random = Math.random().toString(36).substring(2)
    const data = `${provider}-${customer}-${timestamp}-${random}`
    return keccak256(toBytes(data))
  }, [])

  // Approve USDC spending
  const approveUSDC = useCallback(async (amount: string) => {
    if (!address) throw new Error('Wallet not connected')
    
    const amountWei = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, actualDecimals)))
    
    writeContract({
      address: USDC_CONTRACT_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [FLEXPASS_CONTRACT_ADDRESS, amountWei],
    })
  }, [address, writeContract, actualDecimals])

  // Start a new session
  const startSession = useCallback(async (providerAddress: string) => {
    if (!address) throw new Error('Wallet not connected')
    
    console.log('🎯 startSession called with:', { providerAddress, address })
    
    const sessionId = generateSessionId(providerAddress, address)
    console.log('📝 Generated session ID:', sessionId)
    
    console.log('📞 Calling writeContract with:', {
      address: FLEXPASS_CONTRACT_ADDRESS,
      functionName: 'startSession',
      args: [providerAddress, sessionId]
    })
    
    writeContract({
      address: FLEXPASS_CONTRACT_ADDRESS,
      abi: FLEXPASS_ABI,
      functionName: 'startSession',
      args: [providerAddress as `0x${string}`, sessionId],
    })

    // Store session data locally
    const sessionData: SessionData = {
      sessionId,
      provider: providerAddress,
      customer: address,
      startTime: Date.now(),
      isActive: true
    }
    
    console.log('💾 Storing session data:', sessionData)
    setCurrentSession(sessionData)
    
    return sessionId
  }, [address, writeContract, generateSessionId])

  // Charge session (for recurring payments)
  const chargeSession = useCallback(async (sessionId: string) => {
    if (!address) throw new Error('Wallet not connected')
    
    console.log('💰 Charging session:', sessionId)
    
    writeContract({
      address: FLEXPASS_CONTRACT_ADDRESS,
      abi: FLEXPASS_ABI,
      functionName: 'chargeSession',
      args: [sessionId as `0x${string}`],
    })
  }, [address, writeContract])

  // End current session
  const endSession = useCallback(async (sessionId: string) => {
    if (!address) throw new Error('Wallet not connected')
    
    writeContract({
      address: FLEXPASS_CONTRACT_ADDRESS,
      abi: FLEXPASS_ABI,
      functionName: 'endSession',
      args: [sessionId as `0x${string}`],
    })

    // Update local session data
    if (currentSession && currentSession.sessionId === sessionId) {
      setCurrentSession({
        ...currentSession,
        isActive: false
      })
    }
  }, [address, writeContract, currentSession])

  // Get session info from contract
  const { data: sessionInfo } = useReadContract({
    address: FLEXPASS_CONTRACT_ADDRESS,
    abi: FLEXPASS_ABI,
    functionName: 'getSession',
    args: currentSession ? [currentSession.sessionId as `0x${string}`] : undefined,
  })

  // Calculate estimated cost for approval
  const calculateEstimatedCost = useCallback((ratePerMinute: string, estimatedMinutes: number = 60): string => {
    const rate = parseFloat(ratePerMinute)
    const estimatedCost = rate * estimatedMinutes
    return estimatedCost.toString()
  }, [])

  // Check if user has sufficient USDC balance and allowance
  const canStartSession = useCallback((estimatedCost: string): boolean => {
    if (!usdcBalance || !usdcAllowance) return false
    
    const costWei = BigInt(Math.floor(parseFloat(estimatedCost) * Math.pow(10, actualDecimals)))
    const hasBalance = usdcBalance >= costWei
    const hasAllowance = usdcAllowance >= costWei
    
    return hasBalance && hasAllowance
  }, [usdcBalance, usdcAllowance, actualDecimals])

  return {
    // State
    currentSession,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
    
    // Contract data
    usdcBalance: usdcBalance ? formatUnits(usdcBalance, actualDecimals) : '0',
    usdcAllowance: usdcAllowance ? formatUnits(usdcAllowance, actualDecimals) : '0',
    usdcDecimals: actualDecimals,
    sessionInfo,
    
    // Actions
    approveUSDC,
    startSession,
    chargeSession,
    endSession,
    generateSessionId,
    calculateEstimatedCost,
    canStartSession,
    
    // Utilities
    setCurrentSession,
  }
}