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

describe("Cooperative contract tests", () => {

    let accounts
	let coop
    let eur

    /////////// ---------- SETUP ------------ ///////////

    before(async () => {
        accounts = await accountsInitializer.initialize(wallets)
        let deployed = await deployer.deploy(accounts)
		coop = new Cooperative(deployed.coop)
		eur = new Eur(deployed.eur)
    })

    ///////////// --------- TESTS ----------- ///////////

    it('is deployed with coopOwner wallet as owner', async () => {
        let fetchedOwner = coop.owner()
        expect(fetchedOwner).to.equal(accounts.coop.address)    
    })

    it('can register new user if caller is Cooperative owner', async () => {
        let randomWallet = util.generateRandomAeWallet()
        await coop.registerWallet(randomWallet.publicKey)
        let isWalletActive = await coop.isWalletActive(randomWallet.publicKey)
        expect(isWalletActive).to.be.true
    })

    it('should fail if trying to register new user when caller not Cooperative owner', async () => {
        let randomWallet = util.generateRandomAeWallet()
        let fakeAdmin = util.generateRandomAeWallet()
        await accounts.coop.client.spend(100000000000000000, fakeAdmin.publicKey)
        let fakeAdminCoopInstance = await coop.getInstance(fakeAdmin)
        
        let forbiddenCall = fakeAdminCoopInstance.registerWallet(randomWallet.publicKey)
        await expect(forbiddenCall).to.be.rejectedWith("Invocation failed: cb_gU9ubHkgb3duZXIgY2FuIG1ha2UgdGhpcyBhY3Rpb24hEKNgCg==. Decoded: �Only owner can make this action!\u0010�`\n")
    })

})