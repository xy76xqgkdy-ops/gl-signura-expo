import { Json } from './api';
import { formatTime, pad2 } from './dates';

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
  interpreterPictures: string[]; // gebuchte Dolmetscher:innen, Data-URLs (höchstens 3)
  offerCount: number;
  status: RequestStatus;
  // Terminsuche ("Bitte Termin für mich vereinbaren"): booking "arrange".
  // Solange kein Termin angenommen ist, sind start/end der Wunsch-Zeitraum
  // und arrangeState ist gesetzt (sonst null).
  booking: 'fixed' | 'arrange';
  wishFrom: Date | null; // frühestens (Tag, Ortszeit)
  wishTo: Date | null; // spätestens
  timeOfDay: TimeOfDay;
  urgent: boolean;
  note: string;
  arrangeState: ArrangeState | null;
  proposalStart: Date | null; // offener Terminvorschlag
  proposalEnd: Date | null;
};

// searching = noch kein Vermittler, in_progress = ein Vermittler kümmert
// sich, proposed = Terminvorschlag offen, cancelled = abgesagt ohne Termin.
export type ArrangeState = 'searching' | 'in_progress' | 'proposed' | 'cancelled';
const ARRANGE_STATES: ArrangeState[] = ['searching', 'in_progress', 'proposed', 'cancelled'];

export type TimeOfDay = 'morning' | 'afternoon' | 'any';
export const TIMES_OF_DAY: { v: TimeOfDay; label: string }[] = [
  { v: 'morning', label: 'vormittags' },
  { v: 'afternoon', label: 'nachmittags' },
  { v: 'any', label: 'egal' },
];

// "2026-12-01" ↔ Tag in Ortszeit.
export const parseDay = (v: unknown): Date | null => {
  const m = typeof v === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(v) : null;
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
export const dayString = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const optDate = (v: unknown) => (typeof v === 'string' && v ? new Date(v) : null);

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
    interpreterPictures: Array.isArray(j.interpreter_pictures)
      ? j.interpreter_pictures.filter((p: unknown): p is string => typeof p === 'string' && p !== '')
      : [],
    offerCount: typeof j.offer_count === 'number' ? j.offer_count : 0,
    status,
    booking: j.booking === 'arrange' ? 'arrange' : 'fixed',
    wishFrom: parseDay(j.wish_from),
    wishTo: parseDay(j.wish_to),
    timeOfDay: TIMES_OF_DAY.some((t) => t.v === j.time_of_day) ? (j.time_of_day as TimeOfDay) : 'any',
    urgent: j.urgent === true,
    note: str(j.note),
    arrangeState: (ARRANGE_STATES as string[]).includes(j.arrange_state) ? (j.arrange_state as ArrangeState) : null,
    proposalStart: optDate(j.proposal_start),
    proposalEnd: optDate(j.proposal_end),
  };
}

// Kurzes Datum "Di. 24.11." und Zeitraum "23.11.–27.11." (ein Tag nur einmal).
const WD = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];
export const shortDay = (d: Date) => `${WD[d.getDay()]} ${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.`;
const dm = (d: Date) => `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.`;
export const wishText = (r: RequestData) =>
  r.wishFrom && r.wishTo
    ? r.wishFrom.getTime() === r.wishTo.getTime()
      ? dm(r.wishFrom)
      : `${dm(r.wishFrom)}–${dm(r.wishTo)}`
    : '';

// Stand der Terminsuche in einem Satz (Liste).
export function arrangeText(r: RequestData): string {
  switch (r.arrangeState) {
    case 'searching':
      return 'Termin wird gesucht';
    case 'in_progress':
      return 'Vermittler vereinbart den Termin';
    case 'proposed':
      return r.proposalStart
        ? `Vorschlag: ${shortDay(r.proposalStart)}, ${formatTime(r.proposalStart)} Uhr – bitte bestätigen`
        : 'Terminvorschlag – bitte bestätigen';
    case 'cancelled':
      return 'Terminsuche abgesagt';
    default:
      return '';
  }
}

// Straße, PLZ Ort (für die Liste).
export const addressText = (r: RequestData) =>
  [r.locationStreet, [r.locationPostalcode, r.locationCity].filter(Boolean).join(' ')].filter(Boolean).join(', ');

export const timeRange = (r: RequestData) => `${formatTime(r.start)} – ${formatTime(r.end)}`;

// Zusage eines Dolmetschers (GET /me/requests/{id}/offers) mit Profilbild, ohne Vermittler.
// Terminvorschlag: status "proposed" mit proposedStart/-End.
export type OfferData = {
  id: string;
  interpreterName: string;
  picture: string | null;
  status: string;
  proposedStart: Date | null;
  proposedEnd: Date | null;
};

export const parseOffer = (j: Json): OfferData => ({
  id: str(j.offer_id),
  interpreterName: str(j.interpreter_name),
  picture: nonEmpty(j.picture), // Data-URL, fehlt ohne Bild
  status: str(j.status), // offered, proposed, awarded, declined
  proposedStart: optDate(j.proposed_start),
  proposedEnd: optDate(j.proposed_end),
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
