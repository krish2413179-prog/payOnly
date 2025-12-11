import 'dart:math';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/web3_provider.dart';


class EarnScreen extends StatefulWidget {
  const EarnScreen({super.key});

  @override
  State<EarnScreen> createState() => _EarnScreenState();
}

class _EarnScreenState extends State<EarnScreen> {
  int blockNumber = 1;
  int tapsThisBlock = 0;
  int tapsRequired = 18; // will randomize
  int blocksMined = 0;


  bool justMined = false;

  @override
  void initState() {
    super.initState();
    _resetBlock(first: true);
  }

  void _resetBlock({bool first = false}) {
    final random = Random();

    tapsThisBlock = 0;
    tapsRequired = 12 + random.nextInt(14); // 12–25 taps
    justMined = false;

    if (!first) {
      blockNumber++;
    }

    setState(() {});
  }

  void _onTapMine() {
    setState(() {
      // If we just mined, start a new block
      if (justMined) {
        _resetBlock();
        return;
      }

      tapsThisBlock++;

      if (tapsThisBlock >= tapsRequired) {
        // Block mined!
        blocksMined++;
        justMined = true;

        // Give 5 points per block via provider
        final web3 = Provider.of<Web3Provider>(context, listen: false);
        web3.addMiningPoints(15);
      }

    });
  }

  double get _progress =>
      tapsRequired == 0 ? 0 : tapsThisBlock / tapsRequired;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final web3 = Provider.of<Web3Provider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text("Earn: Tap Miner"),
        backgroundColor: Colors.transparent,
      ),
      backgroundColor: const Color(0xFF050510),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              // Title
              const Text(
                "GitBanks Tap Miner",
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                "Tap to “mine” demo blocks and earn mining points.\n"
                    "Later, these points can be linked to on-chain rewards.",
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.white.withOpacity(0.7),
                ),
              ),


              const SizedBox(height: 24),


              // Stats row


        Row(
        children: [
        Expanded(
        child: _miniStat(
        label: "Mining points",
          value: web3.miningPoints.toString(),
          icon: Icons.bolt_rounded,
          accent: const Color(0xFF22C55E),
        ),
        ),


    const SizedBox(width: 10),
    Expanded(
    child: _miniStat(
    label: "Mining points",
    value: web3.miningPoints.toString(),
    icon: Icons.bolt_rounded,
    accent: const Color(0xFF22C55E),
    ),
    ),
    ],
    ),


    const SizedBox(height: 24),
              const SizedBox(height: 16),

              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () {
                    try {
                      web3.applyOneHourBoostFromPoints();
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text("Boost activated: +1% APY for 1 hour"),
                          duration: Duration(seconds: 1),
                        ),
                      );
                    } catch (e) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            e.toString().replaceFirst("Exception: ", ""),
                          ),
                          duration: const Duration(seconds: 1),
                        ),
                      );
                    }
                  },
                  child: const Text(
                    "Convert 100 pts → +1% APY for 1 hour",
                    style: TextStyle(fontSize: 22,fontWeight: FontWeight.bold, ),
                  ),
                ),
              ),
              SizedBox(height: 14,),
              if (web3.apyBoostExpiry != null &&
                  DateTime.now().isBefore(web3.apyBoostExpiry!))
                Padding(
                  padding: const EdgeInsets.only(top: 4.0),
                  child: Text(
                    "Boost active until: ${web3.apyBoostExpiry!.toLocal().toString().substring(11, 16)}",
                    style: const TextStyle(fontSize: 11, color: Colors.white54),
                  ),
                ),



              // Block card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(18),
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Color(0xFF020617),
                      Color(0xFF020617),
                      Color(0xFF111827),
                    ],
                  ),
                  border: Border.all(color: Colors.white10),
                  boxShadow: const [
                    BoxShadow(
                      color: Colors.black54,
                      blurRadius: 18,
                      offset: Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Block header
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(999),
                            color: Colors.white10,
                          ),
                          child: Text(
                            "Block #$blockNumber",
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const Spacer(),
                        Text(
                          "Difficulty: $tapsRequired taps",
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.white.withOpacity(0.7),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 14),

                    // Fake “hash”
                    Text(
                      "Hash",
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.white.withOpacity(0.6),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _fakeHash(blockNumber),
                      style: const TextStyle(
                        fontSize: 12,
                        fontFamily: "RobotoMono",
                        color: Colors.white70,
                      ),
                    ),

                    const SizedBox(height: 14),

                    // Progress
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          "Progress",
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.white.withOpacity(0.7),
                          ),
                        ),
                        Text(
                          "${tapsThisBlock.toString().padLeft(2, '0')} / $tapsRequired",
                          style: const TextStyle(
                            fontSize: 12,
                            color: Colors.white70,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(999),
                      child: LinearProgressIndicator(
                        value: _progress.clamp(0.0, 1.0),
                        backgroundColor: Colors.white10,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          justMined
                              ? const Color(0xFF22C55E)
                              : const Color(0xFF8B5CF6),
                        ),
                        minHeight: 8,
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Status text
                    Text(
                      justMined
                          ? "✅ Block mined! Tap again to start the next block."
                          : "Tap the button to mine this block.",
                      style: TextStyle(
                        fontSize: 12,
                        color: justMined
                            ? const Color(0xFF22C55E)
                            : Colors.white.withOpacity(0.7),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 28),

              // Big mine button
              SizedBox(
                width: 170,
                height: 170,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    shape: const CircleBorder(),
                    backgroundColor: justMined
                        ? const Color(0xFF22C55E)
                        : theme.colorScheme.primary,
                    elevation: 10,
                    shadowColor: Colors.black,
                  ),
                  onPressed: _onTapMine,
                  child: Text(
                    justMined ? "Next Block" : "MINE",
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 14),

              const Text(

                    "Mining points can be redeemed for bonus APY or ETTY rewards.",
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.white54,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // --- Small helpers ---

  Widget _miniStat({
    required String label,
    required String value,
    required IconData icon,
    Color accent = const Color(0xFF8B5CF6),
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF020617),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: accent.withOpacity(0.16),
            ),
            child: Icon(icon, size: 18, color: accent),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label.toUpperCase(),
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                    color: Colors.white.withOpacity(0.6),
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _fakeHash(int block) {
    // Just a deterministic fake hash-looking string
    final rand = Random(block * 9973);
    const chars = "0123456789abcdef";
    final buf = StringBuffer("0x");
    for (int i = 0; i < 48; i++) {
      buf.write(chars[rand.nextInt(chars.length)]);
    }
    return buf.toString();
  }
}
