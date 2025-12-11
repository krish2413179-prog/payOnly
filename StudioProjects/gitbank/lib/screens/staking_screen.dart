import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/web3_provider.dart';
import '../widgets/stat_card.dart';
import '../widgets/primary_button.dart';
import '../widgets/transaction_history_widget.dart';


class StakingScreen extends StatefulWidget {
  const StakingScreen({super.key});

  @override
  State<StakingScreen> createState() => _StakingScreenState();
}

class _StakingScreenState extends State<StakingScreen> {
  final TextEditingController _amountCtrl = TextEditingController();
  Timer? _rewardTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final web3 = Provider.of<Web3Provider>(context, listen: false);
      _rewardTimer = Timer.periodic(const Duration(seconds: 1), (_) {
        web3.refreshAll();
      });
    });
  }

  @override
  void dispose() {
    _rewardTimer?.cancel();
    _amountCtrl.dispose();
    super.dispose();
  }

  @override
  @override
  Widget build(BuildContext context) {
    final web3 = Provider.of<Web3Provider>(context);
    final bool boostActive = web3.apyBoostPercent > 0 &&
        web3.apyBoostExpiry != null &&
        DateTime.now().isBefore(web3.apyBoostExpiry!);

    return RefreshIndicator(
      onRefresh: () async {
        await web3.refreshAll();   // refresh wallet + staking + rewards
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Stake ETTY",
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            StatCard(
              label: "Effective APY",
              value: "${web3.effectiveApyPercent.toStringAsFixed(2)}%",
              subtitle: boostActive
                  ? "BOOST ACTIVE • +${web3.apyBoostPercent.toStringAsFixed(1)}% until ${web3.apyBoostExpiry!.toLocal().toString().substring(11, 16)}"
                  : "No Tap Miner boost applied",
              icon: Icons.trending_up_rounded,
              accent: boostActive
                  ? const Color(0xFF22C55E)
                  : const Color(0xFF8B5CF6),
            ),


// Effective APY & yearly rewards using boosted APY


            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: StatCard(
                    label: "Wallet (gitbank)",
                    value: "${web3.sepoliaBalance.toStringAsFixed(4)} ETTY",
                    subtitle: "Available to stake",
                    icon: Icons.account_balance_wallet_outlined,
                    accent: const Color(0xFF22C55E),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: StatCard(
                    label: "Staked",
                    value: "${web3.stakedBalance.toStringAsFixed(4)} ETTY",
                    subtitle: "Currently locked",
                    icon: Icons.lock_outline_rounded,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            StatCard(
              label: "Rewards",
              value: "${web3.rewardBalance.toStringAsFixed(8)} ETTY",
              subtitle: "Updating in real time",
              icon: Icons.auto_graph_rounded,
              accent: const Color(0xFF22C55E),
            ),
            const SizedBox(height: 20),
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
                    "Amount",
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
                              web3.sepoliaBalance.toStringAsFixed(4);
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
                        label: web3.isLoading ? "Staking..." : "Stake",
                        onPressed: web3.isLoading
                            ? null
                            : () {
                          final amt =
                              double.tryParse(_amountCtrl.text) ?? 0;
                          if (amt > 0) web3.stakeTokens(amt);
                        },
                      ),
                      const SizedBox(width: 8),
                      PrimaryButton(
                        label: "Unstake",
                        secondary: true,
                        onPressed: web3.isLoading
                            ? null
                            : () {
                          final amt =
                              double.tryParse(_amountCtrl.text) ?? 0;
                          if (amt > 0) web3.unstakeTokens(amt);
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      PrimaryButton(
                        label: "Claim",
                        secondary: true,
                        onPressed:
                        web3.isLoading ? null : web3.claimRewards,
                      ),
                      const SizedBox(width: 8),
                      PrimaryButton(
                        label: "Burn",
                        danger: true,
                        onPressed: web3.isLoading
                            ? null
                            : () {
                          final amt =
                              double.tryParse(_amountCtrl.text) ?? 0;
                          if (amt > 0) web3.burnTokens(amt);
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
                  )
                ],

              ),
            ),
            const TransactionHistoryWidget(),
          ],

        ),
      ),
    );
  }

}
