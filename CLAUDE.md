# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a demo workspace containing multiple projects showcasing different aspects of Claude Code development:

- **claude-code-frontend-figma**: Next.js 15 frontend with Figma integration capabilities
- **claude-code-specs-driven**: Spring Boot 3.2 Irish payroll management system  
- **claude-code-sub-agents**: Demo project for Claude Code sub-agents collaboration

## MCP Configuration

The workspace uses Figma MCP server for design integration:
- Figma API integration via `framelink-figma-mcp`
- Requires `FIGMA_API_KEY` environment variable

## Frontend Project (claude-code-frontend-figma)

### Commands
```bash
# Development
npm run dev          # Start dev server with Turbopack
npm run build        # Build for production with Turbopack  
npm run start        # Start production server
npm run lint         # Run ESLint

# Navigate to project
cd claude-code-frontend-figma
```

### Tech Stack
- Next.js 15.5.2 with App Router
- React 19.1.0
- TypeScript 5
- Tailwind CSS 4
- ESLint 9 with Next.js config
- Turbopack for faster builds

### Architecture
- App Router structure with `app/` directory containing `layout.tsx` and `page.tsx`
- TypeScript configuration with strict mode and path aliases (`@/*`)
- Minimal Next.js configuration for rapid development

## Backend Project (claude-code-specs-driven)

### Commands
```bash
# Development
mvn spring-boot:run     # Run application locally
mvn test               # Run all tests
mvn verify            # Run integration tests
mvn clean package     # Build JAR
mvn jacoco:report      # Generate test coverage report

# Testing specific classes
mvn test -Dtest=PayrollServiceTest

# Database migrations
mvn liquibase:update

# Navigate to project
cd claude-code-specs-driven
```

### Tech Stack
- Spring Boot 3.2.1 with Java 17
- Spring Data JPA with PostgreSQL/H2
- Spring Security 6.x with JWT authentication
- Maven build system with profiles (dev, test, prod)
- Liquibase for database migrations
- iText for PDF generation, Apache POI for Excel
- Testcontainers for integration testing
- MapStruct for object mapping

### Architecture
This is a comprehensive Irish payroll management system following layered architecture:

**Core Layers:**
- **Controller Layer**: REST API endpoints with OpenAPI documentation
- **Service Layer**: Business logic including Irish tax calculations (PAYE, PRSI, USC)
- **Repository Layer**: JPA repositories with custom queries
- **Entity Layer**: JPA entities with audit trail support
- **Security Layer**: JWT-based authentication with role-based access

**Irish Tax Compliance:**
- Specialized services for PAYE, PRSI, and USC calculations
- PPS number validation
- Tax credit management
- Revenue compliance reporting

**Key Patterns:**
- Domain-driven design with clear service layers
- AI rules defined in `.ai-rules/` directory (product.md, structure.md, tech.md)
- Comprehensive validation including Irish-specific validators
- PDF payslip generation and Excel reporting

## Sub-Agents Project (claude-code-sub-agents)

### Commands
```bash
# Development
# Serve locally (use any HTTP server)
python -m http.server 8000
# or
npx serve .

# Navigate to project
cd claude-code-sub-agents
```

### Tech Stack
- Vanilla HTML5, CSS3, JavaScript (ES6+)
- Modular CSS architecture with CSS custom properties
- Component-based styling approach
- Accessibility-focused design (WCAG 2.1 AA)

### Architecture
A collaborative to-do list application built as a demonstration of Claude Code sub-agents:

**Structure:**
- `index.html`: Main application entry point with semantic HTML
- `css/`: Modular stylesheets (reset, variables, components, themes)
- `js/app.js`: Application logic with task management functionality
- `specs/`: Requirements and design documentation

**Key Features:**
- Task CRUD operations with priority levels
- Local storage persistence
- Dark/light theme support
- Responsive design
- Keyboard accessibility

## Architecture Notes

### MCP Integration
- Figma MCP server configured for design-to-code workflows
- Environment variable `FIGMA_API_KEY` required for Figma integration

### Development Patterns
- Each sub-project maintains independent development environments
- AI rules guide development patterns and standards in Spring Boot project
- Comprehensive testing strategies across all projects
- Security-first approach with HTTPS, JWT, and input validation

### Testing Strategies
- **Frontend**: ESLint for code quality
- **Backend**: JUnit 5, Mockito, Spring Boot Test, Testcontainers
- **Sub-agents**: Manual testing with diagnostic HTML pages

### Database Considerations
- **Development**: H2 in-memory database for rapid development
- **Testing**: Testcontainers PostgreSQL for integration tests  
- **Production**: PostgreSQL with connection pooling (HikariCP)