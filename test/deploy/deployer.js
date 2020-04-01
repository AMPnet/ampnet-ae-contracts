const contracts = require('../init/contracts')
async function deploy(accounts) {

    let coopInstance = await accounts.coop.client.getContractInstance(contracts.coopSource)
    let eurInstance = await accounts.eur.client.getContractInstance(contracts.eurSource)

    console.log("Deploying Coop")   
    let coop = await coopInstance.deploy()
    console.log(`Coop deployed on ${coop.address}\n`)

    console.log("Deploying EUR token")
    let eur = await eurInstance.deploy([coop.address])
    console.log(`EUR token deployed on ${eur.address}\n`)
    
    console.log("Registering EUR token on Coop contract")
    await coopInstance.call("set_token", [eur.address])
    console.log("EUR token registered\n")

    return {
        coop: coopInstance,
        eur: eurInstance
    }
}

Object.assign(exports, { deploy })