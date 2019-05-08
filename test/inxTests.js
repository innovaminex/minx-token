import 'babel-polyfill';
import 'web3';
const truffleAssert = require('truffle-assertions');
const INX = artifacts.require('./INX.sol');
const BN = web3.utils.BN;

let instance;
let accounts;

contract('INX', async (accs) => {
    accounts = accs;
    instance = await INX.deployed();
  });

  it('BASIC: token name is correct', async() => {
    let tokenId = 1;
    //Wait until instance is there. Weird because of Async, 
    //but it may be undefined at first and affect other tests too.
    for(let i = 0; i<100000000;i++){
        if(instance != undefined){
            assert.equal(await instance.name.call(), "InnovaMinex");
            break;
        }
    }
  });

  it('BASIC: token symbol is correct', async() => {
    assert.equal(await instance.symbol.call(), "MINX");
  });

  it('BASIC: token decimals is correct', async() => {
    assert.equal(await instance.decimals.call(), 6);
  });

  it('DEPLOYMENT: token total supply is correct', async() => {
    assert.equal(await instance.totalSupply.call(), 300000000000000);
  });

  it('DEPLOYMENT: token balance of deployer equals token supply', async() => {
    let user = accounts[0];
    assert.equal(await instance.balanceOf(user), 300000000000000);
  });

  it('TRANSFER: send own tokens to address', async() => {
    let sender = accounts[0];
    let receiver = accounts[1];
    let amount = 10*1000000;
    let initialBalanceSender = await instance.balanceOf(sender);
    let initialBalanceReceiver = await instance.balanceOf(receiver);
    
    let tx = await instance.transfer(receiver, amount, {from: sender});

    truffleAssert.eventEmitted(tx, 'Transfer', (ev) => {
      let amountsAreEqual = (new BN(ev.value).toString() === new BN(amount).toString());
      return (ev.from === sender) && (ev.to === receiver) && amountsAreEqual;
    });

    assert.equal(
      new BN(await instance.balanceOf(sender)).toString(), 
      new BN(initialBalanceSender).sub(new BN(amount)).toString()
    );
    assert.equal(
      new BN(await instance.balanceOf(receiver)).toString(), 
      new BN(initialBalanceReceiver).add(new BN(amount)).toString()
    );
  });

  it('ALLOWANCE: approve an account for an amount: 10', async() => {
    let allower = accounts[0];
    let approved = accounts[1];
    let checker = accounts[2];
    let amount = 10*1000000;

    let tx = await instance.approve(approved, amount, {from: allower});

    truffleAssert.eventEmitted(tx, 'Approval', (ev) => {
      let amountsAreEqual = (new BN(ev.value).toString() === new BN(amount).toString());
      return (ev.owner === allower) && (ev.spender === approved) && amountsAreEqual;
    });

    assert.equal(
      new BN(await instance.allowance(allower, approved, {from: checker})).toString(),
      new BN(amount).toString()
    );
  });

  it('ALLOWANCE: increase previously approved amount: +5', async() => {
    let allower = accounts[0];
    let approved = accounts[1];
    let amount = 5*1000000;
    let previousAllowance = await instance.allowance(allower, approved, {from:allower});
    let tx = await instance.increaseAllowance(approved, amount, {from: allower});
    let nextAllowance = await instance.allowance(allower, approved, {from:allower});

    truffleAssert.eventEmitted(tx, 'Approval', (ev) => {
      let amountsAreEqual = (new BN(ev.value).toString() === new BN(nextAllowance).toString());
      return (ev.owner === allower) && (ev.spender === approved) && amountsAreEqual;
    });

    assert.equal(
      new BN(await instance.allowance(allower, approved, {from: allower})).toString(),
      new BN(previousAllowance).add(new BN(amount)).toString()
    );
  });

  it('ALLOWANCE: decrease previously approved amount: -3', async() => {
    let allower = accounts[0];
    let approved = accounts[1];
    let amount = 3*1000000;
    let previousAllowance = await instance.allowance(allower, approved, {from:allower});
    let tx = await instance.decreaseAllowance(approved, amount, {from: allower});
    let nextAllowance = await instance.allowance(allower, approved, {from:allower});

    truffleAssert.eventEmitted(tx, 'Approval', (ev) => {
      let amountsAreEqual = (new BN(ev.value).toString() === new BN(nextAllowance).toString());
      return (ev.owner === allower) && (ev.spender === approved) && amountsAreEqual;
    });

    assert.equal(
      new BN(await instance.allowance(allower, approved, {from: allower})).toString(),
      new BN(previousAllowance).sub(new BN(amount)).toString()
    );
  });

  it('ALLOWANCE & TRANSFER: send from approved account: 12', async() => {
    let allower = accounts[0];
    let spender = accounts[1];
    let receiver = accounts[2];
    let amount = 12*1000000;
    let initialBalanceAllower = await instance.balanceOf(allower);
    let initialBalanceReceiver = await instance.balanceOf(receiver);
    
    let tx = await instance.transferFrom(allower, receiver, amount, {from: spender});

    truffleAssert.eventEmitted(tx, 'Approval', (ev) => {
      let amountsAreEqual = (new BN(ev.value).toString() === new BN(0).toString());
      return (ev.owner === allower) && (ev.spender === spender) && amountsAreEqual;
    });

    truffleAssert.eventEmitted(tx, 'Transfer', (ev) => {
      let amountsAreEqual = (new BN(ev.value).toString() === new BN(amount).toString());
      return (ev.from === allower) && (ev.to === receiver) && amountsAreEqual;
    });


    assert.equal(
      new BN(await instance.balanceOf(allower)).toString(), 
      new BN(initialBalanceAllower).sub(new BN(amount)).toString()
    );
    assert.equal(
      new BN(await instance.balanceOf(receiver)).toString(), 
      new BN(initialBalanceReceiver).add(new BN(amount)).toString()
    );
  });


  it('BURN: burn own tokens && decrease total supply', async() => {
    let sender = accounts[0];
    let amount = 10*1000000;
    let initialBalanceSender = await instance.balanceOf(sender);
    
    let tx = await instance.burn( amount, {from: sender});

    truffleAssert.eventEmitted(tx, 'Transfer', (ev) => {
      let amountsAreEqual = (new BN(ev.value).toString() === new BN(amount).toString());
      return (ev.from === sender)  && amountsAreEqual;
    });

    assert.equal(
      new BN(await instance.balanceOf(sender)).toString(), 
      new BN(initialBalanceSender).sub(new BN(amount)).toString()
    );

    assert.equal(await instance.totalSupply.call(), 300000000000000-amount);
    
  });

