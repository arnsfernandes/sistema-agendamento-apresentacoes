# Project Rules

## Authentication & Testing Rules
- **NEVER** directly modify `auth.users`, `encrypted_password`, or any user's password to run tests.
- Do not create temporary passwords or perform automated login by altering database credentials.
- When a test requires an authenticated session, request the user to perform the action manually in the Meety interface, and limit the agent's work to validating the result.
