// Roles asignados al iniciar la sesión (SYS-FN-04).
export const ROLES = ['Comprador', 'Proveedor', 'Productor', 'Administrador'] as const;
export type Rol = (typeof ROLES)[number];
