// lib/providers/web3_provider.dart
// Web3Provider (injected MetaMask only + private-key fallback)
// Bridge: Polygon Amoy (chainId 80002) -> lock on polygonBridgeAddress
// Staking: Sepolia (chainId 11155111) by default (always use Sepolia for staking per your choice)
// Optional destination chain (user-editable): destinationRpc, destinationChainId, destinationExplorer, destinationTokenAddress, destinationStakingAddress
//
// Note: This file is web-first (uses window.ethereum) but falls back to a local private key signer for non-web or dev use.

import 'dart:async';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart';
import 'package:web3dart/web3dart.dart';
import 'package:web3dart/crypto.dart';

// web-only imports
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'dart:js_util' as js_util;

import '../utils/constants.dart'; // ERC20_ABI, STAKING_ABI, LOCK_VAULT_ABI

enum TxStatus { idle, sending, pending, confirming, success, failed }

class TxProgress {
  final TxStatus status;
  final String message;
  final String? txHash;
  final int confirmations;
  const TxProgress({this.status = TxStatus.idle, this.message = "", this.txHash, this.confirmations = 0});
  TxProgress copyWith({TxStatus? status, String? message, String? txHash, int? confirmations}) {
    return TxProgress(
      status: status ?? this.status,
      message: message ?? this.message,
      txHash: txHash ?? this.txHash,
      confirmations: confirmations ?? this.confirmations,
    );
  }
}

class TxRecord {
  final String hash;
  final String action;
  final String chain;
  final String explorerUrl;
  final DateTime time;
  TxRecord({required this.hash, required this.action, required this.chain, required this.explorerUrl, required this.time});
}

class Web3Provider extends ChangeNotifier {
  // --- RPC clients & local credentials ---
  Web3Client? polygonClient;
  Web3Client? sepoliaClient;
  Web3Client? destinationClient; // optional user RPC

  // private key fallback (dev)
  String privateKey = "aa1548666bb281de9c3f7677353e17ea2d6af212381ff13be35c68baaa153321";
  Credentials? _localCredentials;
  EthereumAddress? userAddress;

  // --- Chain IDs ---
  static const int polygonChainId = 80002; // Amoy (bridge)
  static const int sepoliaChainId = 11155111; // Sepolia (staking default)

  // --- RPC endpoints (editable) ---
  String polygonRpc = "https://rpc-amoy.polygon.technology/";
  String sepoliaRpc = "https://ethereum-sepolia-rpc.publicnode.com";

  // --- Contracts (fixed default addresses you provided) ---
  final String polygonTokenAddress = "0xb038253A5ff25aa349f2bC6961Af80b4A0370670";
  final String polygonBridgeAddress = "0x323FDc2AD7Ff29899ea1E8b1F958990Fc61a690A";

  final String sepoliaTokenAddress = "0x80Ec7119Db6B616004Cdc7A583013680DeA54CCc"; // bridged ETTY
  final String sepoliaStakingAddress = "0x4e95B7552C8c34214103410C946634cD64350B6A";

  // --- Optional destination chain (user-editable) ---
  String destinationRpc = ""; // user can set a custom GitBanks RPC (empty = unused)
  int destinationChainId = sepoliaChainId; // default to Sepolia for demo
  String destinationExplorer = "https://sepolia.etherscan.io/tx/";
  String destinationTokenAddress = "0x80Ec7119Db6B616004Cdc7A583013680DeA54CCc";
  String destinationStakingAddress = "0x4e95B7552C8c34214103410C946634cD64350B6A";

  // --- App state ---
  bool isConnected = false;
  bool isLoading = false;
  String statusMessage = "";

  // wallet (injected) state
  bool walletConnected = false;
  String? connectedWalletAddress;
  int? connectedChainId;

  // Balances & staking
  double polygonBalance = 0.0;
  double sepoliaBalance = 0.0;
  double stakedBalance = 0.0;
  double rewardBalance = 0.0;

  // APY & Tap Miner
  double apyPercent = 0.0;
  int miningPoints = 0;
  double apyBoostPercent = 0.0;
  DateTime? apyBoostExpiry;
  double get effectiveApyPercent {
    if (apyBoostExpiry != null && DateTime.now().isAfter(apyBoostExpiry!)) {
      apyBoostPercent = 0.0;
      apyBoostExpiry = null;
    }
    return apyPercent + apyBoostPercent;
  }

  // Tx UI & history
  TxProgress txProgress = const TxProgress();
  List<TxRecord> txHistory = [];
  String lastTxHash = "";
  String lastTxExplorerUrl = "";

  // small allowance abi
  final String _allowanceAbi = '[{"constant":true,"inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"}]';

  // --- Initialization ---
  Future<void> init({String? pk, String? pRpc, String? sRpc}) async {
    isLoading = true;
    notifyListeners();

    if (pk != null && pk.isNotEmpty) privateKey = pk;
    if (pRpc != null && pRpc.isNotEmpty) polygonRpc = pRpc;
    if (sRpc != null && sRpc.isNotEmpty) sepoliaRpc = sRpc;

    try {
      // local credentials
      if (privateKey.isNotEmpty) {
        final hex = privateKey.startsWith("0x") ? privateKey : "0x$privateKey";
        _localCredentials = EthPrivateKey.fromHex(hex);
        userAddress = await _localCredentials!.extractAddress();
      }

      polygonClient = Web3Client(polygonRpc, Client());
      sepoliaClient = Web3Client(sepoliaRpc, Client());

      if (destinationRpc.isNotEmpty) {
        destinationClient = Web3Client(destinationRpc, Client());
      }

      isConnected = true;
      statusMessage = "Ready";
      await refreshAll();
    } catch (e) {
      statusMessage = "Init error: $e";
      isConnected = false;
      if (kDebugMode) print("init error: $e");
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  // --- Update RPCs & Destination settings at runtime ---
  void updateRpcs({String? polygonRpcUrl, String? sepoliaRpcUrl}) {
    var changed = false;
    if (polygonRpcUrl != null && polygonRpcUrl.isNotEmpty && polygonRpcUrl != polygonRpc) {
      polygonRpc = polygonRpcUrl;
      polygonClient?.dispose();
      polygonClient = Web3Client(polygonRpc, Client());
      changed = true;
    }
    if (sepoliaRpcUrl != null && sepoliaRpcUrl.isNotEmpty && sepoliaRpcUrl != sepoliaRpc) {
      sepoliaRpc = sepoliaRpcUrl;
      sepoliaClient?.dispose();
      sepoliaClient = Web3Client(sepoliaRpc, Client());
      changed = true;
    }
    if (changed) {
      statusMessage = "RPC endpoints updated";
      notifyListeners();
      unawaited(refreshAll());
    }
  }

  void updateDestination({
    String? rpc,
    int? chainId,
    String? explorer,
    String? tokenAddress,
    String? stakingAddress,
  }) {
    var changed = false;
    if (rpc != null) {
      destinationRpc = rpc;
      destinationClient?.dispose();
      destinationClient = rpc.isNotEmpty ? Web3Client(rpc, Client()) : null;
      changed = true;
    }
    if (chainId != null) {
      destinationChainId = chainId;
      changed = true;
    }
    if (explorer != null) {
      destinationExplorer = explorer;
      changed = true;
    }
    if (tokenAddress != null) {
      destinationTokenAddress = tokenAddress;
      changed = true;
    }
    if (stakingAddress != null) {
      destinationStakingAddress = stakingAddress;
      changed = true;
    }
    if (changed) {
      statusMessage = "Destination settings updated";
      notifyListeners();
      unawaited(refreshAll());
    }
  }

  // --- Injected MetaMask helpers (web-only) ---
  Future<void> connectMetaMask() async {
    if (!kIsWeb) throw Exception("MetaMask injection only works on web.");
    final ethereum = js_util.getProperty(html.window, 'ethereum');
    if (ethereum == null) throw Exception("No injected wallet found (window.ethereum)");

    try {
      final accounts = await js_util.promiseToFuture(js_util.callMethod(ethereum, 'request', [js_util.jsify({'method': 'eth_requestAccounts'})]));
      if (accounts is List && accounts.isNotEmpty) {
        final String acc = accounts.first as String;
        connectedWalletAddress = acc.startsWith('0x') ? acc : '0x$acc';
        walletConnected = true;
        // chain id
        try {
          final chainIdHex = await js_util.promiseToFuture(js_util.callMethod(ethereum, 'request', [js_util.jsify({'method': 'eth_chainId'})]));
          if (chainIdHex is String && chainIdHex.startsWith('0x')) {
            connectedChainId = int.tryParse(chainIdHex.substring(2), radix: 16);
          }
        } catch (_) {}
        statusMessage = "MetaMask connected: ${connectedWalletAddress!.substring(0, 10)}";
        notifyListeners();
        await refreshAll();
        return;
      } else {
        throw Exception("No accounts returned");
      }
    } catch (e) {
      if (kDebugMode) print("MetaMask connect error: $e");
      rethrow;
    }
  }

  Future<void> disconnectMetaMask() async {
    walletConnected = false;
    connectedWalletAddress = null;
    connectedChainId = null;
    statusMessage = "Disconnected";
    notifyListeners();
  }

  Future<void> ensurePolygonNetwork() async {
    if (!kIsWeb) return;
    final ethereum = js_util.getProperty(html.window, 'ethereum');
    if (ethereum == null) return;
    try {
      final hex = '0x' + polygonChainId.toRadixString(16);
      await js_util.promiseToFuture(js_util.callMethod(ethereum, 'request', [js_util.jsify({'method': 'wallet_switchEthereumChain', 'params': [{'chainId': hex}]})]));
      connectedChainId = polygonChainId;
      notifyListeners();
    } catch (e) {
      if (kDebugMode) print("ensurePolygonNetwork error: $e");
      rethrow;
    }
  }

  Future<void> ensureSepoliaNetwork() async {
    if (!kIsWeb) return;
    final ethereum = js_util.getProperty(html.window, 'ethereum');
    if (ethereum == null) return;
    try {
      final hex = '0x' + sepoliaChainId.toRadixString(16);
      await js_util.promiseToFuture(js_util.callMethod(ethereum, 'request', [js_util.jsify({'method': 'wallet_switchEthereumChain', 'params': [{'chainId': hex}]})]));
      connectedChainId = sepoliaChainId;
      notifyListeners();
    } catch (e) {
      if (kDebugMode) print("ensureSepoliaNetwork error: $e");
      rethrow;
    }
  }

  // --- Helpers: decimals & balances ---
  Future<BigInt> _getDecimals(Web3Client client, DeployedContract contract) async {
    try {
      final decimalsFunc = contract.function('decimals');
      final result = await client.call(contract: contract, function: decimalsFunc, params: []);
      return result.first as BigInt;
    } catch (e) {
      return BigInt.from(18);
    }
  }

  Future<double> _getTokenBalance(Web3Client client, String tokenAddr, EthereumAddress? addr) async {
    if (addr == null) return 0.0;
    try {
      final contract = DeployedContract(ContractAbi.fromJson(ERC20_ABI, 'ERC20'), EthereumAddress.fromHex(tokenAddr));
      final decimals = await _getDecimals(client, contract);
      final result = await client.call(contract: contract, function: contract.function('balanceOf'), params: [addr]);
      return (result.first as BigInt).toDouble() / pow(10, decimals.toInt());
    } catch (e) {
      if (kDebugMode) print("balance error: $e");
      return 0.0;
    }
  }

  // Compute staking data from the Sepolia staking contract
  Future<Map<String, double>> _computeStakeData() async {
    try {
      final staking = DeployedContract(ContractAbi.fromJson(STAKING_ABI, "EttyStakingVault"), EthereumAddress.fromHex(sepoliaStakingAddress));
      final stakesFn = staking.function("stakes");
      final targetAddr = (walletConnected && connectedWalletAddress != null)
          ? EthereumAddress.fromHex(connectedWalletAddress!)
          : userAddress ?? EthereumAddress.fromHex("0x0000000000000000000000000000000000000000");
      final stakeResult = await sepoliaClient!.call(contract: staking, function: stakesFn, params: [targetAddr]);

      final BigInt amount = stakeResult[0] as BigInt;
      final BigInt storedRewards = stakeResult[1] as BigInt;
      final BigInt lastUpdate = stakeResult[2] as BigInt;

      final apyFn = staking.function("apyBasisPoints");
      final apyResult = await sepoliaClient!.call(contract: staking, function: apyFn, params: []);
      final BigInt apyBasisPoints = apyResult[0] as BigInt;
      apyPercent = apyBasisPoints.toDouble() / 100.0;

      final token = DeployedContract(ContractAbi.fromJson(ERC20_ABI, 'ERC20'), EthereumAddress.fromHex(sepoliaTokenAddress));
      final decimals = await _getDecimals(sepoliaClient!, token);

      if (amount == BigInt.zero) {
        return {"staked": 0.0, "rewards": storedRewards.toDouble() / pow(10, decimals.toInt())};
      }

      final int nowSec = DateTime.now().millisecondsSinceEpoch ~/ 1000;
      final BigInt nowBig = BigInt.from(nowSec);
      BigInt timeDiff = BigInt.zero;
      if (nowBig > lastUpdate) timeDiff = nowBig - lastUpdate;
      final BigInt denominator = BigInt.from(365 * 24 * 60 * 60 * 10000);
      final BigInt additionalRewards = (amount * apyBasisPoints * timeDiff) ~/ denominator;
      final BigInt totalRewards = storedRewards + additionalRewards;

      return {"staked": amount.toDouble() / pow(10, decimals.toInt()), "rewards": totalRewards.toDouble() / pow(10, decimals.toInt())};
    } catch (e) {
      if (kDebugMode) print("_computeStakeData error: $e");
      return {"staked": 0.0, "rewards": 0.0};
    }
  }

  // --- Refresh (balances & staking) ---
  Future<void> refreshAll() async {
    if (!isConnected) return;
    try {
      EthereumAddress? addr;
      if (walletConnected && connectedWalletAddress != null) addr = EthereumAddress.fromHex(connectedWalletAddress!);
      else if (userAddress != null) addr = userAddress;

      polygonBalance = await _getTokenBalance(polygonClient!, polygonTokenAddress, addr);
      sepoliaBalance = await _getTokenBalance(sepoliaClient!, sepoliaTokenAddress, addr);

      // If destination client exists and token set, optionally fetch destination token balance (UI may use this)
      if (destinationClient != null && destinationTokenAddress.isNotEmpty && addr != null) {
        try {
          // note: user address might not exist on destination chain; this is just a best-effort read
          final destBal = await _getTokenBalance(destinationClient!, destinationTokenAddress, addr);
          // You can expose this to the UI if needed (not overwriting sepoliaBalance)
          // For now we don't store a dedicated destination balance variable to keep the state compact.
          if (kDebugMode) print("destination balance: $destBal");
        } catch (_) {}
      }

      final stakeData = await _computeStakeData();
      stakedBalance = stakeData["staked"] ?? 0.0;
      rewardBalance = stakeData["rewards"] ?? 0.0;
    } catch (e) {
      if (kDebugMode) print("refreshAll error: $e");
    }
    notifyListeners();
  }

  Future<void> refreshStakingOnly() async {
    try {
      final stakeData = await _computeStakeData();
      stakedBalance = stakeData["staked"] ?? 0.0;
      rewardBalance = stakeData["rewards"] ?? 0.0;
    } catch (e) {
      if (kDebugMode) print("refreshStakingOnly error: $e");
    }
    notifyListeners();
  }

  // --- Transaction helpers (send via injected MetaMask on web or via local credentials) ---
  void _setTxStatus(TxStatus status, {String message = "", String? txHash, int confirmations = 0}) {
    txProgress = txProgress.copyWith(status: status, message: message, txHash: txHash, confirmations: confirmations);
    notifyListeners();
    if (status == TxStatus.success || status == TxStatus.failed) {
      Future.delayed(const Duration(seconds: 3), () {
        txProgress = const TxProgress();
        notifyListeners();
      });
    }
  }

  void _recordTx({required String hash, required String action, required String chain, required String explorerBaseUrl}) {
    final url = "$explorerBaseUrl$hash";
    lastTxHash = hash;
    lastTxExplorerUrl = url;
    txHistory.insert(0, TxRecord(hash: hash, action: action, chain: chain, explorerUrl: url, time: DateTime.now()));
    if (txHistory.length > 30) txHistory.removeLast();
    notifyListeners();
  }

  Future<String> _sendTx({
    required Web3Client client,
    required Transaction tx,
    required int chainId,
    required String actionName,
  }) async {
    _setTxStatus(TxStatus.sending, message: "Sending $actionName...");
    String txHash = "";
    try {
      if (kIsWeb && walletConnected && connectedWalletAddress != null) {
        final from = connectedWalletAddress!;
        final to = tx.to?.hex;
        final data = tx.data != null ? bytesToHex(tx.data!, include0x: true) : null;
        final value = tx.value != null ? '0x' + tx.value!.getInWei.toRadixString(16) : '0x0';
        final ethereum = js_util.getProperty(html.window, 'ethereum');
        if (ethereum == null) throw Exception("No injected provider");

        final txJson = {
          "from": from,
          if (to != null) "to": to,
          if (data != null) "data": data,
          "value": value,
        };

        final result = await js_util.promiseToFuture(js_util.callMethod(ethereum, 'request', [js_util.jsify({'method': 'eth_sendTransaction', 'params': [txJson]})]));
        txHash = result.toString();
        _setTxStatus(TxStatus.pending, message: "$actionName pending...", txHash: txHash, confirmations: 0);
      } else {
        if (_localCredentials == null) throw Exception("No local credentials");
        final signed = await client.sendTransaction(_localCredentials!, tx, chainId: chainId);
        txHash = signed;
        _setTxStatus(TxStatus.pending, message: "$actionName pending...", txHash: txHash, confirmations: 0);
      }

      // poll for receipt
      TransactionReceipt? receipt;
      int attempts = 0;
      while (receipt == null && attempts < 40) {
        receipt = await client.getTransactionReceipt(txHash);
        if (receipt != null) break;
        await Future.delayed(const Duration(seconds: 2));
        attempts++;
      }

      if (receipt == null) {
        _setTxStatus(TxStatus.failed, message: "$actionName: timed out", txHash: txHash);
        return txHash;
      }

      if (receipt.status != true) {
        _setTxStatus(TxStatus.failed, message: "$actionName: reverted", txHash: txHash);
        return txHash;
      }

      for (int c = 1; c <= 3; c++) {
        _setTxStatus(TxStatus.confirming, message: "Confirming $actionName...", txHash: txHash, confirmations: c);
        await Future.delayed(const Duration(milliseconds: 400));
      }

      _setTxStatus(TxStatus.success, message: "$actionName successful!", txHash: txHash, confirmations: 3);
      final explorer = chainId == polygonChainId ? "https://amoy.polygonscan.com/tx/" : (chainId == sepoliaChainId ? "https://sepolia.etherscan.io/tx/" : destinationExplorer);
      _recordTx(hash: txHash, action: actionName, chain: chainId == polygonChainId ? "Polygon" : (chainId == sepoliaChainId ? "Sepolia" : "Destination"), explorerBaseUrl: explorer);

      await refreshAll();
      return txHash;
    } catch (e, st) {
      if (kDebugMode) print("_sendTx error: $e\n$st");
      _setTxStatus(TxStatus.failed, message: "$actionName failed: $e", txHash: txHash.isNotEmpty ? txHash : null);
      rethrow;
    }
  }

  Future<String> _approveToken({
    required Web3Client client,
    required String tokenAddr,
    required String spender,
    required BigInt amountWei,
    required int chainId,
    required String actionName,
  }) async {
    final tokenContract = DeployedContract(ContractAbi.fromJson(ERC20_ABI, 'ERC20'), EthereumAddress.fromHex(tokenAddr));
    final tx = Transaction.callContract(contract: tokenContract, function: tokenContract.function('approve'), parameters: [EthereumAddress.fromHex(spender), amountWei]);
    return await _sendTx(client: client, tx: tx, chainId: chainId, actionName: "$actionName Approve");
  }

  Future<BigInt> _checkAllowance(Web3Client client, String tokenAddr, String owner, String spender) async {
    try {
      final contract = DeployedContract(ContractAbi.fromJson(_allowanceAbi, 'ERC20'), EthereumAddress.fromHex(tokenAddr));
      final result = await client.call(contract: contract, function: contract.function('allowance'), params: [EthereumAddress.fromHex(owner), EthereumAddress.fromHex(spender)]);
      return result.first as BigInt;
    } catch (e) {
      if (kDebugMode) print("allowance error: $e");
      return BigInt.zero;
    }
  }

  // --- Amount parsing helper (safe) ---
  BigInt _parseTokenAmountFromString(String amountStr, int decimals) {
    final s = amountStr.trim();
    if (s.isEmpty) return BigInt.zero;
    final parts = s.split('.');
    final wholePart = parts[0].isEmpty ? BigInt.zero : BigInt.parse(parts[0]);
    BigInt frac = BigInt.zero;
    if (parts.length > 1) {
      var fracStr = parts[1];
      if (fracStr.length > decimals) fracStr = fracStr.substring(0, decimals);
      else fracStr = fracStr.padRight(decimals, '0');
      if (fracStr.isNotEmpty) frac = BigInt.parse(fracStr);
    }
    final pow10 = BigInt.from(10).pow(decimals);
    return wholePart * pow10 + frac;
  }

  // --- Bridge (Polygon Amoy) ---
  Future<String> bridgeTokens(double amount) async {
    if (amount <= 0) throw Exception("Amount must be > 0");
    isLoading = true;
    notifyListeners();

    try {
      // --- determine owner ---
      final owner = (walletConnected && connectedWalletAddress != null)
          ? connectedWalletAddress!
          : (userAddress?.hex ?? (throw Exception("No wallet address available")));

      // --- token contract & decimals ---
      final tokenContract = DeployedContract(
        ContractAbi.fromJson(ERC20_ABI, 'ERC20'),
        EthereumAddress.fromHex(polygonTokenAddress),
      );
      final decimals = (await _getDecimals(polygonClient!, tokenContract)).toInt();

      // precise conversion
      final amountWei = parseAmountToWei(amount.toString(), decimals);

      if (kDebugMode) {
        print("bridgeTokens: owner=$owner amountWei=$amountWei decimals=$decimals");
      }

      // --- check current allowance ---
      BigInt allowance = await _checkAllowance(
        polygonClient!,
        polygonTokenAddress,
        owner,
        polygonBridgeAddress,
      );

      if (kDebugMode) print("pre-allowance: $allowance");

      // --- if insufficient, approve using zero-then-approve pattern ---
      if (allowance < amountWei) {
        // If non-zero allowance exists, first set to zero (defensive)
        if (allowance > BigInt.zero) {
          final zeroApproveTx = Transaction.callContract(
            contract: tokenContract,
            function: tokenContract.function('approve'),
            parameters: [EthereumAddress.fromHex(polygonBridgeAddress), BigInt.zero],
          );
          await _sendTx(
            client: polygonClient!,
            tx: zeroApproveTx,
            chainId: polygonChainId,
            actionName: "Approve(0)",
          );

          // small wait to allow RPC to index change
          await Future.delayed(const Duration(seconds: 1));
        }

        // Now approve the needed amount
        final approveTx = Transaction.callContract(
          contract: tokenContract,
          function: tokenContract.function('approve'),
          parameters: [EthereumAddress.fromHex(polygonBridgeAddress), amountWei],
        );

        final approveHash = await _sendTx(
          client: polygonClient!,
          tx: approveTx,
          chainId: polygonChainId,
          actionName: "Approve",
        );

        if (kDebugMode) print("approveHash: $approveHash");

        // Poll allowance until it reaches requested amount (or timeout)
        int attempts = 0;
        const maxAttempts = 20; // ~20 seconds if you wait 1s each
        bool allowanceOk = false;
        while (attempts < maxAttempts) {
          await Future.delayed(const Duration(seconds: 1));
          allowance = await _checkAllowance(
            polygonClient!,
            polygonTokenAddress,
            owner,
            polygonBridgeAddress,
          );
          if (allowance >= amountWei) {
            allowanceOk = true;
            break;
          }
          attempts++;
        }
        if (!allowanceOk) {
          throw Exception("Allowance not visible after approve. allowance=$allowance required=$amountWei");
        }
      }

      // --- (optional) read bridge contract balance before sending, to detect transfer-fee tokens ---
      BigInt beforeBridgeBalance = BigInt.zero;
      try {
        final balRes = await polygonClient!.call(
          contract: tokenContract,
          function: tokenContract.function('balanceOf'),
          params: [EthereumAddress.fromHex(polygonBridgeAddress)],
        );
        beforeBridgeBalance = balRes.first as BigInt;
      } catch (_) { /* ignore */ }

      // --- send lockTokens tx ---
      final lockContract = DeployedContract(
        ContractAbi.fromJson(LOCK_VAULT_ABI, 'LockVault'),
        EthereumAddress.fromHex(polygonBridgeAddress),
      );

      final lockTx = Transaction.callContract(
        contract: lockContract,
        function: lockContract.function('lockTokens'),
        parameters: [amountWei],
      );

      final txHash = await _sendTx(
        client: polygonClient!,
        tx: lockTx,
        chainId: polygonChainId,
        actionName: "Bridge",
      );

      // --- post-check: see how much bridge contract received (detect transfer fee) ---
      try {
        final balResAfter = await polygonClient!.call(
          contract: tokenContract,
          function: tokenContract.function('balanceOf'),
          params: [EthereumAddress.fromHex(polygonBridgeAddress)],
        );
        final afterBridgeBalance = balResAfter.first as BigInt;
        final received = afterBridgeBalance - beforeBridgeBalance;
        if (kDebugMode) {
          print("Bridge received raw: $received, expected: $amountWei");
        }
        // If received < amountWei, token has transfer fees — inform user
        if (received < amountWei) {
          statusMessage = "Bridge succeeded, but token transfer fee detected (received ${received.toString()})";
        } else {
          statusMessage = "Bridge submitted: $txHash";
        }
      } catch (e) {
        // ignore
        statusMessage = "Bridge submitted: $txHash";
      }

      await refreshAll();
      return txHash;
    } catch (e, st) {
      statusMessage = "Bridge error: $e";
      if (kDebugMode) print("bridgeTokens error: $e\n$st");
      rethrow;
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  // --- Staking (always Sepolia per your choice) ---
  Future<void> stakeTokens(double amount) async => _stakingAction("stake", amount);
  Future<void> unstakeTokens(double amount) async => _stakingAction("unstake", amount);
  Future<void> burnTokens(double amount) async => _stakingAction("burn", amount);

  Future<void> claimRewards() async {
    isLoading = true;
    notifyListeners();
    try {
      final staking = DeployedContract(ContractAbi.fromJson(STAKING_ABI, 'EttyStakingVault'), EthereumAddress.fromHex(sepoliaStakingAddress));
      final tx = Transaction.callContract(contract: staking, function: staking.function('claimRewards'), parameters: []);
      await _sendTx(client: sepoliaClient!, tx: tx, chainId: sepoliaChainId, actionName: "Claim");
      statusMessage = "Claim submitted";
      await refreshAll();
    } catch (e) {
      statusMessage = "Claim error: $e";
      rethrow;
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }
  BigInt parseAmountToWei(String amountStr, int decimals) {
    // Accept "1.234", "2", etc.
    amountStr = amountStr.trim();
    if (amountStr.isEmpty) return BigInt.zero;

    if (!amountStr.contains('.')) {
      return BigInt.parse(amountStr) * BigInt.from(pow(10, decimals));
    }

    final parts = amountStr.split('.');
    final whole = parts[0].isEmpty ? BigInt.zero : BigInt.parse(parts[0]);
    String frac = parts[1];
    if (frac.length > decimals) {
      // truncate (no rounding) to avoid overflow
      frac = frac.substring(0, decimals);
    }
    // pad fractional part to decimals
    frac = frac.padRight(decimals, '0');
    final wholeWei = whole * BigInt.from(pow(10, decimals));
    final fracWei = BigInt.parse(frac);
    return wholeWei + fracWei;
  }

  Future<void> _stakingAction(String fn, double amount) async {
    if (amount <= 0) throw Exception("Amount must be > 0");
    isLoading = true;
    notifyListeners();
    try {
      final staking = DeployedContract(ContractAbi.fromJson(STAKING_ABI, 'EttyStakingVault'), EthereumAddress.fromHex(sepoliaStakingAddress));
      final token = DeployedContract(ContractAbi.fromJson(ERC20_ABI, 'ERC20'), EthereumAddress.fromHex(sepoliaTokenAddress));
      final decimals = (await _getDecimals(sepoliaClient!, token)).toInt();
      final amountWei = _parseTokenAmountFromString(amount.toString(), decimals);
      final actionName = fn == "stake" ? "Stake" : fn == "unstake" ? "Unstake" : "Burn";

      if (fn == "stake") {
        statusMessage = "Approving staking...";
        notifyListeners();
        await _approveToken(client: sepoliaClient!, tokenAddr: sepoliaTokenAddress, spender: sepoliaStakingAddress, amountWei: amountWei, chainId: sepoliaChainId, actionName: actionName);
      }

      final tx = Transaction.callContract(contract: staking, function: staking.function(fn), parameters: [amountWei]);
      await _sendTx(client: sepoliaClient!, tx: tx, chainId: sepoliaChainId, actionName: actionName);
      statusMessage = "$actionName successful";
      await refreshAll();
    } catch (e) {
      statusMessage = "$fn error: $e";
      rethrow;
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  // --- Tap miner & boost ---
  void addMiningPoints(int pts) {
    miningPoints += pts;
    notifyListeners();
  }

  void applyOneHourBoostFromPoints() {
    if (miningPoints < 100) throw Exception("Need 100 points");
    miningPoints -= 100;
    apyBoostPercent += 1.0;
    final now = DateTime.now();
    if (apyBoostExpiry != null && apyBoostExpiry!.isAfter(now)) apyBoostExpiry = apyBoostExpiry!.add(const Duration(hours: 1));
    else apyBoostExpiry = now.add(const Duration(hours: 1));
    notifyListeners();
  }

  // Reset tx UI
  void resetTxStatus() {
    txProgress = const TxProgress();
    notifyListeners();
  }
}