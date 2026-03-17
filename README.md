# CPoint

ERP application for business operations management. Built with SvelteKit and deployed on AWS with Docker.

## Features

- Rental management — create, track, and close equipment rentals
- Reservation system with conflict detection and override
- Tour booking management
- CI/CD pipeline with GitHub Actions
- Dockerized deployment (AWS EC2 + Cloudflare Workers)
- Playwright e2e testing

## Stack

- **Frontend:** SvelteKit + TypeScript
- **Database:** Drizzle ORM
- **Infra:** Docker Compose + Nginx + AWS EC2
- **CDN/Edge:** Cloudflare Workers
- **CI/CD:** GitHub Actions (build, test, deploy)
- **Testing:** Playwright
