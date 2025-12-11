import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../providers/web3_provider.dart';

class TransactionHistoryWidget extends StatelessWidget {
  const TransactionHistoryWidget({super.key});

  String _shortHash(String hash) {
    if (hash.length <= 12) return hash;
    return "${hash.substring(0, 8)}…${hash.substring(hash.length - 6)}";
  }

  String _formatTime(DateTime time) {
    // Simple format: HH:mm:ss
    final t = time.toLocal().toString().split(".").first; // "2025-12-10 18:20:33"
    return t.split(" ").last; // "18:20:33"
  }

  @override
  Widget build(BuildContext context) {
    final web3 = Provider.of<Web3Provider>(context);
    final history = web3.txHistory;

    if (history.isEmpty) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 20),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF020617),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Transaction History",
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            "Last ${history.length > 5 ? 5 : history.length} actions (this session)",
            style: TextStyle(
              fontSize: 11,
              color: Colors.white.withOpacity(0.6),
            ),
          ),
          const SizedBox(height: 10),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: history.length > 5 ? 5 : history.length,
            itemBuilder: (context, index) {
              final tx = history[index];
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFF020617),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.white12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // First row: Action + chain + time
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(999),
                            color: const Color(0xFF111827),
                          ),
                          child: Text(
                            tx.action,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          tx.chain,
                          style: const TextStyle(
                            fontSize: 11,
                            color: Colors.white54,
                          ),
                        ),
                        const Spacer(),
                        Text(
                          _formatTime(tx.time),
                          style: const TextStyle(
                            fontSize: 11,
                            color: Colors.white54,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    // Hash line
                    Text(
                      "Hash: ${_shortHash(tx.hash)}",
                      style: const TextStyle(
                        fontSize: 11,
                        color: Colors.white70,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        TextButton(
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: tx.hash));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text("Tx hash copied"),
                                duration: Duration(milliseconds: 800),
                              ),
                            );
                          },
                          child: const Text("Copy"),
                        ),

              TextButton(
              onPressed: () async {
              final uri = Uri.parse(tx.explorerUrl); // or web3.lastTxExplorerUrl

              final ok = await launchUrl(
              uri,
              mode: LaunchMode.externalApplication,
              );

              if (!ok && context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
              content: Text("Could not open explorer link"),
              duration: Duration(seconds: 1),
              ),
              );
              }
              },
              child: const Text("View"),
              ),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
