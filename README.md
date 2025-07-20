# Cloud Control Panel for Moodle – Next.js App

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app), designed to integrate with a Moodle system and support cloud-based features such as remote quiz management, API authentication, and containerized deployment.

---

## 🧲 Getting Started

Make sure your environment is properly configured. First, copy the example environment file:

```bash
cp example.env .env.local
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the app.

---

## ⚙️ Environment Configuration (`.env.local`)

The application depends on environment variables to interact with:

- Moodle backend (via token + REST API)
- Google Cloud Run / Cloud SQL
- Internal and public databases
- Auth system via `next-auth`

Here’s a breakdown of key sections in `.env.local`:

| Section               | Description                                             |
| --------------------- | ------------------------------------------------------- |
| `Google Cloud`        | Project ID, container image, region, service account    |
| `Database`            | Private and public Cloud SQL or MongoDB URLs            |
| `Webservice`          | URL and credentials for remote admin control            |
| `NextAuth`            | Auth token secret and callback base URL                 |
| `Moodle`              | Base URL, REST token, Moodle admin user/pass            |
| `CloudSupport Plugin` | Token specific to Moodle plugin integration             |
| `Container Runtime`   | Memory/CPU/instances for Moodle deployment on Cloud Run |
| `Quiz Time Offsets`   | Control how early quizzes open or how late they close   |

Refer to `example.env` for a template.

---

## 📦 Project Structure

```bash
.
├── app/                  # App Router structure
├── lib/                  # API/middleware logic to interact with Moodle & DB
├── components/           # UI components
├── public/               # Static assets
├── pages/                # Page Router structure
├── logs/                 # Logs runtime
├── middleware.js         # Middleware handle authenticated
├── logger.js             # Handler for logs
├── .env.local            # Private environment config (not committed)
├── next.config.js        # Next.js configuration
├── README.md             # This file
```

---

## 📘 Moodle Integration Notes

This project communicates with Moodle via REST API using a long-lived token:

- Moodle URL is set in `MOODLE_URL`
- REST calls are authenticated using `MOODLE_TOKEN`
- Cloud features (e.g. restore quiz) are handled via a custom plugin: `local_cloudsupport`

> Moodle must be set up with web services and the relevant plugin pre-installed.

---

## 🖥️ Editing Pages

You can start editing by modifying:

- `app/page.js` → Main homepage
- `app/api/` → API routes (e.g., for syncing quiz data or verifying login)
- `lib/moodle/` → Moodle integration logic (fetch quiz, check token, etc.)

The app uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) for automatic font optimization and loads [Geist](https://vercel.com/font) by default.

---

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs) – Full docs on Next.js features and APIs.
- [Learn Next.js](https://nextjs.org/learn) – Interactive tutorial.
- [Moodle Developer Docs](https://moodledev.io) – Plugin and web service documentation.

---

## 🚀 Deploying

The app is optimized for deployment on Vercel.

- **Vercel:** Easiest setup with auto-build from GitHub

Learn more:

- [Next.js Deployment Guide](https://nextjs.org/docs/app/building-your-application/deploying)

<!-- ---

## 📟 License

This project is open-source under the [MIT License](LICENSE). -->
