const { getNamedAccounts, ethers } = require("hardhat")
const { getWeth, AMOUNT } = require("./getWeth")

;(async () => {
    //the protocol treats everything as an ERC20
    await getWeth()
    const { deployer } = await getNamedAccounts()
    const lendingPool = await getLendingPool(deployer)
    console.log("Lending Pool Address : ", lendingPool.address)

    //deposit
    const wethTokenAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"

    //approve
    await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer)

    //deposit
    await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0)
    console.log("Deposited!")

    //How much we have borrowed, how much we can borrow, how much we have in collateral
    let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(lendingPool, deployer)

    //availableBorrowsEth ?? What is the conversion rate on DAI?
    const daiPrice = await getDaiPrice()
    const amountDaiToBorrow = availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber()) // 0.95 - we dont want to hit the maximum amount of what we can borrow
    const amountDaiToBorrowInWei = ethers.utils.parseEther(amountDaiToBorrow.toString())
    console.log(`You can borrow ${amountDaiToBorrowInWei} DAI`)

    //Borrow Time!
    const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
    await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowInWei, deployer)
    await getBorrowUserData(lendingPool, deployer)

    //Repay
    await repay(amountDaiToBorrowInWei, daiTokenAddress, lendingPool, deployer)
})()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

const repay = async (amount, daiAddress, lendingPool, account) => {
    await approveErc20(daiAddress, lendingPool.address, amount, account)
    const repayTx = await lendingPool.repay(daiAddress, amount, 1, account)
    await repay.wait(1)
    console.log("Repaid!")
}

const borrowDai = async (daiAddress, lendingPool, amountDaiToBorrowInWei, account) => {
    const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrowInWei, 1, 0, account)
    await borrowTx.wait(1)
    console.log("You've borrowed!")
}

/**
 * Gets the price of DAI from the Chainlink Data Feeds
 * @returns {BigNumber { _hex: '0x021de8f563d500', _isBigNumber: true }} - DAI price
 */
const getDaiPrice = async () => {
    const daiEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        "0x773616e4d11a78f511299002da57a0a94577f1f4"
    )

    const price = (await daiEthPriceFeed.latestRoundData()).at(1)
    console.log("The DAI/ETH price is: ", price.toString())
    return price
}

/**
 *  Gets the user account data from AAVE
 * @param {Object} lendingPool - The lending Pool contract
 * @param {String} account
 * @returns {{totalCollateralETH: String, availableBorrowsETH: String, totalDebtETH: String}}
 */
const getBorrowUserData = async (lendingPool, account) => {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
        await lendingPool.getUserAccountData(account)

    console.log(`You have ${totalCollateralETH} worth of ETH deposited.`)
    console.log(`You have ${totalDebtETH} worth of ETH borrowed.`)
    console.log(`You can borrow  ${availableBorrowsETH} worth of ETH.`)
    return { totalCollateralETH, totalDebtETH, availableBorrowsETH }
}

/**
 * Sets amount as the allowence  of spender over the caller's tokens.
 * @param {string} erc20Address  - the address of the erc20 (WETH mainnet)
 * @param {string} spenderAddress - lending pool address - we want the lending pool to be able to pull tokens from our account
 * @param {string} amountToSpend - the amount of ETH that the spender can spend
 * @param {string} account
 */
const approveErc20 = async (erc20Address, spenderAddress, amountToSpend, account) => {
    const erc20Token = await ethers.getContractAt("IERC20", erc20Address, account)
    const tx = await erc20Token.approve(spenderAddress, amountToSpend)
    await tx.wait(1)
    console.log("Approved!")
}

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
