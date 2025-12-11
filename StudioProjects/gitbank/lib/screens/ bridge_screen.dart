import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../widgets/transaction_history_widget.dart';
import '../models/tx_status.dart';
import '../widgets/tx_panel.dart';

import '../providers/web3_provider.dart';
import '../widgets/stat_card.dart';
import '../widgets/primary_button.dart';

class BridgeScreen extends StatefulWidget {
  const BridgeScreen({super.key});

  @override
  State<BridgeScreen> createState() => _BridgeScreenState();
}

class _BridgeScreenState extends State<BridgeScreen> {
  final TextEditingController _amountCtrl = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final web3 = Provider.of<Web3Provider>(context);

    // ---- METRICS CALCULATION ----
    final double totalHoldings = web3.polygonBalance +
        web3.sepoliaBalance +
        web3.stakedBalance;

    final double migratedToGitBanks =
        web3.sepoliaBalance + web3.stakedBalance;

    final double migratedPct = totalHoldings > 0
        ? (migratedToGitBanks / totalHoldings) * 100.0
        : 0.0;

    return RefreshIndicator(
      onRefresh: () async {
        await web3.refreshAll();
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Bridge ETTY",
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              "Move ETTY from Polygon Amoy to GitBanks (Sepolia) and track your migration.",
              style: TextStyle(
                color: Colors.white.withOpacity(0.6),
                fontSize: 12,
              ),
            ),

            const SizedBox(height: 16),

            // 🔹 METRIC CARDS
            StatCard(
              label: "Total bridged to GitBanks",
              value: "${migratedToGitBanks.toStringAsFixed(4)} ETTY",
              subtitle: "Wallet + staked on Sepolia",
              icon: Icons.cloud_done_rounded,
              accent: const Color(0xFF22C55E),
            ),
            const SizedBox(height: 10),
            StatCard(
              label: "Migration progress",
              value: "${migratedPct.toStringAsFixed(1)}%",
              subtitle: totalHoldings > 0
                  ? "Of your total ETTY moved off Polygon"
                  : "Bridge some ETTY to start migration",
              icon: Icons.timeline_rounded,
              accent: const Color(0xFF8B5CF6),
            ),

            const SizedBox(height: 16),

            // Existing balances row
            Row(
              children: [
                Expanded(
                  child: StatCard(
                    label: "Polygon (Amoy)",
                    value: "${web3.polygonBalance.toStringAsFixed(4)} ETTY",
                    subtitle: "Source balance",
                    icon: Icons.account_balance_wallet_rounded,
                    accent: const Color(0xFF22C55E),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: StatCard(
                    label: "Gitbank",
                    value: "${web3.sepoliaBalance.toStringAsFixed(4)} ETTY",
                    subtitle: "Bridged wallet balance",
                    icon: Icons.hub_rounded,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 20),

            // --- Bridge form card ---
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(18),
                color: const Color(0xFF020617),
                border: Border.all(color: Colors.white10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    "Amount to Bridge",
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _amountCtrl,
                    keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: "0.0",
                      suffixIcon: TextButton(
                        onPressed: () {
                          _amountCtrl.text =
                              web3.polygonBalance.toStringAsFixed(4);
                        },
                        child: const Text(
                          "MAX",
                          style: TextStyle(
                            color: Color(0xFF8B5CF6),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      PrimaryButton(
                        label: web3.isLoading
                            ? "Bridging..."
                            : "Bridge to Sepolia",
                        onPressed: web3.isLoading
                            ? null
                            : () async {
                          final amt =
                              double.tryParse(_amountCtrl.text) ?? 0;
                          if (amt <= 0) return;
                          try {
                            await web3.bridgeTokens(amt);
                          } catch (_) {}
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    web3.statusMessage,
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.white.withOpacity(0.6),
                    ),
                  ),
                ],
              ),
            ),

            // If you added TransactionHistoryWidget / LastTxWidget, keep them here:
             const TransactionHistoryWidget(),

          ],
        ),
      ),

    );
  }
}
