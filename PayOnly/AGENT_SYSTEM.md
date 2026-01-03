# FlexPass Smart Payment Agent System

## Overview

The FlexPass Smart Payment Agent System is an intelligent, condition-based payment automation system that triggers payments based on real-world conditions like WiFi connectivity, location, and battery status. It integrates with the Envio indexer for comprehensive analytics and monitoring.

## 🤖 Payment Agent Architecture

### Core Components

1. **PaymentAgent** (`agents/PaymentAgent.ts`)
   - Central orchestrator for all payment triggers
   - Event-driven architecture with real-time condition monitoring
   - Supports multiple concurrent sessions with different conditions

2. **WiFi Detector** (`hooks/useWiFiDetector.ts`)
   - Real-time WiFi connection monitoring
   - Signal strength and quality assessment
   - Connection type detection (WiFi, 4G, etc.)

3. **Location Detector** (`hooks/useLocationDetector.ts`)
   - GPS-based location tracking
   - Geofence zone management
   - Distance calculations and zone entry/exit detection

4. **Battery Sensor** (`hooks/useBatterySensor.ts`)
   - Battery charging status monitoring
   - Battery level tracking
   - Charging state change detection

5. **Envio Indexer** (`lib/envio-indexer.ts`)
   - Blockchain event indexing and analytics
   - Payment condition logging
   - Session and provider analytics

## 🔄 How It Works

### 1. Session Initialization
```typescript
// When a session starts, the agent creates a payment trigger
const trigger: PaymentTrigger = {
  id: `trigger-${sessionId}`,
  sessionId,
  serviceType: 'WIFI', // or 'GYM', 'POWER', 'CUSTOM'
  conditions: {
    timeInterval: 1, // Charge every minute
    wifiConnected: true, // Only charge when WiFi is connected
    locationInRange: true, // Only charge when in gym area
    batteryCharging: true // Only charge when battery is charging
  },
  lastTriggered: Date.now(),
  isActive: true
}
```

### 2. Condition Monitoring
The agent continuously monitors conditions based on service type:

- **WiFi Service**: Monitors WiFi connection status and signal quality
- **Gym Service**: Tracks location and geofence zones
- **Power Service**: Monitors battery charging status
- **Custom Service**: Time-based charging only

### 3. Payment Triggering
When all conditions are met:
1. Agent triggers a payment event
2. Blockchain transaction is executed via `chargeSession()`
3. Payment details are logged to Envio indexer
4. User receives real-time notification

### 4. Analytics & Monitoring
All events are indexed by Envio for:
- Session analytics (total payments, duration, conditions)
- Provider analytics (revenue, session count, service types)
- Customer analytics (spending patterns, service usage)

## 🚀 Service-Specific Behaviors

### WiFi Service
```typescript
// Triggers payment when:
- WiFi is connected (not mobile data)
- Signal strength is adequate
- Time interval has passed (1 minute)

// Stops payment when:
- WiFi disconnects
- Signal quality drops below threshold
- User manually ends session
```

### Gym Service
```typescript
// Triggers payment when:
- User is within gym geofence (100m radius)
- Location tracking is active
- Time interval has passed (1 minute)

// Stops payment when:
- User leaves gym area
- Location permission is denied
- GPS signal is lost
```

### Power Service
```typescript
// Triggers payment when:
- Device battery is charging
- Charging cable is connected
- Time interval has passed (1 minute)

// Stops payment when:
- Charging stops (cable unplugged)
- Battery reaches full charge (optional)
- Power source is disconnected
```

## 📊 Envio Indexer Integration

### Event Types Indexed

1. **ServiceRegistered**: New service provider registration
2. **SessionStarted**: Session initiation with provider/customer
3. **SessionCharged**: Individual payment within session
4. **SessionEnded**: Session completion with final cost

### Analytics Available

```graphql
# Get session analytics
query GetSessionAnalytics($sessionId: String!) {
  sessionAnalytics(sessionId: $sessionId) {
    totalPayments
    totalAmount
    averagePayment
    paymentFrequency
    conditions {
      wifiConnected
      locationInRange
      batteryCharging
    }
  }
}

# Get provider analytics
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
```

## 🛠️ Setup Instructions

### 1. Deploy Smart Contract
```bash
# Deploy updated FlexPass contract with recurring payments
cd contracts-temp
npx hardhat run scripts/deploy.js --network baseSepolia
```

### 2. Setup Envio Indexer
```bash
# Install Envio CLI
npm run envio:install

# Generate TypeScript types
npm run envio:codegen

# Build and deploy indexer
npm run envio:deploy
```

### 3. Configure Environment
```bash
# Update .env with new contract address
NEXT_PUBLIC_FLEXPASS_CONTRACT_ADDRESS=0x6625CD770546B3690ce8d266F5b1A9fa1E480605
NEXT_PUBLIC_ENVIO_GRAPHQL_URL=http://localhost:8080/graphql
```

### 4. Start Application
```bash
# Start Next.js app
npm run dev

# Start Envio indexer (separate terminal)
npm run envio:dev
```

## 🔧 Configuration Options

### Payment Agent Settings
```typescript
// Customize check intervals per service type
const checkIntervals = {
  WIFI: 30000,    // 30 seconds
  GYM: 60000,     // 1 minute  
  POWER: 15000,   // 15 seconds
  CUSTOM: 60000   // 1 minute
}

// Customize geofence zones
const geofences = [{
  id: 'gym-zone',
  name: 'Gym Area',
  latitude: 37.7749,
  longitude: -122.4194,
  radius: 100, // meters
  type: 'both' // 'enter', 'exit', or 'both'
}]
```

### WiFi Detection Settings
```typescript
const wifiOptions = {
  checkInterval: 30000,
  onConnectionChange: (connected) => console.log('WiFi:', connected),
  onQualityChange: (quality) => console.log('Quality:', quality)
}
```

### Location Detection Settings
```typescript
const locationOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000,
  trackingInterval: 30000
}
```

## 🚨 Error Handling

### Payment Failures
- Insufficient USDC balance → Session ends with notification
- Network connectivity issues → Retry with exponential backoff
- Smart contract errors → Log to Envio and notify user

### Condition Detection Failures
- WiFi API not supported → Fallback to online/offline detection
- Location permission denied → Disable location-based charging
- Battery API not available → Disable battery-based charging

### Recovery Mechanisms
- Automatic retry for transient failures
- Graceful degradation when sensors unavailable
- Manual session end option always available

## 📱 User Experience

### Real-time Notifications
- Payment processed: "💰 Payment processed for 1 minute - $0.10"
- Condition changed: "📶 WiFi connected - charging resumed"
- Session ended: "🏁 Session ended - Total cost: $2.40"

### Debug Information (Development)
- Agent status and condition monitoring
- Payment trigger events and timing
- Sensor data and API availability
- Blockchain transaction status

## 🔮 Future Enhancements

1. **Machine Learning**: Predictive payment optimization based on usage patterns
2. **Multi-condition Logic**: Complex condition combinations (AND/OR logic)
3. **Dynamic Pricing**: Rate adjustments based on demand and conditions
4. **Social Features**: Shared sessions and group payments
5. **IoT Integration**: Direct device communication for more accurate conditions

## 🤝 Contributing

To add new condition types:

1. Create detector hook in `hooks/`
2. Add condition logic to `PaymentAgent.ts`
3. Update Envio schema for new condition types
4. Add UI components for condition display
5. Write tests for new functionality

## 📄 License

MIT License - see LICENSE file for details