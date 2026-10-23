/**
 * Firestore Service for PontoPro
 * CRUD operations for Companies, Establishments, Employees, TimeEvents, Corrections, and AuditLogs.
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  DocumentSnapshot,
  QuerySnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  Company,
  Establishment,
  Employee,
  WorkSchedule,
  TimeEvent,
  CorrectionRequest,
  AuditLog,
} from '../types';

// ---------------------------------------------------------------------------
// Collection references
// ---------------------------------------------------------------------------

const companiesCol = collection(db, 'companies');
const establishmentsCol = collection(db, 'establishments');
const employeesCol = collection(db, 'employees');
const schedulesCol = collection(db, 'work_schedules');
const punchesCol = collection(db, 'time_events');
const correctionsCol = collection(db, 'corrections');
const auditLogsCol = collection(db, 'audit_logs');

// ---------------------------------------------------------------------------
// Helper: convert Firestore doc to typed object
// ---------------------------------------------------------------------------

function docToData<T>(docSnapshot: DocumentSnapshot): T | null {
  if (!docSnapshot.exists()) return null;
  return { id: docSnapshot.id, ...docSnapshot.data() } as T;
}

function docsToData<T>(snapshot: QuerySnapshot): T[] {
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as T));
}

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

export const companyService = {
  async list(): Promise<Company[]> {
    const q = query(companiesCol, orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    return docsToData<Company>(snap);
  },

  async get(id: string): Promise<Company | null> {
    const snap = await getDoc(doc(companiesCol, id));
    return docToData<Company>(snap);
  },

  async create(data: Omit<Company, 'id'>): Promise<string> {
    const now = new Date().toISOString();
    const docRef = await addDoc(companiesCol, { ...data, created_at: now });
    return docRef.id;
  },

  async update(id: string, data: Partial<Company>): Promise<void> {
    await updateDoc(doc(companiesCol, id), data);
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(companiesCol, id));
  },
};

// ---------------------------------------------------------------------------
// Establishments
// ---------------------------------------------------------------------------

export const establishmentService = {
  async listByCompany(companyId: string): Promise<Establishment[]> {
    const q = query(
      establishmentsCol,
      where('company_id', '==', companyId),
      orderBy('name', 'asc')
    );
    const snap = await getDocs(q);
    return docsToData<Establishment>(snap);
  },

  async get(id: string): Promise<Establishment | null> {
    const snap = await getDoc(doc(establishmentsCol, id));
    return docToData<Establishment>(snap);
  },

  async create(data: Omit<Establishment, 'id'>): Promise<string> {
    const docRef = await addDoc(establishmentsCol, data);
    return docRef.id;
  },

  async update(id: string, data: Partial<Establishment>): Promise<void> {
    await updateDoc(doc(establishmentsCol, id), data);
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(establishmentsCol, id));
  },
};

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------

export const employeeService = {
  async listByCompany(companyId: string): Promise<Employee[]> {
    const q = query(
      employeesCol,
      where('company_id', '==', companyId),
      orderBy('name', 'asc')
    );
    const snap = await getDocs(q);
    return docsToData<Employee>(snap);
  },

  async get(id: string): Promise<Employee | null> {
    const snap = await getDoc(doc(employeesCol, id));
    return docToData<Employee>(snap);
  },

  async create(data: Omit<Employee, 'id'>): Promise<string> {
    const now = new Date().toISOString();
    const docRef = await addDoc(employeesCol, { ...data, created_at: now });
    return docRef.id;
  },

  async update(id: string, data: Partial<Employee>): Promise<void> {
    await updateDoc(doc(employeesCol, id), data);
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(employeesCol, id));
  },
};

// ---------------------------------------------------------------------------
// Work Schedules
// ---------------------------------------------------------------------------

export const scheduleService = {
  async listByCompany(companyId: string): Promise<WorkSchedule[]> {
    const q = query(
      schedulesCol,
      where('company_id', '==', companyId),
      orderBy('name', 'asc')
    );
    const snap = await getDocs(q);
    return docsToData<WorkSchedule>(snap);
  },

  async get(id: string): Promise<WorkSchedule | null> {
    const snap = await getDoc(doc(schedulesCol, id));
    return docToData<WorkSchedule>(snap);
  },

  async create(data: Omit<WorkSchedule, 'id'>): Promise<string> {
    const docRef = await addDoc(schedulesCol, data);
    return docRef.id;
  },

  async update(id: string, data: Partial<WorkSchedule>): Promise<void> {
    await updateDoc(doc(schedulesCol, id), data);
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(schedulesCol, id));
  },
};

// ---------------------------------------------------------------------------
// Time Events (Punches)
// ---------------------------------------------------------------------------

export const punchService = {
  async listByCompany(companyId: string, employeeId?: string): Promise<TimeEvent[]> {
    const constraints: any[] = [where('company_id', '==', companyId)];
    if (employeeId) {
      constraints.push(where('employee_id', '==', employeeId));
    }
    constraints.push(orderBy('occurred_at', 'desc'));
    const q = query(punchesCol, ...constraints);
    const snap = await getDocs(q);
    return docsToData<TimeEvent>(snap);
  },

  async get(id: string): Promise<TimeEvent | null> {
    const snap = await getDoc(doc(punchesCol, id));
    return docToData<TimeEvent>(snap);
  },

  async create(data: Omit<TimeEvent, 'id'>): Promise<string> {
    const now = new Date().toISOString();
    const docRef = await addDoc(punchesCol, {
      ...data,
      received_at: now,
      sync_status: 'synced',
    });
    return docRef.id;
  },

  async batchCreate(items: Omit<TimeEvent, 'id'>[]): Promise<void> {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    for (const item of items) {
      const docRef = doc(punchesCol);
      batch.set(docRef, { ...item, received_at: now, sync_status: 'synced' });
    }
    await batch.commit();
  },

  async update(id: string, data: Partial<TimeEvent>): Promise<void> {
    await updateDoc(doc(punchesCol, id), data);
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(punchesCol, id));
  },
};

// ---------------------------------------------------------------------------
// Corrections
// ---------------------------------------------------------------------------

export const correctionService = {
  async listByCompany(companyId: string): Promise<CorrectionRequest[]> {
    const q = query(
      correctionsCol,
      where('company_id', '==', companyId),
      orderBy('created_at', 'desc')
    );
    const snap = await getDocs(q);
    return docsToData<CorrectionRequest>(snap);
  },

  async get(id: string): Promise<CorrectionRequest | null> {
    const snap = await getDoc(doc(correctionsCol, id));
    return docToData<CorrectionRequest>(snap);
  },

  async create(data: Omit<CorrectionRequest, 'id'>): Promise<string> {
    const now = new Date().toISOString();
    const docRef = await addDoc(correctionsCol, { ...data, created_at: now, status: 'pending' });
    return docRef.id;
  },

  async update(id: string, data: Partial<CorrectionRequest>): Promise<void> {
    await updateDoc(doc(correctionsCol, id), data);
  },

  async review(id: string, status: 'approved' | 'rejected', notes?: string, reviewedBy?: string): Promise<void> {
    await updateDoc(doc(correctionsCol, id), {
      status,
      review_notes: notes,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    });
  },
};

// ---------------------------------------------------------------------------
// Audit Logs
// ---------------------------------------------------------------------------

export const auditLogService = {
  async listByCompany(companyId: string): Promise<AuditLog[]> {
    const q = query(
      auditLogsCol,
      where('company_id', '==', companyId),
      orderBy('created_at', 'desc')
    );
    const snap = await getDocs(q);
    return docsToData<AuditLog>(snap);
  },

  async create(data: Omit<AuditLog, 'id'>): Promise<string> {
    const now = new Date().toISOString();
    const docRef = await addDoc(auditLogsCol, { ...data, created_at: now });
    return docRef.id;
  },
};
