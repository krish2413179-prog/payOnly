// lib/screens/home_screen.dart
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/web3_provider.dart';
import '../screens/ bridge_screen.dart';
import '../widgets/destination_rpc_dialog.dart';
import 'staking_screen.dart';
import 'earn_screen.dart';
import '../widgets/tx_panel.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _index = 0;
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  late final List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    _pages = const [BridgeScreen(), StakingScreen()];
  }

  Future<void> _onTabChanged(int i, Web3Provider web3) async {
    setState(() => _index = i);

    // Auto network switch on web when using injected MetaMask
    if (kIsWeb && web3.walletConnected) {
      try {
        if (i == 0) {
          // Bridge -> Polygon
          await web3.ensurePolygonNetwork();
        } else if (i == 1) {
          // Stake -> Sepolia
          await web3.ensureSepoliaNetwork();
        }
      } catch (_) {
        // ignore network switch failures; user can switch manually in MetaMask
      }
    }

    // Refresh relevant data
    await web3.refreshAll();
  }

  @override
  Widget build(BuildContext context) {
    final web3 = Provider.of<Web3Provider>(context);

    // show loader until provider init
    if (!web3.isConnected) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      key: _scaffoldKey,
      drawer: const AccountDrawer(),
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Color(0xFF020617),
                Color(0xFF020617),
                Color(0xFF000000),
              ],
            ),
          ),
          child: Column(
            children: [
              _buildHeader(web3),
              const SizedBox(height: 8),
              Expanded(
                child: Stack(
                  children: [
                    // active page
                    _pages[_index],
                    // tx status panel anchored bottom
                    const Align(
                      alignment: Alignment.bottomCenter,
                      child: TxPanel(),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index,
        onTap: (i) => _onTabChanged(i, web3),
        backgroundColor: const Color(0xFF020617),
        selectedItemColor: const Color(0xFF8B5CF6),
        unselectedItemColor: Colors.white54,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.swap_horiz_rounded),
            label: "Bridge",
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.savings_rounded),
            label: "Stake",
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(Web3Provider web3) {
    final bool boostActive = web3.apyBoostPercent > 0 &&
        web3.apyBoostExpiry != null &&
        DateTime.now().isBefore(web3.apyBoostExpiry!);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
      child: Row(
        children: [
          // G icon – opens drawer
          InkWell(
            onTap: () => _scaffoldKey.currentState?.openDrawer(),
            borderRadius: BorderRadius.circular(999),
            child: Container(
              width: 38,
              height: 38,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [Color(0xFF8B5CF6), Color(0xFF22C55E)],
                ),
              ),
              child: const Center(
                child: Text(
                  "G",
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
                ),
              ),
            ),
          ),

          const SizedBox(width: 12),

          // Title + address
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  "GitBanks ETTY",
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: Colors.white),
                ),
                const SizedBox(height: 2),
                if (web3.walletConnected && web3.connectedWalletAddress != null)
                  Text(
                    web3.connectedWalletAddress!.substring(0, 8) + '…',
                    style: const TextStyle(fontSize: 11, color: Colors.white54),
                  )
                else if (web3.userAddress != null)
                  Text(
                    web3.userAddress!.hex.substring(0, 8) + '…',
                    style: const TextStyle(fontSize: 11, color: Colors.white54),
                  )
                else
                  const Text(
                    "Not connected",
                    style: TextStyle(fontSize: 11, color: Colors.white54),
                  ),
              ],
            ),
          ),

          // Connect MetaMask (web only) or private-key fallback
          if (kIsWeb)
            Padding(
              padding: const EdgeInsets.only(right: 8.0),
              child: ElevatedButton.icon(
                onPressed: web3.walletConnected
                    ? () async {
                  // Disconnect clears local state (no real wallet disconnect in injected)
                  await web3.disconnectMetaMask();
                }
                    : () async {
                  try {
                    await web3.connectMetaMask();
                  } catch (e) {
                    final msg = e.toString();
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("MetaMask error: $msg")));
                    }
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: web3.walletConnected ? Colors.white12 : const Color(0xFF22C55E),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                ),
                icon: Icon(web3.walletConnected ? Icons.link_off : Icons.account_balance_wallet, size: 18),
                label: Text(web3.walletConnected ? "Disconnect" : "Connect MetaMask", style: const TextStyle(fontSize: 12)),
              ),
            )
          else
          // Non-web: private key (dev) quick connect
            Padding(
              padding: const EdgeInsets.only(right: 8.0),
              child: ElevatedButton.icon(
                onPressed: () async {
                  // local credentials already initialized in provider init; just refresh balances
                  await web3.refreshAll();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF22C55E),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                ),
                icon: const Icon(Icons.key, size: 18),
                label: const Text("Use Private Key", style: TextStyle(fontSize: 12)),
              ),
            ),

          const SizedBox(width: 6),
          IconButton(
            icon: const Icon(Icons.settings_rounded, color: Colors.white),
            tooltip: "Destination RPC Settings",
            onPressed: () {
              showDialog(
                context: context,
                builder: (_) => DestinationRpcDialog(),
              );
            },
          ),

          // Earn button – opens Tap Miner
          TextButton.icon(
            onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const EarnScreen())),
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              foregroundColor: Colors.white,
              backgroundColor: Colors.white12,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
            ),
            icon: const Icon(Icons.videogame_asset_rounded, size: 18),
            label: const Text("Earn", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
          ),

          const SizedBox(width: 6),

          // Manual Refresh
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Colors.white),
            tooltip: "Refresh balances & staking data",
            onPressed: () async {
              web3.statusMessage = "Refreshing...";
              web3.notifyListeners();
              await web3.refreshAll();
            },
          ),
        ],
      ),
    );
  }
}


/// Simple Account Drawer reused from your previous layout
class AccountDrawer extends StatelessWidget {
  const AccountDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final web3 = Provider.of<Web3Provider>(context);
    final addr = web3.connectedWalletAddress ?? web3.userAddress?.hex ?? "Unknown";

    final boostActive = web3.apyBoostPercent > 0 &&
        web3.apyBoostExpiry != null &&
        DateTime.now().isBefore(web3.apyBoostExpiry!);

    return Drawer(
      child: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF020617), Color(0xFF020617), Color(0xFF111827)],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(colors: [Color(0xFF8B5CF6), Color(0xFF22C55E)]),
                  ),
                  child: const Center(child: Text("G", style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800))),
                ),
                const SizedBox(width: 12),
                const Text("Account Overview", style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: Colors.white)),
                const Spacer(),
                IconButton(icon: const Icon(Icons.close, color: Colors.white70), onPressed: () => Navigator.of(context).pop()),
              ]),
              const SizedBox(height: 20),
              _sectionTitle("Address"),
              const SizedBox(height: 6),
              SelectableText(addr, style: const TextStyle(fontSize: 12, color: Colors.white70)),
              const SizedBox(height: 18),
              _sectionTitle("Balances"),
              const SizedBox(height: 10),
              _infoRow("Polygon (Amoy)", "${web3.polygonBalance.toStringAsFixed(4)} ETTY"),
              const SizedBox(height: 6),
              _infoRow("Sepolia wallet", "${web3.sepoliaBalance.toStringAsFixed(4)} ETTY"),
              const SizedBox(height: 6),
              _infoRow("Staked", "${web3.stakedBalance.toStringAsFixed(4)} ETTY"),
              const SizedBox(height: 6),
              _infoRow("Unclaimed rewards", "${web3.rewardBalance.toStringAsFixed(6)} ETTY"),
              const SizedBox(height: 18),
              _sectionTitle("Yield"),
              const SizedBox(height: 10),
              _infoRow("Base APY", "${web3.apyPercent.toStringAsFixed(2)}%"),
              const SizedBox(height: 6),
              Row(children: [
                Expanded(child: _infoRow("Effective APY", "${web3.effectiveApyPercent.toStringAsFixed(2)}%")),
                if (boostActive)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(borderRadius: BorderRadius.circular(999), color: const Color(0xFF22C55E).withOpacity(0.16)),
                    child: Text("Boost +${web3.apyBoostPercent.toStringAsFixed(1)}%", style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Color(0xFF22C55E))),
                  ),
              ]),
              if (boostActive) ...[
                const SizedBox(height: 4),
                Text("Boost until: ${web3.apyBoostExpiry!.toLocal().toString().substring(11, 16)}", style: const TextStyle(fontSize: 11, color: Colors.white54)),
              ],
              const SizedBox(height: 18),
              _sectionTitle("Tap Miner"),
              const SizedBox(height: 10),
              _infoRow("Mining points", web3.miningPoints.toString()),
              const Spacer(),
              Text("GitBanks ETTY Portal", style: TextStyle(fontSize: 11, color: Colors.white.withOpacity(0.5))),
            ]),
          ),
        ),
      ),
    );
  }

  static Widget _sectionTitle(String text) {
    return Text(text.toUpperCase(),
        style: TextStyle(fontSize: 11, letterSpacing: 0.8, fontWeight: FontWeight.w600, color: Colors.white.withOpacity(0.7)));
  }

  static Widget _infoRow(String label, String value) {
    return Row(children: [
      Expanded(child: Text(label, style: const TextStyle(fontSize: 12, color: Colors.white70))),
      Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white)),
    ]);
  }
}