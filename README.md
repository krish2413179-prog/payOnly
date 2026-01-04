# FlexPass Envio Indexer 
 
This branch contains the Envio indexer configuration for the FlexPass protocol. 
 
## Files 
 
- `config.yaml` - Envio indexer configuration 
- `schema.graphql` - GraphQL schema for indexed data 
- `src/EventHandlers.ts` - Event handling logic 
 
## Setup 
 
1. Install Envio CLI v2.32.3: 
   ```bash 
   npm install -g envio@2.32.3 
   ``` 
 
2. Install dependencies: 
   ```bash 
   npm install 
   ``` 
 
3. Generate code: 
   ```bash 
   envio codegen 
   ``` 
 
4. Start indexer: 
   ```bash 
   envio dev 
   ``` 
 
## Contract Details 
 
- **Network**: Base Sepolia (Chain ID: 84532) 
- **Contract**: 0xCb07D903F273Ae4dCEFcC7c1a60a68A13a2AE54E 
- **Events**: SessionStarted, SessionEnded, TrustScoreUpdated 
