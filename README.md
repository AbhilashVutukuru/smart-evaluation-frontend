<<<<<<< HEAD
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
=======
# Introduction 
TODO: Give a short introduction of your project. Let this section explain the objectives or the motivation behind this project. 

# Getting Started
TODO: Guide users through getting your code up and running on their own system. In this section you can talk about:
1.	Installation process
2.	Software dependencies
3.	Latest releases
4.	API references

# Build and Test
TODO: Describe and show how to build your code and run the tests. 

# Contribute
TODO: Explain how other users and developers can contribute to make your code better. 

If you want to learn more about creating good readme files then refer the following [guidelines](https://docs.microsoft.com/en-us/azure/devops/repos/git/create-a-readme?view=azure-devops). You can also seek inspiration from the below readme files:
- [ASP.NET Core](https://github.com/aspnet/Home)
- [Visual Studio Code](https://github.com/Microsoft/vscode)
- [Chakra Core](https://github.com/Microsoft/ChakraCore)
>>>>>>> cd1651bde756909853794a02c98c29fb10b86bda
