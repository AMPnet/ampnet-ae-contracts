let rl = require('readline-sync')
let fs = require('fs')
let path = require('path')
let Cryptr = require('cryptr')
let { HdWallet } = require('@aeternity/aepp-sdk')

/**
 * Loads encrypted keypair from keys/ dir.
 */
function loadKey() {
    let keyName = rl.question('Key name inside keys/ dir: ')
    let mnemonicPath = path.join(__dirname, '..', 'keys', keyName, 'mnemonic')
    let mnemonicEncrypted = fs.readFileSync(mnemonicPath, 'utf8')

    let password = rl.question('AMPnet keypair password: ', {
        hideEchoBack: true,
        mask: ''
    })
    let cryptr = new Cryptr(password)

    let mnemonicDecrypted = cryptr.decrypt(mnemonicEncrypted)
    return HdWallet.getSaveHDWalletAccounts(
        HdWallet.generateSaveHDWallet(mnemonicDecrypted, password),
        password,
        1
    )[0]
}

/**
 * Generates new keypair and saves it as encrypted file in keys/ dir.
 */
function generateKey() {
    let keyName = rl.question('New key name: ')
    let dirPath = path.join(__dirname, '..', 'keys', keyName)
    if (fs.existsSync(dirPath)) {
        console.log("Key with this name already exists. Aborting.")
        return
    }
    fs.mkdirSync(dirPath)

    let password = rl.questionNewPassword('Set password for encrypting new wallet: ', {
        min: 1,
        max: 42,
        mask: ''
    })
    let cryptr = new Cryptr(password)
    
    let mnemonic = HdWallet.generateMnemonic()
    let mnemonicEncrypted = cryptr.encrypt(mnemonic)
    fs.writeFileSync(path.join(dirPath, 'mnemonic'), mnemonicEncrypted)

    let hdWalletEncrypted = HdWallet.generateSaveHDWallet(mnemonic, password)
    let address = HdWallet.getSaveHDWalletAccounts(hdWalletEncrypted, password, 1)[0].publicKey
    fs.writeFileSync(path.join(dirPath, 'address'), address)

    console.log(`Successfully generated and stored keypair in encrypted form.\nAddress: ${address}`)
}

/**
 * Displays decrypted key in plain text if correct password provided.
 * WARNING: Watch your back.
 */
function displayKey() {
    let keypair = loadKey();
    console.log("Keypair:\n", keypair)
}

module.exports = { loadKey, generateKey, displayKey }