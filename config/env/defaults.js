const config = {
    node: {
        url: process.env.NODE_URL,
        compilerUrl: proccess.env.COMPILER_URL,
        networkId: process.env.NETWORK_ID
    },
    keys: {
        coopOwner: {
            publicKey: process.env.COOP_OWNER_PUBLIC_KEY,
            secretKey: process.env.COOP_OWNER_PRIVATE_KEY 
        },
        eurOwner: {
            publicKey: process.env.EUR_OWNER_PUBLIC_KEY,
            secretKey: process.env.EUR_OWNER_PRIVATE_KEY 
        }
    }
}

process.env.NODE_ENV = process.env.NODE_ENV || 'development'
config.env = process.env.NODE_ENV

module.exports = config