import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { AvailabilitySearch, AvailabilityResults } from "@/modules/multi-property";
import { PropertyProvider } from "@/modules/properties";
vi.hoisted(() => { vi.resetModules(); });
// This provisional domain permission is not part of the Backend Staff contract.
// Isolate presentation coverage; PrivateLayout tests prove BFF does not grant it.
vi.mock("@/modules/auth", () => ({useStaffSession: () => ({
  id:"staff-current",userName:"Domain fixture",roleId:"gerencia",permissions:["COMPARE_AVAILABILITY","MULTI_PROPERTY_READ"],
  memberships:[{propertyId:"GT-HB-01",name:"Hotel Boutique Huehue",timezone:"America/Guatemala",currency:"GTQ",active:true},
    {propertyId:"GT-HB-03",name:"Hotel Boutique Antigua",timezone:"America/Guatemala",currency:"GTQ",active:true}],
})}));
const navigation=vi.hoisted(() => ({push:vi.fn(),replace:vi.fn(),refresh:vi.fn(),back:vi.fn(),forward:vi.fn(),prefetch:vi.fn(),bfcacheId:"comparison-presentation"}));
const clients:QueryClient[]=[];
function mount(page:ReactNode){
  const client=new QueryClient({defaultOptions:{queries:{retry:false}}});clients.push(client);
  render(<AppRouterContext.Provider value={navigation}><QueryClientProvider client={client}><PropertyProvider>{page}</PropertyProvider></QueryClientProvider></AppRouterContext.Provider>);
}
beforeEach(()=>{localStorage.clear();sessionStorage.clear();vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API","true");navigation.push.mockClear();});
afterEach(()=>{cleanup();clients.splice(0).forEach(client=>client.clear());vi.unstubAllEnvs();});
describe("provisional comparison presentation (no authentication)",()=>{
  it("validates dates and submits the actual search criteria", async () => {
    const user = userEvent.setup(); mount(<AvailabilitySearch />);
    await screen.findByLabelText("Entrada");
    await user.clear(screen.getByLabelText("Salida")); await user.type(screen.getByLabelText("Salida"), "2026-09-11");
    await user.click(screen.getByRole("button", { name: "Buscar disponibilidad" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("salida posterior");
    expect(navigation.push).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText("Salida")); await user.type(screen.getByLabelText("Salida"), "2026-09-14");
    await user.type(screen.getByLabelText("Tipo de habitación"), "King");
    await user.click(screen.getByRole("button", { name: "Buscar disponibilidad" }));
    expect(navigation.push).toHaveBeenCalledWith("/multi-property/disponibilidad/resultados?start=2026-09-12&end=2026-09-14&roomType=King");
  });
  it("filters comparison by scope, room type and dates", async () => {
    sessionStorage.setItem("pms:private-09:scope:staff-current", "ALL_PROPERTIES");
    mount(<AvailabilityResults criteria={{ startDate: "2026-09-12", endDate: "2026-09-14", roomType: "King" }} />);
    const table = await screen.findByRole("region", { name: "Disponibilidad por propiedad y fecha" });
    expect(table).toHaveTextContent("Deluxe King"); expect(table).toHaveTextContent("Patio King");
    expect(table).not.toHaveTextContent("Standard Twin");
    expect(table).toHaveTextContent("America/Guatemala");
    expect(screen.queryByRole("button", { name: "Evaluar rebooking" })).not.toBeInTheDocument();
  });
});
