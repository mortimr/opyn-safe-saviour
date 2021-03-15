export const tag = 'Test Deployments';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const gebDeployedContractsPath: { [key: number]: string } = {
    42: 'releases/kovan/1.4.0/median/fixed-discount/contracts.json'
}

const deploy: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {

    const nid = await hre.getChainId();

    if (hre.network.tags.test === true && gebDeployedContractsPath[nid]) {

        const { deploy } = hre.deployments;
        const deployer = (await hre.getUnnamedAccounts())[0];

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const gc = require(`geb-changelog/${gebDeployedContractsPath[nid]}`);

        const OpynV2ControllerMock = await deploy('OpynV2ControllerMock', {
            from: deployer,
            args: [],
            log: true,
        });

        const OpynV2WhitelistMock = await deploy('OpynV2WhitelistMock', {
            from: deployer,
            args: [],
            log: true
        });

        const UniswapV2Router02Mock = await deploy('UniswapV2Router02Mock', {
            from: deployer,
            args: [],
            log: true
        });

        const OpynSafeSaviourOperator = await deploy('OpynSafeSaviourOperator', {
            from: deployer,
            args: [
                OpynV2ControllerMock.address,
                OpynV2WhitelistMock.address,
                UniswapV2Router02Mock.address,
                gc.SAFE_SAVIOUR_REGISTRY
            ],
            log: true
        });

        const OpynSaveSaviour = await deploy('OpynSafeSaviour', {
            from: deployer,
            args: [
                gc.GEB_JOIN_ETH_A,
                gc.GEB_LIQUIDATION_ENGINE,
                gc.GEB_ORACLE_RELAYER,
                gc.SAFE_MANAGER,
                gc.SAFE_SAVIOUR_REGISTRY,
                OpynSafeSaviourOperator.address,
                '500000000000000000', //0.5 eth
                '500000000000000000000', // 500 $
                '10', // Safe should have at leave 0.5 * 10 => 5 eth as collateral
                '170'
            ],
            log: true,
            gasLimit: 4500000
        });

        console.log(`Mocked Opyn Safe Saviour => ${OpynSaveSaviour.address}`);

    }

};

export default deploy;