import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../providers/web3_provider.dart';
import '../providers/web3_provider.dart' show TxStatus;

class TxPanel extends StatelessWidget {
  const TxPanel({super.key});

  @override
  Widget build(BuildContext context) {
    final web3 = Provider.of<Web3Provider>(context);
    final tx = web3.txProgress;

    if (tx.status == TxStatus.idle) return const SizedBox.shrink();

    final bool isError = tx.status == TxStatus.failed;
    final bool isSuccess = tx.status == TxStatus.success;

    return IgnorePointer(
      ignoring: false,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeInOut,
        margin: const EdgeInsets.only(
          left: 16,
          right: 16,
          bottom: 20,
        ),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.92),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isError
                ? Colors.redAccent.withOpacity(0.5)
                : isSuccess
                ? Colors.greenAccent.withOpacity(0.5)
                : Colors.white10,
          ),
          boxShadow: const [
            BoxShadow(
              color: Colors.black54,
              blurRadius: 20,
              offset: Offset(0, 10),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // First row: icon + message + close
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Icon(
                  isError
                      ? Icons.error_rounded
                      : isSuccess
                      ? Icons.check_circle_rounded
                      : Icons.autorenew_rounded,
                  color: isError
                      ? Colors.redAccent
                      : isSuccess
                      ? Colors.greenAccent
                      : Colors.blueAccent,
                  size: 26,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    tx.message.isEmpty
                        ? "Processing transaction…"
                        : tx.message,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                ),
                // ❌ ALWAYS show close button
                IconButton(
                  icon: const Icon(
                    Icons.close_rounded,
                    size: 18,
                    color: Colors.white70,
                  ),
                  onPressed: () {
                    web3.resetTxStatus();
                  },
                ),
              ],
            ),

            const SizedBox(height: 8),

            if (tx.txHash != null)
              SelectableText(
                tx.txHash!,
                style: const TextStyle(
                  fontSize: 11,
                  color: Colors.white60,
                ),
              ),

            if (tx.status == TxStatus.pending ||
                tx.status == TxStatus.confirming) ...[
              const SizedBox(height: 10),
              Text(
                "Confirmations: ${tx.confirmations} / 3",
                style: const TextStyle(
                  fontSize: 11,
                  color: Colors.white70,
                ),
              ),
              const SizedBox(height: 6),
              ClipRRect(
                borderRadius: BorderRadius.circular(999),
                child: LinearProgressIndicator(
                  value: (tx.confirmations / 3).clamp(0.0, 1.0),
                  backgroundColor: Colors.white12,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    Colors.greenAccent,
                  ),
                  minHeight: 6,
                ),
              ),
            ],


          ],
        ),
      ),
    );
  }
}
