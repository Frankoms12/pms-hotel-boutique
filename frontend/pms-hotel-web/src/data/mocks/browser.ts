import { setupWorker } from "msw/browser";

import { handlers } from "./handlers";
import { reservationHandlers } from "./reservation-handlers";
import { web3Handlers } from "./web3-handlers";
import { staffPreviewTransportGuard } from './staff-preview';

export const mockWorker = setupWorker(...handlers, ...reservationHandlers, ...web3Handlers, staffPreviewTransportGuard);
