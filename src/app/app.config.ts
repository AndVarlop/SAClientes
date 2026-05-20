import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withViewTransitions, withComponentInputBinding } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { MessageService, ConfirmationService } from 'primeng/api';
import { routes } from './app.routes';
import { AuthService } from './core/services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withViewTransitions(), withComponentInputBinding()),
    provideAnimationsAsync(),
    provideHttpClient(),
    providePrimeNG({ theme: { preset: Aura }, ripple: true }),
    MessageService,
    ConfirmationService,
    {
      provide: APP_INITIALIZER,
      useFactory: (auth: AuthService) => () => auth.init(),
      deps: [AuthService],
      multi: true
    }
  ]
};
