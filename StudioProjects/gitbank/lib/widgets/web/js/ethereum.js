if (typeof window.ethereum !== "undefined") {
  window.flutter_inject_eth = {
    requestAccounts: async function () {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      return accounts;
    },

    sendTransaction: async function (tx) {
      const result = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [tx],
      });
      return result;
    },

    signMessage: async function (msg) {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      return await window.ethereum.request({
        method: "personal_sign",
        params: [msg, accounts[0]],
      });
    }
  };
} else {
  window.flutter_inject_eth = null;
}
<head>
  ...
  <script src="js/ethereum.js"></script>
</head>