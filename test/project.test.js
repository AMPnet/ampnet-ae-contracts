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

    it("can process new user investment", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.coop.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let investor = util.generateRandomAeWallet()
        await coop.registerWallet(investor.publicKey)
        await eur.mint(investor.publicKey, projectInfo.minInvestmentPerUser)
        await accounts.coop.client.spend(100000000000000000, investor.publicKey)

        let investorEurInstance = await eur.getInstance(investor)
        let investmentAmount = projectInfo.minInvestmentPerUser
        await investorEurInstance.approve(proj.address(), investmentAmount)
        await proj.invest(investor.publicKey)

        let totalFundsRaised = await proj.totalFundsRaised()
        expect(totalFundsRaised).to.be.equal(investmentAmount)

        let isCompletelyFunded = await proj.isCompletelyFunded()
        expect(isCompletelyFunded).to.be.false

        let investorProjInstance = await proj.getInstance(investor)
        let fetchedInvestment = await investorProjInstance.getInvestment()
        expect(fetchedInvestment).to.be.equal(investmentAmount)
    })

    it("should signalize when investment cap reached", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.coop.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let investor = util.generateRandomAeWallet()
        let investmentAmount = projectInfo.investmentCap
        await coop.registerWallet(investor.publicKey)
        await eur.mint(investor.publicKey, investmentAmount)
        await accounts.coop.client.spend(100000000000000000, investor.publicKey)

        let investorEurInstance = await eur.getInstance(investor)
        await investorEurInstance.approve(proj.address(), investmentAmount)
        await proj.invest(investor.publicKey)

        let isCompletelyFunded = await proj.isCompletelyFunded()
        expect(isCompletelyFunded).to.be.true
    })

    it("should fail to process investment if project completely funded", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.coop.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let investor = util.generateRandomAeWallet()
        let investmentAmount = projectInfo.investmentCap
        await coop.registerWallet(investor.publicKey)
        await eur.mint(investor.publicKey, investmentAmount)
        await accounts.coop.client.spend(100000000000000000, investor.publicKey)

        let investorEurInstance = await eur.getInstance(investor)
        await investorEurInstance.approve(proj.address(), investmentAmount)
        await proj.invest(investor.publicKey)

        let unluckyInvestor = util.generateRandomAeWallet()
        let unluckyInvestmentAmount = projectInfo.minInvestmentPerUser
        await coop.registerWallet(unluckyInvestor.publicKey)
        await eur.mint(unluckyInvestor.publicKey, unluckyInvestmentAmount)
        await accounts.coop.client.spend(100000000000000000, unluckyInvestor.publicKey)
        
        let unluckyInvestorEurInstance = await eur.getInstance(unluckyInvestor)
        await unluckyInvestorEurInstance.approve(proj.address(), unluckyInvestmentAmount)
        
        let forbiddenInvestCall = proj.invest(unluckyInvestor.publicKey)
        await expect(forbiddenInvestCall).to.be.rejectedWith("Invocation failed: cb_yUNhbiBub3QgaW52ZXN0LCBwcm9qZWN0IGFscmVhZHkgY29tcGxldGVseSBmdW5kZWQu52wRvw==. Decoded: �Can not invest, project already completely funded.�l\u0011�")
    })

    it("should fail to process investment if trying to invest 0 tokens", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.coop.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let investor = util.generateRandomAeWallet()
        await coop.registerWallet(investor.publicKey)
        await accounts.coop.client.spend(100000000000000000, investor.publicKey)

        let forbiddenCall = proj.invest(investor.publicKey)
        await expect(forbiddenCall).to.be.rejectedWith("Invocation failed: cb_bUNhbiBub3QgaW52ZXN0IHplcm8gdG9rZW5zIRIYreE=. Decoded: mCan not invest zero tokens!\u0012\u0018��")
    })

    it("should fail if user's single investment or additional investment will surpass maxPerUser limit", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.coop.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let investor = util.generateRandomAeWallet()
        let singleInvestmentOutOfBounds = projectInfo.maxInvestmentPerUser + 1
        await coop.registerWallet(investor.publicKey)
        await accounts.coop.client.spend(100000000000000000, investor.publicKey)
        await eur.mint(investor.publicKey, singleInvestmentOutOfBounds)

        let investorEurInstance = await eur.getInstance(investor)
        await investorEurInstance.approve(proj.address(), singleInvestmentOutOfBounds)
        
        let forbiddenSingleInvestment = proj.invest(investor.publicKey)
        await expect(forbiddenSingleInvestment).to.be.rejectedWith("Invocation failed: cb_ASxVc2VyJ3MgaW52ZXN0bWVudCB3aWxsIHN1cnBhc3MgbWF4aW11bSBwZXItdXNlciBpbnZlc3RtZW50IGZvciB0aGlzIHByb2plY3QuIEFib3J0aW5nLhXE0g4=. Decoded: \u0001,User\'s investment will surpass maximum per-user investment for this project. Aborting.\u0015��\u000e")
    
        await investorEurInstance.approve(proj.address(), projectInfo.minInvestmentPerUser)
        await proj.invest(investor.publicKey)
        await investorEurInstance.approve(proj.address(), singleInvestmentOutOfBounds - projectInfo.minInvestmentPerUser)
        let forbiddenAdditionalInvestment = proj.invest(investor.publicKey)
        await expect(forbiddenAdditionalInvestment).to.be.rejectedWith("Invocation failed: cb_ASxVc2VyJ3MgaW52ZXN0bWVudCB3aWxsIHN1cnBhc3MgbWF4aW11bSBwZXItdXNlciBpbnZlc3RtZW50IGZvciB0aGlzIHByb2plY3QuIEFib3J0aW5nLhXE0g4=. Decoded: \u0001,User\'s investment will surpass maximum per-user investment for this project. Aborting.\u0015��\u000e")
    })

    it("should fail if user's investment does not meet minimum required perUserInvestment", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.coop.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let investor = util.generateRandomAeWallet()
        let investmentAmount = projectInfo.minInvestmentPerUser - 1
        await coop.registerWallet(investor.publicKey)
        await accounts.coop.client.spend(100000000000000000, investor.publicKey)
        await eur.mint(investor.publicKey, investmentAmount)

        let investorEurInstance = await eur.getInstance(investor)
        await investorEurInstance.approve(proj.address(), investmentAmount)
        
        let forbiddenInvest = proj.invest(investor.publicKey)
        await expect(forbiddenInvest).to.be.rejectedWith("Invocation failed: cb_AUBVc2VyJ3MgaW52ZXN0bWVudCBkb2VzIG5vdCBtZWV0IHJlcXVpcmVkIG1pbmltdW0gcGVyLXVzZXIgaW52ZXN0bWVudCBmb3IgdGhpcyBwcm9qZWN0LiBBYm9ydGluZy7nv6Eb. Decoded: \u0001@User\'s investment does not meet required minimum per-user investment for this project. Aborting.翡\u001b")
    })

    it("should fail if user's investment will make total funds raised be greater than the actual investment cap", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.coop.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let firstInvestor = util.generateRandomAeWallet()
        let firstInvestmentAmount = projectInfo.minInvestmentPerUser
        await coop.registerWallet(firstInvestor.publicKey)
        await accounts.coop.client.spend(100000000000000000, firstInvestor.publicKey)
        await eur.mint(firstInvestor.publicKey, firstInvestmentAmount)

        let firstInvestorEurInstance = await eur.getInstance(firstInvestor)
        await firstInvestorEurInstance.approve(proj.address(), firstInvestmentAmount)
        await proj.invest(firstInvestor.publicKey)

        let secondInvestor = util.generateRandomAeWallet()
        let secondInvestmentAmount = projectInfo.maxInvestmentPerUser
        await coop.registerWallet(secondInvestor.publicKey)
        await accounts.coop.client.spend(100000000000000000, secondInvestor.publicKey)
        await eur.mint(secondInvestor.publicKey, secondInvestmentAmount)
        
        let secondInvestorEurInstance = await eur.getInstance(secondInvestor)
        await secondInvestorEurInstance.approve(proj.address(), secondInvestmentAmount)
        let forbiddenInvest = proj.invest(secondInvestor.publicKey)
        await expect(forbiddenInvest).to.be.rejectedWith("Invocation failed: cb_AT5Vc2VyJ3MgaW52ZXN0bWVudCB3aWxsIG1ha2UgdG90YWwgZnVuZHMgcmFpc2VkIGdyZWF0ZXIgdGhhbiBwcm9qZWN0J3MgaW52ZXN0bWVudCBjYXAuIEFib3J0aW5nLuVH8Q8=. Decoded: \u0001>User\'s investment will make total funds raised greater than project\'s investment cap. Aborting.�G�\u000f")
    })

    it("should fail if user's investment will leave tiny fraction (smaller than minimumPerUser amount) not funded resulting in dead-lock state", async () => {
        let projectInfo = generateProject()

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.coop.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let firstInvestor = util.generateRandomAeWallet()
        let firstInvestmentAmount = 850
        await coop.registerWallet(firstInvestor.publicKey)
        await accounts.coop.client.spend(100000000000000000, firstInvestor.publicKey)
        await eur.mint(firstInvestor.publicKey, firstInvestmentAmount)

        let firstInvestorEurInstance = await eur.getInstance(firstInvestor)
        await firstInvestorEurInstance.approve(proj.address(), firstInvestmentAmount)
        await proj.invest(firstInvestor.publicKey)

        let secondInvestor = util.generateRandomAeWallet()
        let secondInvestmentAmount = 100
        await coop.registerWallet(secondInvestor.publicKey)
        await accounts.coop.client.spend(100000000000000000, secondInvestor.publicKey)
        await eur.mint(secondInvestor.publicKey, secondInvestmentAmount)
        
        let secondInvestorEurInstance = await eur.getInstance(secondInvestor)
        await secondInvestorEurInstance.approve(proj.address(), secondInvestmentAmount)
        let forbiddenInvest = proj.invest(secondInvestor.publicKey)
        await expect(forbiddenInvest).to.be.rejectedWith("Invocation failed: cb_AUhVc2VyJ3MgaW52ZXN0bWVudCB3aWxsIGxlYXZlIHRpbnkgZnJhY3Rpb24gb2YgcHJvamVjdCBub24tZnVuZGVkLiBFbmxhcmdlIHlvdXIgaW52ZXN0bWVudC4gQWJvcnRpbmcuMgUyqA==. Decoded: \u0001HUser\'s investment will leave tiny fraction of project non-funded. Enlarge your investment. Aborting.2\u00052�")
    })

    it("should fail for user to invest if project funding has ended", async () => {
        let projectInfo = generateProject(100, 1000, 1000, time.currentTimeWithSecondsOffset(1))

        let orgOwner = util.generateRandomAeWallet()
        await coop.registerWallet(orgOwner.publicKey)
        await accounts.coop.client.spend(100000000000000000, orgOwner.publicKey)
        
        let org = await createOrganization(orgOwner)
        await coop.registerWallet(org.address())

        let proj = await createProject(org, orgOwner, projectInfo)
        await coop.registerWallet(proj.address())

        let investor = util.generateRandomAeWallet()
        let investmentAmount = projectInfo.minInvestmentPerUser
        await coop.registerWallet(investor.publicKey)
        await accounts.coop.client.spend(100000000000000000, investor.publicKey)
        await eur.mint(investor.publicKey, investmentAmount)

        let investorEurInstance = await eur.getInstance(investor)
        await investorEurInstance.approve(proj.address(), investmentAmount)
        let forbiddenCall = proj.invest(investor.publicKey)
        await expect(forbiddenCall).to.be.rejectedWith("Invocation failed: cb_aVByb2plY3QgZnVuZGluZyBoYXMgZW5kZWQuGY+Xbg==. Decoded: iProject funding has ended.\u0019��n")
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