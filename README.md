# School Portal - Exam Evaluate Angular Application

Angular 19 application with clean architecture, connecting to ExamEvaluate.API

## Features

- ✅ Login with JWT Authentication
- ✅ Forgot Password
- ✅ Reset Password
- ✅ Auth Guard for route protection
- ✅ HTTP Interceptor for token management
- ✅ Clean Architecture (Core, Shared, Features)
- ✅ Standalone Components
- ✅ Reactive Forms
- ✅ Production-ready configuration

## Architecture

```
src/app/
├── core/                    # Core functionality
│   ├── guards/             # Route guards (authGuard)
│   ├── interceptors/       # HTTP interceptors (authInterceptor)
│   ├── models/             # Data models
│   └── services/           # Core services (AuthService)
├── features/               # Feature modules
│   ├── auth/              # Authentication feature
│   │   ├── login/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   └── dashboard/         # Dashboard feature
└── shared/                # Shared components/pipes/directives
```

## Installation

```bash
cd exam-evaluate-portal
npm install
```

## Configuration

Update API URL in `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5163/api'  // Change to your API URL
};
```

For production, update `src/environments/environment.prod.ts`.

## Development

```bash
npm start
```

Navigate to `http://localhost:4200/`

## Build

Production build:
```bash
ng build --configuration production
```

## API Endpoints Used

- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

## Technology Stack

- Angular 19
- TypeScript
- RxJS
- Bootstrap 5.3
- Font Awesome 6.4
