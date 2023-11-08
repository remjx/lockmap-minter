
const lockscribeTx = async(
    { data, mediaType, metaDataTemplate, toAddress }, // inscription
    { address, block, satoshisToLock }, // lock
    { walletAddress } // payer
) => {
    const blockHeight = block;
    const bsvtx = bsv.Transaction();

    // build lock output
    const p2pkhOut = new bsv.Transaction.Output({script: bsv.Script(new bsv.Address(address)), satoshis: 1});
    const addressHex = p2pkhOut.script.chunks[2].buf.toString('hex');
    const nLockTimeHexHeight = int2Hex(blockHeight);
    const scriptTemplate = `${LOCKUP_PREFIX} ${addressHex} ${nLockTimeHexHeight} ${LOCKUP_SUFFIX}`;
    const lockingScript = bsv.Script.fromASM(scriptTemplate);
    const lockOutput = new bsv.Transaction.Output({script: lockingScript, satoshis: satoshisToLock})
    bsvtx.addOutput(lockOutput);

    // build inscription output
    const inscriptionScript = buildInscription(toAddress, data, mediaType, metaDataTemplate);
    bsvtx.addOutput(bsv.Transaction.Output({ script: inscriptionScript, satoshis: 1 }));

    // pay
    const satoshis = bsvtx.outputs.reduce(((t, e) => t + e._satoshis), 0);
    const txFee = parseInt(((bsvtx._estimateSize() + P2PKH_INPUT_SIZE) * FEE_FACTOR)) + 1;
    const utxos = await getPaymentUTXOs(walletAddress, satoshis + txFee);
    if (!utxos.length) { throw `Insufficient funds` }
    bsvtx.from(utxos);
    const inputSatoshis = utxos.reduce(((t, e) => t + e.satoshis), 0);
    bsvtx.to(walletAddress, inputSatoshis - satoshis - txFee);

    bsvtx.sign(bsv.PrivateKey.fromWIF(localStorage.walletKey));
    return bsvtx.toString();
}