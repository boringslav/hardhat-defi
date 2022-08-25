const { getWeth } = require("./getWeth")

;(async () => {
    //the protocol treats everything as an ERC20
    await getWeth()
})()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
