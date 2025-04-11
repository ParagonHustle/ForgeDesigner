// Extending express-session with custom session data
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}