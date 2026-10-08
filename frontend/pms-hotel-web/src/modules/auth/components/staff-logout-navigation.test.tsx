import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useState } from "react";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockServer } from "@/data/mocks/server";
import { GuestSessionProvider, useGuestSession } from "./guest-session-provider";
import { StaffLogout, StaffSessionProvider, useStaffSession } from "./staff-session-provider";
import { staffSessionKey } from "../hooks/staff-session-query";

const dto = { staffUserId:"staff", sessionId:"session", username:"staff.demo", roleCode:"RECEPCION", permissions:["RESERVATION_MANAGE", "SERVICE_REQUEST_INTAKE"], memberships:[] };
const guestDTO = { guestAccountId:"guest", sessionId:"guest-session", email:"guest@example.test", context:"GUEST" };
const clients: QueryClient[] = [];
let authenticated = true;
function GuestProbe() {
  const { account, status } = useGuestSession();
  return <output aria-label="Guest">{`${status}|${account?.id ?? "anonymous"}`}</output>;
}
function PrivateContent({ path }: { path: string }) {
  const staff = useStaffSession();
  return <><h1>{path}</h1><p>{staff.userName}</p><StaffLogout /></>;
}
function mount(initial: string) {
  const client = new QueryClient({ defaultOptions:{ queries:{retry:false}, mutations:{retry:false} } });
  clients.push(client);
  const replace = vi.fn(), push = vi.fn(), refresh = vi.fn();
  function Harness() {
    const [path, setPath] = useState(initial);
    replace.mockImplementation((destination: string) => {
      expect(client.getQueryData(staffSessionKey)).toBeNull();
      setPath(destination);
    });
    return <AppRouterContext.Provider value={{replace,push,refresh,back:vi.fn(),forward:vi.fn(),prefetch:vi.fn(),bfcacheId:"logout-test"}}>
      <QueryClientProvider client={client}><GuestSessionProvider><GuestProbe />
        <output aria-label="Pathname">{path}</output>
        {path === "/" ? <><h1>Inicio público</h1><button onClick={() => setPath("/calendario")}>Volver a ruta Staff</button></>
          : <StaffSessionProvider><PrivateContent path={path} /></StaffSessionProvider>}
      </GuestSessionProvider></QueryClientProvider>
    </AppRouterContext.Provider>;
  }
  render(<Harness />);
  return {client,replace,push,refresh,user:userEvent.setup()};
}
beforeEach(() => {
  authenticated = true;
  vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API","false");
  mockServer.use(
    http.get("*/api/auth/staff/session", () => authenticated ? HttpResponse.json(dto) : new HttpResponse(null,{status:401})),
    http.post("*/api/auth/staff/refresh", () => new HttpResponse(null,{status:401})),
    http.delete("*/api/auth/staff/session", () => { authenticated=false;return new HttpResponse(null,{status:204}); }),
    http.get("*/api/auth/guest/session", () => HttpResponse.json(guestDTO)),
  );
});
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.unstubAllEnvs(); });

describe("explicit Staff logout navigation", () => {
  it.each(["/dashboard","/calendario"])("replaces %s with / after success and clears only Staff data", async path => {
    const {client,user,replace,push,refresh} = mount(path);
    await screen.findByRole("heading",{name:path});
    await waitFor(() => expect(screen.getByLabelText("Guest")).toHaveTextContent("signed-in|guest"));
    for (const key of ["private-09","reservations","rooms","staff-room-catalog"]) client.setQueryData([key,"staff-fixture"],{staffData:true});
    client.setQueryData(["guest","profile"],{guestData:true});
    client.setQueryData(["public-availability"],{publicData:true});
    await user.click(screen.getByRole("button",{name:"Cerrar sesión"}));
    await screen.findByRole("heading",{name:"Inicio público"});
    expect(screen.getByLabelText("Pathname")).toHaveTextContent(/^\/$/);
    expect(replace).toHaveBeenCalledExactlyOnceWith("/");
    expect(push).not.toHaveBeenCalled(); expect(refresh).not.toHaveBeenCalled();
    expect(client.getQueryData(staffSessionKey)).toBeNull();
    for (const key of ["private-09","reservations","rooms","staff-room-catalog"]) expect(client.getQueriesData({queryKey:[key]})).toEqual([]);
    expect(client.getQueryData(["guest-session"])).toMatchObject({context:"GUEST"});
    expect(client.getQueryData(["guest","profile"])).toEqual({guestData:true});
    expect(client.getQueryData(["public-availability"])).toEqual({publicData:true});
    expect(screen.getByLabelText("Guest")).toHaveTextContent("signed-in|guest");
    expect(screen.queryByText("Sesión Staff requerida")).not.toBeInTheDocument();
  });
  it("waits for BFF confirmation before clearing state or navigating", async () => {
    let release!: () => void;
    mockServer.use(http.delete("*/api/auth/staff/session",async()=>{await new Promise<void>(resolve=>{release=resolve;});authenticated=false;return new HttpResponse(null,{status:204});}));
    const {client,user,replace} = mount("/calendario");
    await screen.findByRole("heading",{name:"/calendario"});
    await user.click(screen.getByRole("button",{name:"Cerrar sesión"}));
    await waitFor(()=>expect(release).toBeDefined());
    expect(screen.getByRole("button",{name:"Cerrando sesión…"})).toBeDisabled();
    expect(client.getQueryData(staffSessionKey)).toMatchObject({staffUserId:"staff"});
    expect(replace).not.toHaveBeenCalled();
    await act(async()=>release());
    await screen.findByRole("heading",{name:"Inicio público"});
  });
  it("failed logout keeps Staff session/cache and location, with an actionable error", async () => {
    mockServer.use(http.delete("*/api/auth/staff/session",()=>new HttpResponse(null,{status:503})));
    const {client,user,replace} = mount("/calendario");
    await screen.findByRole("heading",{name:"/calendario"});
    client.setQueryData(["reservations","staff-fixture"],{privateData:true});
    await user.click(screen.getByRole("button",{name:"Cerrar sesión"}));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cerrar la sesión");
    expect(screen.getByRole("heading",{name:"/calendario"})).toBeInTheDocument();
    expect(client.getQueryData(staffSessionKey)).toMatchObject({staffUserId:"staff"});
    expect(client.getQueryData(["reservations","staff-fixture"])).toEqual({privateData:true});
    expect(replace).not.toHaveBeenCalled();
  });
  it.each(["/dashboard","/reservas","/calendario","/staff/habitaciones"])("direct unauthenticated %s access replaces the private route with home", async path => {
    authenticated=false;
    const {replace}=mount(path);
    await screen.findByRole("heading",{name:"Inicio público"});
    expect(screen.getByLabelText("Pathname")).toHaveTextContent(/^\/$/);
    expect(screen.queryByText("staff.demo")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledExactlyOnceWith("/");
  });
  it("returning to a Staff route after logout cannot recover private content", async () => {
    const {user,client,replace}=mount("/dashboard");
    await screen.findByRole("heading",{name:"/dashboard"});
    await user.click(screen.getByRole("button",{name:"Cerrar sesión"}));
    await screen.findByRole("heading",{name:"Inicio público"});
    await user.click(screen.getByRole("button",{name:"Volver a ruta Staff"}));
    await waitFor(()=>expect(replace).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("heading",{name:"Inicio público"})).toBeInTheDocument();
    expect(screen.queryByText("staff.demo")).not.toBeInTheDocument();
    expect(client.getQueryData(staffSessionKey)).toBeNull();
  });
});
