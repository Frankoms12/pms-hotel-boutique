import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RoomTypePhotoEditor } from './room-type-photo-editor';
function Photos() {
  const [images, setImages] = useState<string[]>([]);
  return <RoomTypePhotoEditor images={images} onChange={setImages} disabled={false} onBusyChange={vi.fn()} />;
}
describe('Room type photos', () => {
  it('rejects unsafe photo references, adds valid sources, and changes/removes the cover', () => {
    render(<Photos />);
    fireEvent.change(screen.getByLabelText('O agregar una URL de fotografía'), { target: { value: 'javascript:alert(1)' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar foto' }));
    expect(screen.getByRole('alert')).toHaveTextContent('URL HTTPS');
    for (const suffix of ['deluxe-king', 'junior-suite']) {
      fireEvent.change(screen.getByLabelText('O agregar una URL de fotografía'), { target: { value: `/images/rooms/demo/${suffix}.webp` } });
      fireEvent.click(screen.getByRole('button', { name: 'Agregar foto' }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Usar foto 2 como portada' }));
    expect(screen.getByRole('img', { name: 'Fotografía 1' }).getAttribute('src')).toContain('junior-suite');
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar foto 1' }));
    expect(screen.getAllByRole('img')).toHaveLength(1);
  });
  it('reads a raster file locally and rejects SVG, empty or oversized files', async () => {
    render(<Photos />);
    fireEvent.change(screen.getByLabelText('Seleccionar fotografías'), { target: { files: [new File(['test'], 'a.svg', { type: 'image/svg+xml' })] } });
    expect(screen.getByRole('alert')).toHaveTextContent('JPG, PNG o WebP');
    fireEvent.change(screen.getByLabelText('Seleccionar fotografías'), { target: { files: [new File(['image'], 'a.png', { type: 'image/png' })] } });
    await waitFor(() => expect(screen.getByRole('img', { name: 'Fotografía 1' })).toHaveAttribute('src', expect.stringContaining('data:image/png;base64,')));
    fireEvent.change(screen.getByLabelText('Seleccionar fotografías'), { target: { files: [new File(['a'.repeat(2 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' })] } });
    expect(screen.getByRole('alert')).toHaveTextContent('hasta 2 MB');
    expect(screen.getAllByRole('img')).toHaveLength(1);
  });
});
