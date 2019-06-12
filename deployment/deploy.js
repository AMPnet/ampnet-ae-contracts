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

const deploy = async (network, privateKey) => {

	// Initialize Coop client and contract

	let coopClient = await Ae({
        url: 'http://localhost:3001/',
        internalUrl: 'http://localhost:3001/internal/',
        keypair: {
			"publicKey": "ak_fUq2NesPXcYZ1CcqBcGC3StpdnQw3iVxMA3YSeCNAwfN4myQk",
			"secretKey": "7c6e602a94f30e4ea7edabe4376314f69ba7eaa2f355ecedb339df847b6f0d80575f81ffb0a297b7725dc671da0b1769b1fc5cbe45385c7b5ad1fc2eaf1d609d"
		},
        nativeMode: true,
		networkId: 'ae_devnet',
		compilerUrl: 'http://localhost:3080'
	})
	let coopSource = fs.readFileSync(path.join(__dirname, '..', 'contracts', 'Coop.aes')).toString('utf-8')
	let coopContract = await coopClient.getContractInstance(coopSource)
	

	// Initialize EUR client and contract

	let eurClient = await Ae({
        url: 'http://localhost:3001/',
        internalUrl: 'http://localhost:3001/internal/',
        keypair: {
			"publicKey": "ak_tWZrf8ehmY7CyB1JAoBmWJEeThwWnDpU4NadUdzxVSbzDgKjP",
			"secretKey": "7fa7934d142c8c1c944e1585ec700f671cbc71fb035dc9e54ee4fb880edfe8d974f58feba752ae0426ecbee3a31414d8e6b3335d64ec416f3e574e106c7e5412"
		},
        nativeMode: true,
		networkId: 'ae_devnet',
		compilerUrl: 'http://localhost:3080'
	})
	let eurSource = fs.readFileSync(path.join(__dirname, '..', 'contracts', 'EUR.aes')).toString('utf-8')
	let eurContract = await eurClient.getContractInstance(eurSource)


	// Deploy

	let coop = await coopContract.deploy()
	console.log(`Coop deployed at: ${coop.deployInfo.address}`)

	let eur = await eurContract.deploy([coop.deployInfo.address])
	console.log(`EUR deployed at: ${eur.deployInfo.address}`)

	await coop.call('set_token', [eur.deployInfo.address])
	console.log('EUR token registered in Coop contract')

};

module.exports = {
	deploy
};