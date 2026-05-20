export type UserRol = 'ADMIN' | 'USER';

export interface UserProfile {
  id: string;
  nombre: string;
  correo: string;
  rol: UserRol;
  created_at: string;
}
