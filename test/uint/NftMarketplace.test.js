const { assert, expect } = require("chai")
const { network, deployments, ethers, getNamedAccounts } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("nft marketplace test", function () {
      let nftmarketplace, deployer, player
      const PRICE = ethers.utils.parseEther("0.1")
      const Token_ID = 0
      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer
        accounts = await ethers.getSigners()
        player1 = accounts[1]
        player2 = accounts[2]
        await deployments.fixture(["all"])
        nftmarketplace = await ethers.getContract("NftMarketplace")
        // nftmarketplace = await nftmarketplace.connet(player)
        basicNft = await ethers.getContract("BasicNFT")
        await basicNft.mintNFT()
        await basicNft.approve(nftmarketplace.address, Token_ID)
      })

      //   it("Initilizes the NFT Correctly.", async function () {
      //     const name = await basicNft.name()
      //     const symbol = await basicNft.symbol()
      //     const tokenCounter = await basicNft.getTokenCOunter()
      //     assert.equal(name, "dogie")
      //     assert.equal(symbol, "DOG")
      //     console.log(tokenCounter.toString())
      //     assert.equal(tokenCounter.toString(), "1")
      //   })

      describe("Construtor", () => {
        it("lists and can be bought", async () => {
          await nftmarketplace.listItem(basicNft.address, Token_ID, PRICE)
          const playerConnectedNftMarketplace = nftmarketplace.connect(player1)
          await playerConnectedNftMarketplace.buyItem(basicNft.address, Token_ID, { value: PRICE })
          const newOwner = await basicNft.ownerOf(Token_ID)
          const deployerProceeds = await nftmarketplace.getProceeds(deployer)
          assert(newOwner.toString() == player1.address)
          assert(deployerProceeds.toString() == PRICE.toString())
        })

        it("getListing and getProceeds correctly", async () => {
          await nftmarketplace.listItem(basicNft.address, Token_ID, PRICE)
          const playerConnectedNftMarketplace = nftmarketplace.connect(player1)
          await playerConnectedNftMarketplace.buyItem(basicNft.address, Token_ID, { value: PRICE })
          const proceedgot = await nftmarketplace.getProceeds(deployer)
          assert(proceedgot.toString() == PRICE)
          await basicNft.connect(player1).approve(nftmarketplace.address, Token_ID)
          await nftmarketplace.connect(player1).listItem(basicNft.address, Token_ID, PRICE)
          const listing = await nftmarketplace.getListing(basicNft.address, Token_ID)
          assert(listing.toString() == `${PRICE},${player1.address}`)
        })

        it("withdrawl proceeds correctly", async () => {
          const proceedgot = await nftmarketplace.getProceeds(deployer)
          assert(proceedgot.toString() == 0)
          await expect(nftmarketplace.withdrawProceeds()).to.be.revertedWith(
            "NftMarketplace__NoProceeds"
          )
          await nftmarketplace.listItem(basicNft.address, Token_ID, PRICE)
          const playerConnectedNftMarketplace = nftmarketplace.connect(player1)
          await playerConnectedNftMarketplace.buyItem(basicNft.address, Token_ID, { value: PRICE })
          const proceedgotnow = await nftmarketplace.getProceeds(deployer)
          assert(proceedgotnow.toString() == PRICE)
          await nftmarketplace.withdrawProceeds()
          const proceedgotafter = await nftmarketplace.getProceeds(deployer)
          assert(proceedgotafter.toString() == 0)
          // console.log(proceedgot)

          // assert(proceedgot.toString() == withdrawlresult)
        })
        it("update listing correctly and emit the event", async () => {
          await nftmarketplace.listItem(basicNft.address, Token_ID, PRICE)
          const listing = await nftmarketplace.getListing(basicNft.address, Token_ID)
          assert(listing.toString() == `${PRICE},${deployer}`)
          await nftmarketplace.updateListing(basicNft.address, Token_ID, PRICE+PRICE)
          await expect(nftmarketplace.updateListing(basicNft.address, Token_ID, PRICE+PRICE)).to.emit(
            nftmarketplace,
            "ItemListed")
          const listingNOW = await nftmarketplace.getListing(basicNft.address, Token_ID)
          assert(listingNOW.toString() == `${PRICE+PRICE},${deployer}`)
        })
        it("buying item with less money revert error message and buyting item with more money will go through", async () => {
          const WRONGPRICE = ethers.utils.parseEther("0.01")
          await nftmarketplace.listItem(basicNft.address, Token_ID, PRICE)
          const playerConnectedNftMarketplace = nftmarketplace.connect(player1)
          // const buying1 = await playerConnectedNftMarketplace.buyItem(basicNft.address, Token_ID, { value: WRONGPRICE })
          await expect(playerConnectedNftMarketplace.buyItem(basicNft.address, Token_ID, { value: WRONGPRICE })).to.be.revertedWith(
            "NftMarketplace__PriceNotMet"
          )
          // const buying2 = await playerConnectedNftMarketplace.buyItem(basicNft.address, Token_ID, { value: PRICE })
          await expect(playerConnectedNftMarketplace.buyItem(basicNft.address, Token_ID, { value: PRICE })).to.emit(
            nftmarketplace,
            "ItemBought")
        })
      })
    })
