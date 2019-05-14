const util = require("../utils/util")
const error = require("../utils/error")

async function deploy(contracts) {
    console.log("Deploying Coop")
    let coop = await contracts.coop.compiled.deploy().catch(error.decode)
    let coopAddress = util.decodeAddress(coop.address)
    console.log(`Coop deployed on ${coop.address}\n`)

    console.log("Deploying EUR token")
    let eur = await contracts.eur.compiled.deploy({
        initState: `(${coopAddress})`
    }).catch(error.decode)
    let eurAddress = util.decodeAddress(eur.address)
    console.log(`EUR token deployed on ${eur.address}\n`)
    
    console.log("Registering EUR token on Coop contract")
    await coop.call("set_token", {
        args: `(${eurAddress})`
    }).catch(error.decode)
    console.log("EUR token registered\n")

    return {
        coop: coop,
        eur: eur
    }
}

Object.assign(exports, { deploy })