'use client'

import { useAccount, useReadContract } from 'wagmi'

const ERC20_ABI = [
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
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

const USDC_CONTRACTS = [
  { name: 'fUSDC Base Sepolia (18 decimals)', address: '0x6B0dacea6a72E759243c99Eaed840DEe9564C194' },
  { name: 'Official USDC Eth Sepolia (6 decimals)', address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' },
  { name: 'Test USDC (18 decimals)', address: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8' },
] as const

function USDCContractInfo({ name, address }: { name: string; address: string }) {
  const { address: userAddress } = useAccount()
  
  const { data: balance } = useReadContract({
    address: address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
  })
  
  const { data: decimals } = useReadContract({
    address: address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'decimals',
  })
  
  const { data: symbol } = useReadContract({
    address: address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'symbol',
  })
  
  const formatBalance = (balance: bigint | undefined, decimals: number | undefined) => {
    if (!balance || !decimals) return '0'
    return (Number(balance) / Math.pow(10, decimals)).toFixed(2)
  }
  
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 mb-2">
      <div className="flex justify-between items-center mb-2">
        <span className="text-white font-medium text-sm">{name}</span>
        <span className="text-gray-400 text-xs">{symbol || 'Unknown'}</span>
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-400">Balance:</span>
          <span className="text-white font-mono">
            {formatBalance(balance, decimals)} {symbol}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Decimals:</span>
          <span className="text-white">{decimals || 'Unknown'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Address:</span>
          <span className="text-gray-400 font-mono">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function USDCDebug() {
  const { isConnected, address } = useAccount()
  
  if (!isConnected) {
    return (
      <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4 mb-6">
        <p className="text-gray-400 text-center">Connect wallet to check USDC balances</p>
      </div>
    )
  }
  
  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4 mb-6">
      <h3 className="text-white font-medium mb-3">USDC Contract Debug</h3>
      <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-3 mb-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Connected Wallet:</span>
          <span className="text-white font-mono text-sm">
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
          </span>
        </div>
        <div className="mt-1">
          <span className="text-gray-400 text-xs">Full address: </span>
          <span className="text-gray-300 text-xs font-mono break-all">{address}</span>
        </div>
      </div>
      {USDC_CONTRACTS.map((contract) => (
        <USDCContractInfo
          key={contract.address}
          name={contract.name}
          address={contract.address}
        />
      ))}
    </div>
  )
}