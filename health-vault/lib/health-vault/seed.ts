import type { Evidence, Person, WorkRecord } from "./types";

export const SEED_PEOPLE: Person[] = [
  {
    id: "p1",
    name: "Carlos Méndez",
    role: "Gerente de área",
    department: "Operaciones",
    relationship: "Jefe directo",
    email: "carlos.mendez@empresa.com",
    phone: "",
    notes: "Supervisor inmediato desde enero 2025.",
    createdAt: "2025-01-10T09:00:00.000Z",
  },
  {
    id: "p2",
    name: "Ana Ruiz",
    role: "Coordinadora RH",
    department: "Recursos Humanos",
    relationship: "RH",
    email: "ana.ruiz@empresa.com",
    phone: "",
    notes: "Contacto para reportes formales.",
    createdAt: "2025-02-01T10:00:00.000Z",
  },
  {
    id: "p3",
    name: "Luis Ortega",
    role: "Compañero de equipo",
    department: "Operaciones",
    relationship: "Testigo",
    email: "luis.ortega@empresa.com",
    phone: "",
    notes: "Presente en reunión del 15 de marzo.",
    createdAt: "2025-03-15T14:00:00.000Z",
  },
];

export const SEED_RECORDS: WorkRecord[] = [
  {
    id: "r1",
    type: "comportamiento",
    title: "Asignación de tareas fuera de horario sin compensación",
    date: "2025-03-15",
    description:
      "El gerente asignó trabajo urgente un viernes a las 18:30, con entrega el lunes, sin reconocer horas extra ni flexibilidad previa acordada.",
    personIds: ["p1", "p3"],
    status: "documentado",
    behaviorKind: "incorrecto",
    tags: ["horas-extra", "asignación"],
    createdAt: "2025-03-15T19:00:00.000Z",
    updatedAt: "2025-03-15T19:00:00.000Z",
  },
  {
    id: "r2",
    type: "queja",
    title: "Falta de respuesta a solicitud de aclaración de políticas",
    date: "2025-04-02",
    description:
      "Envié correo solicitando aclaración sobre política de home office. Pasaron 12 días hábiles sin respuesta formal de RH.",
    personIds: ["p2"],
    status: "abierto",
    tags: ["rh", "políticas", "home-office"],
    createdAt: "2025-04-02T11:00:00.000Z",
    updatedAt: "2025-04-02T11:00:00.000Z",
  },
  {
    id: "r3",
    type: "correspondencia",
    title: "Correo de reconocimiento por entrega de proyecto",
    date: "2025-02-20",
    description:
      "Correo del gerente reconociendo entrega a tiempo del proyecto Q1. Útil como referencia de desempeño positivo.",
    personIds: ["p1"],
    status: "documentado",
    tags: ["reconocimiento", "desempeño"],
    createdAt: "2025-02-20T16:30:00.000Z",
    updatedAt: "2025-02-20T16:30:00.000Z",
  },
];

export const SEED_EVIDENCE: Evidence[] = [
  {
    id: "e1",
    recordId: "r1",
    type: "email",
    title: "Correo de asignación urgente — viernes 18:32",
    date: "2025-03-15",
    content:
      "Asunto: URGENTE entrega lunes\n\nNecesito el reporte completo para el lunes 8am. Sé que es tarde pero es prioridad.\n\n— Carlos Méndez",
    source: "carlos.mendez@empresa.com",
    personId: "p1",
    createdAt: "2025-03-15T18:35:00.000Z",
  },
  {
    id: "e2",
    recordId: "r1",
    type: "testigo",
    title: "Declaración de Luis Ortega",
    date: "2025-03-15",
    content:
      "Estaba en la oficina cuando Carlos envió el correo. Vi que varios del equipo también recibieron asignaciones similares ese viernes.",
    source: "Luis Ortega",
    personId: "p3",
    createdAt: "2025-03-16T10:00:00.000Z",
  },
  {
    id: "e3",
    recordId: "r2",
    type: "email",
    title: "Solicitud de aclaración — home office",
    date: "2025-04-02",
    content:
      "Asunto: Solicitud de aclaración — política de home office\n\nEstimada Ana,\n\nSolicito por escrito la política vigente de trabajo remoto y los criterios de elegibilidad.\n\nQuedo atento.\n\nSaludos.",
    source: "yo@empresa.com",
    personId: "p2",
    createdAt: "2025-04-02T11:00:00.000Z",
  },
  {
    id: "e4",
    recordId: "r3",
    type: "email",
    title: "Reconocimiento entrega Q1",
    date: "2025-02-20",
    content:
      "Asunto: Excelente trabajo en Q1\n\nQuería reconocer tu entrega del proyecto. Cumpliste plazos y la calidad fue sobresaliente.\n\n— Carlos",
    source: "carlos.mendez@empresa.com",
    personId: "p1",
    createdAt: "2025-02-20T16:30:00.000Z",
  },
];
