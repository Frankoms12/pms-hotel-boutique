import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetStaffRoomCatalog, roomCatalogFixture, operationalRoomFixture } from '@/data/mocks/staff-room-catalog';
import { RoomCatalogAdmin } from './room-catalog-admin';

beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true'); resetStaffRoomCatalog(); });
afterEach(() => vi.unstubAllEnvs());
function renderCatalog(propertyId = 'GT-HB-01', canManage = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><RoomCatalogAdmin propertyId={propertyId} sessionId="staff-test" canManage={canManage} /></QueryClientProvider>);
}
async function typesTab() {
  await screen.findByRole('heading', { name: 'Administrar habitaciones' });
  fireEvent.click(screen.getByRole('tab', { name: 'Tipos de habitación' }));
}
async function createType(code: string, name: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Nuevo tipo' }));
  fireEvent.change(screen.getByLabelText('Código del tipo'), { target: { value: code } });
  fireEvent.change(screen.getByLabelText('Nombre del tipo'), { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
}

describe('Staff room catalog', () => {
  it('creates a personalized type and physical room together, with floor, private notes and a public preview', async () => {
    renderCatalog(); await screen.findByRole('heading', { name: 'Administrar habitaciones' });
    fireEvent.click(screen.getByRole('button', { name: 'Nueva habitación' }));
    fireEvent.change(screen.getByLabelText('Número / código de habitación'), { target: { value: '601' } });
    fireEvent.change(screen.getByLabelText('Piso / nivel'), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText('Notas internas de la habitación'), { target: { value: 'Cerca del ascensor' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear tipo personalizado' }));
    fireEvent.change(screen.getByLabelText('Código del nuevo tipo'), { target: { value: 'FAM-TERRAZA' } });
    fireEvent.change(screen.getByLabelText('Nombre del nuevo tipo'), { target: { value: 'Familiar con terraza' } });
    fireEvent.change(screen.getByLabelText('Capacidad máxima'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Tamaño (m²)'), { target: { value: '42' } });
    fireEvent.change(screen.getByLabelText('Configuración de camas'), { target: { value: 'King y sofá cama' } });
    fireEvent.change(screen.getByLabelText('Descripción para el huésped'), { target: { value: 'Espacio para disfrutar en familia.' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Terraza' }));
    const preview = within(screen.getByRole('region', { name: 'Vista previa de la ficha pública' }));
    expect(preview.getByText(/4 huéspedes/)).toHaveTextContent('42 m²');
    expect(preview.queryByText('Cerca del ascensor')).not.toBeInTheDocument();
    const photoInput = screen.getByLabelText('Seleccionar fotografías');
    const openChooser = vi.spyOn(photoInput, 'click');
    fireEvent.click(preview.getByRole('button', { name: /Agrega fotografías del tipo/ }));
    expect(openChooser).toHaveBeenCalledOnce();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.change(photoInput, { target: { files: [new File(['photo'], 'terraza.png', { type: 'image/png' })] } });
    await waitFor(() => expect(preview.getByRole('img', { name: 'Familiar con terraza' })).toHaveAttribute('src', expect.stringContaining('data:image/png;base64,')));
    const photo = preview.getByRole('img', { name: 'Familiar con terraza' }).getAttribute('src');
    expect(preview.queryByRole('button', { name: /Agrega fotografías del tipo/ })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), { timeout: 5000 });
    const catalog = roomCatalogFixture('GT-HB-01'), created = catalog.rooms.find(room => room.code === '601')!;
    expect(catalog.types).toHaveLength(5); expect(catalog.rooms).toHaveLength(11);
    expect(catalog.types.find(type => type.id === created.roomTypeId)).toMatchObject({ name: 'Familiar con terraza', presentation: { maxOccupancy: 4, amenities: ['Terraza'], images: [photo] } });
    expect(created).toMatchObject({ floor: '6', internalNotes: 'Cerca del ascensor' });
    expect(operationalRoomFixture('GT-HB-01').find(room => room.room_id === created.id)).toMatchObject({ floor: '6', status: 'ACTIVE' });
  });
  it('preserves physical draft fields while switching type mode and inherits an existing public profile', async () => {
    renderCatalog(); await screen.findByRole('heading', { name: 'Administrar habitaciones' });
    fireEvent.click(screen.getByRole('button', { name: 'Nueva habitación' }));
    fireEvent.change(screen.getByLabelText('Número / código de habitación'), { target: { value: '205' } });
    fireEvent.change(screen.getByLabelText('Piso / nivel'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear tipo personalizado' }));
    fireEvent.change(screen.getByLabelText('Nombre del nuevo tipo'), { target: { value: 'Mi tipo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Usar tipo existente' }));
    fireEvent.change(screen.getByLabelText('Tipo de habitación'), { target: { value: 'RT-DLX' } });
    expect(screen.getByLabelText('Número / código de habitación')).toHaveValue('205');
    const preview = within(screen.getByRole('region', { name: 'Vista previa de la ficha pública' }));
    expect(preview.getByText(/2 huéspedes/)).toHaveTextContent('King · 32 m²');
    expect(preview.queryByRole('button', { name: /Agrega fotografías del tipo/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), { timeout: 5000 });
    expect(roomCatalogFixture('GT-HB-01').types).toHaveLength(4);
    expect(roomCatalogFixture('GT-HB-01').rooms.find(room => room.code === '205')).toMatchObject({ roomTypeId: 'RT-DLX', floor: '2' });
  });
  it('creates a type without adding physical inventory, then creates and renames a room preserving its type/id', async () => {
    renderCatalog(); await typesTab();
    await createType('FAM', 'Familiar');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), { timeout: 5000 });
    expect(roomCatalogFixture('GT-HB-01').rooms).toHaveLength(10);
    fireEvent.click(screen.getByRole('tab', { name: 'Habitaciones físicas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nueva habitación' }));
    fireEvent.change(screen.getByLabelText('Número / código de habitación'), { target: { value: '501' } });
    const typeId = roomCatalogFixture('GT-HB-01').types.find(type => type.code === 'FAM')!.id;
    fireEvent.change(screen.getByLabelText('Tipo de habitación'), { target: { value: typeId } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), { timeout: 5000 });
    expect(screen.getByRole('button', { name: 'Editar 501' })).toBeInTheDocument();
    const before = { ...roomCatalogFixture('GT-HB-01').rooms.find(room => room.code === '501')! };
    fireEvent.click(screen.getByRole('button', { name: 'Editar 501' }));
    expect(screen.queryByLabelText('Tipo de habitación')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Número / código de habitación'), { target: { value: '502' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), { timeout: 5000 });
    expect(screen.getByRole('button', { name: 'Editar 502' })).toBeInTheDocument();
    expect(roomCatalogFixture('GT-HB-01').rooms.find(room => room.id === before.id)).toMatchObject({ code: '502', roomTypeId: typeId, createdAt: before.createdAt });
    expect(operationalRoomFixture('GT-HB-01').find(room => room.room_id === before.id)).toMatchObject({ number: '502', floor: null, status: 'ACTIVE', room_type_label: 'Familiar' });
    expect(roomCatalogFixture('GT-HB-01').rooms).toHaveLength(11);
  }, 15000); // Three sequential HTTP mutations and the complete create/edit interaction.

  it('focuses the first invalid field and preserves entries after duplicate-code rejection', async () => {
    renderCatalog(); await typesTab();
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo tipo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(screen.getByLabelText('Código del tipo')).toHaveFocus();
    expect(screen.getByLabelText('Código del tipo')).toHaveAttribute('aria-invalid', 'true');
    expect(roomCatalogFixture('GT-HB-01').types).toHaveLength(4);
    fireEvent.change(screen.getByLabelText('Código del tipo'), { target: { value: 'std' } });
    fireEvent.change(screen.getByLabelText('Nombre del tipo'), { target: { value: 'Mi tipo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ese código ya existe');
    expect(screen.getByLabelText('Nombre del tipo')).toHaveValue('Mi tipo');
    expect(roomCatalogFixture('GT-HB-01').types).toHaveLength(4);
  });

  it('isolates the inventory of different properties', async () => {
    renderCatalog('GT-HB-03'); await typesTab();
    expect(screen.queryByRole('button', { name: 'Editar STD' })).not.toBeInTheDocument();
    await createType('NEW', 'Otra propiedad');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(roomCatalogFixture('GT-HB-03').types).toHaveLength(1);
    expect(roomCatalogFixture('GT-HB-01').types).toHaveLength(4);
    expect(roomCatalogFixture('GT-HB-03').rooms).toHaveLength(0);
  });

  it('keeps sessions without management permission in read-only mode', async () => {
    renderCatalog('GT-HB-01', false); await typesTab();
    expect(screen.queryByRole('button', { name: 'Nuevo tipo' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('table')).queryByRole('button', { name: /Editar/ })).not.toBeInTheDocument();
  });

  it('does not expose the mock transport when the application uses the real backend', () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false'); renderCatalog();
    expect(screen.getByRole('status')).toHaveTextContent('cuando se conecte el catálogo');
    expect(screen.queryByRole('button', { name: 'Nueva habitación' })).not.toBeInTheDocument();
  });
});
