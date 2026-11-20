import { Json } from './api';
import { formatTime } from './dates';

// Status einer Anfrage, wie im Backend (request.status).
export type RequestStatus = 'new' | 'transferred' | 'confirmed' | 'cancelled';

export const STATUS: Record<RequestStatus, { text: string; color: string }> = {
  new: { text: 'Offen', color: '#F44336' },
  transferred: { text: 'Weitergeleitet', color: '#2196F3' },
  confirmed: { text: 'Gebucht', color: '#4CAF50' },
  cancelled: { text: 'Abgesagt', color: '#9E9E9E' },
};
export const STATUS_ORDER: RequestStatus[] = ['new', 'transferred', 'confirmed', 'cancelled'];

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const nonEmpty = (v: unknown) => (typeof v === 'string' && v ? v : null);

// Eine Dolmetsch-Anfrage (GET/POST /me/requests).
export type RequestData = {
  id: string;
  start: Date; // Ortszeit
  end: Date;
  purpose: string;
  remote: boolean; // true = per Video, false = vor Ort
  locationId: string | null; // nur Herkunft (gespeicherter Ort)
  locationName: string; // Adresse gehört der Anfrage selbst
  locationStreet: string;
  locationPostalcode: string;
  locationCity: string;
  locationEmail: string;
  locationPhone: string;
  interpreterName: string | null;
  interpreterPicture: string | null;
  offerCount: number;
  status: RequestStatus;
};

export function parseRequest(j: Json): RequestData {
  const status = (STATUS_ORDER as string[]).includes(j.status) ? (j.status as RequestStatus) : 'new';
  return {
    id: str(j.id),
    start: new Date(j.start_date),
    end: new Date(j.end_date),
    purpose: str(j.purpose),
    remote: j.mode === 'remote',
    locationId: nonEmpty(j.location_id),
    locationName: str(j.location_name),
    locationStreet: str(j.location_street),
    locationPostalcode: str(j.location_postalcode),
    locationCity: str(j.location_city),
    locationEmail: str(j.location_email),
    locationPhone: str(j.location_phone),
    interpreterName: nonEmpty(j.interpreter_name),
    interpreterPicture: nonEmpty(j.interpreter_picture),
    offerCount: typeof j.offer_count === 'number' ? j.offer_count : 0,
    status,
  };
}

// Straße, PLZ Ort (für die Liste).
export const addressText = (r: RequestData) =>
  [r.locationStreet, [r.locationPostalcode, r.locationCity].filter(Boolean).join(' ')].filter(Boolean).join(', ');

export const timeRange = (r: RequestData) => `${formatTime(r.start)} – ${formatTime(r.end)}`;

// Zusage eines Dolmetschers (GET /me/requests/{id}/offers), ohne Vermittler.
export type OfferData = { id: string; interpreterName: string; status: string };

export const parseOffer = (j: Json): OfferData => ({
  id: str(j.offer_id),
  interpreterName: str(j.interpreter_name),
  status: str(j.status), // offered, awarded, declined
});

// Ein eigener Ort (GET/POST /me/locations).
export type LocationData = {
  id: string;
  name: string;
  street: string;
  postalcode: string;
  city: string;
  email: string;
  phone: string;
};

export const parseLocation = (j: Json): LocationData => ({
  id: str(j.id),
  name: str(j.name),
  street: str(j.street),
  postalcode: str(j.postalcode),
  city: str(j.city),
  email: str(j.email),
  phone: str(j.phone),
});

export const locationAddress = (l: LocationData) => `${l.street}, ${l.postalcode} ${l.city}`;
