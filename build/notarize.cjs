const { notarize } = require("@electron/notarize");
const path = require("path");
const fs = require("fs");

module.exports = async function notarizing(context) {
  if (process.platform !== "darwin") return;

  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== "darwin") return;

  console.log(`[notarize] build output directory: ${appOutDir}`);

  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.log(
      "Skipping notarization because APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, and APPLE_TEAM_ID are all not fully set."
    );
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  if (!fs.existsSync(appPath)) {
    console.log(`[notarize] Skipping notarization because expected app path does not exist yet: ${appPath}`);
    return;
  }

  console.log(`[notarize] notarizing ${appPath}`);

  await notarize({
    appPath,
    appleId,
    appleIdPassword,
    teamId
  });
};
