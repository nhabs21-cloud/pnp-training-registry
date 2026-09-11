// ============================================================
// PNP TRAINING & CERTIFICATION REGISTRY
// ============================================================


// ============================================================
// GLOBAL VARIABLES
// ============================================================

let provider = null;
let signer = null;
let contract = null;


// ============================================================
// CONTRACT ADDRESS
// ============================================================
//
// IMPORTANT:
//
// Put the FULL address of your deployed
// PNPTrainingRegistry contract on SEPOLIA here.
//
// DO NOT put your MetaMask wallet address here.
//
// Your wallet address is:
// 0xAAF9F279a6b855B4772234A720dFbDD6355BA557
//
// Your CONTRACT address is the one Remix showed as:
// 0x81b...1918b
//
// Paste the FULL 0x81... address below.
// ============================================================

const CONTRACT_ADDRESS =
    "0x81b065cE54bfC3DC4a5c3fE2196a2B94F891918b";


// ============================================================
// CONTRACT ABI
// ============================================================

const CONTRACT_ABI = [

    // Issue certificate
    "function issueCertificate(bytes32,string,string) external",

    // Revoke certificate
    "function revokeCertificate(uint256) external",

    // Verify certificate
    "function verifyCertificate(uint256) external view returns (tuple(uint256 id, bytes32 personnelHash, string trainingTitle, string certificateNo, uint256 dateIssued, uint8 status))",

    // Contract owner
    "function owner() external view returns (address)",

    // Certificate issued event
    "event CertificateIssued(uint256 indexed id, bytes32 indexed personnelHash, string certificateNo)",

    // Certificate revoked event
    "event CertificateRevoked(uint256 indexed id)"
];


// ============================================================
// CONNECT WALLET
// ============================================================

async function connectWallet() {

    // Check MetaMask
    if (!window.ethereum) {

        alert(
            "Please install MetaMask."
        );

        return;
    }


    try {

        // Create provider
        provider =
            new ethers.BrowserProvider(
                window.ethereum
            );


        // Ask MetaMask to connect
        await provider.send(
            "eth_requestAccounts",
            []
        );


        // Get signer
        signer =
            await provider.getSigner();


        // Get wallet address
        const address =
            await signer.getAddress();


        // Get network
        const network =
            await provider.getNetwork();


        const chainId =
            Number(network.chainId);


        // Display wallet
        document
            .getElementById("walletAddress")
            .textContent =
            shortenAddress(address);


        // Display network
        document
            .getElementById("network")
            .textContent =
            getNetworkName(chainId) +
            " (" +
            chainId +
            ")";


        // Make sure Sepolia is selected
        if (chainId !== 11155111) {

            updateSystemStatus(
                "Switch to Sepolia"
            );

            alert(
                "Please switch MetaMask to the Sepolia network."
            );

            contract = null;

            return;
        }


        // Make sure contract address was entered
        if (
            CONTRACT_ADDRESS ===
            "PASTE_YOUR_FULL_SEPOLIA_CONTRACT_ADDRESS_HERE"
        ) {

            updateSystemStatus(
                "Contract Address Missing"
            );

            alert(
                "Please enter your full Sepolia contract address in app.js."
            );

            return;
        }


        // Check contract address format
        if (
            !ethers.isAddress(
                CONTRACT_ADDRESS
            )
        ) {

            updateSystemStatus(
                "Invalid Contract Address"
            );

            alert(
                "The contract address in app.js is invalid."
            );

            return;
        }


        // Check whether code exists
        const code =
            await provider.getCode(
                CONTRACT_ADDRESS
            );


        if (code === "0x") {

            updateSystemStatus(
                "Contract Not Found"
            );

            alert(
                "No contract was found at this address on Sepolia."
            );

            return;
        }


        // Create contract
        contract =
            new ethers.Contract(
                CONTRACT_ADDRESS,
                CONTRACT_ABI,
                signer
            );


        // System ready
        updateSystemStatus(
            "Blockchain Ready"
        );


        // Read certificate count
        await updateTotalCertificates();


        console.log(
            "Connected wallet:",
            address
        );


        console.log(
            "Contract:",
            CONTRACT_ADDRESS
        );


    } catch (error) {

        console.error(
            "Connection error:",
            error
        );


        updateSystemStatus(
            "Connection Error"
        );


        alert(
            getErrorMessage(error)
        );
    }
}


// ============================================================
// TOTAL CERTIFICATES
// ============================================================
//
// We use the CertificateIssued event because your currently
// deployed Solidity contract does not have a public
// totalCertificates() function.
//
// This allows us to keep your existing deployed contract.
// ============================================================


async function updateTotalCertificates() {

    if (!contract || !provider) {
        return;
    }

    try {

        const latestBlock =
            await provider.getBlockNumber();

        // Look back over the most recent 10,000 blocks
        const startBlock =
            Math.max(
                0,
                latestBlock - 10000
            );

        const chunkSize = 500;

        let total = 0;

        const filter =
            contract.filters.CertificateIssued();

        for (
            let fromBlock = startBlock;
            fromBlock <= latestBlock;
            fromBlock += chunkSize
        ) {

            const toBlock =
                Math.min(
                    fromBlock + chunkSize - 1,
                    latestBlock
                );

            console.log(
                `Checking blocks ${fromBlock} - ${toBlock}`
            );

            const events =
                await contract.queryFilter(
                    filter,
                    fromBlock,
                    toBlock
                );

            total += events.length;
        }

        document
            .getElementById(
                "totalCertificates"
            )
            .textContent = total;

        console.log(
            "TOTAL CERTIFICATES:",
            total
        );

    } catch (error) {

        console.error(
            "TOTAL CERTIFICATES ERROR:",
            error
        );

        document
            .getElementById(
                "totalCertificates"
            )
            .textContent = "Error";
    }
}







// ============================================================
// ISSUE CERTIFICATE
// ============================================================

async function issueCertificate() {

    if (!contract) {

        alert(
            "Connect your wallet first."
        );

        return;
    }


    // Get input values
    const personnelHash =
        document
            .getElementById(
                "personnelHash"
            )
            .value
            .trim();


    const trainingTitle =
        document
            .getElementById(
                "trainingTitle"
            )
            .value
            .trim();


    const certificateNo =
        document
            .getElementById(
                "certificateNo"
            )
            .value
            .trim();


    // Validate bytes32
    if (
        !ethers.isHexString(
            personnelHash,
            32
        )
    ) {

        alert(
            "Personnel Hash must be exactly 32 bytes."
        );

        return;
    }


    // Validate training
    if (!trainingTitle) {

        alert(
            "Please enter the training title."
        );

        return;
    }


    // Validate certificate number
    if (!certificateNo) {

        alert(
            "Please enter the certificate number."
        );

        return;
    }


    try {

        // Show status
        document
            .getElementById(
                "issueStatus"
            )
            .textContent =
            "Waiting for MetaMask...";


        // Send transaction
        const tx =
            await contract.issueCertificate(
                personnelHash,
                trainingTitle,
                certificateNo
            );


        console.log(
            "Issue transaction:",
            tx.hash
        );


        document
            .getElementById(
                "issueStatus"
            )
            .textContent =
            "Transaction submitted. Waiting for confirmation...";


        // Wait for confirmation
        await tx.wait();


        // Success
        document
            .getElementById(
                "issueStatus"
            )
            .textContent =
            "Certificate successfully issued.";


        // Clear form
        document
            .getElementById(
                "personnelHash"
            )
            .value = "";


        document
            .getElementById(
                "trainingTitle"
            )
            .value = "";


        document
            .getElementById(
                "certificateNo"
            )
            .value = "";


        // Update count
        await updateTotalCertificates();


    } catch (error) {

        console.error(
            "Issue error:",
            error
        );


        document
            .getElementById(
                "issueStatus"
            )
            .textContent =
            getErrorMessage(error);
    }
}


// ============================================================
// VERIFY CERTIFICATE
// ============================================================

async function verifyCertificate() {

    if (!contract) {

        alert(
            "Connect your wallet first."
        );

        return;
    }


    // Get ID
    const id =
        document
            .getElementById(
                "verifyId"
            )
            .value
            .trim();


    // Validate ID
    if (
        !id ||
        Number(id) <= 0
    ) {

        alert(
            "Enter a valid certificate ID."
        );

        return;
    }


    try {

        console.log(
            "Verifying certificate:",
            id
        );


        // Read certificate from blockchain
        const certificate =
            await contract.verifyCertificate(
                id
            );


        console.log(
            "Certificate:",
            certificate
        );


        // Determine status
        const status =
            Number(certificate.status) === 0
                ? "VALID"
                : "REVOKED";


        const statusClass =
            status === "VALID"
                ? "valid"
                : "revoked";


        // Convert timestamp
        const date =
            new Date(
                Number(
                    certificate.dateIssued
                ) * 1000
            ).toLocaleString();


        // Display result
        document
            .getElementById(
                "certificateResult"
            )
            .innerHTML = `

                <div class="certificate">

                    <strong>
                        Certificate ID:
                    </strong>

                    ${certificate.id}

                    <br>


                    <strong>
                        Training:
                    </strong>

                    ${escapeHTML(
                        certificate.trainingTitle
                    )}

                    <br>


                    <strong>
                        Certificate No:
                    </strong>

                    ${escapeHTML(
                        certificate.certificateNo
                    )}

                    <br>


                    <strong>
                        Personnel Hash:
                    </strong>

                    ${certificate.personnelHash}

                    <br>


                    <strong>
                        Date Issued:
                    </strong>

                    ${date}

                    <br>


                    <strong>
                        Status:
                    </strong>

                    <span class="${statusClass}">

                        ${status}

                    </span>

                </div>

            `;


    } catch (error) {

        console.error(
            "Verify error:",
            error
        );


        document
            .getElementById(
                "certificateResult"
            )
            .innerHTML = `

                <p class="revoked">
                    Certificate not found.
                </p>

            `;
    }
}


// ============================================================
// REVOKE CERTIFICATE
// ============================================================

async function revokeCertificate() {

    if (!contract) {

        alert(
            "Connect your wallet first."
        );

        return;
    }


    // Get ID
    const id =
        document
            .getElementById(
                "revokeId"
            )
            .value
            .trim();


    // Validate ID
    if (
        !id ||
        Number(id) <= 0
    ) {

        alert(
            "Enter a valid certificate ID."
        );

        return;
    }


    try {

        document
            .getElementById(
                "revokeStatus"
            )
            .textContent =
            "Waiting for MetaMask...";


        // Send transaction
        const tx =
            await contract.revokeCertificate(
                id
            );


        console.log(
            "Revoke transaction:",
            tx.hash
        );


        document
            .getElementById(
                "revokeStatus"
            )
            .textContent =
            "Transaction submitted. Waiting for confirmation...";


        // Wait
        await tx.wait();


        document
            .getElementById(
                "revokeStatus"
            )
            .textContent =
            "Certificate successfully revoked.";


    } catch (error) {

        console.error(
            "Revoke error:",
            error
        );


        document
            .getElementById(
                "revokeStatus"
            )
            .textContent =
            getErrorMessage(error);
    }
}


// ============================================================
// SHORTEN WALLET ADDRESS
// ============================================================

function shortenAddress(
    address
) {

    return (
        address.slice(0, 6) +
        "..." +
        address.slice(-4)
    );
}


// ============================================================
// NETWORK NAME
// ============================================================

function getNetworkName(
    chainId
) {

    if (
        Number(chainId) === 11155111
    ) {

        return "sepolia";
    }


    if (
        Number(chainId) === 1
    ) {

        return "mainnet";
    }


    return "unknown";
}


// ============================================================
// SYSTEM STATUS
// ============================================================

function updateSystemStatus(
    message
) {

    const element =
        document.getElementById(
            "systemStatus"
        );


    if (element) {

        element.textContent =
            message;
    }
}


// ============================================================
// ERROR MESSAGE
// ============================================================

function getErrorMessage(
    error
) {

    if (
        error &&
        error.code === 4001
    ) {

        return "Transaction rejected by user.";
    }


    if (
        error &&
        error.reason
    ) {

        return error.reason;
    }


    if (
        error &&
        error.shortMessage
    ) {

        return error.shortMessage;
    }


    if (
        error &&
        error.message
    ) {

        return error.message;
    }


    return "Transaction failed.";
}


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHTML(
    value
) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );
}


// ============================================================
// CONNECT BUTTON
// ============================================================

document
    .getElementById(
        "connectBtn"
    )
    .addEventListener(
        "click",
        connectWallet
    );


// ============================================================
// METAMASK ACCOUNT CHANGE
// ============================================================

if (window.ethereum) {

    window.ethereum.on(
        "accountsChanged",
        function () {

            window.location.reload();

        }
    );


    window.ethereum.on(
        "chainChanged",
        function () {

            window.location.reload();

        }
    );
}
