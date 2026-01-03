/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    // Handle missing React Native dependencies
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@react-native-async-storage/async-storage': false,
        'react-native': false,
        'react-native-fs': false,
        'react-native-get-random-values': false,
        'react-native-keychain': false,
      }
    }
    
    // Ignore specific warnings
    config.ignoreWarnings = [
      { module: /node_modules\/@metamask\/sdk/ },
      { message: /Can't resolve '@react-native-async-storage\/async-storage'/ },
      { message: /Failed to execute 'removeChild' on 'Node'/ },
    ]
    
    return config
  },
  // Add experimental features to handle React strict mode issues
  experimental: {
    optimizePackageImports: ['connectkit'],
  },
  // Suppress hydration warnings in development
  reactStrictMode: false,
}

module.exports = nextConfig