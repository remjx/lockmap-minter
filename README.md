# 🔓 LRC-20

> Read every word if you decide to test. These will be worthless. Use at your own risk.

This is just a fun experimental standard demonstrating that you can lock bitcoin as a fair mint mechanism for fungible tokens. It by no means should be considered THE standard for fungibility on bitcoin with ordinals, as I believe there are almost certainly better design choices and optimization improvements to be made. Consequently, this is an extremely dynamic experiment, and I strongly discourage any financial decisions to be made on the basis of it's design. I do, however, encourage the bitcoin community to tinker with standard designs and optimizations until a general consensus on best practices is met (or to decide that this is a bad idea altogether!).

## Introduction

LRC-20 is the first fungible token protocol utilizing proof-of-lock as the fair mint mechanism.&#x20;

The design is a variation of [BSV-20 V1](https://docs.1satordinals.com/bsv20) with a [lockup](https://github.com/shruggr/lockup) contract. Deploy and mint operations require locking bitcoin for a specified number of blocks in order to be valid.

## Specification

Only differences with BSV-20 are documented here for now.

### Deploy

Two fields are added to the deploy operation:

* `blocks`: The minimum number of blocks bitcoins must be locked for a mint to be valid.
* `yield`: The maximum number of tokens that can be minted (yielded) for each 1 bitcoin locked. Partial bitcoins locked can mint a proportional amount of tokens.

Deploy transactions require 2 outputs:

1. Locking script - [https://github.com/shruggr/lockup](https://github.com/shruggr/lockup).

    The minimum lock to deploy a ticker is 1 bitcoin for 21,000 blocks.

2. Deploy inscription - [https://docs.1satordinals.com/text-inscriptions](https://docs.1satordinals.com/text-inscriptions)

    ```json
    {
        "p": "lrc-20",
        "op": "deploy",
        "tick": "lock",
        "max": "21000000",
        "lim": "1000",
        "blocks": "21000",
        "yield": "1000"
    }
    ```

Example: https://whatsonchain.com/tx/6d70c9c09456cf77cd39e0c84ca623694fffc74ba203f0c86f4058c5cb0c20b0

### Mint

Mint transactions require 2 outputs:

1. Locking script

    Lock duration must be greater than or equal to the `blocks` specified in the deploy inscription.

2. Mint inscription - [https://docs.1satordinals.com/text-inscriptions](https://docs.1satordinals.com/text-inscriptions)

    ```json
    {
        "p": "lrc-20",
        "op": "mint",
        "tick": "lock",
        "amt": "1000"
    }
    ```

Example: https://whatsonchain.com/tx/4d20e2caa2dd6736c38253163c7dd936996bf5b4697c2a86a8618ec509fb0ff0

### Metadata

Content-type should be `application/lrc-20` instead of `application/bsv-20`.

## Minter

Experimental minter is available at https://remjx.github.io/lrc20-minter/
This repo holds the code for the minter.
To run it locally, `npm install && npm run start`
github-pages deployment w/ creat-react-app kinda weird so may need to remove the `/lrc20-minter/` from the urls in app and package.json `"homepage"` to get it working.

## References

BRC-20 experiment https://domo-2.gitbook.io/brc-20-experiment

BSV-20 spec https://docs.1satordinals.com/bsv20

shruggr lockup scrypt contract https://github.com/shruggr/lockup
