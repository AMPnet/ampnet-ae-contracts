/*
 * ISC License (ISC)
 * Copyright (c) 2018 aeternity developers
 *
 *  Permission to use, copy, modify, and/or distribute this software for any
 *  purpose with or without fee is hereby granted, provided that the above
 *  copyright notice and this permission notice appear in all copies.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
 *  REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
 *  AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 *  INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
 *  LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
 *  OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
 *  PERFORMANCE OF THIS SOFTWARE.
 */
let Ae = require('@aeternity/aepp-sdk').Universal

let fs = require('fs')
let path = require('path')
let rl = require('readline-sync')

let util = require('../util/util')

const deploy = async (network, privateKey) => {
	switch (network) {
		case "local":
			url = 'http://localhost:3001/',
			compilerUrl = 'http://localhost:3080',
			ownerKeypair = {
				publicKey: "ak_fUq2NesPXcYZ1CcqBcGC3StpdnQw3iVxMA3YSeCNAwfN4myQk",
				secretKey: "7c6e602a94f30e4ea7edabe4376314f69ba7eaa2f355ecedb339df847b6f0d80575f81ffb0a297b7725dc671da0b1769b1fc5cbe45385c7b5ad1fc2eaf1d609d"
			}
			networkId = 'ae_devnet'
			break
		case "testnet":
			url = 'https://sdk-testnet.aepps.com/'
			compilerUrl = 'https://latest.compiler.aepps.com'
			networkId = 'ae_uat'
			ownerKeypair = util.loadKey()
			break
		case "mainnet":
			url = 'https://sdk-mainnet.aepps.com'
			compilerUrl = 'https://latest.compiler.aepps.com'
			networkId = 'ae_mainnet'
			ownerKeypair = util.loadKey()
			break
		default:
			throw new Error('Wrong network specified while runnging deploy script. Expected local/testnet/mainnet as network parameter!')
	}

	let client = await Ae({
        url: url,
        keypair: ownerKeypair,
		networkId: networkId,
		compilerUrl: compilerUrl
	})

	let coopSource = fs.readFileSync(path.join(__dirname, '..', 'contracts', 'Coop.aes')).toString('utf-8')
	let coopContract = await client.getContractInstance(coopSource)

	let eurSource = fs.readFileSync(path.join(__dirname, '..', 'contracts', 'EUR.aes')).toString('utf-8')
	let eurContract = await client.getContractInstance(eurSource)

	// Deploy
	console.log(`Deploying contracts from wallet: ${ownerKeypair.publicKey}`)

	let coop = await coopContract.deploy()
	console.log(`Coop deployed at: ${coop.address}`)
	
	let eur = await eurContract.deploy([coop.address])
	console.log(`EUR deployed at: ${eur.address}`)

	await coopContract.call('set_token', [eur.address])
	console.log('EUR token registered in Coop contract.')

	if (rl.keyInYN("Transfer ownership of deployed contracts?")) {
		let newCoopOwner = rl.question("New Coop owner address: ")
		await coopContract.call('transfer_ownership', [newCoopOwner])
		console.log('Changed ownership for deployed Coop contract!')
	
		let newEurOwner = rl.question("New Token owner address: ")
		await eurContract.call('transfer_ownership', [newEurOwner])
		console.log('Changed ownership for deployed Token contract!')
	}
};

module.exports = {
	deploy
};