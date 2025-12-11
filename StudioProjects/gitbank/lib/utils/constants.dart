const String ERC20_ABI = '''
[
  {"constant":true,"inputs":[{"name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"type":"function"},
  {"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"type":"function"},
  {"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"type":"function"}
]
''';

const String STAKING_ABI = '''
[
  {"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"stake","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"unstake","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"claimRewards","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"burn","outputs":[],"stateMutability":"nonpayable","type":"function"},

  {
    "inputs":[{"internalType":"address","name":"user","type":"address"}],
    "name":"stakes",
    "outputs":[
      {"internalType":"uint256","name":"amount","type":"uint256"},
      {"internalType":"uint256","name":"rewards","type":"uint256"},
      {"internalType":"uint256","name":"lastUpdate","type":"uint256"}
    ],
    "stateMutability":"view",
    "type":"function"
  },

  {
    "inputs":[],
    "name":"apyBasisPoints",
    "outputs":[{"internalType":"uint256","name":"","type":"uint256"}],
    "stateMutability":"view",
    "type":"function"
  }
]
''';


const String LOCK_VAULT_ABI = '''
[
  {"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"lockTokens","outputs":[],"stateMutability":"nonpayable","type":"function"}
]
''';
