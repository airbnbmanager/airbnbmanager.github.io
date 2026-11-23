import type { Employee } from '@/types';
import { mockEmployees } from '@/mocks/data';

let emps = [...mockEmployees];

export async function getEmployees(): Promise<Employee[]> {
  await new Promise(r => setTimeout(r, 200));
  return [...emps];
}

export async function createEmployee(payload: Omit<Employee, 'emp_id'>): Promise<Employee> {
  await new Promise(r => setTimeout(r, 300));
  const newEmp: Employee = {
    ...payload,
    emp_id: `EMP-${100 + emps.length + 1}`,
  };
  emps.unshift(newEmp);
  return newEmp;
}

export async function updateEmployee(id: string, payload: Partial<Employee>): Promise<Employee> {
  await new Promise(r => setTimeout(r, 250));
  const idx = emps.findIndex(e => e.emp_id === id);
  if (idx === -1) throw new Error('Employee not found');
  emps[idx] = { ...emps[idx], ...payload };
  return emps[idx];
}
