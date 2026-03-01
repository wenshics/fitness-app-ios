# Xcode Build Guide for Pulse App

## Prerequisites

Before building, make sure you have:
- ✅ Xcode installed (version 15.0 or later)
- ✅ Apple Developer Account with active membership
- ✅ Development Certificate and Provisioning Profile
- ✅ Your Mac with sufficient storage (at least 10GB free)

---

## Step 1: Prepare Your Project

### 1.1 Install Dependencies
```bash
cd /home/ubuntu/fitness-app-ios
npm install
# or
pnpm install
```

### 1.2 Install CocoaPods Dependencies
```bash
cd ios
pod install
cd ..
```

---

## Step 2: Open Project in Xcode

### 2.1 Open the Workspace (NOT the .xcodeproj file)
```bash
open ios/fitness-app-ios.xcworkspace
```

⚠️ **IMPORTANT**: Always open `.xcworkspace`, NOT `.xcodeproj`

### 2.2 Verify Project Settings
In Xcode, you should see:
- Project name: `fitness-app-ios`
- Targets: `fitness-app-ios` (main app target)
- Schemes: `fitness-app-ios`

---

## Step 3: Configure Signing & Capabilities

### 3.1 Select the Project
1. In the left sidebar, click on the project name `fitness-app-ios`
2. Select the `fitness-app-ios` target
3. Go to the "Signing & Capabilities" tab

### 3.2 Set Team
1. Under "Team", select your Apple Developer Team
2. If you don't see your team:
   - Click the dropdown
   - Select "Add an Account"
   - Sign in with your Apple ID
   - Wait for Xcode to load your team

### 3.3 Verify Bundle ID
- Bundle ID should be: `space.manus.fitness.app.ios` (or similar)
- This must match what you configured in `app.config.ts`

### 3.4 Check Capabilities
Ensure these are enabled:
- ✅ Push Notifications (for reminders)
- ✅ Background Modes (if needed)
- ✅ HealthKit (optional, for fitness data)

---

## Step 4: Select Build Configuration

### 4.1 Select Generic iOS Device
1. At the top of Xcode, click the device/simulator selector
2. Select **"Generic iOS Device"** (not a simulator)
   - This is required for App Store builds

### 4.2 Select Release Scheme
1. Click on the Scheme selector (next to device selector)
2. Select `fitness-app-ios` → `Release`

---

## Step 5: Archive the App

### 5.1 Create Archive
1. Go to menu: **Product → Archive**
2. Wait for the build to complete (this takes 5-15 minutes)
3. The Organizer window will open automatically

### 5.2 Verify Archive
In the Organizer window:
- You should see your app listed under "Archives"
- Check the date and version number
- Status should show as "Ready to Upload"

---

## Step 6: Upload to App Store Connect

### 6.1 Distribute App
1. In the Organizer, select your archive
2. Click **"Distribute App"** button
3. Select **"App Store Connect"** as the distribution method
4. Click **"Next"**

### 6.2 Distribution Options
- **Select a method of distribution**: Choose "Upload"
- Click **"Next"**

### 6.3 Signing
- **Signing certificate**: Should auto-select your team
- **Provisioning profile**: Should auto-select
- Click **"Next"**

### 6.4 Review
- Review the app details
- Verify bundle ID, version, and build number
- Click **"Upload"**

### 6.5 Wait for Upload
- Xcode will upload your app to App Store Connect
- This takes 2-5 minutes depending on file size
- You'll see a success message when complete

---

## Step 7: Verify Upload in App Store Connect

### 7.1 Check Build Status
1. Go to https://appstoreconnect.apple.com
2. Navigate to your app → Builds
3. You should see your new build listed
4. Status will show "Processing" for a few minutes, then "Ready to Submit"

### 7.2 Select Build for Submission
1. Go to **Prepare for Submission**
2. Scroll to the **Build** section
3. Click **"Select a build before you submit your app"**
4. Choose your newly uploaded build
5. Click **"Done"**

---

## Step 8: Add Screenshots (If Not Done)

### 8.1 Add Screenshots
1. In **Prepare for Submission**, scroll to **Previews and Screenshots**
2. For each device size (iPhone 6.5", etc.):
   - Click **"Choose File"**
   - Select 3-5 screenshots
   - Screenshots should be:
     - **Resolution**: 1242 × 2688px (for 6.5" iPhone)
     - **Format**: PNG or JPG
     - **Content**: Show key app features

### 8.2 Screenshot Tips
- Screenshot 1: Home screen with daily workout
- Screenshot 2: Workout timer in action
- Screenshot 3: Achievements/badges
- Screenshot 4: Progress tracking
- Screenshot 5: Reminder settings

---

## Step 9: Submit for Review

### 9.1 Final Check
Before submitting, verify:
- ✅ Build is selected
- ✅ Screenshots are uploaded
- ✅ App Review Notes are filled
- ✅ Privacy Policy URL is set
- ✅ Support URL is set
- ✅ Age rating is set

### 9.2 Submit
1. Click **"Add for Review"** button
2. Confirm submission
3. Your app is now in the review queue!

---

## Troubleshooting

### Build Fails with "No matching provisioning profile"
**Solution:**
1. In Xcode: Preferences → Accounts
2. Select your Apple ID
3. Click "Manage Certificates"
4. Create a new iOS Development Certificate if needed
5. Download and install the certificate

### "Generic iOS Device" Not Available
**Solution:**
1. Go to Window → Devices and Simulators
2. Click "Devices" tab
3. Plug in an iPhone or iPad
4. Trust the device
5. Now "Generic iOS Device" will appear

### Archive Fails with "Code Signing"
**Solution:**
1. Go to Project Settings → Signing & Capabilities
2. Ensure Team is selected
3. Toggle "Automatically manage signing" OFF then ON
4. Try archiving again

### Upload Fails
**Solution:**
1. Check internet connection
2. Verify Apple ID has permission to upload apps
3. Try uploading again from Organizer
4. If still fails, try using Transporter app (separate tool from Apple)

---

## Expected Timeline

| Step | Time |
|------|------|
| Build & Archive | 5-15 minutes |
| Upload to App Store | 2-5 minutes |
| Processing in App Store | 5-30 minutes |
| App Review | 24-48 hours |
| **Total Time to Approval** | **1-3 days** |

---

## After Approval

Once your app is approved:
1. You'll receive an email from Apple
2. Log into App Store Connect
3. Click **"Release this version"** to make it live
4. Your app will appear in the App Store within 1-2 hours

---

## Need Help?

If you encounter issues:
1. Check Xcode build logs (Report Navigator on the right)
2. Search the error message on Stack Overflow
3. Visit Apple Developer Forums
4. Contact Apple Support through App Store Connect

Good luck with your submission! 🚀
