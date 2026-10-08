import {http,HttpResponse} from "msw";
import { setupServer } from "msw/node";

import { handlers } from "./handlers";

export const mockServer = setupServer(http.get("*/api/auth/guest/session",()=>new HttpResponse(null,{status:401})),http.post("*/api/auth/guest/refresh",()=>new HttpResponse(null,{status:401})),http.delete("*/api/auth/guest/session",()=>new HttpResponse(null,{status:204})),...handlers);
