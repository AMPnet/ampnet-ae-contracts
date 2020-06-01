let { Universal: Ae, Node, MemoryAccount } = require('@aeternity/aepp-sdk')
let AeConfig = require('./init/config').local

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
const SellOffer = require("./contracts/selloffer").SellOffer

const accountsInitializer = require("./init/accounts")
const deployer = require("./deploy/deployer")

const util = require('./utils/util')
const time = require('./utils/time')

describe("Project contract tests", () => {

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

    it("should be able to exchange tokens for stake in project (instant scenario)", async () => {
        let projectInfo = generateProject()

        await coop.registerWallet(accounts.bob.address)
        let org = await createOrganization(accounts.bob.keypair)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, accounts.bob.keypair, projectInfo)
        await coop.registerWallet(proj.address())

        let investor = accounts.bob
        let investmentAmount = projectInfo.investmentCap
        let sharesToTransfer = investmentAmount / 2
        let priceOfSharesToTransfer = 100
        await eur.mint(investor.address, investmentAmount)

        let investorEurInstance = await eur.getInstance(investor.keypair)
        await investorEurInstance.approve(proj.address(), investmentAmount)
        await proj.invest(investor.address)

        let newSharesOwner = accounts.alice
        await coop.registerWallet(newSharesOwner.address)
        await eur.mint(newSharesOwner.address, priceOfSharesToTransfer)
        
        let sellOffer = new SellOffer(proj.address(), investor.client, sharesToTransfer, priceOfSharesToTransfer)
        await sellOffer.deploy()
        await proj.activateSellOffer(sellOffer.address())
        
        let buyerEurInstance = await eur.getInstance(newSharesOwner.keypair)
        await buyerEurInstance.approve(sellOffer.address(), priceOfSharesToTransfer)
        await sellOffer.tryToSettle(newSharesOwner.address)

        let investorBalance = await eur.getBalance(investor.address)
        let investorOwnedShares = await proj.getInvestment(investor.address)
        assert.strictEqual(investorBalance, priceOfSharesToTransfer)
        assert.strictEqual(investorOwnedShares, investmentAmount - sharesToTransfer)

        let newSharesOwnerBalance = await eur.getBalance(newSharesOwner.address)
        let newSharesOwnerOwnedShares = await proj.getInvestment(newSharesOwner.address)
        assert.strictEqual(newSharesOwnerBalance, 0)
        assert.strictEqual(newSharesOwnerOwnedShares, sharesToTransfer)
    })

    it("should be able to exchange tokens for stake in project (counter-offer scenario)", async () => {
        let projectInfo = generateProject()

        await coop.registerWallet(accounts.bob.address)
        let org = await createOrganization(accounts.bob.keypair)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, accounts.bob.keypair, projectInfo)
        await coop.registerWallet(proj.address())

        let investor = accounts.bob
        let investmentAmount = projectInfo.investmentCap
        let sharesToTransfer = investmentAmount / 2
        let priceOfSharesToTransfer = 100
        await eur.mint(investor.address, investmentAmount)

        let investorEurInstance = await eur.getInstance(investor.keypair)
        await investorEurInstance.approve(proj.address(), investmentAmount)
        await proj.invest(investor.address)

        let newSharesOwner = accounts.alice
        await coop.registerWallet(newSharesOwner.address)
        await eur.mint(newSharesOwner.address, priceOfSharesToTransfer)
        
        let sellOffer = new SellOffer(proj.address(), investor.client, sharesToTransfer, priceOfSharesToTransfer)
        await sellOffer.deploy()
        await proj.activateSellOffer(sellOffer.address())
        
        let buyerEurInstance = await eur.getInstance(newSharesOwner.keypair)
        let counterOfferPrice = 80
        await buyerEurInstance.approve(sellOffer.address(), counterOfferPrice)
        await sellOffer.tryToSettle(newSharesOwner.address)
        await sellOffer.acceptCounterOffer(newSharesOwner.address)

        let investorBalance = await eur.getBalance(investor.address)
        let investorOwnedShares = await proj.getInvestment(investor.address)
        assert.strictEqual(investorBalance, counterOfferPrice)
        assert.strictEqual(investorOwnedShares, investmentAmount - sharesToTransfer)

        let newSharesOwnerBalance = await eur.getBalance(newSharesOwner.address)
        let newSharesOwnerOwnedShares = await proj.getInvestment(newSharesOwner.address)
        assert.strictEqual(newSharesOwnerBalance, priceOfSharesToTransfer - counterOfferPrice)
        assert.strictEqual(newSharesOwnerOwnedShares, sharesToTransfer)
    })

    ///////////// --------- HELPERS ----------- ////////////

    async function createOrganization(keypair) {
        let node = await Node({
            url: AeConfig.url,
            internalUrl: AeConfig.internalUrl
        })
        let client = await Ae({
            nodes: [ { name: "node", instance: node } ],
            compilerUrl: AeConfig.compilerUrl,
            accounts: [
                MemoryAccount({ keypair: keypair })
            ],
            address: keypair.publicKey,
            networkId: AeConfig.networkId
        })
        let org = new Organization(coop.address(), client)
        await org.deploy()
        return org
    }

    async function createProject(organization, keypair, project) {
        let node = await Node({
            url: AeConfig.url,
            internalUrl: AeConfig.internalUrl
        })
        let client = await Ae({
            nodes: [ { name: "node", instance: node } ],
            compilerUrl: AeConfig.compilerUrl,
            accounts: [
                MemoryAccount({ keypair: keypair })
            ],
            address: keypair.publicKey,
            networkId: AeConfig.networkId
        })
        let proj = new Project(organization.address(), client, project)
        await proj.deploy()
        return proj
    }

    //////////// ----------- TEST DATA ------------- ////////////

    function generateProject(
        minInvestmentPerUser = 100,
        maxInvestmentPerUser = 1000,
        investmentCap = 1000,
        endsAtSecondsOffset = 300
    ) {
        return {
            minInvestmentPerUser,
            maxInvestmentPerUser,
            investmentCap,
            endsAt: time.currentTimeWithSecondsOffset(endsAtSecondsOffset)
        }
    }


})