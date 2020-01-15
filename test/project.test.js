let Ae = require('@aeternity/aepp-sdk').Universal
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

    it("can create new project if caller is organization admin and organization is verified", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.coop.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        expect(proj.contractInstance.deployInfo.result.returnType).is.equal('ok')

        let fetchedProjectInfo = await proj.getInfo()
        expect(fetchedProjectInfo.minInvestmentPerUser).is.equal(projectInfo.minInvestmentPerUser)
        expect(fetchedProjectInfo.maxInvestmentPerUser).is.equal(projectInfo.maxInvestmentPerUser)
        expect(fetchedProjectInfo.investmentCap).is.equal(projectInfo.investmentCap)
        expect(fetchedProjectInfo.endsAt).is.equal(projectInfo.endsAt)

        let hasFundingExpired = await proj.hasFundingExpired()
        let isCompletelyFunded = await proj.isCompletelyFunded()
        let totalFundsRaised = await proj.totalFundsRaised()
        expect(hasFundingExpired).to.be.false
        expect(isCompletelyFunded).to.be.false
        expect(totalFundsRaised).is.equal(0)

        let investments = await proj.getInvestments()
        expect(investments).to.be.an('array').that.is.empty

        await coop.registerWallet(proj.address())
        let isWalletActive = await coop.isWalletActive(proj.address())
        expect(isWalletActive).to.be.true
    })

    it("should fail to create project if caller is not an organization admin", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.coop.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let notOwner = util.generateRandomAeWallet()
        await coop.registerWallet(notOwner.publicKey)
        await accounts.coop.client.spend(100000000000000000, notOwner.publicKey)

        let forbiddenProjectCreate = createProject(org, notOwner, projectInfo)
        await expect(forbiddenProjectCreate).to.be.rejectedWith("Invocation failed: cb_4U11c3QgYmUgb3JnYW5pemF0aW9uIG93bmVyIHRvIGJlIGFibGUgdG8gY3JlYXRlIFByb2plY3Qub3u5pA==. Decoded: �Must be organization owner to be able to create Project.o{��")
    })

    it("should fail to create project if organization is not verified", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.coop.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        let forbiddenProjectCreate = createProject(org, orgOwner, projectInfo)
        await expect(forbiddenProjectCreate).to.be.rejectedWith("Invocation failed: cb_ARJPcmdhbml6YXRpb24gbXVzdCBoYXZlIGFuIGFjdGl2ZSB3YWxsZXQgYmVmb3JlIGl0IGNhbiBjcmVhdGUgbmV3IFByb2plY3QuIUxpOA==. Decoded: \u0001\u0012Organization must have an active wallet before it can create new Project.!Li8")
    })

    ///////////// --------- HELPERS ----------- ////////////

    async function createOrganization(keypair) {
        let client = await Ae({
            ...AeConfig,
            keypair: keypair
        })
        let org = new Organization(coop.address(), client)
        await org.deploy()
        return org
    }

    async function createProject(organization, keypair, project) {
        let client = await Ae({
            ...AeConfig,
            keypair: keypair
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