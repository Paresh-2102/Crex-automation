import { test as setup } from '../fixtures/index.js';
import { CREDENTIALS, URLS, TIMEOUTS } from '../utils/testData.js';
import path from 'path';

const authFile = path.resolve(process.cwd(), 'playwright/.auth/user.json');

setup('authenticate', async ({ loginPage, page }) => {
  // Perform authentication steps.
  await loginPage.navigate();
  await loginPage.login(CREDENTIALS.email, CREDENTIALS.password);

  // Wait until the page receives the cookies/tokens (e.g. navigation complete).
  await page.waitForURL(URLS.affiliateManagers, { timeout: TIMEOUTS.medium });

  // End of authentication steps.
  await page.context().storageState({ path: authFile });
});
