enum TxStatus {
  idle,
  sending,
  pending,
  confirming,
  success,
  failed
}

class TxProgress {
  TxStatus status;
  String message;
  String? txHash;
  int confirmations;

  TxProgress({
    this.status = TxStatus.idle,
    this.message = "",
    this.txHash,
    this.confirmations = 0,
  });
}
