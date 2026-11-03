import { useContext } from "react";
import { Web3Context } from "./Web3Context.js";

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) throw new Error("useWeb3 must be used within Web3Provider");
  return context;
}
