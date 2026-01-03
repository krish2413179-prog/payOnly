// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title FlexPass
 * @dev Universal Pay-As-You-Go Access Protocol
 * @author FlexPass Team
 */
contract FlexPass is ReentrancyGuard, Ownable {
    
    // Service Types
    enum ServiceType { GYM, WIFI, POWER, CUSTOM }
    
    // Service Structure
    struct Service {
        string name;
        uint256 rate; // Rate per minute in USDC (6 decimals)
        ServiceType serviceType;
        bool isActive;
        uint256 registeredAt;
    }
    
    // Session Structure
    struct Session {
        address provider;
        address customer;
        uint256 startTime;
        uint256 endTime;
        uint256 totalCost;
        uint256 lastChargeTime;
        uint256 totalMinutesCharged;
        bool isActive;
    }
    
    // State Variables
    mapping(address => Service) public services;
    mapping(bytes32 => Session) public sessions;
    mapping(address => uint256) public providerEarnings;
    
    IERC20 public immutable usdcToken;
    uint256 public platformFee = 250; // 2.5% (basis points)
    uint256 public constant MAX_FEE = 1000; // 10% max
    
    // Events
    event ServiceRegistered(
        address indexed provider,
        string name,
        uint256 rate,
        ServiceType serviceType
    );
    
    event ServiceUpdated(
        address indexed provider,
        string name,
        uint256 rate,
        ServiceType serviceType
    );
    
    event SessionCharged(
        bytes32 indexed sessionId,
        address indexed provider,
        address indexed customer,
        uint256 chargeAmount,
        uint256 minutesCharged
    );
    
    event SessionStarted(
        bytes32 indexed sessionId,
        address indexed provider,
        address indexed customer,
        uint256 startTime
    );
    
    event SessionEnded(
        bytes32 indexed sessionId,
        address indexed provider,
        address indexed customer,
        uint256 endTime,
        uint256 totalCost
    );
    
    event EarningsWithdrawn(
        address indexed provider,
        uint256 amount
    );
    
    // Constructor
    constructor(address _usdcToken) {
        usdcToken = IERC20(_usdcToken);
    }
    
    // Modifiers
    modifier onlyActiveService(address provider) {
        require(services[provider].isActive, "Service not active");
        _;
    }
    
    modifier onlyServiceProvider() {
        require(services[msg.sender].isActive, "Not a service provider");
        _;
    }
    
    // Service Management Functions
    
    /**
     * @dev Register a new service
     * @param name Service name
     * @param rate Rate per minute in USDC (6 decimals)
     * @param serviceType Type of service
     */
    function registerService(
        string calldata name,
        uint256 rate,
        ServiceType serviceType
    ) external {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(rate > 0, "Rate must be greater than 0");
        require(!services[msg.sender].isActive, "Service already registered");
        
        services[msg.sender] = Service({
            name: name,
            rate: rate,
            serviceType: serviceType,
            isActive: true,
            registeredAt: block.timestamp
        });
        
        emit ServiceRegistered(msg.sender, name, rate, serviceType);
    }
    
    /**
     * @dev Update existing service
     * @param name New service name
     * @param rate New rate per minute
     * @param serviceType New service type
     */
    function updateService(
        string calldata name,
        uint256 rate,
        ServiceType serviceType
    ) external onlyServiceProvider {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(rate > 0, "Rate must be greater than 0");
        
        Service storage service = services[msg.sender];
        service.name = name;
        service.rate = rate;
        service.serviceType = serviceType;
        
        emit ServiceUpdated(msg.sender, name, rate, serviceType);
    }
    
    /**
     * @dev Deactivate service
     */
    function deactivateService() external onlyServiceProvider {
        services[msg.sender].isActive = false;
    }
    
    /**
     * @dev Reactivate service
     */
    function reactivateService() external {
        require(services[msg.sender].registeredAt > 0, "Service never registered");
        services[msg.sender].isActive = true;
    }
    
    // Session Management Functions
    
    /**
     * @dev Start a new session
     * @param provider Service provider address
     * @param sessionId Unique session identifier
     */
    function startSession(
        address provider,
        bytes32 sessionId
    ) external payable onlyActiveService(provider) nonReentrant {
        require(sessions[sessionId].startTime == 0, "Session already exists");
        require(msg.sender != provider, "Cannot start session with yourself");
        
        sessions[sessionId] = Session({
            provider: provider,
            customer: msg.sender,
            startTime: block.timestamp,
            endTime: 0,
            totalCost: 0,
            lastChargeTime: block.timestamp,
            totalMinutesCharged: 0,
            isActive: true
        });
        
        emit SessionStarted(sessionId, provider, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Charge for active session usage (can be called periodically)
     * @param sessionId Session identifier
     */
    function chargeSession(bytes32 sessionId) external nonReentrant {
        Session storage session = sessions[sessionId];
        require(session.isActive, "Session not active");
        require(
            msg.sender == session.customer || 
            msg.sender == session.provider || 
            msg.sender == owner(),
            "Not authorized to charge session"
        );
        
        // Calculate minutes since last charge
        uint256 timeSinceLastCharge = block.timestamp - session.lastChargeTime;
        uint256 minutesToCharge = timeSinceLastCharge / 60; // Only charge for complete minutes
        
        require(minutesToCharge > 0, "No complete minutes to charge");
        
        // Calculate charge amount
        uint256 chargeAmount = minutesToCharge * services[session.provider].rate;
        
        // Transfer payment from customer to contract
        require(
            usdcToken.transferFrom(session.customer, address(this), chargeAmount),
            "Payment transfer failed"
        );
        
        // Calculate platform fee
        uint256 fee = (chargeAmount * platformFee) / 10000;
        uint256 providerAmount = chargeAmount - fee;
        
        // Update provider earnings
        providerEarnings[session.provider] += providerAmount;
        
        // Update session
        session.totalCost += chargeAmount;
        session.lastChargeTime = block.timestamp;
        session.totalMinutesCharged += minutesToCharge;
        
        emit SessionCharged(
            sessionId,
            session.provider,
            session.customer,
            chargeAmount,
            minutesToCharge
        );
    }
    
    /**
     * @dev End an active session
     * @param sessionId Session identifier
     */
    function endSession(bytes32 sessionId) external nonReentrant {
        Session storage session = sessions[sessionId];
        require(session.isActive, "Session not active");
        require(
            msg.sender == session.customer || msg.sender == session.provider,
            "Not authorized to end session"
        );
        
        // Charge for any remaining time since last charge
        uint256 timeSinceLastCharge = block.timestamp - session.lastChargeTime;
        if (timeSinceLastCharge >= 60) {
            // Charge for remaining complete minutes
            uint256 minutesToCharge = timeSinceLastCharge / 60;
            uint256 chargeAmount = minutesToCharge * services[session.provider].rate;
            
            // Transfer payment from customer to contract
            if (usdcToken.transferFrom(session.customer, address(this), chargeAmount)) {
                // Calculate platform fee
                uint256 fee = (chargeAmount * platformFee) / 10000;
                uint256 providerAmount = chargeAmount - fee;
                
                // Update provider earnings
                providerEarnings[session.provider] += providerAmount;
                
                // Update session
                session.totalCost += chargeAmount;
                session.totalMinutesCharged += minutesToCharge;
                
                emit SessionCharged(
                    sessionId,
                    session.provider,
                    session.customer,
                    chargeAmount,
                    minutesToCharge
                );
            }
        }
        
        // Update session
        session.endTime = block.timestamp;
        session.isActive = false;
        
        emit SessionEnded(
            sessionId,
            session.provider,
            session.customer,
            block.timestamp,
            session.totalCost
        );
    }
    
    /**
     * @dev Withdraw earnings for service provider
     */
    function withdrawEarnings() external onlyServiceProvider nonReentrant {
        uint256 amount = providerEarnings[msg.sender];
        require(amount > 0, "No earnings to withdraw");
        
        providerEarnings[msg.sender] = 0;
        
        require(
            usdcToken.transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit EarningsWithdrawn(msg.sender, amount);
    }
    
    // View Functions
    
    /**
     * @dev Get service information
     * @param provider Service provider address
     */
    function getService(address provider) external view returns (
        string memory name,
        uint256 rate,
        ServiceType serviceType,
        bool isActive
    ) {
        Service memory service = services[provider];
        return (service.name, service.rate, service.serviceType, service.isActive);
    }
    
    /**
     * @dev Get session information
     * @param sessionId Session identifier
     */
    function getSession(bytes32 sessionId) external view returns (
        address provider,
        address customer,
        uint256 startTime,
        uint256 endTime,
        uint256 totalCost,
        uint256 lastChargeTime,
        uint256 totalMinutesCharged,
        bool isActive
    ) {
        Session memory session = sessions[sessionId];
        return (
            session.provider,
            session.customer,
            session.startTime,
            session.endTime,
            session.totalCost,
            session.lastChargeTime,
            session.totalMinutesCharged,
            session.isActive
        );
    }
    
    // Admin Functions
    
    /**
     * @dev Update platform fee (only owner)
     * @param newFee New fee in basis points
     */
    function updatePlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= MAX_FEE, "Fee too high");
        platformFee = newFee;
    }
    
    /**
     * @dev Withdraw platform fees (only owner)
     */
    function withdrawPlatformFees() external onlyOwner nonReentrant {
        uint256 balance = usdcToken.balanceOf(address(this));
        
        // Calculate total provider earnings
        uint256 totalProviderEarnings = 0;
        // Note: In production, you'd want to track this more efficiently
        
        uint256 platformEarnings = balance - totalProviderEarnings;
        require(platformEarnings > 0, "No platform fees to withdraw");
        
        require(
            usdcToken.transfer(owner(), platformEarnings),
            "Transfer failed"
        );
    }
    
    /**
     * @dev Emergency pause function (only owner)
     * @param provider Service provider to pause
     */
    function emergencyPause(address provider) external onlyOwner {
        services[provider].isActive = false;
    }
}