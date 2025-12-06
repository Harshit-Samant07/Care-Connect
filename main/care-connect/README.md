# Care Connect Frontend

Care Connect is a React + TypeScript + Vite application for donating and browsing surplus medicines. It supports individual seekers, donors, and NGOs with role-based data.

## Features Implemented

- Browse nearby donated medicines with distance info
- Donate medicine with location, expiry validation, price suggestion
- Role-aware UI (NGO badge pricing logic, future admin tools)
- Account creation with optional NGO details
- Google and email/password authentication

## NGO Signup Flow

When creating an account you can tick "I represent an NGO" to enter:

- Organization name (required)
- Registration number (required)
- Registered address (required)
- Website (optional)
- Contact number (optional)

On signup we store:
```jsonc
users/{uid} {
  displayName: string,
  email: string,
  role: "ngo" | "seeker",
  ngo?: {
    orgName: string,
    regNo: string,
    address: string,
    website?: string,
    contact?: string
  },
  createdAt: <Firestore Timestamp>
}
```

## Development

Run the dev server:
```bash
npm install
npm run dev
```

Build production:
```bash
npm run build
```

## Tech Stack

- React 18 + TypeScript
- Vite
- Firebase Auth & Firestore
- Tailwind utility classes (partially replaced with custom CSS due to config constraints)

## Next Steps / Roadmap

1. Profile page to view/edit NGO details
2. Display NGO badge on cards / dashboard
3. Firestore security rule updates for ngo field write restrictions
4. Add reservation flow & status updates (reserved / collected)
5. Code splitting to reduce bundle size
6. Add tests for form validation (Zod) and price calculation

## Troubleshooting

If styling utilities using `@apply` show errors, ensure Tailwind PostCSS pipeline is correctly configured or keep using plain CSS helper classes defined in `src/index.css`.

Missing environment variables (`VITE_FB_*`, Cloudinary) will limit some actions; add a `.env` file per your deployment.

## License

Internal project (specify license if needed).
