const escapeText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
function foldLine(line: string) {
  const encoder = new TextEncoder();
  let output = '', length = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (length + size > 75) { output += '\r\n '; length = 1; }
    output += character; length += size;
  }
  return output;
}

/** RFC 5545 all-day stay: departure is exclusive. No inferred hotel check-in time. */
export function confirmationCalendar(confirmation: { reservationId: string; confirmationCode?: string; confirmedAt?: string; receivedAt?: string; arrival: string; departure: string; stays: { roomName: string }[] }) {
  const stamp = new Date(confirmation.confirmedAt ?? confirmation.receivedAt!).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hotel Boutique//Reservas//ES', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${escapeText(confirmation.reservationId)}@hotelboutique.example`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${confirmation.arrival.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${confirmation.departure.replace(/-/g, '')}`,
    `SUMMARY:${escapeText(`Hotel Boutique · ${confirmation.confirmationCode ?? confirmation.reservationId}`)}`,
    `DESCRIPTION:${escapeText(`Estadía en Hotel Boutique.\n${confirmation.stays.map(stay => stay.roomName).join(', ')}`)}`,
    'CLASS:PRIVATE', 'TRANSP:TRANSPARENT', 'END:VEVENT', 'END:VCALENDAR', '',
  ].map(foldLine).join('\r\n');
}
