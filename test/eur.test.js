const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)

const assert = chai.assert
const expect = chai.expect
const wallets = require('aeproject-config').defaultWallets
const contracts = require('./init/contracts')

const Cooperative = require("./contracts/cooperative").Cooperative
const Eur = require("./contracts/eur").Eur
const Organization = require("./contracts/organization").Organization
const Project = require("./contracts/project").Project

const accountsInitializer = require("./init/accounts")
const deployer = require("./deploy/deployer")

const util = require('./utils/util')

describe("EUR contract tests", () => {

    let accounts
	let coop
    let eur

    /////////// ------ SETUP ------------ ///////////

    before(async () => {
        accounts = await accountsInitializer.initialize(wallets)
        let deployed = await deployer.deploy(accounts)
		coop = new Cooperative(deployed.coop)
		eur = new Eur(deployed.eur)
    })
    
    ///////////// --------- TESTS ----------- ///////////

    it('is deployed with minter role assigned to eurTokenOwner (not Coop owner?)', async () => {
        let fetchedOwner = eur.owner()
        expect(fetchedOwner).to.equal(accounts.eur.address, "Invalid EUR token owner!")
    })

    it('can mint tokens on wallet registered by Cooperative if caller is token issuer (deposit option)', async () => {
        let expectedBalance = 1000
        let randomWallet = util.generateRandomAeWallet()
        await coop.registerWallet(randomWallet.publicKey)
        await eur.mint(randomWallet.publicKey, expectedBalance)
        let actualBalance = await eur.getBalance(randomWallet.publicKey)
        expect(actualBalance).to.equal(expectedBalance)
    })

    it("should fail if trying to mint tokens to user registered by Cooperative when caller not token issuer", async () => {
        let randomWallet = util.generateRandomAeWallet()
        await coop.registerWallet(randomWallet.publicKey)
        let eurInstance = await accounts.bob.client.getContractInstance(contracts.eurSource, {
            contractAddress: eur.address()
        })
        let forbiddenMint = eurInstance.methods.mint(randomWallet.publicKey, 1000000)
        await expect(forbiddenMint).to.be.rejectedWith("Invocation failed: cb_UU9ubHkgb3duZXIgY2FuIG1pbnQhvfwVEw==. Decoded: QOnly owner can mint!��")
    })

    it("can burn tokens if user allowed token issuer to do so (withdraw option)", async () => {
        let randomWallet = util.generateRandomAeWallet()

        let startingBalance = 1000
        let withdrawAmount = 500
        let expectedRemainingBalance = startingBalance - withdrawAmount

        await coop.registerWallet(randomWallet.publicKey)
        await eur.mint(randomWallet.publicKey, startingBalance)
        await accounts.bank.client.spend(100000000000000000, randomWallet.publicKey)

        let randomWalletEurInstance = await eur.getInstance(randomWallet)
        await randomWalletEurInstance.approve(eur.owner(), withdrawAmount)
        await eur.burn(randomWallet.publicKey, withdrawAmount)

        let fetchedBalance = await eur.getBalance(randomWallet.publicKey)
        expect(fetchedBalance).to.equal(expectedRemainingBalance)
    })


    it('is is possible to send funds to another registered Cooperative user', async () => {
        let alice = util.generateRandomAeWallet()
        let bob = util.generateRandomAeWallet()
        let bobInitialBalance = 5000
        let aliceInitialBalance = 0
        let transferAmountBobToAlice = 5000
        let bobFinalBalance = bobInitialBalance - transferAmountBobToAlice
        let aliceFinalBalance = aliceInitialBalance + transferAmountBobToAlice
        
        await coop.registerWallet(alice.publicKey)
        await coop.registerWallet(bob.publicKey)
        
        await accounts.bank.client.spend(100000000000000000, bob.publicKey)
        await eur.mint(bob.publicKey, bobInitialBalance)

        let bobEurInstance = await eur.getInstance(bob)
        await bobEurInstance.transfer(alice.publicKey, transferAmountBobToAlice)

        let fetchedBobBalance = await eur.getBalance(bob.publicKey)
        expect(fetchedBobBalance).to.equal(bobFinalBalance)

        let fetchedAliceBalance = await eur.getBalance(alice.publicKey)
        expect(fetchedAliceBalance).to.equal(aliceFinalBalance)
    })

    it('should fail if trying to send funds to user not registered in Cooperative contract', async () => {
        let registeredCoopWallet = util.generateRandomAeWallet()
        let nonRegisteredCoopWallet = util.generateRandomAeWallet()
        
        let amount = 100
        await coop.registerWallet(registeredCoopWallet.publicKey)
        await eur.mint(registeredCoopWallet.publicKey, amount)
        await accounts.bank.client.spend(100000000000000000, registeredCoopWallet.publicKey)
        
        let registeredCoopWalletEurInstance = await eur.getInstance(registeredCoopWallet)
        let forbiddenTransfer = registeredCoopWalletEurInstance.transfer(nonRegisteredCoopWallet.publicKey, amount)

        await expect(forbiddenTransfer).to.be.rejectedWith("Invocation failed: cb_2U9ubHkgcmVnaXN0ZXJlZCBDb29wZXJhdGl2ZSB1c2VyIGNhbiBtYWtlIHRoaXMgYWN0aW9uITerAto=. Decoded: �Only registered Cooperative user can make this action!7�\u0002�")
    })

    it('should fail when anyone tries to burn his own tokens - only token issure can burn', async () => {
        let randomWallet = util.generateRandomAeWallet()
        let amount = 100

        await accounts.bank.client.spend(100000000000000000, randomWallet.publicKey)
        await coop.registerWallet(randomWallet.publicKey)
        await eur.mint(randomWallet.publicKey, amount)

        let randomWalletEurInstance = await eur.getInstance(randomWallet)
        let forbiddenBurn = randomWalletEurInstance.burn(randomWallet.publicKey, amount)

        await expect(forbiddenBurn).to.be.rejectedWith("cb_UU9ubHkgb3duZXIgY2FuIG1pbnQhvfwVEw==. Decoded: QOnly owner can mint!��")
    })

})