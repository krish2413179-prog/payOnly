# FlexPass - Universal Pay-As-You-Go Access Protocol

A decentralized access application for the physical world built with Next.js 14, featuring **real** QR code generation/scanning and **real** hardware sensor integration for automatic session management.

## 🚀 Features

- **Real QR Code Generation**: Generate actual QR codes for services that can be printed or displayed
- **Real QR Code Scanning**: Uses device camera to scan FlexPass QR codes
- **Real Hardware Sensor Integration**: Battery API, Geolocation API for automatic session termination
- **EIP-7702 Delegation**: Advanced MetaMask permissions for seamless payments
- **Real-time Cost Tracking**: Live payment calculation based on actual usage
- **Envio Verification**: Trusted service provider verification
- **No Simulation**: All features use real hardware APIs and actual QR codes

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + Framer Motion
- **Web3**: Wagmi v2 + Viem + ConnectKit
- **QR Codes**: qrcode (generation) + qr-scanner (scanning)
- **Hardware APIs**: Battery Status API, Geolocation API, Network Information API
- **TypeScript**: Full type safety

## 📱 Design System - "Utility Chic"

- **Theme**: Deep Void Black (#0a0a0a) backgrounds with crisp white text
- **Accent Colors**: 
  - Electric Blue (#00d4ff) for WiFi
  - Neon Green (#39ff14) for Power
  - Gold (#ffd700) for Gym
- **Typography**: Inter for UI, Space Grotesk for financial numbers
- **Animations**: Pulsing rings, heartbeat effects, and smooth transitions

## 🏗 Project Structure

```
flexpass/
├── app/
│   ├── page.tsx              # Universal QR Scanner & Generator
│   ├── session/[id]/
│   │   └── page.tsx          # Active Session Monitor
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   ├── ServiceVerification.tsx  # Trust layer with EIP-7702
│   ├── QRScanner.tsx           # Real camera QR scanning
│   └── QRGenerator.tsx         # Real QR code generation
├── hooks/
│   ├── useBatterySensor.ts     # Battery Status API integration
│   └── useGeoFence.ts          # Geolocation monitoring
├── lib/
│   └── envio.ts               # Service verification
└── package.json
```

## 🚦 Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run development server**:
   ```bash
   npm run dev
   ```

3. **Open your browser**:
   Navigate to [http://localhost:3001](http://localhost:3001)

## 🎮 Real Usage

### 1. Generate Real QR Codes
- Click "Generate QR Code" to create actual QR codes
- Select service type (Gym, Power, WiFi)
- Download or display the QR code for users to scan
- QR codes contain real FlexPass protocol URLs

### 2. Scan Real QR Codes
- Click "Scan QR Code" to activate device camera
- Point camera at any FlexPass QR code
- Real-time QR detection and parsing
- Requires camera permissions

### 3. Service Verification
- Each service shows verification badge from Envio
- Rate information and provider details
- "Slide to Authorize" for EIP-7702 delegation signature

### 4. Real Hardware Monitoring
- **Power Services**: Uses actual Battery Status API
- **Gym Services**: Uses real Geolocation API with geofencing
- **WiFi Services**: Monitors actual network connectivity
- Sessions automatically end when hardware conditions change

## 🔧 Real Hardware APIs

### Battery Status API
```typescript
const battery = useBatterySensor()
// Returns: { isCharging, level, isSupported, chargingTime, dischargingTime }
// Automatically ends power sessions when device stops charging
```

### Geolocation API
```typescript
const geoFence = useGeoFence({
  targetLat: 37.7749,
  targetLng: -122.4194,
  fenceRadius: 50
})
// Returns: { distanceInMeters, isInsideFence, currentPosition, isSupported, error }
// Automatically ends gym sessions when user leaves geofenced area
```

### Network Connectivity
```typescript
// Uses navigator.onLine for real network status
// Automatically ends WiFi sessions when connection is lost
```

## 📱 Browser Compatibility

### QR Scanner Requirements:
- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: iOS 11+ required
- **Mobile**: Works on all modern mobile browsers

### Hardware API Support:
- **Battery API**: Chrome, Edge (limited browser support)
- **Geolocation**: All modern browsers (requires HTTPS)
- **Network Status**: All modern browsers

## 🎨 Key Components

### QRGenerator
- Generates real QR codes using the `qrcode` library
- Service selection interface
- Download functionality for printing
- High-quality QR code output

### QRScanner  
- Real camera access using `qr-scanner` library
- Live QR code detection
- Camera permission handling
- Error handling for unsupported devices

### Session Monitor
- Real-time cost tracking
- Hardware sensor status display
- Automatic session termination based on real hardware events
- Professional financial interface

## 🔒 Security Features

- Service verification through Envio protocol
- Real hardware-based automatic session termination
- EIP-7702 delegation for secure payments
- Real-time monitoring and alerts

## 📊 Service Types

1. **POWER** (`0xPower`): Tesla Supercharger - $0.25/kWh
   - Monitors battery charging status
   - Ends when device stops charging

2. **GYM** (`0xGym`): Gold's Gym - $0.10/min
   - Uses GPS geofencing
   - Ends when user leaves 50m radius

3. **WIFI** (`0xWiFi`): WeWork Network - $0.05/min
   - Monitors network connectivity
   - Ends when connection is lost

## 🎯 Production Ready Features

- ✅ Real QR code generation and scanning
- ✅ Actual hardware sensor integration
- ✅ Camera permission handling
- ✅ Error handling for unsupported devices
- ✅ Real-time session monitoring
- ✅ Automatic session termination
- ✅ Professional UI/UX
- ✅ No simulation or mock features

## 📄 License

MIT License - Built for Web3 hackathon demonstration with real hardware integration.