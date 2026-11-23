declare module "virtual:library" {
  import type { Library } from "./lib/types.ts";
  const library: Library;
  export default library;
}
