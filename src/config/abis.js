import foodFiOrders from "./abis/foodFiOrders.json";
import foodFiToken from "./abis/foodFiToken.json";
import foodSavingRewards from "./abis/foodSavingRewards.json";
import foodFiVault from "./abis/foodFiVault.json";
import lpToken from "./abis/lpToken.json";
import liquidityPool from "./abis/liquidityPool.json";
import mockERC20E4 from "./abis/mockERC20E4.json";
import simpleYieldFarm from "./abis/simpleYieldFarm.json";
import dexERC20 from "./abis/dexERC20.json";
import mockERC20E6 from "./abis/mockERC20E6.json";
import pair from "./abis/pair.json";
import factory from "./abis/factory.json";
import router from "./abis/router.json";

export const ABIS = {
  orders: foodFiOrders,
  foodToken: foodFiToken,
  foodRewards: foodSavingRewards,
  vault: foodFiVault,
  ammLpToken: lpToken,
  liquidityPool,
  ammUsd: mockERC20E4,
  farm: simpleYieldFarm,
  dexERC20,
  dexUsd: mockERC20E6,
  dexBridge: mockERC20E6,
  dexPair: pair,
  factory,
  router,
};
