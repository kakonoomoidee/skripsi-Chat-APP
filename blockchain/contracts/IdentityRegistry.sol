// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IdentityRegistry
 * @dev Smart Contract untuk menyimpan identitas pengguna Chat P2P secara terdesentralisasi.
 * Mendukung Gasless Registration & Challenge-Response Login.
 */
contract IdentityRegistry {
    // --- 1. STRUKTUR DATA (Sesuai kode favorit Yang Mulia) ---
    struct User {
        string username;
        string publicKey;
        bool isRegistered;
        uint256 registeredAt;
    }

    // Mapping Database (Key-Value Store)
    mapping(address => User) public users;
    mapping(string => address) public usernameToAddress;

    // Event biar Frontend/Relay tau kalau ada yang daftar
    event UserRegistered(
        address indexed userAddress,
        string username,
        uint256 timestamp
    );

    // --- 2. FUNGSI REGISTER (GASLESS / META-TX) ---
    // (Kode Asli Pilihan Yang Mulia - TIDAK DIUBAH)
    function registerUser(
        address _user,
        string memory _username,
        string memory _publicKey,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) public {
        // Validasi Dasar
        require(
            !users[_user].isRegistered,
            "Error: Wallet Address sudah terdaftar!"
        );
        require(
            usernameToAddress[_username] == address(0),
            "Error: Username sudah diambil orang lain!"
        );
        require(
            bytes(_username).length > 0,
            "Error: Username tidak boleh kosong!"
        );

        // VERIFIKASI TANDA TANGAN
        bytes32 messageHash = keccak256(
            abi.encodePacked(_user, _username, _publicKey)
        );

        // Tambahkan prefix Ethereum ("\x19Ethereum Signed Message:\n32")
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        // Recover signer address dari signature
        address signer = ecrecover(ethSignedMessageHash, _v, _r, _s);

        // Cek: Apakah yang tanda tangan beneran si _user?
        require(
            signer == _user,
            "Invalid Signature: Maling terdeteksi! Tanda tangan tidak cocok."
        );

        users[_user] = User(_username, _publicKey, true, block.timestamp);
        usernameToAddress[_username] = _user;

        // Kabarin dunia kalau ada user baru
        emit UserRegistered(_user, _username, block.timestamp);
    }

    // --- 3. FUNGSI VERIFIKASI LOGIN ---
    // Dipanggil Relay buat ngecek Signature dari Nonce.
    // Fungsi ini PURE (Gratis, Gak bayar Gas) karena cuma itung matematika.
    function verifyLoginSignature(
        address _signer,
        string memory _nonce,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) public pure returns (bool) {
        // Rekonstruksi Hash dari Nonce
        bytes32 messageHash = keccak256(abi.encodePacked(_nonce));

        // Tambah Prefix Ethereum
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        // Recover siapa yang tanda tangan
        address recoveredAddress = ecrecover(ethSignedMessageHash, _v, _r, _s);

        // Cek apakah cocok dengan User yang mau login?
        return (recoveredAddress == _signer);
    }

    // --- 4. HELPER FUNCTIONS (READ-ONLY) ---
    function getUser(
        address _userAddress
    ) public view returns (string memory, string memory, uint256) {
        require(users[_userAddress].isRegistered, "User tidak ditemukan");
        User memory u = users[_userAddress];
        return (u.username, u.publicKey, u.registeredAt);
    }

    function getAddressByUsername(
        string memory _username
    ) public view returns (address) {
        return usernameToAddress[_username];
    }
}
