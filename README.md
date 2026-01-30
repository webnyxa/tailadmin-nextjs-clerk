# TailAdmin Next.js - Free Next.js Tailwind Admin Dashboard Template

TailAdmin is a free and open-source admin dashboard template built on **Next.js and Tailwind CSS** providing developers with everything they need to create a feature-rich and data-driven: back-end, dashboard, or admin panel solution for any sort of web project.

![TailAdmin - Next.js Dashboard Preview](./banner.png)

With TailAdmin Next.js, you get access to all the necessary dashboard UI components, elements, and pages required to build a high-quality and complete dashboard or admin panel. Whether you're building a dashboard or admin panel for a complex web application or a simple website.

TailAdmin utilizes the powerful features of **Next.js 16** and common features of Next.js such as server-side rendering (SSR), static site generation (SSG), and seamless API route integration. Combined with the advancements of **React 19** and the robustness of **TypeScript**, TailAdmin is the perfect solution to help get your project up and running quickly.

## Overview

TailAdmin provides essential UI components and layouts for building feature-rich, data-driven admin dashboards and control panels. It's built on:

* Next.js 16.x
* React 19
* TypeScript
* Tailwind CSS V4

### Quick Links

* [✨ Visit Website](https://tailadmin.com)
* [📄 Documentation](https://tailadmin.com/docs)
* [⬇️ Download](https://tailadmin.com/download)
* [🖌️ Figma Design File (Community Edition)](https://www.figma.com/community/file/1463141366275764364)
* [⚡ Get PRO Version](https://tailadmin.com/pricing)

### Demos

* [Free Version](https://nextjs-free-demo.tailadmin.com)
* [Pro Version](https://nextjs-demo.tailadmin.com)

### Other Versions

- [Next.js Version](https://github.com/TailAdmin/free-nextjs-admin-dashboard)
- [React.js Version](https://github.com/TailAdmin/free-react-tailwind-admin-dashboard)
- [Vue.js Version](https://github.com/TailAdmin/vue-tailwind-admin-dashboard)
- [Angular Version](https://github.com/TailAdmin/free-angular-tailwind-dashboard)
- [Laravel Version](https://github.com/TailAdmin/tailadmin-laravel)

## Installation

### Prerequisites

To get started with TailAdmin, ensure you have the following prerequisites installed and set up:

* Node.js 18.x or later (recommended to use Node.js 20.x or later)

### Cloning the Repository

Clone the repository using the following command:

```bash
git clone https://github.com/TailAdmin/free-nextjs-admin-dashboard.git
```

> Windows Users: place the repository near the root of your drive if you face issues while cloning.

1. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   ```

   > Use `--legacy-peer-deps` flag if you face peer-dependency error during installation.

2. Start the development server:

   ```bash
   npm run dev
   # or
   yarn dev
   ```

## Clerk Authentication Setup

This project uses [Clerk](https://clerk.com) for authentication. Follow these steps to set up Clerk:

### Step 1: Create a Clerk Account

1. Go to [https://clerk.com](https://clerk.com) and sign up for a free account
2. Create a new application in your Clerk dashboard

### Step 2: Get Your Clerk Keys

1. In your Clerk dashboard, go to **API Keys** section
2. Copy your **Publishable Key** (starts with `pk_test_...` or `pk_live_...`)
3. Copy your **Secret Key** (starts with `sk_test_...` or `sk_live_...`)

### Step 3: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp env.example .env.local
   ```

2. Open `.env.local` and add your Clerk keys:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
   CLERK_SECRET_KEY=sk_test_your_secret_key_here
   ```

3. Optionally customize the authentication routes (defaults are already set):
   ```env
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
   ```

### Step 4: Verify Setup

1. Restart your development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

2. Visit `http://localhost:3000/login` - you should see the login page
3. Try signing up with a new account
4. After signup, you'll be redirected to the dashboard

### Important Notes

- **Never commit `.env.local`** - it's already in `.gitignore`
- The **Publishable Key** is safe to expose in client-side code
- The **Secret Key** must never be exposed - it's only used server-side
- For production, use `pk_live_...` and `sk_live_...` keys from your Clerk dashboard

### Troubleshooting

**Issue: "Missing publishableKey" error**
- Make sure `.env.local` exists and contains `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- Restart the dev server after adding environment variables

**Issue: Can't access dashboard after login**
- Check that `CLERK_SECRET_KEY` is set in `.env.local`
- Verify middleware is working by checking browser console

**Issue: Redirect loop on login page**
- Ensure `src/middleware.ts` exists (not in root directory)
- Check that public routes are correctly configured in middleware

For more information, see the [Clerk Documentation](https://clerk.com/docs).

## Profile Features

This project includes a fully functional profile management system integrated with Clerk authentication.

### Available Features

✅ **View Profile Information**
- Displays user's name, email, and profile image from Clerk
- All data is dynamically fetched and displayed

✅ **Update Profile Information**
- Update first name and last name
- Upload and change profile picture (max 5MB)
- Real-time form validation
- Success/error notifications

✅ **Change Password**
- Secure password change with current password verification
- Password strength validation (minimum 8 characters)
- Form validation and error handling

✅ **Session Management**
- View all active sessions across devices
- See last active time for each session
- Sign out from all devices with confirmation

✅ **Last Login Display**
- Shows when you last signed in
- Formatted date and time display

### Testing Profile Features

1. **View Profile:**
   - Navigate to `/profile` page
   - Verify your Clerk account information is displayed

2. **Update Profile:**
   - Click "Edit" on profile cards
   - Update name or upload new image
   - Click "Save Changes" and verify updates persist

3. **Change Password:**
   - Go to Profile page → Security & Sessions card
   - Click "Change Password"
   - Enter current password and new password
   - Verify you can login with new password

4. **Manage Sessions:**
   - Click "Manage Sessions" in Security card
   - View all active sessions
   - Test "Sign Out All Devices" (will redirect to login)

**Note:** Email change is not implemented in the UI. Users can change email through Clerk dashboard or use Clerk's built-in components if needed.

## Components

TailAdmin is a pre-designed starting point for building a web-based dashboard using Next.js and Tailwind CSS. The template includes:

* Sophisticated and accessible sidebar
* Data visualization components
* Profile management and custom 404 page
* Tables and Charts(Line and Bar)
* Authentication forms and input elements
* Alerts, Dropdowns, Modals, Buttons and more
* Can't forget Dark Mode 🕶️

All components are built with React and styled using Tailwind CSS for easy customization.

## Feature Comparison

### Free Version

* 1 Unique Dashboard
* 30+ dashboard components
* 50+ UI elements
* Basic Figma design files
* Community support

### Pro Version

* 7 Unique Dashboards: Analytics, Ecommerce, Marketing, CRM, SaaS, Stocks, Logistics (more coming soon)
* 500+ dashboard components and UI elements
* Complete Figma design file
* Email support

To learn more about pro version features and pricing, visit our [pricing page](https://tailadmin.com/pricing).

## Changelog

### Version 2.2.2 - [December 30, 2025]

* Fixed date picker positioning and functionality in Statistics Chart.


### Version 2.1.0 - [November 15, 2025]

* Updated to Next.js 16.x
* Fixed all reported minor bugs

### Version 2.0.2 - [March 25, 2025]

* Upgraded to Next.js 16.x for [CVE-2025-29927](https://nextjs.org/blog/cve-2025-29927) concerns
* Included overrides vectormap for packages to prevent peer dependency errors during installation.
* Migrated from react-flatpickr to flatpickr package for React 19 support

### Version 2.0.1 - [February 27, 2025]

#### Update Overview

* Upgraded to Tailwind CSS v4 for better performance and efficiency.
* Updated class usage to match the latest syntax and features.
* Replaced deprecated class and optimized styles.

#### Next Steps

* Run npm install or yarn install to update dependencies.
* Check for any style changes or compatibility issues.
* Refer to the Tailwind CSS v4 [Migration Guide](https://tailwindcss.com/docs/upgrade-guide) on this release. if needed.
* This update keeps the project up to date with the latest Tailwind improvements. 🚀

### v2.0.0 (February 2025)

A major update focused on Next.js 16 implementation and comprehensive redesign.

#### Major Improvements

* Complete redesign using Next.js 16 App Router and React Server Components
* Enhanced user interface with Next.js-optimized components
* Improved responsiveness and accessibility
* New features including collapsible sidebar, chat screens, and calendar
* Redesigned authentication using Next.js App Router and server actions
* Updated data visualization using ApexCharts for React

#### Breaking Changes

* Migrated from Next.js 14 to Next.js 16
* Chart components now use ApexCharts for React
* Authentication flow updated to use Server Actions and middleware

[Read more](https://tailadmin.com/docs/update-logs/nextjs) on this release.

### v1.3.4 (July 01, 2024)

* Fixed JSvectormap rendering issues

### v1.3.3 (June 20, 2024)

* Fixed build error related to Loader component

### v1.3.2 (June 19, 2024)

* Added ClickOutside component for dropdown menus
* Refactored sidebar components
* Updated Jsvectormap package

### v1.3.1 (Feb 12, 2024)

* Fixed layout naming consistency
* Updated styles

### v1.3.0 (Feb 05, 2024)

* Upgraded to Next.js 14
* Added Flatpickr integration
* Improved form elements
* Enhanced multiselect functionality
* Added default layout component

## Project Structure

### Key Files & Directories

- `src/app/layout.tsx` - Root layout with ClerkProvider
- `src/middleware.ts` - Route protection middleware
- `src/app/(admin)/layout.tsx` - Dashboard layout with auth check
- `src/app/(full-width-pages)/(auth)/login/[[...rest]]/page.tsx` - Login page
- `src/app/(full-width-pages)/(auth)/signup/[[...rest]]/page.tsx` - Signup page
- `src/app/(admin)/(others-pages)/profile/page.tsx` - Profile page
- `src/components/user-profile/` - Profile management components
- `src/app/api/sessions/` - Session management API routes
- `.env.local` - Environment variables (not committed)
- `env.example` - Example environment variables

### Documentation Files

- `README.md` - Main project documentation (this file)
- `FEATURE_STATUS_AND_TESTING.md` - Detailed feature status and testing guide
- `CLERK_INTEGRATION_GUIDE.md` - Technical details of Clerk integration

## License

TailAdmin Next.js Free Version is released under the MIT License.

## Support
If you find this project helpful, please consider giving it a star on GitHub. Your support helps us continue developing and maintaining this template.
