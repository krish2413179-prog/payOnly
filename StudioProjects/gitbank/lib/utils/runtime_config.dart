import 'dart:convert';
import 'package:http/http.dart' as http;

class RuntimeConfig {
  final String polygonRpc;
  final String sepoliaRpc;
  final String polygonTokenAddress;
  final String sepoliaTokenAddress;
  final String polygonBridgeAddress;
  final String sepoliaStakingAddress;

  RuntimeConfig({
    required this.polygonRpc,
    required this.sepoliaRpc,
    required this.polygonTokenAddress,
    required this.sepoliaTokenAddress,
    required this.polygonBridgeAddress,
    required this.sepoliaStakingAddress,
  });

  factory RuntimeConfig.fromJson(Map<String, dynamic> j) => RuntimeConfig(
    polygonRpc: j['polygonRpc'],
    sepoliaRpc: j['sepoliaRpc'],
    polygonTokenAddress: j['polygonTokenAddress'],
    sepoliaTokenAddress: j['sepoliaTokenAddress'],
    polygonBridgeAddress: j['polygonBridgeAddress'],
    sepoliaStakingAddress: j['sepoliaStakingAddress'],
  );

  static Future<RuntimeConfig> load() async {
    final res = await http.get(Uri.parse("/config.json"));
    if (res.statusCode != 200) throw Exception("config.json missing");
    return RuntimeConfig.fromJson(json.decode(res.body));
  }
}