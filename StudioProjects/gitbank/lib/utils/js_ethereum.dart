@JS('flutter_inject_eth')
library eth;

import 'package:js/js.dart';

@JS()
external dynamic requestAccounts();

@JS()
external dynamic sendTransaction(dynamic tx);

@JS()
external dynamic signMessage(String msg);