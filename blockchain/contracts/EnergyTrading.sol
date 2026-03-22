// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title EnergyTrading
 * @dev Full P2P energy trading smart contract with gas tracking,
 *      dynamic pricing support, and listing lifecycle management.
 */
contract EnergyTrading {

    // ─────────────────────────────────────────
    //  ENUMS & STRUCTS
    // ─────────────────────────────────────────

    enum ListingStatus { Active, Sold, Cancelled }

    struct EnergyListing {
        uint256      id;
        address payable seller;
        string       sellerId;
        uint256      energyAmount;   // Wh
        uint256      pricePerUnit;   // wei per Wh
        uint256      totalPrice;     // wei
        uint256      timestamp;
        ListingStatus status;
    }

    struct Trade {
        uint256 id;
        uint256 listingId;
        address buyer;
        address seller;
        string  buyerId;
        string  sellerId;
        uint256 energyAmount;
        uint256 totalPaid;
        uint256 platformFee;
        uint256 sellerReceived;
        uint256 timestamp;
        uint256 blockNumber;
    }

    // ─────────────────────────────────────────
    //  STATE
    // ─────────────────────────────────────────

    address public  owner;
    uint256 public  platformFeePercent = 1;   // 1%
    uint256 public  listingCount;
    uint256 public  tradeCount;
    uint256 public  totalEnergyTraded;
    uint256 public  totalVolumeWei;

    mapping(uint256 => EnergyListing) public listings;
    mapping(uint256 => Trade)         public trades;
    mapping(address => uint256)       public pendingWithdrawals;
    mapping(address => uint256[])     public sellerListings;
    mapping(address => uint256[])     public buyerTrades;

    uint256[] private _activeIds;

    // ─────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────

    event ListingCreated(
        uint256 indexed id,
        address indexed seller,
        string  sellerId,
        uint256 energyAmount,
        uint256 pricePerUnit,
        uint256 totalPrice,
        uint256 timestamp
    );

    event EnergyPurchased(
        uint256 indexed tradeId,
        uint256 indexed listingId,
        address indexed buyer,
        address seller,
        string  buyerId,
        string  sellerId,
        uint256 energyAmount,
        uint256 totalPaid,
        uint256 sellerReceived,
        uint256 timestamp
    );

    event ListingCancelled(uint256 indexed listingId, address indexed seller);
    event Withdrawn(address indexed user, uint256 amount);
    event FeeUpdated(uint256 newFee);

    // ─────────────────────────────────────────
    //  MODIFIERS
    // ─────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier validListing(uint256 _id) {
        require(_id > 0 && _id <= listingCount, "Invalid listing");
        require(listings[_id].status == ListingStatus.Active, "Not active");
        _;
    }

    // ─────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ─────────────────────────────────────────
    //  LISTING FUNCTIONS
    // ─────────────────────────────────────────

    /**
     * @dev Create an energy sell listing
     */
    function createListing(
        uint256 _energyAmount,
        uint256 _pricePerUnit,
        string  calldata _sellerId
    ) external returns (uint256) {
        require(_energyAmount  > 0, "Energy must be > 0");
        require(_pricePerUnit  > 0, "Price must be > 0");
        require(bytes(_sellerId).length > 0, "SellerId required");

        listingCount++;
        uint256 id    = listingCount;
        uint256 total = _energyAmount * _pricePerUnit;

        listings[id] = EnergyListing({
            id:           id,
            seller:       payable(msg.sender),
            sellerId:     _sellerId,
            energyAmount: _energyAmount,
            pricePerUnit: _pricePerUnit,
            totalPrice:   total,
            timestamp:    block.timestamp,
            status:       ListingStatus.Active
        });

        sellerListings[msg.sender].push(id);
        _activeIds.push(id);

        emit ListingCreated(
            id, msg.sender, _sellerId,
            _energyAmount, _pricePerUnit, total, block.timestamp
        );

        return id;
    }

    /**
     * @dev Buy energy from a listing
     */
    function buyEnergy(
        uint256 _listingId,
        string  calldata _buyerId
    ) external payable validListing(_listingId) {
        EnergyListing storage listing = listings[_listingId];

        require(msg.sender != listing.seller, "Cannot buy own listing");
        require(bytes(_buyerId).length > 0,   "BuyerId required");
        require(msg.value >= listing.totalPrice, "Insufficient payment");

        // Calculate fees
        uint256 fee            = (listing.totalPrice * platformFeePercent) / 100;
        uint256 sellerReceived = listing.totalPrice - fee;
        uint256 refund         = msg.value - listing.totalPrice;

        // Update state BEFORE transfers (re-entrancy protection)
        listing.status = ListingStatus.Sold;
        _removeActiveId(_listingId);

        tradeCount++;
        uint256 tradeId = tradeCount;

        trades[tradeId] = Trade({
            id:             tradeId,
            listingId:      _listingId,
            buyer:          msg.sender,
            seller:         listing.seller,
            buyerId:        _buyerId,
            sellerId:       listing.sellerId,
            energyAmount:   listing.energyAmount,
            totalPaid:      listing.totalPrice,
            platformFee:    fee,
            sellerReceived: sellerReceived,
            timestamp:      block.timestamp,
            blockNumber:    block.number
        });

        buyerTrades[msg.sender].push(tradeId);

        // Update global stats
        totalEnergyTraded += listing.energyAmount;
        totalVolumeWei    += listing.totalPrice;

        // Accumulate seller earnings for pull-pattern withdrawal
        pendingWithdrawals[listing.seller] += sellerReceived;
        // Platform fee stays in contract (owner withdraws)
        pendingWithdrawals[owner]          += fee;

        // Refund overpayment
        if (refund > 0) {
            payable(msg.sender).transfer(refund);
        }

        emit EnergyPurchased(
            tradeId, _listingId, msg.sender, listing.seller,
            _buyerId, listing.sellerId, listing.energyAmount,
            listing.totalPrice, sellerReceived, block.timestamp
        );
    }

    /**
     * @dev Cancel an active listing
     */
    function cancelListing(uint256 _listingId)
        external
        validListing(_listingId)
    {
        EnergyListing storage listing = listings[_listingId];
        require(msg.sender == listing.seller || msg.sender == owner, "Not authorized");

        listing.status = ListingStatus.Cancelled;
        _removeActiveId(_listingId);

        emit ListingCancelled(_listingId, listing.seller);
    }

    // ─────────────────────────────────────────
    //  WITHDRAWAL
    // ─────────────────────────────────────────

    /**
     * @dev Pull-pattern withdrawal for sellers and platform
     */
    function withdraw() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nothing to withdraw");

        pendingWithdrawals[msg.sender] = 0;
        payable(msg.sender).transfer(amount);

        emit Withdrawn(msg.sender, amount);
    }

    // ─────────────────────────────────────────
    //  VIEW FUNCTIONS
    // ─────────────────────────────────────────

    function getActiveListing(uint256 _id)
        external view
        returns (EnergyListing memory)
    {
        return listings[_id];
    }

    function getActiveListingIds()
        external view
        returns (uint256[] memory)
    {
        return _activeIds;
    }

    function getTrade(uint256 _id)
        external view
        returns (Trade memory)
    {
        require(_id > 0 && _id <= tradeCount, "Invalid trade");
        return trades[_id];
    }

    function getStats()
        external view
        returns (
            uint256 _listingCount,
            uint256 _tradeCount,
            uint256 _totalEnergyTraded,
            uint256 _totalVolumeWei,
            uint256 _activeCount
        )
    {
        return (
            listingCount,
            tradeCount,
            totalEnergyTraded,
            totalVolumeWei,
            _activeIds.length
        );
    }

    function getSellerListings(address _seller)
        external view
        returns (uint256[] memory)
    {
        return sellerListings[_seller];
    }

    function getBuyerTrades(address _buyer)
        external view
        returns (uint256[] memory)
    {
        return buyerTrades[_buyer];
    }

    // ─────────────────────────────────────────
    //  ADMIN
    // ─────────────────────────────────────────

    function setPlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 10, "Max fee is 10%");
        platformFeePercent = _newFee;
        emit FeeUpdated(_newFee);
    }

    // ─────────────────────────────────────────
    //  INTERNAL
    // ─────────────────────────────────────────

    function _removeActiveId(uint256 _id) internal {
        uint256 len = _activeIds.length;
        for (uint256 i = 0; i < len; i++) {
            if (_activeIds[i] == _id) {
                _activeIds[i] = _activeIds[len - 1];
                _activeIds.pop();
                break;
            }
        }
    }

    receive() external payable {}
}
