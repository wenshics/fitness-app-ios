# Expo Build Guide for Pulse App - App Store Submission

## Overview

Since you're using **Expo**, you don't need Xcode to build your app. Expo provides a cloud build service that creates the iOS app for you. This is much simpler than traditional Xcode builds!

---

## Prerequisites

Before building, make sure you have:
- ✅ Expo CLI installed: `npm install -g expo-cli` or `pnpm add -g expo-cli`
- ✅ Expo account (free at https://expo.dev)
- ✅ Apple Developer Account with active membership ($99/year)
- ✅ Apple App-Specific Password (for uploading to App Store)

---

## Step 1: Set Up Expo Account

### 1.1 Create Expo Account
1. Go to https://expo.dev
2. Click "Sign Up"
3. Create account with email and password
4. Verify your email

### 1.2 Log In to Expo CLI
```bash
cd /home/ubuntu/fitness-app-ios
expo login
```
- Enter your Expo email
- Enter your Expo password

### 1.3 Verify Login
```bash
expo whoami
```
You should see your Expo username

---

## Step 2: Configure App for iOS Build

### 2.1 Check app.config.ts
Your `app.config.ts` should already be configured with:
```typescript
const env = {
  appName: "Pulse",
  appSlug: "fitness-app-ios",
  iosBundleId: "space.manus.fitness.app.ios",
  // ... other config
};
```

### 2.2 Verify Configuration
```bash
expo config
```
This shows your app configuration. Look for:
- `name`: "Pulse - Daily Workouts"
- `slug`: "fitness-app-ios"
- `ios.bundleIdentifier`: Should match your Apple app bundle ID

---

## Step 3: Create Apple App in App Store Connect

### 3.1 Create App ID
1. Go to https://appstoreconnect.apple.com
2. Go to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** → **+** button
4. Select **App IDs**
5. Fill in:
   - **App ID Description**: "Pulse - Daily Workouts"
   - **Bundle ID**: `space.manus.fitness.app.ios` (must match app.config.ts)
   - **Capabilities**: Enable "Push Notifications"
6. Click **Continue** → **Register**

### 3.2 Create Provisioning Profile
1. Go to **Provisioning Profiles** → **+** button
2. Select **App Store**
3. Select your app ID
4. Select your certificate
5. Enter profile name: "Pulse App Store"
6. Download the profile

---

## Step 4: Create Apple API Key (Recommended Method)

### 4.1 Create API Key in App Store Connect
1. Go to https://appstoreconnect.apple.com
2. Go to **Users and Access** → **Keys** (under App Store Connect API)
3. Click **+** button
4. **Key Name**: "Expo Build Key"
5. **Access Level**: Select "App Manager"
6. Click **Generate**
7. Download the `.p8` file (save it somewhere safe)
8. Note your **Key ID** and **Issuer ID**

### 4.2 Configure Expo with API Key
```bash
eas credentials
```
Follow the prompts:
- Select "iOS"
- Choose "Create new"
- When asked for credentials, select "Use App Store Connect API Key"
- Upload your `.p8` file
- Enter your Key ID
- Enter your Issuer ID
- Enter your Apple Team ID (found in App Store Connect → Membership)

---

## Step 5: Build for App Store

### 5.1 Trigger Build
```bash
cd /home/ubuntu/fitness-app-ios
eas build --platform ios --auto-submit
```

This command will:
- Build your app in Expo's cloud servers
- Sign it with your Apple certificate
- Automatically submit it to App Store Connect for review

### 5.2 Monitor Build Progress
```bash
eas build:list
```
This shows all your builds and their status:
- `BUILD_QUEUED` → Waiting to build
- `BUILD_IN_PROGRESS` → Currently building
- `BUILD_COMPLETE` → Ready to submit
- `SUBMITTED` → Submitted to App Store

### 5.3 View Build Details
```bash
eas build:view <build-id>
```
Replace `<build-id>` with the ID from the build list

---

## Step 6: Alternative - Manual Build (Without Auto-Submit)

If you want to review the build before submitting:

```bash
eas build --platform ios
```

Then manually submit:
```bash
eas submit --platform ios --latest
```

---

## Step 7: What Happens Next

### 7.1 Build Status
- **Build takes 10-20 minutes** in Expo's cloud
- You'll see progress in the terminal
- Build will be automatically uploaded to App Store Connect

### 7.2 In App Store Connect
1. Go to https://appstoreconnect.apple.com
2. Your app → **Builds**
3. You should see your new build listed
4. Status: "Processing" → "Ready to Submit"

### 7.3 Complete Submission
If you didn't use `--auto-submit`:
1. Go to **Prepare for Submission**
2. Select your build
3. Add screenshots (if not done)
4. Click **Add for Review**

---

## Step 8: Monitor App Review

### 8.1 Check Status
1. Go to App Store Connect
2. Your app → **Activity**
3. You'll see submission status

### 8.2 Expected Timeline
- **In Review**: 24-48 hours
- **Approved**: You'll get an email
- **Rejected**: You'll get details on what to fix

### 8.3 After Approval
1. Go to App Store Connect
2. Click **Release this version**
3. App appears in App Store within 1-2 hours

---

## Troubleshooting

### "eas: command not found"
**Solution:**
```bash
npm install -g eas-cli
# or
pnpm add -g eas-cli
```

### "Not authenticated"
**Solution:**
```bash
eas login
expo login
```

### "Invalid bundle ID"
**Solution:**
1. Check `app.config.ts` - `iosBundleId` field
2. Must match the App ID created in App Store Connect
3. Update and try again

### "Credentials not found"
**Solution:**
```bash
eas credentials
# Follow prompts to set up credentials
```

### Build Fails
**Solution:**
1. Check build logs: `eas build:view <build-id>`
2. Look for specific error message
3. Common issues:
   - Invalid bundle ID
   - Missing provisioning profile
   - Expired certificate

---

## Comparison: Expo vs Xcode

| Feature | Expo | Xcode |
|---------|------|-------|
| **Setup Time** | 5 minutes | 30+ minutes |
| **Build Time** | 10-20 min (cloud) | 5-15 min (local) |
| **Requires Mac** | No (cloud) | Yes |
| **Complexity** | Simple | Complex |
| **Cost** | Free | Free |
| **Best For** | Quick submissions | Full control |

---

## Quick Start Summary

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Log in
eas login
expo login

# 3. Set up credentials (first time only)
eas credentials

# 4. Build and submit to App Store
eas build --platform ios --auto-submit

# 5. Monitor progress
eas build:list
```

That's it! Your app will be submitted to App Store for review automatically.

---

## Need Help?

- **Expo Docs**: https://docs.expo.dev/build/setup/
- **EAS Submit**: https://docs.expo.dev/submit/ios/
- **Troubleshooting**: https://docs.expo.dev/build/troubleshooting/

Good luck! 🚀
