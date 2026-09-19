// Server-only narrative: do not import this module from the renderer or public catalogue.
export const evidence = [
  {
    id: "register",
    name: "The last arrival",
    location: "Lobby",
    type: "Document",
    description:
      "The register lists only June Ash as a guest. Owner Adrian Vale called manager Mara to his study at 21:00 for an accounts review. Eli was assigned to repair the main breaker.",
    requires: [],
  },
  {
    id: "body",
    name: "A deliberate wound",
    location: "Study",
    type: "Crime scene",
    description:
      "Adrian lies beside his desk. A single narrow stab wound matches the bloodied brass letter opener on the floor. His glass is untouched. The study clock reads 21:12, but the hallway lights are now working.",
    requires: [],
  },
  {
    id: "ledger",
    name: "The missing £18,400",
    location: "Study",
    type: "Accounts",
    description:
      "Adrian circled transfers totalling £18,400 into M. Vale’s personal account. His signed note reads: “Mara — explain these tomorrow morning, or I take this to the police.”",
    requires: ["body"],
  },
  {
    id: "clock",
    name: "A clock stopped too late",
    location: "Hallway",
    type: "Timeline",
    description:
      "The hotel’s mains-powered hallway clock froze at 21:12 when the breaker tripped. This dates the power cut, not the attack. Someone wants the two events confused.",
    requires: [],
  },
  {
    id: "breaker",
    name: "The breaker record",
    location: "Hallway",
    type: "Maintenance",
    description:
      "The breaker’s mechanical event strip records the failure at 21:12 and restoration at 21:18. Eli signed in at the external generator at 21:05; its emergency telephone log kept him there until 21:18.",
    requires: ["clock"],
  },
  {
    id: "glass",
    name: "Two glasses, one false lead",
    location: "Dining room",
    type: "Object",
    description:
      "June’s wineglass bears a dark lipstick stain. Adrian’s untouched water glass is still on the service tray. The labelled stain on the napkin is spilled red wine, not evidence of poison.",
    requires: [],
  },
  {
    id: "letter",
    name: "June’s unsent demand",
    location: "Guest room",
    type: "Letter",
    description:
      "June demanded an interview about unpaid suppliers. Her letter threatens an exposé, not Adrian’s life. A handwritten line reads: “Mara keeps the accounts. Ask her where it went.”",
    requires: [],
  },
  {
    id: "key",
    name: "A key without an alibi",
    location: "Lobby",
    type: "Access",
    description:
      "The service-key checkout sheet is signed by Mara at 20:50 and returned at 21:09. This key opens the study’s service door. There is no forced entry.",
    requires: ["register"],
  },
  {
    id: "receipt",
    name: "A helpful receipt",
    location: "Guest room",
    type: "Corroboration",
    description:
      "A dated laundry receipt confirms June arrived that afternoon. A quarrel mentioned by Mara happened by telephone last week, not in the hotel tonight.",
    requires: [],
  },
];
export const dialogues: Record<
  string,
  { id: string; label: string; requires: string[]; text: string }[]
> = {
  mara: [
    {
      id: "alibi",
      label: "Where were you tonight?",
      requires: [],
      text: "Mara: “At reception, all evening. I only went to the study after the lights failed at 21:12. June was angry with Adrian. You should speak to her.”",
    },
    {
      id: "accounts",
      label: "Ask about the missing funds",
      requires: ["ledger"],
      text: "Mara: “Those transfers were advances. Adrian misunderstood. Yes, he threatened to call the police, but I never entered his study before the blackout.”",
    },
    {
      id: "key",
      label: "Confront her with the key record",
      requires: ["key"],
      text: "Mara: “I borrowed the service key for a cupboard. Returning it at 21:09 proves nothing.” She has changed her claim: she was no longer at reception all evening.",
    },
  ],
  eli: [
    {
      id: "alibi",
      label: "What happened to the power?",
      requires: [],
      text: "Eli: “The storm brought down a line. I was outside at the generator from 21:05. The emergency operator kept me on the phone until the lights came back.”",
    },
    {
      id: "timing",
      label: "Compare the clock and breaker times",
      requires: ["breaker"],
      text: "Eli: “The event strip is mechanical. It recorded 21:12 exactly. A stopped clock tells you when power failed; it cannot tell you when Adrian died.”",
    },
  ],
  june: [
    {
      id: "alibi",
      label: "What did you see?",
      requires: [],
      text: "June: “I was in the dining room writing. At 21:08 I heard Adrian say ‘Mara, put that down,’ then a crash. I saw Mara come from the study corridor. The lights were still on.”",
    },
    {
      id: "witness",
      label: "Check her account against the clock",
      requires: ["clock", "body"],
      text: "June: “My watch read 21:08. The blackout came four minutes later. Mara was holding a folded towel. I didn’t see the blade, but I saw who came out.”",
    },
    {
      id: "letter",
      label: "Ask about the threatening letter",
      requires: ["letter"],
      text: "June: “I wanted a story about unpaid suppliers. I’d lose my source if Adrian died. He told me the irregular transfers were Mara’s.”",
    },
  ],
};
export const deductions = [
  {
    id: "timeline",
    pair: ["clock", "breaker"],
    name: "The blackout is not the murder time",
    description:
      "The clock and event strip agree: power failed at 21:12. June’s statement places the attack four minutes earlier.",
  },
  {
    id: "motive",
    pair: ["ledger", "key"],
    name: "Motive meets opportunity",
    description:
      "Mara faced exposure for the missing money and possessed a key to the study before the blackout.",
  },
];
export const solution = {
  suspect: "Mara Vale",
  method: "The study’s brass letter opener",
  motive: "Conceal £18,400 in stolen hotel funds",
  explanation:
    "Mara entered the study using the service key for the 21:00 accounts meeting. Confronted with the ledger and a threat of police involvement, she stabbed Adrian with his letter opener at approximately 21:08. June heard Adrian name Mara and saw her leaving while the lights were on. Mara returned the key at 21:09, then used the unrelated 21:12 blackout to invent a later arrival. The ledger establishes motive; the key establishes access; the wound establishes the weapon; the independent clock, breaker, and witness account defeat her alibi. June’s angry letter is a genuine grievance, but not proof of murder.",
  timeline: [
    "20:50 — Mara signs out the service key.",
    "21:00 — Adrian summons Mara to review the accounts.",
    "21:05 — Eli starts the logged generator call outside.",
    "21:08 — June hears the confrontation and sees Mara leave the study corridor.",
    "21:09 — Mara returns the service key.",
    "21:12 — The storm trips the breaker; the clock stops.",
    "21:18 — Eli restores power. The body is discovered.",
  ],
};
