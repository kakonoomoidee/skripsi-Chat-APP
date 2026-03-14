// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IdentityRegistry
 * @dev Decentralized identity storage for P2P Chat.
 * Supports gasless registration and challenge-response authentication.
 */
contract IdentityRegistry {
    struct User {
        string username;
        string publicKey;
        bool isRegistered;
        uint256 registeredAt;
    }

    mapping(address => User) public users;
    mapping(string => address) public usernameToAddress;

    event UserRegistered(
        address indexed userAddress,
        string username,
        uint256 timestamp
    );

    /**
     * @notice Registers a new user via meta-transaction (gasless).
     * @param _user The address of the user to register.
     * @param _username The desired username.
     * @param _publicKey The user's public key for ECDH.
     * @param _v ECDSA signature parameter v.
     * @param _r ECDSA signature parameter r.
     * @param _s ECDSA signature parameter s.
     */
    function registerUser(
        address _user,
        string memory _username,
        string memory _publicKey,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) public {
        require(
            !users[_user].isRegistered,
            "IdentityRegistry: Address already registered"
        );
        require(
            usernameToAddress[_username] == address(0),
            "IdentityRegistry: Username already taken"
        );
        require(
            bytes(_username).length > 0,
            "IdentityRegistry: Username cannot be empty"
        );

        bytes32 messageHash = keccak256(
            abi.encodePacked(_user, _username, _publicKey)
        );

        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        address signer = ecrecover(ethSignedMessageHash, _v, _r, _s);
        require(signer == _user, "IdentityRegistry: Invalid signature");

        users[_user] = User({
            username: _username,
            publicKey: _publicKey,
            isRegistered: true,
            registeredAt: block.timestamp
        });

        usernameToAddress[_username] = _user;

        emit UserRegistered(_user, _username, block.timestamp);
    }

    /**
     * @notice Verifies a login signature based on a challenge nonce and checks user registration status.
     * @dev The state mutability is upgraded from `pure` to `view` to allow reading from the contract's state.
     * IMPORTANT: Replace `registeredUsers` with your actual state variable name for user registration.
     * @param _signer The address attempting to log in.
     * @param _nonce The challenge string to be signed.
     * @param _v ECDSA signature parameter v.
     * @param _r ECDSA signature parameter r.
     * @param _s ECDSA signature parameter s.
     * @return bool True if the signature is valid AND the user exists in the registry, false otherwise.
     */
    function verifyLoginSignature(
        address _signer,
        string memory _nonce,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) public view returns (bool) {
        require(
            users[_signer].isRegistered,
            "Access Denied: User is not registered in this contract."
        );

        bytes32 messageHash = keccak256(abi.encodePacked(_nonce));

        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        address recoveredAddress = ecrecover(ethSignedMessageHash, _v, _r, _s);

        return (recoveredAddress == _signer);
    }

    /**
     * @notice Retrieves user details.
     * @param _userAddress The address of the user.
     * @return username, publicKey, and registration timestamp.
     */
    function getUser(
        address _userAddress
    ) public view returns (string memory, string memory, uint256) {
        require(
            users[_userAddress].isRegistered,
            "IdentityRegistry: User not found"
        );
        User memory u = users[_userAddress];
        return (u.username, u.publicKey, u.registeredAt);
    }

    /**
     * @notice Retrieves a user's address by their username.
     * @param _username The username to query.
     * @return address The associated user address.
     */
    function getAddressByUsername(
        string memory _username
    ) public view returns (address) {
        return usernameToAddress[_username];
    }
}
