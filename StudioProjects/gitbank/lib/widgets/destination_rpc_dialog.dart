import 'package:flutter/material.dart';
import 'package:http/http.dart';
import 'package:provider/provider.dart';
import 'package:web3dart/web3dart.dart';
import '../providers/web3_provider.dart';

class DestinationRpcDialog extends StatefulWidget {
  const DestinationRpcDialog({super.key});

  @override
  State<DestinationRpcDialog> createState() => _DestinationRpcDialogState();
}

class _DestinationRpcDialogState extends State<DestinationRpcDialog> {
  late TextEditingController rpcCtrl;
  late TextEditingController chainCtrl;
  late TextEditingController explorerCtrl;
  late TextEditingController tokenCtrl;
  late TextEditingController stakingCtrl;

  bool testing = false;
  String testMsg = "";

  @override
  void initState() {
    super.initState();
    final web3 = Provider.of<Web3Provider>(context, listen: false);

    rpcCtrl = TextEditingController(text: web3.destinationRpc);
    chainCtrl = TextEditingController(text: web3.destinationChainId.toString());
    explorerCtrl = TextEditingController(text: web3.destinationExplorer);
    tokenCtrl = TextEditingController(text: web3.destinationTokenAddress);
    stakingCtrl = TextEditingController(text: web3.destinationStakingAddress);
  }

  Future<void> runTestConnection() async {
    setState(() {
      testing = true;
      testMsg = "Testing connection...";
    });

    try {
      final rpc = rpcCtrl.text.trim();
      if (rpc.isEmpty) throw "RPC cannot be empty";

      final client = Web3Provider().polygonClient; // just placeholder instance
      // Real check:
      final probe = Web3Provider();
      final temp = Web3Provider();

      final tClient = Web3Provider();
      final web3client = Web3Client(rpc, Client());

      await web3client.getBlockNumber(); // simple RPC test

      setState(() {
        testMsg = "✔ Connection OK!";
      });
    } catch (e) {
      setState(() {
        testMsg = "❌ Error: $e";
      });
    } finally {
      setState(() {
        testing = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final web3 = Provider.of<Web3Provider>(context);

    return AlertDialog(
      backgroundColor: const Color(0xFF0F172A),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: const Text(
        "Destination RPC Settings",
        style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
      ),
      content: SingleChildScrollView(
        child: Column(
          children: [
            _field("RPC URL", rpcCtrl),
            _field("Chain ID", chainCtrl, keyboard: TextInputType.number),
            _field("Explorer URL (tx/)", explorerCtrl),
            _field("Token Address", tokenCtrl),
            _field("Staking Address", stakingCtrl),

            const SizedBox(height: 12),

            if (testing)
              const CircularProgressIndicator()
            else
              Text(testMsg, style: const TextStyle(color: Colors.white70)),

            const SizedBox(height: 12),

            ElevatedButton(
              onPressed: testing ? null : runTestConnection,
              child: const Text("Test Connection"),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          child: const Text("Cancel", style: TextStyle(color: Colors.white70)),
          onPressed: () => Navigator.pop(context),
        ),
        ElevatedButton(
          onPressed: () {
            final rpc = rpcCtrl.text.trim();
            final chainId = int.tryParse(chainCtrl.text.trim()) ?? web3.destinationChainId;

            web3.updateDestination(
              rpc: rpc,
              chainId: chainId,
              explorer: explorerCtrl.text.trim(),
              tokenAddress: tokenCtrl.text.trim(),
              stakingAddress: stakingCtrl.text.trim(),
            );
            Navigator.pop(context);
          },
          child: const Text("Save"),
        ),
      ],
    );
  }

  Widget _field(String label, TextEditingController ctrl, {TextInputType keyboard = TextInputType.text}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Colors.white70)),
        const SizedBox(height: 4),
        TextField(
          controller: ctrl,
          keyboardType: keyboard,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            filled: true,
            fillColor: Colors.white12,
          ),
        ),
        const SizedBox(height: 12),
      ],
    );
  }
}