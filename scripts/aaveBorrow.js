const { getNamedAccounts, ethers } = require("hardhat")
const { getWeth } = require("./getWeth")

;(async () => {
    //the protocol treats everything as an ERC20
    await getWeth()
    const { deployer } = await getNamedAccounts()
    const lendingPool = await getLendingPool(deployer)
    console.log("Lending Pool Address : ", lendingPool.address)
})()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

/**
 * This function returns the lendingPool contract after getting it from the lendingPoolAddressesProvider
 * @param {*} account - the deployer
 * @returns lendingPool contract
 */
const getLendingPool = async (account) => {
    /**
     * We have to use the ILendingPoolAddressesProvider to get the LendingPool address
     */
    const lendingPoolAdressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
        account
    )

    const lendingPoolAddress = await lendingPoolAdressesProvider.getLendingPool()
    const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, account)
    return lendingPool
}
