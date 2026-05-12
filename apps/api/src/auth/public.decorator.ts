import { SetMetadata } from "@nestjs/common";
import { IS_PUBLIC_KEY } from "./auth.types.js";

/**
 * Marks an endpoint as public (no auth required).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
