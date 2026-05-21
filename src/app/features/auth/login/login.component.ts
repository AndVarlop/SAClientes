import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, InputTextModule, PasswordModule, ButtonModule, ToastModule],
  providers: [MessageService],
  styles: [`
    .login-left {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6366f1 100%);
    }
    .input-wrap input {
      width: 100%;
      background: #09090b;
      border: 1px solid #3f3f46;
      border-radius: 10px;
      padding: 12px 14px;
      color: white;
      font-size: 14px;
      transition: border-color 0.2s;
      outline: none;
    }
    .input-wrap input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgb(99 102 241 / 0.15);
    }
    .input-wrap input::placeholder { color: #52525b; }
    .login-btn {
      width: 100%;
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      color: white;
      border: none;
      border-radius: 10px;
      padding: 13px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.1s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .login-btn:hover { opacity: 0.9; }
    .login-btn:active { transform: scale(0.99); }
    .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  `],
  template: `
    <p-toast position="top-right" />

    <div class="min-h-screen flex bg-zinc-950">

      <!-- LEFT — branding -->
      <div class="login-left hidden lg:flex flex-col justify-between p-12 w-[420px] shrink-0">
        <div class="flex items-center gap-3">
          <img src="S&A-Clientes-logo.png" alt="S&A Clientes"
               style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.3)">
          <span class="text-white font-bold text-lg">S&A Clientes</span>
        </div>

        <div>
          <h2 class="text-4xl font-bold text-white leading-tight">
            Control total<br/>de tu negocio
          </h2>
          <p class="text-indigo-200 text-sm mt-4 leading-relaxed">
            Registra compras, abonos y consulta el saldo<br/>
            de cada cliente en tiempo real.
          </p>

          <div class="flex flex-col gap-3 mt-8">
            @for (f of features; track f.label) {
              <div class="flex items-center gap-3">
                <div class="w-7 h-7 bg-white/15 rounded-lg flex items-center justify-center">
                  <i [class]="f.icon + ' text-white text-xs'"></i>
                </div>
                <span class="text-indigo-100 text-sm">{{ f.label }}</span>
              </div>
            }
          </div>
        </div>

        <p class="text-indigo-300/60 text-xs">© 2025 S&A Clientes</p>
      </div>

      <!-- RIGHT — form -->
      <div class="flex-1 flex items-center justify-center p-6">
        <div class="w-full max-w-[360px]">

          <!-- Mobile logo -->
          <div class="lg:hidden text-center mb-8">
            <img src="S&A-Clientes-logo.png" alt="S&A Clientes"
                 style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:3px solid #6366f1;margin:0 auto 12px">
            <h1 class="text-white font-bold text-xl">S&A Clientes</h1>
          </div>

          <div class="mb-8">
            <h1 class="text-2xl font-bold text-white">Bienvenida</h1>
            <p class="text-zinc-400 text-sm mt-1">Ingresa para administrar el sistema</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="login()" class="flex flex-col gap-4">
            <div class="input-wrap flex flex-col gap-1.5">
              <label class="text-zinc-300 text-sm font-medium">Correo electrónico</label>
              <input formControlName="email" type="email" placeholder="admin@ejemplo.com" />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-zinc-300 text-sm font-medium">Contraseña</label>
              <p-password formControlName="password" placeholder="••••••••"
                          [feedback]="false" [toggleMask]="true"
                          styleClass="w-full" inputStyleClass="w-full" />
            </div>

            <button type="submit" class="login-btn mt-2" [disabled]="loading()">
              @if (loading()) {
                <i class="pi pi-spinner pi-spin"></i>
                Ingresando...
              } @else {
                <i class="pi pi-sign-in"></i>
                Ingresar al panel
              }
            </button>
          </form>

          <div class="mt-6 pt-6 border-t border-zinc-800 text-center">
            <p class="text-zinc-500 text-xs">
              ¿Eres cliente?
              <a routerLink="/consulta" class="text-indigo-400 hover:text-indigo-300 ml-1 font-medium">
                Consultar mi saldo
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private msg = inject(MessageService);
  private fb = inject(FormBuilder);

  loading = signal(false);

  features = [
    { icon: 'pi pi-users', label: 'Gestión de clientes' },
    { icon: 'pi pi-receipt', label: 'Registro de compras y abonos' },
    { icon: 'pi pi-chart-bar', label: 'Dashboard en tiempo real' },
    { icon: 'pi pi-image', label: 'Evidencias fotográficas' },
  ];

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  async login() {
    if (this.form.invalid) return;
    this.loading.set(true);
    const { email, password } = this.form.value;
    const { error } = await this.auth.login(email!, password!);
    this.loading.set(false);
    if (error) {
      this.msg.add({ severity: 'error', summary: 'Error de acceso', detail: 'Correo o contraseña incorrectos' });
      return;
    }
    this.router.navigate(['/admin/dashboard']);
  }
}
