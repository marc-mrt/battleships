# Battleships Project - AI Coding Assistant Instructions

## Project Overview

A real-time 2-player battleships game for the web using WebSockets for game state synchronization.

**Author**: Marc Morant
**License**: MIT
**Tech Stack**: TypeScript, React, Express, PostgreSQL, WebSockets

---

## Project Structure

This is a **pnpm monorepo** with workspace support:

```
battleships/
├── apps/
│   ├── client/          # React frontend application
│   └── server/          # Express backend with WebSocket support
└── packages/
    ├── game-messages/   # Shared WebSocket message schemas (Zod)
    └── game-rules/      # Shared game constants and rules
```

### Workspace Configuration

- **Package Manager**: pnpm (v10.18.0+)
- **Node Version**: v22.20.0+
- **Workspace**: Defined in `pnpm-workspace.yaml`
- **Catalog**: Shared dependency versions managed in `pnpm-workspace.yaml` catalog

---

## Architecture Patterns

### Backend (Express Server)

#### Folder Structure

```
server/src/
├── config.ts              # Environment configuration
├── index.ts               # Application entry point
├── controllers/           # Request handlers and WebSocket logic
├── database/              # Database queries and mappers
├── middlewares/           # Express middleware
├── models/                # TypeScript domain models
└── services/              # Business logic layer
```

#### Key Patterns

**1. Layered Architecture**

- **Controllers**: Handle HTTP requests and WebSocket messages
- **Services**: Contain business logic
- **Database**: Data access layer with type-safe mappers
- **Models**: TypeScript interfaces for domain entities

**2. Error Handling**

- Custom error hierarchy: `HttpError` → `BadRequestError`, `NotFoundError`, `InternalServerError`
- Database errors: `DatabaseError` → `UnexpectedDatabaseError`, `InvalidQueryPayloadError`
- Database errors convert to HTTP errors via `toHttpError()` method
- Centralized error handler middleware in `middlewares/error.ts`

**3. Database Access**

- Raw SQL queries using `pg` (PostgreSQL)
- Type-safe mapping with Zod schemas
- Mapper pattern: `generateMapperToDomainModel(schema, mapper)` for validation
- Database module exports `query(text, params)` function

**4. WebSocket Management**

- Connection map: `Map<PlayerId, WebSocket>`
- Session-based authentication via cookies
- Message validation with Zod schemas (`ClientMessageSchema`)
- Discriminated union types for message handling

**5. Configuration**

- Environment variables loaded via `dotenv/config`
- Config validation at startup (fails fast if missing)
- Required vars: `ALLOWED_ORIGINS`, `PORT`, `DATABASE_CONNECTION_STRING`, `JWT_SECRET`

**6. JWT-Based Session Cookies**

- Cookie name: `session`
- Contains: JWT-signed token with `{ sessionId, playerId, iat }`
- Signed with `JWT_SECRET` environment variable using HMAC SHA-256
- Used for both HTTP and WebSocket authentication
- Helper functions: `parseSessionCookie()`, `setSessionCookie()`
- JWT utilities: `signJwt()`, `verifyJwt()` in `utils/jwt.ts`

### Frontend

#### Key Patterns

**1. API Client**

- Separate files per endpoint in `lib/api/`
- Always use `credentials: 'include'` for cookies
- Config-based URLs from `VITE_SERVER_BASE_URL` env var
- WebSocket URL auto-detection (ws/wss based on protocol)

**2. Component Organization**

- Feature-based folders (e.g., `GameSession/`)
- Subcomponents in `components/` subfolder
- Utils in `utils/` subfolder
- Each component handles its own subscriptions/cleanup

---

## Code Style & Conventions

### TypeScript

**File Extensions**

- `.ts` - Standard TypeScript
- `.tsx` - TypeScript React components

**Type Definitions**

- Use `interface` for object shapes (models, DTOs, payload objects)
- Use `type` for unions, aliases, and complex types
- Export types alongside implementation
- Use `Pick<T, 'field'>` for partial types from models

**Function Parameters**

- Functions with >2 parameters MUST use payload objects
- Payload interfaces should be named `{FunctionName}Payload`
- Example:
  ```typescript
  interface ProcessPaymentPayload {
    userId: string;
    amount: number;
    currency: string;
  }
  
  function processPayment(payload: ProcessPaymentPayload): Result {
    const { userId, amount, currency } = payload;
    // ...
  }
  ```

**Function Definitions**

- Prefer named functions over arrow functions
- Exception: Simple callbacks in array methods
- Example:
  ```typescript
  // ✅ Good
  function isActive(item: Item): boolean {
    return item.status === 'active';
  }
  
  // ❌ Avoid
  const isActive = (item: Item) => item.status === 'active';
  ```

**Naming Conventions**

- **Files**: kebab-case (e.g., `create-session.ts`)
- **Components**: PascalCase (e.g., `PlaceBoats.tsx`, `BoatGrid.tsx`)
- **Classes**: PascalCase (e.g., `GridManager`, `WebsocketManager`)
- **Interfaces**: PascalCase (e.g., `Session`, `Player`, `Boat`)
- **Functions**: camelCase (e.g., `createSession`, `handleShotFired`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `GRID_SIZE`, `BOAT_TYPES`)
- **Type aliases**: PascalCase (e.g., `PlayerId`, `SessionStatus`)

**Import Patterns**

- Use named imports for utilities: `import * as API from '../api'`
- Use named imports for services: `import * as GameService from '../services/game'`
- Use type imports: `import type { Player } from './models/player'`
- Ramda: `import * as R from 'ramda'`

**Functional Patterns**

- Use currying for reusable transformations
- Leverage Ramda for common operations (`R.pipe`, `R.propEq`, `R.map`)
- Separate pure functions from side effects
- Example:
  ```typescript
  // Curried function
  function createFilter(status: string) {
    return function filter(items: Item[]): Item[] {
      return items.filter(item => item.status === status);
    };
  }
  
  // Using Ramda
  function isShooter(playerId: string) {
    return R.propEq(playerId, 'shooterId');
  }
  ```

### Zod Schemas

**Schema Naming**: `{ModelName}Schema` or `{ModelName}DatabaseSchema`

```typescript
export const BoatPlacementSchema = z.object({ ... });
export type BoatPlacement = z.infer<typeof BoatPlacementSchema>;
```

**Message Schemas**: Discriminated unions with `type` field

```typescript
export const ClientMessageSchema = z.discriminatedUnion("type", [
  PlaceBoatsMessageSchema,
  FireShotMessageSchema,
]);
```

**Validation Pattern**

```typescript
const result = Schema.safeParse(data);
if (!result.success) {
  throw new BadRequestError(`Invalid request: ${result.error.message}`);
}
```

---

## Database Schema

### Tables

- `players`: id (UUID), username, wins, created_at
- `sessions`: id (UUID), slug, owner_id, friend_id, current_turn_id, winner_id, created_at
- `boats`: id (VARCHAR), player_id, start_x, start_y, length, orientation, sunk, created_at
- `shots`: id (UUID), session_id, shooter_id, target_id, x, y, hit, created_at

### Constraints

- Coordinates: 0-9 (CHECK constraints)
- Boat length: 1-5 (CHECK constraint)
- Orientation: 'horizontal' | 'vertical' (CHECK constraint)
- Foreign keys with CASCADE/SET NULL as appropriate

### Query Pattern

```typescript
const result = await query(
  `SELECT ... FROM table WHERE condition = $1`,
  [param]
);
return mapToModel(result.rows[0]);
```

---

## Game Messages (WebSocket Protocol)

### Client → Server

- `place-boats`: Submit boat placements
- `fire-shot`: Fire at coordinates (x, y)

### Server → Client

- `friend-joined`: Opponent joined session
- `ready-to-play`: Both players ready, game starts
- `shot-received`: Incoming shot notification
- `shot-result`: Result of your shot
- `your-turn`: Your turn to shoot
- `game-over`: Game ended with winner

All messages validated with Zod schemas in `packages/game-messages`.

---

## Game Rules (Constants)

Defined in `packages/game-rules/src/index.ts`:

- `GRID_SIZE`: 9 (0-indexed: 0-8)
- `BOATS_CONFIGURATION`: Array of `{ length, count }`
    - 1x length 5
    - 1x length 4
    - 2x length 3
    - 1x length 2
- `TOTAL_BOATS`: Computed total

---

## Development Workflow

### Running the Project

```bash
# Install dependencies
pnpm install

# Run client dev server
cd apps/client && pnpm dev

# Run server dev server
cd apps/server && pnpm dev

# Build server
cd apps/server && pnpm build
```

### Scripts

- `dev`: Development server with hot reload
- `build`: Production build
- `lint`: Biome lint
- `format`: Biome format
- `typecheck`: Type check

### Environment Variables

**Client** (`.env`):

- `VITE_SERVER_BASE_URL`: Backend URL

**Server** (`.env` or environment):

- `PORT`: Server port
- `ALLOWED_ORIGINS`: Comma-separated CORS origins
- `DATABASE_CONNECTION_STRING`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for signing session JWTs (min 32 characters recommended)

---

## Session Flow

1. **Create Session**: Owner creates session → receives slug
2. **Join Session**: Friend joins via slug
3. **Place Boats**: Both players place boats
4. **Ready to Play**: Game starts when both ready
5. **In Game**: Turn-based shooting
6. **Game Over**: Winner determined

### Session Status States

- `waiting_for_opponent`: Created, waiting for opponent
- `waiting_for_boat_placements`: Both joined, placing boats
- `in_game`: Active gameplay (server only)
- `ready_to_play`: Ready to start (client-side representation of in_game)
- `game_over`: Finished

**Note**: Client uses `ready_to_play` status while server uses `in_game` for the same state.

---

## Common Patterns & Anti-Patterns

### ✅ DO

- Use workspace protocol for internal packages: `"game-messages": "workspace:"`
- Use catalog for shared dependencies: `"ramda": "catalog:"`
- Validate all external input with Zod
- Use discriminated unions for message types
- Handle WebSocket reconnection gracefully
- Use TypeScript strict mode
- Export types alongside implementations
- Use payload objects for functions with >2 parameters
- Use named functions instead of arrow functions
- Apply functional programming patterns (currying, composition)
- Keep functions small and focused (single responsibility)
- Use explicit, descriptive names for functions and variables

### ❌ DON'T

- Don't use `any` type
- Don't ignore TypeScript errors
- Don't commit sensitive data (use .gitignore)
- Don't use direct SQL string concatenation (use parameterized queries)
- Don't forget error handling in async functions
- Don't use arrow functions for main logic (use named functions)
- Don't pass >2 individual parameters (use payload objects)
- Don't mix side effects with pure logic
- Don't use magic numbers/strings (use named constants)

---

## Testing & Quality

- TypeScript strict mode enabled
- Biome for linting and formatting
- Type checking via `tsc`
- No unused locals/parameters (enforced by tsconfig)

---

## Code Examples

### Payload Object Pattern

```typescript
// ✅ Correct: >2 parameters use payload
interface HandleShotFiredPayload {
  session: Session;
  playerId: string;
  coordinates: Coordinates;
}

async function handleShotFired(payload: HandleShotFiredPayload): Promise<void> {
  const { session, playerId, coordinates } = payload;
  // ...
}

// Usage
await handleShotFired({ session, playerId, coordinates });
```

### Curried Functions

```typescript
// ✅ Reusable through currying
function getPlayerShots(playerId: string) {
  return function filterShots(shots: Shot[]): Shot[] {
    return shots.filter(R.propEq(playerId, 'shooterId'));
  };
}

// Usage
const filterByPlayer = getPlayerShots('player-123');
const playerShots = filterByPlayer(allShots);
```

### Type Guards

```typescript
// ✅ Type-safe error handling
function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof DatabaseError;
}

function handleError(error: unknown): void {
  if (isDatabaseError(error)) {
    // TypeScript knows error is DatabaseError
    handleDatabaseError(error);
    return;
  }
  // Handle other cases
}
```

### Functional Composition

```typescript
// ✅ Using Ramda pipe
const transformations = [
  updateStatus('active'),
  updateTimestamp(Date.now()),
  validateData(),
] as const;

const result = R.pipe(...transformations)(data);
```

### Mapper Pattern

```typescript
// ✅ Type-safe database mapping
const mapToPlayer = generateMapperToDomainModel({
  schema: PlayerDatabaseSchema,
  mapper: (parsed) => ({
    id: parsed.id,
    username: parsed.username,
  }),
});
```

---

## Special Notes

1. **Build Process**: Server build adds package.json with commonjs type to dist/
3. **Boat IDs**: Generated client-side using `crypto.getRandomValues()`
4. **Session Slugs**: Generated server-side with format `s_{random_hex}`
5. **Grid Indexing**: 0-based (0-8), not 1-based
6. **WebSocket URL**: Auto-detects ws/wss from HTTP protocol

---

## When Making Changes

### Adding New Features

1. Define models in both client and server if needed
2. Add Zod schemas to `game-messages` for new messages
3. Update WebSocket message handlers
4. Add database queries if data persistence needed
5. Update UI components with proper TypeScript types
6. Handle all error cases

### Modifying Database

1. Update `init.sql` schema
2. Update TypeScript models
3. Update Zod schemas for validation
4. Update mapper functions
5. Test queries with proper error handling

### Adding API Endpoints

1. Add controller function
2. Add route in `index.ts`
3. Add client API function in `lib/api/`
4. Use proper error handling and status codes
5. Add TypeScript types for request/response

---

## Dependencies Philosophy

- **Use catalog**: For dependencies shared across multiple packages
- **Use workspace protocol**: For internal packages only
- **Minimal dependencies**: Prefer standard library when possible
- **Type definitions**: Always install @types packages as devDependencies
- **Ramda**: Used for functional programming utilities
- **Zod**: Used for runtime type validation

---

This document should be updated as the project evolves. When in doubt, follow existing patterns in the codebase.
