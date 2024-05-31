// const Web3 = require("web3");
// const contract = require("@truffle/contract");
// const artifacts = require("../blockchain_node_api/build/contracts/Contacts.json");
// // const CONTACT_ABI = require("./config");
// // const CONTACT_ADDRESS = require("./config");

// const web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:7545"));
// const contractInstance = contract(artifacts);
// contractInstance.setProvider(web3.currentProvider);

// exports.getProperty = async () => {
//   // try {
//   //   // const { propertyId } = req.params;
//   //   const propertyData = await getPropertyData();
//   //   res.json(propertyData);
//   // } catch (error) {
//   //   console.error(error);
//   //   res.status(500).json({ error: "Internal Server Error" });
//   // }
//   try {
//     const instance = await contractInstance.deployed();
//     // let cache = [];
//     // const COUNTER = await contractInstance.methods.count().call();
//     // for (let i = 1; i <= COUNTER; i++) {
//     const contact = await instance.getTransaction(1234);
//     // cache = [...cache, contact];
//     // }
//     console.log(contact);
//     // res.json(cache);
//     return;
//   } catch (error) {
//     console.error(error);
//     // res.status(500).json({ error: "Internal Server Error" });
//   }
// };

// exports.setTransaction = async ({_id, _userid, _followers, _likes}) => {
//   try {
//     // const instance = new web3.eth.Contract(
//     //   artifactsTransaction.abi,
//     //   TRANSACTION_CONTRACT_ADDRESS
//     // );

//     // console.log(gasPrice);

//     // let balance = await web3.eth.getBalance(account);
//     // balance = web3.utils.fromWei(balance, "ether");
//     // console.log(balance);

//     const transactionData = [
//       _id,
//       _userid,
//       _followers,
//       _likes,
//     ];

//     console.log(transactionData);

//     let accounts = await web3.eth.getAccounts();
//     const instance = await contractInstance.deployed();
//     await instance.createContact(...transactionData, {
//       from: accounts[0],
//     });
//   } catch (error) {
//     console.error(error);
//     // res.status(500).json({ error: "Internal Server Error" });
//   }
// };




const Web3 = require("web3");
const contract = require("@truffle/contract");
const artifactsTransaction = require("../blockchain_node_api/build/contracts/Contacts.json");
// const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const { BL_PRIVATE_KEY, TRANSACTION_CONTRACT_ADDRESS, ACCOUNT } = process.env;
const account = ACCOUNT;

const web3 = new Web3(
  new Web3.providers.WebsocketProvider(
    `wss://eth-sepolia.g.alchemy.com/v2/${process.env.PROJECT_ID}`
  )
);
// const web3_send = new Web3('https://sepolia.infura.io/v3/ded983088f234ae28702ddfabbcc411c');
const web3_send = new Web3('https://eth-sepolia.g.alchemy.com/v2/dkhqCl3kyNVSx2e2CMA1-LZLf--EZ3U2');
// const contractInstance = contract(artifacts);
// contractInstance.setProvider(web3.currentProvider);

exports.getTransaction = async (req, res) => {
  try {
    const instance = new web3.eth.Contract(
      artifactsTransaction.abi,
      TRANSACTION_CONTRACT_ADDRESS
    );
    // const { propertyId } = req.params;
    const contact = await instance.methods.getTransaction(983983).call();
    console.log(contact);
    res.send(contact);
  } catch (error) {
    console.error(error);
    // res.status(500).json({ error: "Internal Server Error" });
    return false;
  }
};

exports.setTransaction = async ({ _id, _userid, _followers, _likes, _reward }) => {
  try {
    const instance = new web3.eth.Contract(
      artifactsTransaction.abi,
      TRANSACTION_CONTRACT_ADDRESS
    );

    const transactionData = [_id, _userid, _followers, _likes, _reward];

    console.log(transactionData);

    let gas = await instance.methods
      .createContact(...transactionData)
      .estimateGas({ from: account });
    gas = Math.floor(gas);
    console.log(gas);
    const gasPrice = web3.utils.toWei("0.0000001", "ether"); // Reduced gas price

    const tx = {
      from: account,
      to: TRANSACTION_CONTRACT_ADDRESS,
      gas: gas, // Reduced gas limit
      gasPrice: gasPrice, // Reduced gas price (in wei)
      data: instance.methods.createContact(...transactionData).encodeABI(),
    };

    const signature = await web3.eth.accounts.signTransaction(
      tx,
      BL_PRIVATE_KEY
    );

    await web3.eth
      .sendSignedTransaction(signature.rawTransaction)
      .on("receipt", (receipt) => {
        console.log(receipt);
      });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

exports.sendEther = async ({receiverAddress, amountInEthers}) => {

  try {
    const amountInWei = web3_send.utils.toWei((amountInEthers/100).toString(), 'ether');
    var SignedTransaction = await web3_send.eth.accounts.signTransaction({
      to:  receiverAddress,
      value: amountInWei,
      gas: 100000
      },  BL_PRIVATE_KEY  );
      web3_send.eth.sendSignedTransaction(SignedTransaction.rawTransaction).then((receipt) => {
        console.log(receipt);
  });

  } catch (error) {
    console.error(`Error sending ether: ${error}`);
  }
}
