Personal notes

### ideas:

- could not register with a .email domain, but .dev was fine. maybe regex is too strict
- could use unique solana address and wallet signature to confirm login from the backend (will work on signatures and sdk to start)
- potentially have users add information and then use a successful wallet connection to register, only need to submit manually if validation fails
- I think there are built in createdAt and updatedAt options we could use
- combine auth route for signature with user login and registration?

### questions:

- keep current versions of packages, or maybe update the minor versions?
- is there a preference between npm, yarn, or pnpm?
- keep signature confirmations only for login and registration? 
- disconnecting doesn't seem consistent (could be a wrong setting I have)
